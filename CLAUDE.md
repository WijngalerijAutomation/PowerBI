# Power BI project

One semantic model, several thin reports — one report per business stream.
Inkoop is still planned.

| Open this | Report folder | Pages |
|---|---|---|
| `Wijngalerij Klanten DEV.pbip` | `Wijngalerij Klanten DEV.Report` | Klantdetail (desktop) · Klant algemeen |
| `Wijngalerij CEO DEV.pbip` | `Wijngalerij CEO DEV.Report` | CEO dashboard |
| `Wijngalerij Producten DEV.pbip` | `Wijngalerij Producten DEV.Report` | Producten algemeen · Productdetail (drillthrough) |
| `Wijngalerij Voorraad DEV.pbip` | `Wijngalerij Voorraad DEV.Report` | Voorraad (werkkapitaal) |

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

**The model can only read `marts`.** `bi_readonly` has USAGE and SELECT on `marts` and
`predictions` — **not on `staging`, `raw`, or anything else**. Pointing a table at
`staging.<model>` fails at refresh with **"The key didn't match any rows in the table"**,
which is what a missing schema grant looks like from M's side and reads like a typo. Note
`dbt` runs as `transformer`, so *verifying a table exists via dbt proves nothing about
whether the model can read it* — that mistake cost a full build-and-revert cycle here.
Anything the report needs must be a **mart**. That boundary is deliberate: marts is the
published contract, staging is internal and free to change shape.

New marts are readable automatically — `sql/01_roles_and_schemas.sql` carries
`ALTER DEFAULT PRIVILEGES FOR ROLE transformer IN SCHEMA marts GRANT SELECT ON TABLES TO
analyst_readonly, bi_readonly`, so no manual grant is needed after adding one.

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
`fct_klant_product`, `fct_voorraad` (repointed 2026-08-19).
**Still on the scraper marts:** `dim_product` — the last one.

`fct_voorraad_db` carries real stock (753 products, 112.197 flessen, € 468.236, same-day
snapshot, zero nulls); its `voorraad` was validated upstream against the scraper's
known-good figure, 714 of 736 products matching exactly, the other 22 being rows where the
scraper itself is NULL. The old reason for holding back — "the DB source has no stock
quantities at all" — had stopped being true.

Because `dim_product` is still scraper-sourced, `fct_sales`, `fct_klant_product` **and now
`fct_voorraad`** each carry a **transitional M cast** of `product_id` to text (`_db` has
real `bigint`, the scraper marts have strings). Without it the `→ dim_product`
relationships and the DAX-level `fct_klant_product` / `fct_voorraad` equality silently
match nothing. All three are commented as removable once `dim_product` moves over — that
is now the single remaining blocker to deleting every cast.

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

8 source tables (`dim_customer`, `dim_date`, `dim_product`, `fct_sales`, `fct_voorraad`,
`fct_klant`, `fct_klant_product`, `fct_voorraad_mutaties`), `_Metingen` (measure home, no
data, ~188 measures), and four disconnected parameter/helper tables: `TopN keuze`,
`TopN producten`, `Sortering producten`, `CEO kleuren`. Auto date/time is **off**.

Note `_Metingen` is not the only measure home — `fct_voorraad` carries 19 of its own,
`fct_klant` 17, `fct_sales` 7, `dim_date` 1. See the trap on this below.

Peildatum is `dim_date[snapshot_datum]` via `[Peildatum]` — never `TODAY()`.

**Sales data starts 2024-10-02.** Any window reaching further back is partly empty, so
year-on-year growth reads high; `[Wijn vergelijking sub]` computes and states the gap.

Added label/flag columns: `fct_klant[klant_label]`, `fct_klant_product[klant_label]` and
`[is_zakelijk]`, `fct_voorraad[product_label]`, `[is_wijn]`, the previous-window columns
and the growth hex columns, `dim_date[in_venster]`, `[jaar_offset]`.

## Voorraad

**Where to pick up (as of 2026-08-19).** The model layer is done and verified; the report
layer has not started.

- ✅ `fct_voorraad` repointed to `_db` — real stock, marts agreeing to the cent
- ✅ `fct_voorraad_mutaties` in the model, six stock-over-time measures verified against
  the warehouse month for month
- ✅ `Dekking weken` / `Dekking label` hidden — they read plausible and wrong
- ✅ **Voorraad report built (2026-08-20)** — `Wijngalerij Voorraad DEV.pbip`, one page,
  43 visuals, generated by `Reference/gen_voorraad.js` (the source of truth — fold Desktop
  edits back into it). Screenshot-verified against the warehouse figures.
- ✅ **The upstream bundle is derived (2026-08-20).** `fct_voorraad_db` now carries
  `gereserveerd`, `in_bestelling`, `effectieve_voorraad`, `dekking_weken`,
  `voorraadstatus`, `verwachte_uitverkoopdatum` and `open_inkoopwaarde` (€ 41.005 at
  first build), derived from the ERP's order/inkoop tables and validated same-moment
  against the ERP's own stock page — gereserveerd exact (48/48), in_bestelling counts
  sent POs only (drafts deliberately excluded; the page counts them inconsistently).
  Landed on prod via the hourly pipeline.
- ✅ **The effective-stock family is in the PBI model (2026-08-20).** `fct_voorraad` has
  58 source columns now: the seven new ones (`gereserveerd`, `in_bestelling`,
  `effectieve_voorraad`, `dekking_weken`, `voorraadstatus`, `verwachte_uitverkoopdatum`,
  `open_inkoopwaarde`) were defined **explicitly via MCP** — see the refresh-cycle trap
  below for why that path and not Desktop's auto-detect. `Dekking weken` /
  `Dekking label` are visible again, rewritten on effective stock (25,8 weken).
- ⬜ **Next on the PBI side:** fill the Open inkoopwaarde reserved block on the Voorraad
  page (€ 41.005 is in `fct_voorraad[open_inkoopwaarde]`), and consider voorraadstatus
  visuals (161 niet leverbaar / status tiers exist as a column).
- ⬜ Ask the ERP developer what the stock page's draft-counting rule is (in_bestelling
  residual: 1.572 flessen on 2026-08-20).

Two things to know before placing a visual: **start any stock history at 2025-02** (the
measures already return BLANK before it), and `Voorraadwaarde op datum` is an
approximation at today's cost price.

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

### Nothing *renders* from the stock columns yet — but measures do read them

**`_Metingen` is not the only measure home.** `fct_voorraad` carries **19 measures of its
own**, and grepping `_Metingen.tmdl` alone misses every one of them. Use
`DISCOVER_CALC_DEPENDENCY`, not grep, before concluding anything is unused — that is what
caught this.

- **No visual uses a stock column or a stock measure.** Visuals reference only
  `product_label`, `is_wijn`, `wijnhuis` and the three `*_groei_kleur` columns.
- **Five measures on `fct_voorraad` do read the broken columns:**
  `Totale voorraadwaarde` = `SUM(fct_voorraad[voorraadwaarde])`, `Voorraad flessen` =
  `SUM(fct_voorraad[voorraad])`, plus `Voorraadwaarde label`, `Dekking weken` and
  `Dekking label` built on those. On prod they all return 0.

So the table currently *renders* purely as a product-level sales and margin table, but the
Voorraad scaffolding already exists in measure form. The earlier warning that "every stock
and cover visual depends on them" was forward-looking — those visuals do not exist yet.

**`Dekking weken` and `Dekking label` are visible again (2026-08-20), rewritten on
effective stock.** They were hidden on 2026-08-19 because the old definition divided RAW
stock by demand — no `gereserveerd`, no `in_bestelling` — which read ~23,4 weken,
plausible and wrong. Now that validated effective stock exists in the mart,
`Dekking weken` is `DIVIDE(SUM(fct_voorraad[effectieve_voorraad]), [Vraag per week])`
(25,8 weken at first read). Note it deliberately differs from the Voorraad page's
"Dagen voorraad" KPI: that one is a *working-capital* metric (physical stock over
52-week demand, 158 dagen ≈ 22,7 weken); dekking is *operational cover* (effective
stock over 12-week demand). Both say so in their descriptions — don't "reconcile" them.

### Repointing `fct_voorraad` to `_db`

**Step 1 is done (2026-08-19, committed).** The 10 source columns `fct_voorraad_db` lacks
— `dekking_weken`, `effectieve_voorraad`, `gereserveerd`, `in_bestelling`,
`schapvoorraad`, `slow_mover_categorie`, `slow_mover_reden`, `verwachte_uitverkoopdatum`,
`voorraadstatus`, `voorraadwaarde_erp` — have been deleted. `fct_voorraad` is now 51
columns (41 source + 10 calculated), all 19 measures intact.

**The state is unstable until the partition is repointed.** Deleting a source column from
a table with an M partition does not stop Desktop re-adding it on refresh — the MCP warns
about this and suggests `Table.RemoveColumns`. Repointing to `fct_voorraad_db` fixes it
permanently, because those columns do not exist there. **A refresh before the repoint
undoes the work.**

Remaining step: point the partition at `fct_voorraad_db` and add the same cast `fct_sales`
already carries:

```
#"Changed Type" = Table.TransformColumnTypes(#"Navigation 1", {{"product_id", type text}})
```

**`product_id` typing is not the obstacle it looked like.** Measured on the warehouse:

| Test | Result |
|---|---|
| `fct_voorraad_db::text` -> `dim_product` | **736 of 736** |
| current scraper match | 736 — identical |
| `product_id` unique / null | **753 of 753 unique, 0 nulls** — one-side cardinality holds |
| DAX equality vs `fct_klant_product` | **653 today -> 664 of 664 after** |

The repoint *improves* matching: 11 products currently resolve to blank in the five
`Wijn klant …` measures and would start working, because both sides would then originate
from the same ERP bigint. Note the warehouse itself refuses `varchar = bigint` outright —
that error is this mismatch made visible.

Still worth watching:

1. **`dim_product` is still scraper-sourced**, and `fct_voorraad` carries its blank
   unknown-member row into slicers. 742 -> 753 products changes that surface; 17 `_db`
   rows have no `dim_product` counterpart.
2. The relationship is `fct_voorraad` -> `dim_product` with `fromCardinality: one` and
   **bidirectional** filtering — the fact is the *one* side and the dimension the many,
   backwards from usual. It works; know it before touching it, given the cycle history.
3. `omzet_vorige_12m`, `flessen_vorige_12m` and `klanten_vorige_12m` will change for those
   11 products. They feed the growth chips on Productdetail.
4. Two column descriptions go stale at 740 -> 753 products: `product_label` cites "737
   namen voor 740 producten", `is_wijn` references the blank unknown-member row.
5. Repointing routes *around* the live scraper bug rather than fixing it. Fine for the
   reports, but the pipeline defect stays.

`_db` still omits `gereserveerd`, `in_bestelling`, `effectieve_voorraad`, `dekking_weken`,
`voorraadstatus` and `verwachte_uitverkoopdatum` **by design** — validating them needs a
live scraper snapshot of the same moment, which the parsing bug prevents. So cover and
stock status cannot come from `_db` yet either.

### Stock over time is buildable — from 2025-02

`stg_voorraad_mutaties_db` is a **mutation ledger** — one row per movement, not a
snapshot: 46.600 mutations, 733 products, **2024-10-28 -> 2026-08-19 13:59** (live,
hourly), 30.693 in the last 12 months, 6 mutation types. A cumulative sum reconstructs
stock at any date, and the method is verified: the series ends at 113.069 against
`fct_voorraad_db`'s 113.063.

**But the ledger has no opening balance, so anything before 2025-02 is unusable** — see
"The ledger has no opening balance" below. Sales start 2024-10-02 and the ledger 2024-10-28,
but stock existed before both and was never booked.

This closes the earlier "single snapshot, so *stock value over time* and *out-of-stock
during the last 12 months* cannot be built at all" gap — they need a periodic
(product x week/month) grain, and the ledger supplies it.

Worth carrying into any new table: `laatste_verkoop`, `maanden_sinds_laatste_verkoop`,
`niet_verkocht_bucket`, `slow_mover_categorie`, `wijnhuis` (109 producers),
`in_bestelling`, `inkoopprijs`, `lead_time_days`. `in_bestelling` has no order or
delivery date, so open inkoopwaarde can be totalled but not aged.

#### Built and verified (2026-08-19)

`fct_voorraad_mutaties` is in the model, reading **`marts.fct_voorraad_mutaties`** (a mart,
because the model cannot read `staging` — see the grant note above), with a
**single-direction** relationship to `dim_date[datum]`. `datum` is cast to `date` in M:
the ledger carries timestamps and `dim_date[datum]` does not, so an uncast join matches
nothing, silently. There is deliberately **no relationship to `dim_product`** — it would
loop via `fct_sales` → `dim_date` and Power BI rejects it as ambiguous, exactly as it did
for `fct_klant_product`. Match on `product_id` in DAX instead.

Six measures in `_Metingen`:

| measure | notes |
|---|---|
| `Voorraadmutatie` | net movement in the period, not a stand |
| `Voorraad op datum` | running stock — the core measure |
| `Voorraad op datum label` | Dutch formatting |
| `Voorraadwaarde op datum` | **approximation** — current cost price, see below |
| `Voorraadwaarde op datum label` | Dutch formatting |
| `Producten uit voorraad` | products at 0 or below |

Verified against the warehouse month for month: 45.943 at 2025-02, 66.501 at 2025-04,
102.721 at 2025-07, 81.063 at 2025-10, and BLANK before 2025-02.

**The 2025-02 floor is a `BLANK` guard inside each measure, not a report filter** — so it
cannot be forgotten by whoever builds the visual. Do not "fix" a blank early period by
removing it.

**`Voorraadwaarde op datum` values historical stock at today's purchase price**, because
historic cost does not exist in the model (a Known gap). A price change retroactively
rewrites the whole series. Sound for the *shape* of the curve, not as a valuation of a
past date. The fix is upstream, not in DAX.

`order_id` and `inkoop_id` are imported and usable: the mart converts the ERP's zero-fill
to real NULLs, so unlike the raw ledger, `IS NOT NULL` behaves. 40.132 order references,
1.541 purchase references.

### Building the Voorraad report — scope, and what is blocked

**Decision (2026-08-19): build fresh measures over the mutation ledger; do not preserve
the 10 unused columns.** They are not dormant assets — on prod they are corrupt.
`dekking_weken`, `voorraadstatus`, `verwachte_uitverkoopdatum`, `effectieve_voorraad`,
`slow_mover_reden` and `slow_mover_categorie` are all derived from effective stock, which
on prod is **−113.023**; `gereserveerd` is a euro value in a bottle column. Preserving
them means not repointing at all.

The ledger also does something the snapshot fundamentally cannot: `fct_voorraad` is one
row per product at one moment, so stock-over-time is impossible from it at any effort.
At 46.600 rows the ledger is small enough to import as a fact table and answer with a
running-total measure over `dim_date` — no periodic (product x week) mart needed.

| Measures exist (`_db` + ledger) | Blocked on dbt-side work |
|---|---|
| stock on hand, stock value ✅ built | cover / `dekking_weken` |
| stock value over time ✅ built | `voorraadstatus` |
| out-of-stock history ✅ built | `verwachte_uitverkoopdatum` |
| slow movers, dead stock, `niet_verkocht_bucket` — columns exist, no visuals yet | effective stock |
| demand, margin, rankings, wijnhuis / leverancier — measures exist | open inkoopwaarde (`in_bestelling`) |

**The left column is measures, not visuals.** Nothing has been placed on a page yet — the
Voorraad report itself is still to be built. See "Built and verified" above for what the
measures are.

Everything in the right column needs `gereserveerd` and `in_bestelling`, which **neither**
source currently supplies validated. No measure can rescue that; it is upstream work.
Take `gereserveerd` and `in_bestelling` to the dbt side — they are the same class of
problem and gate the same column. (`CO` is resolved: see below.)

#### Landmines in the ledger

- **`inkoop_id` and `order_id` are zero-filled, not null.** `inkoop_id` has 45.059 zeros
  against 1.541 real references; `order_id` 6.530 zeros against 40.070 real. The staging
  model's comment ("at most one is set per row") reads as NULL-able. **`IS NOT NULL`
  matches every row** and will look like it works. Use `> 0`.
- **`CO` is `Correctie`, and it hides a missing opening balance (resolved 2026-08-19).**
  Mutation types and their net effect:

  | code | label | rows | sum(aantal) |
  |---|---|---|---|
  | `AF` | Afboeking | 30.445 | −554.781 |
  | `BI` | Bij boeken | 7.933 | +556.025 |
  | `CO` | Correctie (ERP title is literally `???`, ascii 63 — not NULL) | 4.840 | **+114.137** |
  | `IV` | Intern verbruik | 3.372 | −2.816 |
  | `BV` | Begin voorraad | 9 | +505 |
  | `VN` | Vernietiging | 1 | −1 |

  `AF` and `BI` roughly cancel, so `CO` is what creates the entire standing stock. Its
  `toelichting` shows ordinary corrections — `nieuwe telling`, `Telling AGP`, `Breuk`,
  `Vintage correctie`, `Jaartal aanpassing` — **but 90% of the volume is two backfills
  with a blank `toelichting`:** 2024-11 (325 rows, +40.969) and 2025-01 (674 rows,
  +60.178), together 102.719 of 114.137. Those are opening stocktakes, not periodic
  recounts.

##### The ledger has no opening balance — start stock history at 2025-02

`Begin voorraad` is 9 rows and +505 flessen, nowhere near an opening position, so the
cumulative series **goes negative**, which is physically impossible:

| month | total stock | products negative |
|---|---|---|
| 2024-10 | **−3.663** | **82 of 83** |
| 2024-11 | 22.389 | 89 |
| 2024-12 | **−1.080** | 114 (−18.397 flessen) |
| 2025-01 | 51.874 | **7** |
| 2025-02 onward | climbs steadily | 3–32 |
| 2026-08 | **113.069** | 2 |

Stock existed before the ledger starts (2024-10-28); it was never booked. The 2025-01
stocktake is what retroactively establishes a credible baseline.

1. **Stock-over-time is unusable before 2025-02.** Earlier windows show stock appearing
   from nothing and dipping below zero. Treat 2025-01 as a baseline reset, not a data point.
2. **The method is sound.** The cumulative series ends at 113.069 against
   `fct_voorraad_db`'s 113.063 — a 6-flessen gap. Running-sum-of-mutations reconstructs
   stock correctly.
3. **A residual floor remains:** 3–32 products carry negative running stock every month
   even after the reset. A stock-over-time visual must handle that rather than render
   negative bottles.

Also structural: `Shopify`, `Vivino`, `Getvino`, `Web`, `Abo` and `Wijnabonnementen` appear
as `CO` `toelichting` values — those channels are booked as **stock corrections rather than
orders**, so that demand is invisible to `fct_sales` but visible as stock decrements. Small
(~1.700 flessen against 113.000), so not material to headline figures, but channel demand
and stock movement will not reconcile.

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
  `fct_klant_product` agree to the cent — **€ 1.746.527,60** as of 2026-08-19, both now
  `_db`-sourced from the same hourly load. `fct_sales` over `in_venster` gives a different
  figure. Never compare a mart figure against a fct_sales window.
  **This agreement is a live invariant, and it has silently broken before:** when
  `fct_klant_product` moved to `_db` and `fct_voorraad` did not, the pair drifted
  € 82.516 apart (1.661.153,48 vs 1.743.669,10) and nothing flagged it. Repointing
  `fct_voorraad` restored it. If the two ever disagree again, one of them has been
  repointed or refreshed without the other — check that before trusting either.
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
- **Desktop's UI refresh throws "A cyclic reference" when schema auto-detect adds new
  source columns — define them via MCP first.** When a mart the model reads gains columns
  (fct_voorraad_db grew seven on 2026-08-20), Desktop's refresh path does an ALTER plus a
  full recalc in one transaction, and that ordering surfaces a *latent* whole-table loop
  between `fct_klant`'s kleur-columns (which read `fct_klant_product` and `fct_sales`)
  and the other calc columns — reported against `fct_sales` and `fct_klant`, which are
  **victims, not causes**, and have no calc columns of their own at all. The same refresh
  via XMLA (single table or all tables in one transaction) succeeds, because no schema
  change is involved. The fix: create the new column definitions explicitly with the MCP
  (`column_operations Create` with `sourceColumn`), refresh, done — Desktop's auto-detect
  then finds nothing to alter and its refresh works again. Verified clean afterwards.
- **`REMOVEFILTERS(t)` does not stop cross-filtering that arrives *through* `t`.** It
  clears filters *on* that table only. A date filter reaches `fct_voorraad` by travelling
  `dim_date` → `fct_sales` → `dim_product` ⇄ `fct_voorraad`, and those last two hops are
  **bidirectional**, so `REMOVEFILTERS(fct_voorraad)` leaves it filtered anyway. This cost
  an hour on `[Voorraadwaarde op datum]`: a per-product price lookup came back BLANK for
  every product not sold on the date in context, and the measure returned € 125.838
  instead of € 470.844. No error, a plausible number, nothing visible in the DAX text.
  **For a lookup that must ignore all context, use `REMOVEFILTERS()` with no argument**,
  then filter to the one key. Four of the seven relationships are bidirectional; assume
  any filter can reach any table until proven otherwise.
- **A measure can be correct standalone and wrong in a visual.** The same measure returned
  the right total evaluated naked and the wrong one inside a date filter — which is how
  every visual evaluates it. Verify measures **wrapped in the filter context they will
  actually meet** (`CALCULATE([M], dim_date[jaar_maand] = "2026-08")`), not just bare.
- **`_Metingen` is not the only measure home.** `fct_voorraad` alone carries 19 measures of
  its own. Grepping `_Metingen.tmdl` to decide whether something is used will miss them and
  produce a confident wrong answer — it did exactly that here, concluding "nothing consumes
  the stock columns" when five measures read them. Use `DISCOVER_CALC_DEPENDENCY`, which
  returns the engine's resolved graph across every table.

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
- **One extreme value defeats `growToFit`.** A single 76-character wine name pushed the
  value column out of a 600px table with a horizontal scrollbar. Pin per-column widths via
  `objects.columnWidth` entries (`selector: {metadata: "entity.property"}`, value `<n>D`) —
  but only where needed: a 110px cap on a status column broke "weer op voorraad" over two
  lines in a table that fitted naturally.
- **Textbox pt-sizes need more height than the validator floor.** A 28pt title in 44px and
  a 26pt glyph in 42px both passed offline validation yet rendered scrollbars. Give pt-sized
  textboxes ~1.8× the point size in pixels, then screenshot.
- **`powerbi-desktop open` fails on the Store install** (`DESKTOP_EXE_NOT_FOUND` — the exe
  probe list misses WindowsApps packages). Launch via the file association instead:
  `Start-Process "<path>.pbip"`. `status`/`reload`/`screenshot` work normally once Desktop runs.
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
- Generate report JSON with a Node script and **commit it under `Reference/`** — the script
  is the source of truth and manual Desktop edits get folded back into it. Not the session
  scratchpad: that dies with the session, and with it the ability to fold anything back.
  (`Reference/gen_voorraad.js` is the first one; earlier pages lost their generators this way.)
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
- **The scraper's stock-page bug is FIXED (2026-08-20).** Root cause: the ERP inserted a
  "Safety stock" column in voorraad.php on ~2026-08-11 and the positional parser read
  one-column-shifted garbage for nine silent days — the euro-formatted Inkoopprijs slid
  into the voorraad cell and never parsed as int. The parser now resolves columns by
  header name and **raises** on a missing header (second reshuffle of this page; the next
  one fails loudly). Verified on dev: gereserveerd 334, in_bestelling 13.116 flessen,
  all 70 dbt checks green. Prod heals with the next scheduled scraper run. Note the PBI
  model no longer reads scraper stock (fct_voorraad is `_db`-sourced), so this matters for
  the gereserveerd/in_bestelling validation, not for any visual.
- **`gereserveerd` and `in_bestelling` are derived and validated (2026-08-20)** — the
  right-hand column of the Voorraad scope table is unblocked. What remains open is only
  the ERP page's draft-counting rule (we count sent POs; the page adds an inconsistent
  subset of unsent drafts — ask the ERP developer). See **Voorraad** above and
  `fct_voorraad_db`'s header in the Analytics repo for the validation numbers.
- **The mutation ledger has no opening balance.** Cumulative stock goes negative before
  2025-02 (82 of 83 products negative in 2024-10), and 3–32 products still carry negative
  running stock every month after. Stock history must start at 2025-02. `CO` itself is
  resolved — it is `Correctie`, with two unlabelled 2024-11 / 2025-01 backfills making up
  90% of its volume.
