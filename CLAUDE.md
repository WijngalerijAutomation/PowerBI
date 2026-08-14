# Power BI project

Active: "Wijngalerij Semantic Model DEV.pbip"
- Report: Wijngalerij Semantic Model DEV.Report
- Model:  Wijngalerij Semantic Model DEV.SemanticModel
- Pages:  Klantoverzicht, Klant (detail)

"Klanten DEV.Report" is a reference copy only — never edit.

## Environment gotchas
- Windows PowerShell 5.1: `Set-Content -Encoding utf8` writes a BOM,
  which breaks PBIR JSON parsing. Write with:
  [System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding $false))
- Validate: powerbi-report-author validate "<path>"  — positional arg, not --path
- developer.microsoft.com unreachable: schema validation is skipped,
  structural checks only.
- Bridge: powerbi-desktop status | reload | screenshot

## Model shape
7 visible tables: dim_customer, dim_date, dim_product,
fct_sales, fct_voorraad, fct_klant, fct_klant_product. 44 measures.
Auto date/time is ON — 16 hidden LocalDateTable_* tables, candidate for removal.

## Rules
- Commit before and after any batch of report edits.
- Never hand-edit the .SemanticModel folder — use the Modeling MCP.MCP.