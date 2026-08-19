# Power BI project — Wijngalerij

## Active project
`Wijngalerij Semantic Model DEV.pbip`
- Report: `Wijngalerij Semantic Model DEV.Report`
- Model:  `Wijngalerij Semantic Model DEV.SemanticModel`
- Pages:  `Klantoverzicht` (5aef0f115cceba800015), `Klant (detail)` (aac5e5fb0e05ee5a00eb)

`Klanten DEV.Report` / `Klanten DEV.pbip` is a REFERENCE COPY ONLY.
It is a thin report from the service with no local model. Never edit it.
The current report pages were transplanted out of it.

## Environment gotchas

### BOM breaks PBIR (subtle, will waste your time)
Windows PowerShell 5.1 writes UTF-8 WITH BOM for both of these:
  Set-Content -Encoding utf8
  Out-File -Encoding utf8
The BOM makes PBIR JSON fail to parse with:
  "Unexpected token '?', ...is not valid JSON"
Always write JSON with:
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding $false))

### Validator syntax
Path is POSITIONAL, not a flag. `--path` is rejected.
  powerbi-report-author validate "C:\PBI\Wijngalerij Semantic Model DEV.Report"
Options: --format json|text, --no-schema

### Schema fetches are blocked
developer.microsoft.com is unreachable from this VM, so every
visualContainer and mobile.json schema check is SKIPPED.
A clean validate result means structural checks passed only —
it is NOT proof of schema conformance. Desktop opening is the stronger signal.

### Desktop Bridge
  powerbi-desktop status | reload | screenshot
- Power BI Desktop must stay open with the .pbip loaded.
- `hasUnsavedChanges: true` reads true from the moment a project opens. Ignore it.
- The AS port changes on every Desktop restart — rediscover, never hardcode.
- One operation at a time per process; a timeout usually means "still loading", so retry.

### npm
npm 12 blocks postinstall scripts by default. Global installs that need them:
  npm install -g --allow-scripts=<pkg> <pkg>

## Model shape
7 visible tables: dim_customer, dim_date, dim_product,
fct_sales, fct_voorraad, fct_klant, fct_klant_product. 44 measures.

Known cleanup candidates (do not action without asking):
- Auto date/time is ON: 16 hidden LocalDateTable_* tables + template, redundant
  because dim_date already exists.
- `fct_klant` contains measures literally named `Measure` and `Measure 2`.
- Page folder `df62499a25a1ed09b7b7` exists on disk but is not in pageOrder,
  so Desktop ignores it. Identify before adding or deleting.
- Two duplicate filter names across visuals on the Klant (detail) page
  (5b86367f212cdbee328e, fe96a222e28476661186) — artifacts of the transplant.

## Rules
- Commit before AND after any batch of report edits. There is no undo.
- Never hand-edit anything under .SemanticModel — use the Modeling MCP.
- Run `powerbi-report-author validate` before reloading Desktop.
- Report changes go in .Report; model changes go through the MCP. They are
  separate layers and the MCP never touches report pages.