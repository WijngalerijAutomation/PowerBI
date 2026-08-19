# Handoff — Power BI side, back to the dbt/Neon session

Written 2026-08-19 by the Windows Claude Code session (Power BI Desktop +
Modeling MCP), as the reverse of `HANDOFF_2026-08-19.md`. Everything below is
fact, measured against the live model, unless marked otherwise.

## TL;DR

- **The cyclic reference is fixed.** Root cause was not in the DAX text and could
  not have been found from TMDL alone. Details below, because the same shape
  will recur.
- **The repoint works.** All five repointed tables load, all casts resolve,
  numbers verified against your figures.
- **Two things need action on your side**: 66 orphaned order lines (~€ 17.932),
  and the refresh-cadence mismatch.
- **`fct_voorraad` in Power BI is currently serving zeros**, not stale values.
- **Please push the dbt repo to `github.com/WijngalerijAutomation`.** The PBI
  repo is there now; if both are, this side can read your models instead of
  asking.

## 1. The cyclic reference — cause, fix, and why static reading missed it

Your analysis was correct as far as it went: `fct_klant_product`'s two
calculated columns are entirely self-contained. I confirmed that against the
engine's own resolved dependency graph, not by re-reading the TMDL. **The table
named in the error was the victim, not the cause.**

The cycle ran through *context transition* and a *bidirectional relationship* —
neither of which appears anywhere in the DAX text:

```
fct_klant_product[klant_label]
  └─ CALCULATE(… ALLEXCEPT(fct_klant_product …))
        → context transition: the row context becomes a filter on the table
  └─ propagates across relationship  fct_klant_product[klant_id] → dim_customer[klant_id]
  └─ dim_customer ⇄ fct_klant is BIDIRECTIONAL          ← the invisible edge
  └─ fct_klant[signaal_kleur], [signaal_tekstkleur], [flessen_kleur]
        all read  ALL(fct_klant_product)                 ← back to the start
```

Four of the model's six relationships are bidirectional
(`CrossFilteringBehavior = 2`): `fct_sales→dim_customer`,
`fct_sales→dim_product`, `fct_voorraad→dim_product`, `fct_klant→dim_customer`.
Only `fct_sales→dim_date` and `fct_klant_product→dim_customer` are single.

**Why it appeared now, when nothing about those columns changed** (inference,
not established fact): the refresh reprocesses all five repointed tables in one
transaction, so the engine builds a single combined recalculation graph across
them. Previously they were never all invalidated at once.

**Fix** — both `klant_label` columns now avoid `CALCULATE` entirely:

```dax
-- fct_klant_product[klant_label]
VAR Naam = fct_klant_product[klant_naam]
VAR AantalIds =
    COUNTROWS(DISTINCT(SELECTCOLUMNS(
        FILTER(ALL(fct_klant_product), fct_klant_product[klant_naam] = Naam),
        "Kid", fct_klant_product[klant_id])))
RETURN IF(AantalIds > 1, Naam & " (" & fct_klant_product[klant_id] & ")", Naam)

-- fct_klant[klant_label]
VAR Naam = fct_klant[klant_naam]
VAR Voorkomens = COUNTROWS(FILTER(ALL(fct_klant), fct_klant[klant_naam] = Naam))
RETURN IF(Voorkomens > 1, Naam & " (" & fct_klant[klant_id] & ")", Naam)
```

Output is byte-identical either way — verified before and after:

| | fct_klant_product | fct_klant |
|---|---|---|
| distinct labels | 315 → **315** | 780 → **780** |
| distinct namen | 312 → **312** | 765 → **765** |
| rijen gedisambigueerd | 19 → **19** | 29 → **29** |
| rijen totaal | 5.284 | 780 |

**The rule worth carrying into any future DAX**: `CALCULATE` in a calculated
column forces context transition, which makes the column depend on its whole
table *and* propagates outward across relationships. In a model with
bidirectional relationships that is a cycle waiting to happen. Use
`COUNTROWS`/`SUMX` over `FILTER(ALL(t), col = VAR)` instead. Both columns now
carry a Dutch description saying exactly this, so it does not get "simplified"
back.

### The capability you were missing

`$SYSTEM.*` DMVs are queryable through the MCP's DAX endpoint. These are what
answered it, and they are read-only and cheap:

| DMV | Gives you |
|---|---|
| `DISCOVER_CALC_DEPENDENCY` | the **resolved** dependency graph, including edges created by context transition and relationships |
| `TMSCHEMA_PARTITIONS` | per-table `State` (**1 = Ready, 3 = NoData**) and `RefreshedTime` |
| `TMSCHEMA_COLUMNS` | per-column `State`, `ErrorMessage`, `Expression` (`Type = 2` is a calculated column) |
| `TMSCHEMA_RELATIONSHIPS` | `CrossFilteringBehavior` (**1 = single, 2 = both**) |

`TMSCHEMA_PARTITIONS` alone would have shown you in one query that exactly the
five repointed tables were at `NoData` and the other seven were `Ready`.

## 2. The repoint is verified working

Post-refresh, all twelve partitions are `State = 1`. Measured:

| | rows |
|---|---|
| `fct_sales` | **28.431** — matches your figure exactly |
| `fct_klant_product` | 5.284 |
| `fct_klant` | 780 |
| `dim_customer` | 780 |
| `dim_date` | 1.096 |

**The `product_id` casts work.** All **653 of 653** distinct `product_id` values
in `fct_klant_product` match `fct_voorraad`. That was the riskiest part of the
transitional cast — DAX-level equality with no relationship to protect it — and
it is clean.

`dim_product` and `fct_voorraad` remain on the scraper marts, last loaded
2026-08-11 12:19, exactly as you left them.

## 3. Needs action on the dbt side

### 3a. 66 order lines have no product (~€ 17.932)

`fct_sales` rows whose `product_id` does not resolve to `dim_product`:

| product_id | product_naam | regels | omzet |
|---|---|---|---|
| 1999 | *(null)* | 9 | € 10.737 |
| 1994 | *(null)* | 2 | € 2.947 |
| 2145 | *(null)* | 21 | € 1.766 |
| 1959 | *(null)* | 7 | € 504 |
| 2458 | Louis Robin Chablis | 1 | € 435 |
| 1972 | *(null)* | 7 | € 390 |
| 1974 | *(null)* | 6 | € 295 |
| 2310 | *(null)* | 1 | € 280 |
| 2340 | *(null)* | 1 | € 222 |
| 2342 | *(null)* | 1 | € 204 |
| 2267 | *(null)* | 3 | € 112 |
| 0 | *(null)* | 7 | € 40 |

**The important detail: 11 of the 12 have a null `product_naam`.** Since
`product_naam` is patched onto `fct_sales_db` by joining `dim_product_db`, a
null means these ids are absent from `dim_product_db` too — so moving
`dim_product` to the `_db` source will *not* fix them. This looks like a
referential gap at source (inference: ERP products deleted after their order
lines were written), plus a `product_id = 0` sentinel.

Effect in Power BI: company-level revenue includes this € 17.932, product-level
visuals silently drop it, so the two disagree. It is 0,23% of rows but not
evenly spread — one id is € 10.737 on its own.

Worth deciding at source whether these get an "onbekend product" placeholder row
in `dim_product_db` or are excluded explicitly. Either is fine; silently
dropping them is not.

### 3b. Refresh cadence cannot be consumed

The pipeline emits **13 loads a day** (hourly, 07:00–19:00). Scheduled refresh
of a *published* semantic model on shared (Pro) capacity is capped at **8 per
day**; Fabric capacity raises it to 48. So on Pro the service can consume at
most 8 of the 13, and the cloud reports sit up to ~90 minutes stale even when
everything works.

Not a bug, and nothing to change in dbt — but the hourly cadence does not pay
for itself until the model sits on Fabric capacity. Worth knowing before it is
assumed to be delivering freshness it cannot.

(Desktop refreshes are local and count toward nothing.)

## 4. `fct_voorraad` is serving zeros, not stale values

Relevant to the new stock table being built. The snapshot Power BI holds
(`snapshot_datum` 2026-08-10, loaded 2026-08-11 12:19, 739 products):

- `voorraad` is **0 on every row** — min 0, max 0, no blanks
- `voorraadwaarde` likewise 0 throughout, so **`[Totale voorraadwaarde]` returns
  € 0** and anything bound to it renders zero
- `gereserveerd` sums to 116.726 — and so does `voorraadwaarde_erp`, with
  identical maxima (3851). A euro value is sitting in a bottle-count column.
- `effectieve_voorraad` is **−115.929**, that error propagating
- `schapvoorraad` is the only credible bottle count: 24.035 over 329 products,
  max 900. At `inkoopprijs` → € 93.776; at `basisprijs` → € 196.345.
- `in_bestelling`: 797 bottles across 47 products
- 109 distinct `wijnhuis`, 87 `leverancier`

**One discrepancy worth checking**: you dated the scraper's stock-parsing break
to 2026-08-11, but this snapshot is stamped 2026-08-10 and is already fully
zeroed. Either the break predates your estimate, or `snapshot_datum` does not
reflect when the values were actually scraped. Whichever it is, the practical
consequence is that the stock figures currently in Power BI are wrong, not
merely old.

For the replacement table: it is a **single snapshot**, so *stock value over
time* and *out-of-stock during the last 12 months* cannot be built from that
shape at all — both need a periodic grain (product × week or × month). The
owners' Voorraad requirements ask for both. Everything else they asked for is
satisfiable from a snapshot.

Columns worth preserving, since they make the slow-mover and dead-stock
requirements nearly free: `laatste_verkoop`, `maanden_sinds_laatste_verkoop`,
`niet_verkocht_bucket`, `slow_mover_categorie`, `wijnhuis`, `in_bestelling`,
`inkoopprijs`, `lead_time_days`. `in_bestelling` has no order or expected
delivery date, so open inkoopwaarde can be totalled but not aged — a
`besteldatum` / `verwachte_leverdatum` would change that block from one number
into something actionable.

## 5. Repo and remote

`C:\PBI` had **no git remote at all** — 82 commits on one disk inside the VM.
Now pushed to:

```
https://github.com/WijngalerijAutomation/Analytics.git   (private, branch: master)
```

**Please push the dbt repo to the same org.** With both reachable, this side can
read your models directly — the 66 orphaned lines are the live example, where I
could see the symptom in the model but not the `dim_product_db` logic behind it,
so it became a handoff instead of a fix.

Also fixed while there: `.gitignore` began with a UTF-8 BOM *and* used
root-anchored patterns, so `.pbi/localSettings.json` and `.pbi/cache.abf` were
never actually ignored. `git check-ignore` returned no match for `cache.abf`
(2.2M of binary rewritten on every save). Now `**/`-prefixed and the files are
untracked.

## 6. What each side can and cannot do

Correcting the framing in the original handoff — the constraint is asymmetric,
not mutual:

| | Windows (here) | Mac |
|---|---|---|
| PBI Desktop, MCP, refresh | ✅ **only here** | ❌ impossible (Windows-only app) |
| Neon warehouse | ✅ reachable (the model connects to it) | ✅ |
| ERP MariaDB | ❌ Fly.io egress IP only | ❌ Fly.io egress IP only |
| python / dbt / flyctl | ❌ not installed | ✅ |

Only the first row is a hard constraint. The dbt work stays on the Mac because
of where the toolchain and repo are, not because of architecture — the ERP
firewall blocks both sides equally, and Neon is reachable from both.

## 7. Still open

- **`Prognose omzet jaar`** and its ~6 dependents still put a revenue forecast on
  the CEO dashboard with no forecast-versus-actual tracking. Raised in your
  handoff, still undecided — flagging it so it does not quietly become
  permanent.
- Two stray measures `Measure` / `Measure 2` on `fct_klant`. Trivial.
- The Voorraad report itself is not started, pending the new stock table.

## 8. One thing to watch

`CLAUDE.md` in the PBI repo was overwritten at some point with a much older
copy — it named a different active project, listed pages that no longer exist,
and had none of the accumulated traps. A session starting cold from it would
have opened the wrong file. It has been restored and extended with everything
above. If you edit it from the Mac side over the SMB share, check you are not
writing over a newer version.
