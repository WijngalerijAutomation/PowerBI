# Power BI project

One semantic model, several thin reports — one report per business stream.
Voorraad is in progress (see **Voorraad** below); Inkoop is still planned.

| Open this | Report folder | Pages |
|---|---|---|
| `Wijngalerij Klanten DEV.pbip` | `Wijngalerij Klanten DEV.Report` | Klantdetail (desktop) · Klant algemeen |
| `Wijngalerij CEO DEV.pbip` | `Wijngalerij CEO DEV.Report` | CEO dashboard |
| `Wijngalerij Producten DEV.pbip` | `Wijngalerij Producten DEV.Report` | Producten algemeen · Productdetail (drillthrough) |

Model: `Wijngalerij Semantic Model DEV.SemanticModel`. All reports bind to it by
**relative** path in `definition.pbir` — keep it relative, never absolute.

`Klanten DEV.Report` (no "Wijngalerij" prefix) is a pre-session snapshot, kept for
reference — **never edit**. It fails validation on a nested `selfFilter`; expected.

Design language, shared by all pages: white canvas, 40px content gutter, no card chrome on
KPI figures, hairline `#E4E9E4` rules, Segoe UI, `#1B2523` ink, `#5C6B66` secondary,
`#839182` eyebrow, `#3B6FD4` chart blue, `#1F9D55` / `#CC3B2F` growth green and red.

## Environment

- Windows PowerShell 5.1: `Set-Content -Encoding utf8` writes a BOM, which breaks PBIR
  JSON parsing. Write with:
  `[System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding $false))`
- Validate: `powerbi-report-author validate "<path>"` — positional arg, not `--path`
- developer.microsoft.com is unreachable, so schema validation is skipped. The
  `PBIR_SCHEMA_UNREACHABLE` warning is expected and is the only clean-state warning.
- Bridge: `powerbi-desktop status | reload | screenshot`. `status` returns the AS engine
  PID via the Modeling MCP but the **bridge needs the PBIDesktop UI PID** — read it from
  `status`, don't reuse the MCP's.
- The MCP connection drops whenever Desktop opens a different file, and the AS port
  changes on every restart. Reconnect with
  `connection_operations ListLocalInstances` → `Connect`. Never hardcode the port.
- After a rolled-back model write the MCP cache goes stale
  ("Model object-map is not consistent"). Disconnect and reconnect to clear it.
- **Desktop runs in a Parallels VM with limited RAM** and has wedged repeatedly, always
  after a batch of MCP model writes. Keep writes small and space the refreshes.
- `hasUnsavedChanges: true` reads true from the moment a project opens. On its own it
  means nothing.

### Diagnosing the model live (the DMVs)

`dax_query_operations Execute` runs DMV queries as well as DAX. These answer questions
that reading TMDL cannot, and they are read-only and cheap:

- `$SYSTEM.DISCOVER_CALC_DEPENDENCY` — the engine's **resolved** dependency graph,
  including edges created by context transition and by relationships. This is the only
  way to see a cycle that does not appear in the DAX text.
- `$SYSTEM.TMSCHEMA_PARTITIONS` — per-table `State` and `RefreshedTime`.
  **`State` 1 = Ready, 3 = NoData.** Instantly shows which tables failed to load.
- `$SYSTEM.TMSCHEMA_COLUMNS` — per-column `State`, `ErrorMessage` and `Expression`
  (`Type` 2 = calculated column). Filter `WHERE [State] <> 1` for errors.
- `$SYSTEM.TMSCHEMA_RELATIONSHIPS` — **`CrossFilteringBehavior` 1 = single, 2 = both.**
  Four of the six relationships here are bidirectional; that matters for cycles.

## Working with Desktop — the rules that matter

1. **Report edits: I write → I reload. Model edits: the user saves.** A Desktop save
   overwrites any report file Desktop has not ingested — it has deleted 56 visuals at once,
   reverted a relabel, and dropped a slicer filter. Once Desktop *has* ingested a change, a
   save is harmless and may even add state worth keeping (a slicer selection), so after a
   save **check the diff before restoring** rather than reflexively `git checkout`.
2. **Model changes live only in memory until the user saves.** Never tell the user to
   discard/close without saving while model work is pending — that has cost five measures
   once already.
3. **Pin page IDs in generators.** A regenerated page ID changes page identity; Desktop
   cannot take that through a reload, reports success, keeps the old document, and the
   bridge then answers "Unknown pageId" for a page `status` still lists from disk.
4. **New model objects need a Desktop reopen**, not a reload, before the report layer can
   bind to them.
5. **If Desktop hangs, snapshot before force-quitting.** The AS engine survives a wedged
   UI: `database_operations ExportToTmdlFolder` captures every unsaved object, turning a
   crash into a replay instead of a reconstruction.

Commit before every reload. A blank or half-populated screenshot straight after a reload is
usually mid-render — always retake before believing it.

## Data sources — the model reads two mart sets

The warehouse (Neon Postgres, `marts` schema, role `bi_readonly`) holds **two parallel
sets** of dbt marts. The dbt project itself lives in a separate repo on the Mac side; see
`HANDOFF_2026-08-19.md` for the full story.

- **Scraper-sourced marts** (no suffix) — built by HTML-scraping the ERP web app.
  Refreshes once daily. Legacy.
- **DB-sourced marts** (`_db` suffix) — direct read-only MariaDB connection to the ERP's
  actual database. Refreshes hourly 07:00–19:00. Real types, real FKs.

**Two Neon branches, and the model reads only one.** `dev` and `prod` are Neon *branches*,
not schemas, on different endpoints:

| Target | Endpoint | Who reads it |
|---|---|---|
| `prod` / `main` | `ep-soft-salad-agt3f5p2` | **the semantic model**, via `bi_readonly` (read replica) |
| `dev` | `ep-silent-fire-agbo418j` | dbt experimentation only |

Both targets run the **same deployed dbt code**, so any dev/prod difference is in the
source data, not the SQL. A fix verified on `dev` is *not* live for the reports until the
data lands on `main`. Query either with
`flyctl ssh console -a wijngalerij-pipeline -C "python scripts/dbt_env.py --target dev show --inline '<sql>'"`
(see `SETUP_flyctl_windows.md`); `--target prod` is not in the allowlist by default.

**Repointed to `_db`:** `dim_customer`, `dim_date`, `fct_sales`, `fct_klant`,
`fct_klant_product`.
**Still on the scraper marts:** `dim_product`, `fct_voorraad`.

The old reason — "the DB source has no stock quantities at all" — is **no longer true**
(verified 2026-08-19 against prod). `fct_voorraad_db` exists, is built on both Neon
branches, and carries real stock: 753 products, 112.197 flessen, € 468.236, snapshot
same-day, zero nulls. Its `voorraad` was validated upstream by summing the mutation
ledger against the scraper's known-good figure — 714 of 736 products matching exactly,
the remaining 22 being rows where the scraper itself is NULL.

Because the two halves disagree on `product_id`'s type (`_db` has real `bigint`, the
scraper marts have strings), `fct_sales` and `fct_klant_product` carry a **transitional
M cast** of `product_id` to text. Without it the `fct_sales → dim_product` relationship
and the DAX-level `fct_klant_product` / `fct_voorraad` equality silently match nothing.
Both are commented as removable once the other two tables move over.

**66 sales lines (~€ 17,9k) have no matching product** after the repoint. Eleven of the
twelve product_ids are missing from `dim_product_db` too, so this is a referential gap at
source, not a cast problem. Company-level revenue includes them; product-level visuals
drop them, so the two disagree. Fix belongs on the dbt side.

### Refresh limits

Desktop refreshes are local and count toward **nothing** — refresh freely. The 8/day cap
applies to scheduled refresh of the *published* model on shared (Pro) capacity; Fabric
capacity raises it to 48. Note the pipeline produces 13 hourly loads a day, so on Pro the
service can never consume more than 8 of them.

## Model shape

7 source tables (`dim_customer`, `dim_date`, `dim_product`, `fct_sales`, `fct_voorraad`,
`fct_klant`, `fct_klant_product`), `_Metingen` (measure home, no data, ~180 measures), and
four disconnected parameter/helper tables: `TopN keuze`, `TopN producten`,
`Sortering producten`, `CEO kleuren`. Auto date/time is **off**.

Peildatum is `dim_date[snapshot_datum]` via `[Peildatum]` — never `TODAY()`.

**Sales data starts 2024-10-02.** Any window reaching further back is partly empty, so
year-on-year growth reads high; `[Wijn vergelijking sub]` computes and states the gap.

Added label/flag columns: `fct_klant[klant_label]`, `fct_klant_product[klant_label]` and
`[is_zakelijk]`, `fct_voorraad[product_label]`, `[is_wijn]`, the previous-window columns
and the growth hex columns, `dim_date[in_venster]`, `[jaar_offset]`.

## Voorraad

**The broken figures below are a `prod`-only problem, and nothing currently renders from
them.** Verified 2026-08-19 by querying both Neon branches directly.

`fct_voorraad` on **prod** (`ep-soft-salad`, the `main` read replica the semantic model
actually reads) is still broken exactly as first found — 742 products, `voorraad` and
`voorraadwaarde` **0 on every row**, `gereserveerd` 113.663 (a euro value in a
bottle-count column), `effectieve_voorraad` −113.023, `schapvoorraad` 24.251 the only
credible bottle count.

The same mart on **dev** (`ep-silent-fire`) is healthy: `voorraad` 119.998,
`voorraadwaarde` € 497.326,63, `gereserveerd` 92, `effectieve_voorraad` +132.860. Both
targets run the **same deployed dbt code**, so the difference is in the *source data*,
not the SQL — dev has had good stock data loaded, prod has not. The scraper's stock-page
parsing has returned NULL for `voorraad` on every run since ~2026-08-11, warning-only in
dlt, never surfaced. Still live. Fix belongs on the dbt/ingestion side.

Caution: on dev, `schapvoorraad` and `voorraad` are identical to the bottle (119.998
both). Two distinct columns agreeing exactly looks more like a fallback than a
coincidence — confirm before trusting either.

### Nothing consumes the stock columns yet

Checked across all three reports and `_Metingen`. `fct_voorraad` is currently used purely
as a **product-level sales and margin table**:

- **Visuals** use only `product_label`, `is_wijn`, `wijnhuis`, and the three
  `*_groei_kleur` columns.
- **Measures** use `wijnhuis`, `product_id`, `product_label`, `omzet_12m`,
  `omzet_vorige_12m`, `n_klanten`, `leverancier`, `klanten_vorige_12m`,
  `klanten_nu_zakelijk`, `inkoopprijs`, `gem_verkoopprijs_12m`, `flessen_vorige_12m`,
  `flessen_52w`, `artikelcode`.

No `voorraad`, `voorraadwaarde`, `gereserveerd`, `dekking_weken` anywhere. The earlier
warning that "every stock and cover visual depends on them" was forward-looking — those
visuals do not exist yet.

### Repointing `fct_voorraad` to `_db`

Of the 51 source columns the model imports, `fct_voorraad_db` lacks 10 — `dekking_weken`,
`effectieve_voorraad`, `gereserveerd`, `in_bestelling`, `schapvoorraad`,
`slow_mover_categorie`, `slow_mover_reden`, `verwachte_uitverkoopdatum`, `voorraadstatus`,
`voorraadwaarde_erp`. **All 10 are unused.** Every source column that *is* consumed exists
in `_db`; the `*_vorige_12m`, `*_kleur`, `is_wijn` and `product_label` columns are DAX
calculated columns added in PBI and survive a repoint.

So the repoint is viable with no report breakage. Resolve first:

1. **`product_id` type.** `_db` is real `bigint`, the scraper marts are strings. The
   DAX-level `fct_klant_product` / `fct_voorraad` equality silently matches nothing
   across that divide — this is the trap that has already cost time. Real work, not a
   flip of a source.
2. **`dim_product` is still scraper-sourced**, and `fct_voorraad` carries its blank
   unknown-member row into slicers. 742 -> 753 products changes that surface.
3. Repointing routes *around* the live scraper bug rather than fixing it. Fine for the
   reports, but the pipeline defect stays.

`_db` still omits `gereserveerd`, `in_bestelling`, `effectieve_voorraad`, `dekking_weken`,
`voorraadstatus` and `verwachte_uitverkoopdatum` **by design** — validating them needs a
live scraper snapshot of the same moment, which the parsing bug prevents. So cover and
stock status cannot come from `_db` yet either.

### Stock over time is now buildable

`stg_voorraad_mutaties_db` is a **mutation ledger** — one row per movement, not a
snapshot: 46.600 mutations, 733 products, **2024-10-28 -> 2026-08-19 13:59** (live,
hourly), 30.693 in the last 12 months, 6 mutation types. Sales start 2024-10-02, so it
covers effectively the whole history and a cumulative sum reconstructs stock at any date.

This closes the earlier "single snapshot, so *stock value over time* and *out-of-stock
during the last 12 months* cannot be built at all" gap — they need a periodic
(product x week/month) grain, and the ledger supplies it.

Worth carrying into any new table: `laatste_verkoop`, `maanden_sinds_laatste_verkoop`,
`niet_verkocht_bucket`, `slow_mover_categorie`, `wijnhuis` (109 producers),
`in_bestelling`, `inkoopprijs`, `lead_time_days`. `in_bestelling` has no order or
delivery date, so open inkoopwaarde can be totalled but not aged.

## Traps that have already cost time

### DAX and the model

- **`CALCULATE` in a calculated column forces context transition.** The row context
  becomes a filter on the whole table, which then travels **outward across
  relationships** — including bidirectional ones. This produced
  `"A cyclic reference was encountered during evaluation"` on a refresh, reported against
  `fct_klant_product`, whose own columns had no outbound edges at all: the named table was
  the victim, not the cause. The loop ran
  `fct_klant_product[klant_label]` → context transition → relationship to `dim_customer`
  → **bidirectional** `dim_customer ⇄ fct_klant` → `fct_klant[signaal_kleur]` /
  `[flessen_kleur]`, which read `ALL(fct_klant_product)`.
  **None of this is visible in the DAX text** — use `DISCOVER_CALC_DEPENDENCY`.
  Both `klant_label` columns now use `COUNTROWS`/`DISTINCT` over
  `FILTER(ALL(t), col = VAR)`, which has no transition. Keep them that way.
- **`[Omzet 12m]` is `SUM(fct_voorraad[omzet_12m])`** — stock revenue. It silently
  corrupted `[Brutomarge % 12m]` (2,7% instead of 51,1%) on a customer page. On the
  *product* pages it is exactly the right number; that is what it was written for.
- **Model culture is `en-US` and cannot be changed after creation.** Raw measures render
  `98,086.34` and a percentage renders `0.42`. For Dutch output use label measures:
  `FORMAT(x, "€ #,##0", "nl-NL")`. `"0,0"` is a *grouping* format — use `"0.0"`.
- **`SAMEPERIODLASTYEAR` is wrong for a YTD comparison with no date filter in context** —
  it shifts the whole table and returns the *entire* prior year, reading −30% where the
  truth is +28%. Use `dim_date[is_ytd_vergelijkbaar]`, which flags day-of-year ≤ peildatum
  in every year, and is grain-safe because it is a column.
- **A filter predicate cannot call a measure.** `dim_date[jaar] = YEAR([Peildatum])` fails
  with "a function PLACEHOLDER has been used in a True/False expression". Put it in a `VAR`.
- **`fct_klant_product` has no relationship to `dim_product` and cannot get one** — Power BI
  rejects it as an ambiguous path to `dim_date` via `fct_sales`. Match on `product_id`
  explicitly instead.
- **The marts' 12-month window is not `dim_date[in_venster]`.** `fct_voorraad` and
  `fct_klant_product` agree to the cent (€ 1.661.153,48); `fct_sales` over `in_venster`
  gives € 1.741.250. Never compare a mart figure against a fct_sales window.
- **`Start` and `Id` are reserved DAX keywords** — `VAR Start = …` does not compile.
- **`RANKX` must rank over the same column the visual groups by**, or every row gets rank 1.
- **Measure-based visual filters are grain-sensitive.** Prefer a flag *column*, which
  filters before grouping. Guard blanks: `BLANK() <= 50` is **true**, so an unguarded
  top-N filter lets the blank row through.
- **Names are not unique.** 774 customers share 759 names; 740 products share 737 names and
  623 artikelcodes. Group on the `_label` columns.
- **`fct_voorraad` carries `dim_product`'s blank unknown-member row.** It reaches slicers,
  where single-select grabs it as the first value and blanks the whole page.
- **Definitions must match on both sides of a comparison.** A growth chip once read 133%
  because it compared the mart's all-customer `n_klanten` against a previous count that
  only included customers with revenue.

### PBIR authoring

- **PBIR resolves measures by their home table.** `SourceRef.Entity` must be the table the
  measure lives on. Wrong entity = "Something's wrong with one or more fields".
- **`isDefaultSort` is a plain JSON boolean**, not the `{expr:{Literal:…}}` form used by
  formatting properties. Wrong type = Desktop refuses to open the report.
- **`visualLink` is a visualContainerObject**, not a property of `/visual`.
- **Objects with multi-state selectors need *two* entries** — one with
  `selector: {id: "default"}` and one with none. With only the selector entry the
  unselectored level falls back to the theme, whose `border: [{width: 1}]` has no colour
  and draws a 1px accent-blue line. Applies to `shape` `outline`/`fill` and to
  `actionButton` `text`/`outline`/`fill` (which otherwise renders as an empty box).
- **Line series take their colour from `dataPoint.fill`, not `lineStyles.strokeColor`** —
  `lineStyle` and `strokeWidth` on `lineStyles` *do* apply, so a dash can land correctly
  while the colour silently does not.
- **`tableEx` has only a `Values` role** — a dimension plus measures renders headers with no
  rows. Use `pivotTable` with the dimension in `Rows`.
- **Conditional formatting does not work on `cardVisual`.** Feed a calculated hex column
  into `fillCustom.fillColor` / `value.fontColor` via `Aggregation(Min)`; works on `shape`
  too. A card colours its *whole* value, so a coloured chip needs its own card.
- **`cardVisual` `fontSize` is in points; textbox `fontSize` is in px.** 13pt ≈ 17.3px —
  estimating character counts against pixel widths under-predicts by a third. Measure with
  `System.Drawing` `MeasureString` in the real font before trusting a fit.
- **Dropdown slicers need height ≥ 76px** and `general.selfFilterEnabled` for a search box.
- **Typing in a slicer's search box makes Desktop write an invalid `general.selfFilter`**
  (`PBIR_FORMATTING_PROP_NESTED`). Delete the property; the selection in `general.filter`
  survives. Selecting from the dropdown does not trigger it.
- **Do not hand-write TopN `Subquery` filters** — that made the report unopenable. Use a
  rank measure filtered to 1.
- **The offline validator passes all of the above.** It checks property names and enum
  values, not JSON types, object placement, or measure home tables. Only Desktop catches
  them, so opening the report is part of verification.

## Publishing to the service

Publishing a `.pbip` produces exactly two items, named after the **folders**, not the
pages: the report takes the `.Report` folder name, the semantic model takes the
`.SemanticModel` folder name. So `Wijngalerij Klanten DEV.pbip` yields a report
`Wijngalerij Klanten DEV` and a model `Wijngalerij Semantic Model DEV` — different names,
not adjacent in an alphabetical list. Page names never appear as workspace items.

All three projects bind to the same model folder, so **every publish overwrites the shared
model** with whatever is on disk at that moment. Publish from a known-good state.

## Rules

- Commit before and after any batch of report edits.
- Never hand-edit the `.SemanticModel` folder — use the Modeling MCP.
- Generate report JSON with a Node script in the scratchpad; keep the script the source of
  truth and fold manual Desktop edits back into it.
- `.pbi/localSettings.json` and `.pbi/cache.abf` are gitignored but were committed before
  the rule existed, so they still churn. Do not add them to commits.
- Say "zakelijke klanten", not "B2B", in anything the user reads.

## Known gaps

- **Marge per doos** cannot be computed — no bottles-per-case attribute exists.
  `fct_klant_product[prijs_doos]` is a price tier, equal to the per-bottle price in 1124 of
  1125 rows.
- **Debiteuren and crediteuren** have no source; the CEO dashboard reserves the blocks.
- Historic **cost** exists only for the current 12-month window, so margin cannot be
  compared year on year at product level.
- `[Brutomarge % 12m]` and `[Brutomarge pct 12m]` are duplicates.
- **`Prognose omzet jaar`** and its ~6 dependent measures put a revenue forecast on the CEO
  dashboard with no forecast-versus-actual tracking behind it. Flagged, not yet decided.
- Two stray measures named `Measure` / `Measure 2` on `fct_klant` — trivial cleanup.
- **The scraper's stock-page parsing has returned NULL for `voorraad` since ~2026-08-11**
  — warning-only in dlt, never surfaced, still live on prod. It is why prod's
  `fct_voorraad` reads 0 while dev's does not. Fix belongs on the dbt/ingestion side; see
  **Voorraad** above.
