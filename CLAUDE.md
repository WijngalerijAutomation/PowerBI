# Power BI project

One semantic model, several thin reports — one report per business stream.
More streams planned (Producten, Voorraad, Inkoop).

| Open this | Report folder | Contents |
|---|---|---|
| `Wijngalerij Klanten DEV.pbip` | `Wijngalerij Klanten DEV.Report` | Klantoverzicht · Klantdetail (desktop) · Klant algemeen · Page 1 (stray, empty) |
| `Wijngalerij CEO DEV.pbip` | `Wijngalerij CEO DEV.Report` | Scaffold only — proves the shared-model binding |

Model: `Wijngalerij Semantic Model DEV.SemanticModel`. All reports bind to it by
**relative** path in `definition.pbir` — keep it relative, never absolute.

`Klanten DEV.Report` is a pre-session snapshot, kept for reference — **never edit**
(its binding was normalised once, with explicit approval). It fails validation on a
pre-existing nested `selfFilter` defect; that is expected, not something to fix.

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
- **Desktop runs in a Parallels VM with limited RAM.** It has frozen several times, always
  after a batch of MCP model writes. Engine stays alive while the UI wedges — check with a
  DAX query before assuming data loss. Keep model writes in small batches.

## Working with Desktop — the two rules that matter

1. **Commit before every reload.** Desktop rewrites on-disk PBIR it has not ingested —
   it has flipped sorts, reset column widths, deleted filters, gutted a visual, and left a
   table querying the whole product catalogue. `git checkout` was the recovery every time.
2. **New model objects need a Desktop reopen**, not a reload, before the report layer can
   bind to them. A reload reports success and silently keeps the old visual, or renders
   "Something's wrong with one or more fields".

Order that avoids both: **model changes → user saves → write report files → reload →
verify → commit.** A blank screenshot straight after a reload is usually mid-render —
always retake once before believing it.

## Model shape

7 source tables (`dim_customer`, `dim_date`, `dim_product`, `fct_sales`, `fct_voorraad`,
`fct_klant`, `fct_klant_product`) plus `_Metingen` (measure home, no data) and
`TopN keuze` (disconnected parameter table). ~75 measures. Auto date/time is **off**.

Peildatum is `dim_date[snapshot_datum]` via `[Peildatum]` — never `TODAY()`. The model
reads **prod** despite the DEV name.

## Traps that have already cost time

- **`[Omzet 12m]` is `SUM(fct_voorraad[omzet_12m])`** — stock revenue, not customer
  revenue. It silently corrupted `[Brutomarge % 12m]` (2,7% instead of 51,1%). Renaming it
  would remove the hazard but the voorraad pages reference it.
- **Model culture is `en-US` and cannot be changed after creation.** Raw numeric measures
  render `1,234`. For Dutch output use label measures: `FORMAT(x, "€ #,##0", "nl-NL")`.
  Note `"0,0"` is a *grouping* format — use `"0.0"` for one decimal.
- **`tableEx` has only a `Values` role.** A dimension column plus measures in `Values`
  renders headers with no rows. Use `pivotTable` with the dimension in `Rows`.
- **`Start` and `Id` are reserved DAX keywords** — `VAR Start = …` does not compile.
- **PBIR resolves measures by their home table.** `SourceRef.Entity` must be the table the
  measure actually lives on, even though DAX never qualifies measure names. Wrong entity =
  "Something's wrong with one or more fields". The offline validator cannot catch this.
- **`RANKX` must rank over the same column the visual groups by**, or it returns rank 1 for
  every row.
- **Measure-based visual filters are grain-sensitive.** A filter built on
  `MIN(dim_date[datum])` returns 0 at a row grain that has no date in context. For row-level
  windows use a flag *column* (`dim_date[in_venster]`), which filters before grouping.
- **`fct_klant[klant_naam]` is not unique** — 774 customers share 759 names. Group on
  `fct_klant[klant_label]`, which appends the id only where names collide.
- **Conditional formatting does not work on `cardVisual`.** Use calculated hex columns fed
  into `fillCustom.fillColor` / `value.fontColor` via `Aggregation(Min)`; this works on
  `shape` too. Card heights need `render(fs) = ceil(fs × 1.5)`.

## Rules

- Commit before and after any batch of report edits.
- Never hand-edit the `.SemanticModel` folder — use the Modeling MCP.
- `.pbi/localSettings.json` and `.pbi/cache.abf` are gitignored but were committed before
  the rule existed, so they still churn. Do not add them to commits.
