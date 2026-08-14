# Power BI — klantdetail, desktopvariant naar de mockup

A second layout of the same page as `powerbi_klantdetail.md`, built to a supplied
desktop mockup. **That document is unchanged and still governs the phone
layout** — model setup, relationship rules and the slicer argument all live there
and are not repeated in full here. Read §0 and §1 of it first; this document
assumes them.

What is different: the phone spec is six stacked blocks optimised for one hand on
a train. This one is a wide canvas with a narrative banner, a year-on-year chart
and a single combined wine table. Same measures where they overlap, same marts,
same counting rules.

## 0. Read this before you build anything

> **Geen acties in deze paragraaf**, op één na: richt het model op **prod /
> `main`**, niet op `dev`. De rest is context — welke cijfers in de mockup
> kloppen en welke niet. Sla het over als je wilt bouwen, en kom terug zodra een
> getal op je scherm niet overeenkomt met de mockup.

The mockup was drawn from **real data** — Beachclub C exists, and several figures
on it are exact. Several others are illustrative. Knowing which is which is the
difference between a page that reconciles and a page that quietly does not.

Verified against **`main` (prod)** on 2026-08-11, peildatum **2026-08-10**. Prod
is what Power BI reads; `dev` currently carries an older snapshot (peildatum
2026-08-05) and gives slightly different growth figures. Check against prod.

| Mockup says | Mart says | Verdict |
|---|---|---|
| Beachclub C · Horeca · Noordwijk · Dennis | identical | ✅ exact |
| Omzet 12 mnd € 43.565 | `omzet_12m` = 43565 | ✅ exact |
| Omzet YTD € 22.067 | 22067 | ✅ exact |
| ↘ 32% vs. vorig jaar | `omzet_groei_yoy_pct` = −0,3216 | ✅ exact |
| Actief: € 35.878 · 5.720 fl. | 35878 · 5720 | ✅ exact |
| Gestopt: 278 fl. | `flessen_vorige_12m` = 278 | ✅ exact |
| Amie Rosé 599 fl · € 4.439 | identical | ✅ exact |
| Cantina Tollo Gufo 288 fl · € 1.359 | identical | ✅ exact |
| Whispering Angel · Gestopt mei 25 · 42 fl | 42 fl, laatste order 2025-05-06 | ✅ exact |
| Ruinart · Gestopt aug 25 · 24 fl | 24 fl, laatste order 2025-08-18 | ✅ exact |
| **Orders 12 mnd: 121** | 121 is the **all-time** order count. 12m = **62** | ❌ wrong window |
| **gem. € 360** | 43565 ÷ 121 (all-time orders). 12m = **€ 703** | ❌ follows from the above |
| **2,3 per maand** | 62 ÷ 12 = **5,2 per maand** | ❌ follows from the above |
| **Flessen 12 mnd 5.720** | 5.720 is `actief` only. Customer total = **6.869** | ❌ portfolio subtotal, not the customer |
| **↘ 1.940 minder dan vorig jaar** | prior 12m = 5.814, so bottles are **up 1.055** | ❌ wrong sign |
| **Actief 24 wijnen** | 21 | ❌ |
| **Gestopt 7 wijnen · € 9.840** | 22 wijnen · € 4.485 | ❌ |
| **Kans 6 wijnen · € 6.200 potentieel** | 18 wijnen; no potential figure exists | ❌ |
| **63% van jaardoel € 35.000** | no target data anywhere in the warehouse | ❌ blocked |
| **"grootste verlies zit in rosé en champagne"** | no grape/type/category in `dim_product` | ❌ blocked |
| **Actiepunten (3 bullets)** | no visit data, no substitution mart | ❌ blocked |
| **Whispering Angel € 3.120 / Ruinart € 2.280** | € 706 / € 1.490 (prior 12m) | ❌ |

Do not treat the mockup's numbers as acceptance criteria. Build the page, then
check it against the **Mart says** column.

### The contradiction hiding in the mockup

The banner says revenue is **falling 32%**. Over the same period the chart shows
twelve months of bars, and those bars sum to **more** than the year before:
€ 43.565 against € 39.577, up 10%.

Both are true. `omzet_groei_yoy_pct` is the **last six months against the same
six months a year earlier** (€ 18.827 vs € 27.753 = −32,2%). The chart is
**twelve months against twelve months**. Beachclub C had a strong autumn and a
weak spring, so the two windows disagree in sign.

This is not a bug to fix — it is the reason the growth measure was moved to
year-on-year in the first place (see `powerbi_klantdetail.md`, "The growth card
is year-on-year"). But a banner reading *"Omzet daalt 32%"* directly above a
chart that visibly rises is the sort of thing that costs the page its
credibility in a meeting.

**Therefore: the banner must name its window.** Not "32% JoJ" but "de laatste
zes maanden tegenover dezelfde zes maanden vorig jaar". §4 does this.

### The other thing to know before you start

`omzet_groei_yoy_pct` is **NULL for 686 of 774 customers** — only 88 clear the
€ 500 floor in the year-earlier window. So on a randomly picked customer the two
loudest elements in this design, the banner and the ↘ delta, are **both empty**.

The layout has to look deliberate when they are. §4 and §5 specify the empty
states; do not skip them and discover this on a demo.

## Hoe dit document te lezen

Two kinds of text, and they are now visually separated because mixing them made
this unusable as a build sheet:

> **DOEN** — a box like this is a thing you click, type or tick. Every action in
> the document appears in one, and nowhere else.

Everything outside a DOEN box is **why**: what the figure means, what it
reconciles against, and what breaks if you do it differently. Skip it on the
first pass and come back when something does not add up.

The master list below is every action in order. Each line names the section
that explains it.

## DOEN — de complete checklist

### A. Voorbereiding (§1–§2)

- [ ] Wijs het semantic model naar **prod / `main`**, niet naar `dev` — §0, punt 0
- [ ] Ververs het **schema** van het model zodat `omzet_vorige_12m` verschijnt
      (Manage tables → vink de kolom aan → Save). Een dataverversing is niet
      genoeg — §1
- [ ] Maak de relatie `fct_klant_product[klant_id]` → `dim_customer[klant_id]`,
      veel-op-één, enkele richting — §2
- [ ] Maak **géén** relatie `fct_klant_product[product_id]` → `dim_product` — §2
- [ ] Markeer `dim_date` als datumtabel — §2
- [ ] Zet `Summarize by = None` op `omzet_vorige_12m` — §2
- [ ] Voeg `dim_date[snapshot_datum]` toe aan het model, auto date/time **uit** — §2
- [ ] Kijk na wélke `Gem. orderwaarde` in dit model bestaat, en maak geen derde — §2

### B. Metingen aanmaken (§3) — 30 stuks, vóór je één visual plaatst

- [ ] 3 anker-metingen: `Peildatum`, `Laadtijd`, `Actualiteit label` — §3.1
- [ ] 5 venstermetingen over `fct_sales` — §3.2
- [ ] 4 afgeleide KPI-metingen — §3.3
- [ ] 9 portfolio-metingen — §3.4
- [ ] 9 label-metingen — §3.5
- [ ] 1 risicovlag — §3.6
- [ ] 3 banner-metingen (`Signaal` + 2 kleuren) — §3.7
- [ ] 4 tabel-metingen — §3.8
- [ ] 3 kolomlabels voor de portfolio-tegels — §9
- [ ] 1 asfilter `In laatste 12 maanden` — §8.1
- [ ] 1 knop-URL `Pierre verkoopadvies` — §11.1
- [ ] Controle: `[Omzet 12m rollend]` = `[Omzet 12m]` = **€ 43.565** op Beachclub C

### C. Canvas (§4)

- [ ] Canvas settings → Custom, **1280 × 1400**
- [ ] View → **Actual size** (niet Fit to page)
- [ ] Canvasachtergrond `#FFFFFF`

### D. Visuals plaatsen (§5–§11), in deze volgorde

- [ ] Slicer op `dim_customer[klant_naam]` — dropdown, zoeken aan, enkelvoudig — §5
- [ ] Kopregel: eyebrow, naam, 2 badges, subregel — §5
- [ ] Laatste order, rechts uitgelijnd — §5
- [ ] Signaalbanner — §6
- [ ] 4 KPI-tegels — §7
- [ ] Omzet per maand (lijn + gegroepeerde kolom) — §8
- [ ] Kop "Wijnportfolio" + 3 tegels — §9
- [ ] Wijnentabel met statuskleuren — §10
- [ ] Actiepunten + knop naar Pierre — §11

### E. Afronden (§13)

- [ ] Loop de 25 controles langs met **Beachclub C** geselecteerd — §13
- [ ] Test één klant **zonder** JoJ-basis (686 van de 774) op lege staten — §13
- [ ] Controleer dat er **geen datumslicer** op de pagina staat — §13
- [ ] **Sla op met een klant geselecteerd** — §13

### Wat je NIET kunt bouwen (§12) — hier geen tijd aan verliezen

- Jaardoel / voortgangsbalk — geen doelendata in het warehouse
- "rosé en champagne" — geen druif of categorie in `dim_product`
- Actiepunten als tekst — geen bezoekhistorie, geen substitutiemart

## 1. New mart column (already applied)

> **DOEN** — één actie
>
> - [ ] Ververs het **schema** van het semantic model: open het model →
>       **Transform data / Manage tables** → vink `omzet_vorige_12m` aan op
>       `fct_klant_product` → Save.
>
> De dbt-kant is al klaar en staat op prod. Maar een **dataverversing voegt geen
> kolom toe** — alleen een schemaverversing doet dat. Sla je dit over, dan
> falen alle metingen in §3.4 en §3.8 met *field not found*.

`fct_klant_product` gained **`omzet_vorige_12m`** — revenue in the 12 months
before the current 12, mirroring the existing `flessen_vorige_12m`.

It exists because the mockup's wine table shows a stopped wine *with a revenue
figure*, and a stopped wine's `omzet_12m` is near zero by construction. Without
it, every `gestopt` row sorts to the bottom of a revenue sort at €0 — which is
exactly backwards, since the biggest lost wine is the most interesting row on
the page.

Built on `dev` and `prod` on 2026-08-11, 5.087 rows on prod, 9 tests green.

Business-wide totals on prod, for orientation:

| regelstatus | rijen | omzet_12m | omzet_vorige_12m |
|---|---|---|---|
| actief | 2.404 | € 1.440.535 | € 503.111 |
| gestopt | 863 | € 186.892 | € 422.751 |
| incidenteel | 1.396 | € 33.727 | € 115.367 |
| kans | 424 | € 0 | € 17.125 |

Two caveats that belong on any figure taken from it:

- **Order history starts 2024-10-02.** At the current peildatum the 12–24 month
  window is only partly covered, so `omzet_vorige_12m` is a **floor**, not a
  full year. It grows more accurate every month.
- **`gestopt` does not mean zero recent revenue.** The status trips at 182 days
  of silence, so a wine last bought 200 days ago is `gestopt` *and* still carries
  € 186.892 of `omzet_12m` business-wide. Beachclub C's Ruinart is exactly this
  case: `gestopt · aug 25`, and still € 373 of revenue inside the current twelve
  months. Do not describe `omzet_12m` on a gestopt row as "should be zero".

**After the next `dbt build` you must refresh the Power BI semantic model before
the new column appears.** A new column does not arrive through a data refresh —
it arrives when the model's schema is refreshed. In the browser: open the
semantic model → **Transform data / Manage tables** → tick `omzet_vorige_12m` on
`fct_klant_product` → Save. If you skip this, every measure in §3 that references
it fails with *field not found*.

## 2. Model setup

> **DOEN**
>
> - [ ] Relatie `fct_klant_product[klant_id]` → `dim_customer[klant_id]`, veel-op-één, enkele richting
> - [ ] **Geen** relatie `fct_klant_product[product_id]` → `dim_product[product_id]`
> - [ ] Verwijder auto-gedetecteerde relaties `fct_klant_product` ↔ `fct_klant` / `fct_sales`, en `fct_klant` ↔ `fct_sales`
> - [ ] `dim_date` markeren als datumtabel
> - [ ] Auto date/time uit voor alle datumkolommen
> - [ ] `Summarize by = None` op `omzet_vorige_12m`
> - [ ] `dim_date[snapshot_datum]` aanvinken in Manage tables, auto date/time uit
> - [ ] Kijk na welke `Gem. orderwaarde` bestaat — maak er geen tweede
>
> De rest van deze paragraaf legt uit waaróm, plus hoe je de kalenderdekking
> controleert. Niets daarvan is een actie behalve de dbt-test, die vanzelf
> meeloopt.

Everything in `powerbi_klantdetail.md` §0 applies unchanged. In particular:

- exactly one new relationship, `fct_klant_product[klant_id]` → `dim_customer[klant_id]`, many-to-one, single direction
- **no** `fct_klant_product[product_id]` → `dim_product[product_id]`
- `dim_date` **marked as a date table**
- auto date/time **off**

Two additions for this page.

**`Summarization = None` on `omzet_vorige_12m`.** Same reason as the other eight
columns already listed. Model view → select the column → Properties →
Advanced → Summarize by = None.

**Auto date/time off for `dim_date[snapshot_datum]`.** §3.1 anchors every window
on it, and Power BI's automatic date hierarchy would otherwise build a hidden
date table against a column holding one distinct value across 1.096 rows. The
original doc already turns auto date/time off for three date columns; this is a
fourth. If `snapshot_datum` is not in the model at all, tick it in
**Manage tables** — it is generated by `dim_date.sql` but carries no dbt
description, so it is easy to miss when picking columns.

**Check the `dim_date` range covers 24 months before peildatum.** This page's
prior-window measures read back to 2024-08. `DATESBETWEEN` does not error when
its range runs off the end of the date table — it silently returns the part that
exists, so the failure is a prior-year figure that is quietly too small, on a
page whose whole job is comparing this year with last.

Today it passes with 222 days to spare:

| | |
|---|---|
| `dim_date` eerste dag | 2024-01-01 |
| peildatum | 2026-08-10 |
| nodig vanaf | 2024-08-10 |
| marge | **222 dagen** |

### How to check it — three levels

**1. In dbt, which is where it now lives.** `assert_dim_date_dekt_vorige_vensters`
runs with every `dbt build`. Nothing to remember:

```
python scripts/dbt_env.py --target prod test --select assert_dim_date_dekt_vorige_vensters
```

**2. Ad hoc, straight against the warehouse:**

```sql
with d as (select min(datum) eerste from marts.dim_date),
     p as (select max(order_datum) peildatum from marts.fct_sales)
select d.eerste,
       p.peildatum,
       (p.peildatum - interval '24 months')::date            as nodig_vanaf,
       d.eerste <= (p.peildatum - interval '24 months')::date as dekt_24m,
       (p.peildatum - interval '24 months')::date - d.eerste  as marge_dagen
from d cross join p;
```

**3. In Power BI**, which is the one that actually matters — the model can be a
stale import of a warehouse that is fine. Drop this on a card while building:

```dax
Kalenderdekking =
VAR Eerste = CALCULATE(MIN(dim_date[datum]), ALL(dim_date))
VAR Nodig  = EDATE([Peildatum], -24)
RETURN
    IF(Eerste <= Nodig,
        "OK · " & FORMAT(INT(Nodig - Eerste), "#,##0", "nl-NL") & " dagen marge",
        "TE KORT · kalender begint " & FORMAT(INT(Eerste - Nodig), "#,##0", "nl-NL")
        & " dagen te laat — vorige-jaar cijfers zijn afgekapt")
```

Delete it once the page is finished; the dbt test is the durable version.

### The failure mode is not what it looks like

`dim_date`'s floor is `date_trunc('year', min(order_datum))` — **1 January of
the year of the oldest order**, not anything derived from the newest. Since
peildatum only ever moves forward, `peildatum − 24 months` moves forward with
it and **the margin grows**. The snapshot advancing cannot break this.

What breaks it is the **history floor moving forward**: a load that lands only
recent orders, a truncated backfill, a seed that replaces rather than extends.
Then `min(order_datum)` jumps a year, `dim_date`'s first row jumps with it, and
every prior-window measure downstream shortens without a single error anywhere.
Not hypothetical — `--orders-seed-from` exists, and a `replace` write
disposition is one flag away from that shape.

Simulated against the live peildatum, to confirm the test fires rather than just
staying green:

| `dim_date` vloer | resultaat |
|---|---|
| 2024-01-01 (nu) | PASS |
| 2024-08-10 (precies genoeg) | PASS |
| 2024-08-11 | FAIL — 1 dag tekort |
| 2025-01-01 (historie afgekapt) | FAIL — 144 dagen tekort |

**This says nothing about whether the orders go back 24 months.** They do not —
history starts 2024-10-02, which is why `omzet_vorige_12m` is documented as a
floor rather than a full year. The test checks only that the *calendar* is not
the thing truncating them.

### Name collision warning

This semantic model already contains **two different measures called
`Gem. orderwaarde`** — one in `powerbi_klantrapport.md` §1 (`fct_klant`,
all-time) and one in `powerbi_sales_dashboard.md` §2 (`fct_sales`, date-context).
Power BI has one namespace per model, so only one of them actually exists;
whichever was created second either failed or overwrote the first.

**Check which one you have before using it, and do not add a third.** Every new
measure below is named so it cannot collide: the ones that mean "12 months back
from peildatum" all carry the suffix **`12m rollend`**.

## 3. All measures, in build order

> **DOEN**
>
> Maak alle metingen in §3.1 t/m §3.8 aan **voordat je één visual plaatst**.
> Elk codeblok hieronder is één meting; kopieer per stuk.
>
> - [ ] §3.1 anker — 3 metingen
> - [ ] §3.2 vensters — 5
> - [ ] §3.3 afgeleid — 4
> - [ ] §3.4 portfolio — 9
> - [ ] §3.5 labels — 9
> - [ ] §3.6 risicovlag — 1
> - [ ] §3.7 banner — 3
> - [ ] §3.8 tabel — 4
>
> Aanmaken gaat zo: **Open data model** → tabel kiezen in het Data-paneel →
> **New measure** → plakken → bevestigen. De tabel waarop je hem maakt is
> alleen ordening; metingen zijn modelbreed.

Create these in the semantic model **before** placing any visual. Copy the whole
block; each is a separate measure.

Existing measures reused without change: `[Omzet]`, `[Omzet 12m]`,
`[Omzet 12m label]`, `[Omzet YTD]`, `[Omzet YTD label]`, `[Omzet groei JoJ]`,
`[Omzet groei JoJ label]`.

### 3.1 The anchor

Everything on this page is measured from the snapshot, never from today.

```dax
Peildatum = CALCULATE(MAX(dim_date[snapshot_datum]), ALL(dim_date))
```

#### The column already exists — so when do you need the measure?

Four times over, in fact. The snapshot date is denormalised onto every mart,
and all four copies agree (verified on prod, 2026-08-10):

| Kolom | Rijen | Distinct waarden |
|---|---|---|
| `dim_date[snapshot_datum]` | 1.096 | 1 |
| `fct_klant[peildatum]` | 774 | 1 |
| `fct_klant_product[peildatum]` | 5.087 | 1 |
| `fct_voorraad[snapshot_datum]` | 739 | 1 |

**To show the date, use the column. Do not write a measure.** Drop
`fct_klant[peildatum]` on a card with `Summarize by = None` and you are done —
that is what §2 already asks you to set, and §5's footer needs nothing more.

**To compute with the date, you need an aggregation**, because a bare column
reference is not a scalar inside a measure — `VAR Eind = fct_klant[peildatum]`
does not compile, there being no row context. So the real choice is not
*measure vs. column*; it is *one named measure* versus repeating
`MAX(fct_klant[peildatum])` inline in the eight window measures below.

The measure earns its place on three modest grounds, and it is fair to call
them modest: one definition instead of eight, one place for the filter guard,
and one edit if the anchor ever has to move. If you would rather inline it, do
— but then read the guard note below, because inlining it on `fct_klant` is the
version that can go blank.

#### Why `dim_date` and not `fct_klant`

**Corrected after checking the model.** The first version of this measure read
`CALCULATE(MAX(fct_klant[peildatum]), ALL(fct_klant))`, which works but needs
its guard to do so. `dim_date` is the better anchor, and by model design rather
than by defensive DAX:

- `fct_klant ↔ dim_customer` is **one-to-one, so Power BI forces it to
  cross-filter both ways**. Selecting a customer filters `fct_klant` to one
  row — and to *no* rows for any customer present in `dim_customer` and absent
  from `fct_klant`. `MAX` over nothing is BLANK. Hence the `ALL(fct_klant)`.
- `dim_date` is never filtered by the customer slicer at all. Filters travel
  from the one-side to the many-side, so `dim_customer → fct_sales` and
  `dim_date → fct_sales` both propagate, but `fct_sales` propagates to neither.
  There is no path from the slicer to `dim_date`.

So on `dim_date` the anchor is constant no matter who is selected, and
`snapshot_datum` sits on all 1.096 rows rather than on a table that a filter can
empty. `ALL(dim_date)` stays anyway, for one reason only: it makes the anchor
survive a date slicer. §7 forbids one on this page — but a measure that quietly
depends on a rule somebody else has to remember is worth one function call.

#### What goes wrong without the guard

Worth knowing because the symptom is silence, not an error.

BLANK propagates as zero into date arithmetic, and DAX's date epoch is
**30 December 1899**. So `EDATE([Peildatum], -12)` lands in 1898, every
`DATESBETWEEN` asks `dim_date` for a range it does not contain, and the page
returns **blank figures with no error anywhere** — KPI tiles, chart and
portfolio all empty at once, for one customer, on a page that works perfectly
for the other 773.

#### Where to create it

Semantic model in the browser → **Open data model** → select a table in the Data
pane → **New measure** (right-click the table, or the Home ribbon) → paste into
the formula bar → commit with the tick.

The table you create it on is its **home table** — purely organisational, since
measures are model-wide and DAX never qualifies them with a table name. It does
not have to match the table the measure reads, and nothing breaks if it does
not; it only decides where the next person finds it.

With ~25 new measures from this page landing in a model that already holds the
klantrapport and sales-dashboard sets, consider a dedicated empty table (often
called `_Metingen`) as the home for all of them, so the Data pane does not
become a hunt. Cosmetic, but the alternative is measures scattered across four
fact tables in one flat namespace.

#### `Peildatum` is NOT the refresh time

This is the most likely thing to get wrong on the whole page, because "the
snapshot date" sounds like "when the data was last pulled". They are different
dates, and on this platform there are in fact **three**:

| Wat | Waar het vandaan komt | Nu |
|---|---|---|
| **Peildatum** — newest order date in the data | `max(fct_sales[order_datum])`, stored on every mart row | **2026-08-10** |
| **Laadtijd** — when the pipeline last ran | `max(fct_sales[extracted_at])` | **2026-08-11 04:00 UTC** |
| **Modelverversing** — when Power BI last imported | Power BI's own schedule, 8×/dag | whenever the last of the eight ran |

There will nearly always be a gap between the first two, and it is not staleness
— a load at 04:00 cannot see a complete today, so the newest order it finds is
normally yesterday's. Today that gap is one day.

**Every window on this page must be anchored on the peildatum, not on the load
time and not on `TODAY()`.** Not a stylistic preference: `fct_klant`'s columns
(`omzet_12m`, `omzet_6m`, `dagen_sinds_laatste_order`, `recency_ratio`) are
computed in SQL from `max(order_datum)`. Anchor the DAX anywhere else and
`[Omzet 12m rollend]` stops equalling `[Omzet 12m]`, the §7 cross-check fails,
and the two halves of the page quietly disagree about what "twelve months"
means.

`TODAY()` is worse than the load time, because it drifts every morning while the
data does not move — so a customer silently ages one day per day between
refreshes and the recency card contradicts the segment reason beside it.

#### Show the other two dates anyway

The anchor is peildatum; the *header* should carry both, because they answer two
different questions. "Is this current?" means the load time. "What does twelve
months mean?" means the peildatum. Pierre's header does exactly this — and it
does it because showing only the peildatum once made a perfectly healthy
overnight refresh look a day stale.

```dax
Laadtijd = CALCULATE(MAX(fct_sales[extracted_at]), ALL(fct_sales))

Actualiteit label =
    "bijgewerkt " & FORMAT([Laadtijd], "d MMM HH:mm", "nl-NL")
    & " · cijfers t/m " & FORMAT([Peildatum], "d MMM yyyy", "nl-NL")
```

`extracted_at` is stored UTC; Neon runs UTC and Amsterdam is +2 in August, so
this reads two hours early in the summer. Add `+ (2/24)` only if that matters
enough to justify a hard-coded offset that is wrong for half the year — better
to label it, or to add the conversion in the mart where a timezone name can be
used properly.

For the **third** date — when Power BI itself last imported — nothing in the
marts can tell you, because the warehouse does not know. If you want it on the
page, add a one-row query to the model via **Get data**:

```sql
select now() at time zone 'Europe/Amsterdam' as model_ververst
```

It re-evaluates on every refresh, so it stamps the import rather than the
pipeline. Worth it only if somebody is likely to look at an 8×/day surface and
ask why it disagrees with Evidence, which reads live.

### 3.2 Rolling twelve-month windows over `fct_sales`

`fct_klant` bakes its windows in at build time and has no date grain, so
anything the mart does not already store has to be measured over `fct_sales`.
That works here for the same reason `[Omzet YTD]` does: the slicer is on
`dim_customer`, the shared parent of both facts.

```dax
Omzet 12m rollend =
VAR Eind  = [Peildatum]
VAR Start = EDATE(Eind, -12)
RETURN CALCULATE([Omzet], DATESBETWEEN(dim_date[datum], Start + 1, Eind))

Omzet vorige 12m rollend =
VAR Eind  = EDATE([Peildatum], -12)
VAR Start = EDATE([Peildatum], -24)
RETURN CALCULATE([Omzet], DATESBETWEEN(dim_date[datum], Start + 1, Eind))

Orders 12m rollend =
VAR Eind  = [Peildatum]
VAR Start = EDATE(Eind, -12)
RETURN CALCULATE(
    DISTINCTCOUNT(fct_sales[ordernummer]),
    DATESBETWEEN(dim_date[datum], Start + 1, Eind),
    fct_sales[is_revenue] = TRUE()
)

Flessen 12m rollend =
VAR Eind  = [Peildatum]
VAR Start = EDATE(Eind, -12)
RETURN CALCULATE(
    SUM(fct_sales[aantal]),
    DATESBETWEEN(dim_date[datum], Start + 1, Eind),
    fct_sales[is_revenue] = TRUE()
)

Flessen vorige 12m rollend =
VAR Eind  = EDATE([Peildatum], -12)
VAR Start = EDATE([Peildatum], -24)
RETURN CALCULATE(
    SUM(fct_sales[aantal]),
    DATESBETWEEN(dim_date[datum], Start + 1, Eind),
    fct_sales[is_revenue] = TRUE()
)
```

**`Start + 1` is deliberate and reconciles with the mart.** `fct_klant` filters
`order_datum > peildatum - interval '12 months'` — strictly greater.
`DATESBETWEEN` is inclusive on both ends, so without the `+ 1` you pick up one
extra day and `[Omzet 12m rollend]` no longer equals `[Omzet 12m]`. Verify on
Beachclub C: both must read **€ 43.565**. If they differ by a few euro, this is
why.

**`is_revenue`, not `is_stock_movement`.** The existing `[Flessen]` measure uses
`is_stock_movement`, which includes free samples. `fct_klant[flessen_12m]` uses
`is_revenue`. Mixing them on one page gives two different bottle counts for the
same customer and no way to tell which is which. This page is revenue-consistent
throughout.

### 3.3 Derived KPI figures

```dax
Gem. orderwaarde 12m rollend = DIVIDE([Omzet 12m rollend], [Orders 12m rollend])

Orders per maand 12m = DIVIDE([Orders 12m rollend], 12)

Flessen verschil 12m = [Flessen 12m rollend] - [Flessen vorige 12m rollend]

Dagen sinds laatste order = SELECTEDVALUE(fct_klant[dagen_sinds_laatste_order])
```

### 3.4 Portfolio measures

Nine measures, three per status. Tedious, and worth it: a matrix would put the
three groups in a row of identical grey cells, and the mockup's point is that the
three groups are *different kinds* of fact.

```dax
Wijnen actief   = CALCULATE(COUNTROWS(fct_klant_product), fct_klant_product[regelstatus] = "actief")
Omzet actief    = CALCULATE(SUM(fct_klant_product[omzet_12m]),   fct_klant_product[regelstatus] = "actief")
Flessen actief  = CALCULATE(SUM(fct_klant_product[flessen_12m]), fct_klant_product[regelstatus] = "actief")

Wijnen gestopt  = CALCULATE(COUNTROWS(fct_klant_product), fct_klant_product[regelstatus] = "gestopt")
Omzet gemist    = CALCULATE(SUM(fct_klant_product[omzet_vorige_12m]),   fct_klant_product[regelstatus] = "gestopt")
Flessen gemist  = CALCULATE(SUM(fct_klant_product[flessen_vorige_12m]), fct_klant_product[regelstatus] = "gestopt")

Wijnen kans     = CALCULATE(COUNTROWS(fct_klant_product), fct_klant_product[regelstatus] = "kans")
Kans eerdere omzet = CALCULATE(SUM(fct_klant_product[omzet_vorige_12m]), fct_klant_product[regelstatus] = "kans")
Kans met historie  = CALCULATE(
    COUNTROWS(fct_klant_product),
    fct_klant_product[regelstatus] = "kans",
    fct_klant_product[omzet_vorige_12m] > 0
)
```

**`Omzet gemist` uses the prior window on purpose.** `Omzet actief` uses the
current one. They are different windows in adjacent tiles, which is exactly the
kind of thing that gets misread — so §6 puts the window in each tile's subtitle
rather than trusting the reader.

**There is no honest `Kans potentieel`.** The mockup's € 6.200 has no source: a
`kans` wine has an agreed case price and no orders in twelve months, so the only
things known about it are the price and (sometimes) what they used to spend.
`prijs_doos` × an assumed volume is a number you would have to defend in front of
a customer, and you could not. `Kans eerdere omzet` is real money they actually
spent on exactly those wines — € 1.956 for Beachclub C, across the **5 of 18**
with any history. Use that, and label it *"eerder besteed"*, not *"potentieel"*.
The other 13 have an agreed price and no history at all: genuinely
unquantifiable, and honestly so.

### 3.5 Label measures

Cards cannot reach Display units in this build, so every currency figure goes
through `FORMAT`.

```dax
Omzet 12m rollend label   = FORMAT([Omzet 12m rollend], "€ #,##0", "nl-NL")
Orders 12m label          = FORMAT([Orders 12m rollend], "#,##0", "nl-NL")
Flessen 12m label         = FORMAT([Flessen 12m rollend], "#,##0", "nl-NL")
Omzet actief label        = FORMAT([Omzet actief], "€ #,##0", "nl-NL")
Omzet gemist label        = FORMAT([Omzet gemist], "€ #,##0", "nl-NL")
Kans eerdere omzet label  = FORMAT([Kans eerdere omzet], "€ #,##0", "nl-NL")

Gem. orderwaarde 12m label =
    "gem. " & FORMAT([Gem. orderwaarde 12m rollend], "€ #,##0", "nl-NL")
    & " · " & FORMAT([Orders per maand 12m], "0,0", "nl-NL") & " per maand"

Flessen verschil label =
VAR V = [Flessen verschil 12m]
RETURN SWITCH(TRUE(),
    ISBLANK(V) || V = 0, "gelijk aan vorig jaar",
    V > 0,  "↗ " & FORMAT(V, "#,##0", "nl-NL") & " meer dan vorig jaar",
            "↘ " & FORMAT(ABS(V), "#,##0", "nl-NL") & " minder dan vorig jaar"
)

Groei JoJ label =
VAR G = [Omzet groei JoJ]
RETURN SWITCH(TRUE(),
    ISBLANK(G), "geen vergelijkbare basis vorig jaar",
    G >= 0, "↗ " & FORMAT(G, "0%", "nl-NL") & " vs. zelfde 6 mnd vorig jaar",
            "↘ " & FORMAT(ABS(G), "0%", "nl-NL") & " vs. zelfde 6 mnd vorig jaar"
)

Laatste order label =
VAR D = [Dagen sinds laatste order]
RETURN SWITCH(TRUE(),
    ISBLANK(D), "nooit besteld",
    D = 0, "vandaag",
    D = 1, "1 dag geleden",
    FORMAT(D, "#,##0", "nl-NL") & " dagen geleden"
)
```

**`Flessen verschil label` is the measure that catches the mockup's error.** On
Beachclub C it renders *"↗ 1.055 meer dan vorig jaar"*. The mockup shows a red
downward arrow. Do not hard-code the arrow into the visual's formatting; let the
measure choose it, or the page will confidently show the wrong direction.

**`Groei JoJ label` never renders a bare percentage.** The window is in the
string. This is the fix for the contradiction in §0.

### 3.6 The risk flag

There is no risk column in the marts. This derives one from the two signals that
already exist — `recency_ratio` (this customer's silence against their own
rhythm) and the year-on-year growth.

```dax
Risicovlag =
VAR R = SELECTEDVALUE(fct_klant[recency_ratio])
VAR G = [Omzet groei JoJ]
VAR S = SELECTEDVALUE(fct_klant[klant_segment])
RETURN SWITCH(TRUE(),
    S IN { "verloren", "slapend" },        "Risico",
    NOT ISBLANK(R) && R >= 3,              "Risico",
    NOT ISBLANK(G) && G <= -0.25,          "Risico",
    BLANK()
)
```

Thresholds are a judgement call, stated here rather than buried: **3×** the
customer's own median interval, or a **25%** year-on-year fall. Beachclub C trips
the second (−32,2%) and not the first (`recency_ratio` = 1,14 — they ordered
eight days ago against a seven-day rhythm). That combination is precisely the
case worth flagging: **still ordering, ordering less**. An absolute
days-since-last-order cutoff would have missed it entirely.

`recency_ratio` is NULL below three orders, so a two-order customer can only be
flagged by segment. Correct — there is no cadence to be late against.

**If this proves useful, move it into `fct_klant`.** A threshold in a DAX measure
is a business rule outside version-controlled SQL, which is the one thing this
platform's architecture says not to do. It lives here for now because it is a
draft; it should not still be here in three months.

### 3.7 The narrative banner

```dax
Signaal =
VAR G        = [Omzet groei JoJ]
VAR NGestopt = [Wijnen gestopt]
VAR Gemist   = [Omzet gemist]
VAR Zin1 =
    SWITCH(TRUE(),
        ISBLANK(G), BLANK(),
        G <= -0.10,
            "Omzet daalt " & FORMAT(ABS(G), "0%", "nl-NL") &
            " over de laatste zes maanden, tegenover dezelfde zes maanden vorig jaar.",
        G >= 0.10,
            "Omzet stijgt " & FORMAT(G, "0%", "nl-NL") &
            " over de laatste zes maanden, tegenover dezelfde zes maanden vorig jaar.",
        BLANK()
    )
VAR Zin2 =
    IF(NGestopt > 0,
        FORMAT(NGestopt, "#,##0", "nl-NL") & " wijnen gestopt, samen goed voor " &
        FORMAT(Gemist, "€ #,##0", "nl-NL") & " omzet in de twaalf maanden daarvoor.",
        BLANK()
    )
RETURN
    IF(ISBLANK(Zin1) && ISBLANK(Zin2),
        BLANK(),
        TRIM(COALESCE(Zin1, "") & UNICHAR(10) & COALESCE(Zin2, ""))
    )
```

On Beachclub C this renders:

```
Omzet daalt 32% over de laatste zes maanden, tegenover dezelfde zes maanden vorig jaar.
22 wijnen gestopt, samen goed voor € 4.485 omzet in de twaalf maanden daarvoor.
```

Compare to the mockup's *"grootste verlies zit in rosé en champagne"* — that
clause is gone, and §8 explains why it cannot come back yet.

```dax
Signaal kleur =
VAR G = [Omzet groei JoJ]
RETURN IF(NOT ISBLANK(G) && G <= -0.10, "#FDECEA", "#F2F5F2")

Signaal tekstkleur =
VAR G = [Omzet groei JoJ]
RETURN IF(NOT ISBLANK(G) && G <= -0.10, "#A2515F", "#1B2523")
```

`#A2515F` is the Wijngalerij house red, `#1B2523` the derived ink — the same
tokens Pierre uses, so the two surfaces do not disagree on what "bad" looks like.

### 3.8 Wine table measures

```dax
Statuslabel =
VAR S = SELECTEDVALUE(fct_klant_product[regelstatus], "meerdere")
VAR D = MAX(fct_klant_product[laatste_order_datum])
RETURN SWITCH(S,
    "actief",      "Actief",
    "gestopt",     "Gestopt · " & FORMAT(D, "mmm yy", "nl-NL"),
    "kans",        "Kans",
    "incidenteel", "Incidenteel",
    S
)

Flessen tabel =
VAR S = SELECTEDVALUE(fct_klant_product[regelstatus], "meerdere")
RETURN IF(S IN { "gestopt", "kans" },
    SUM(fct_klant_product[flessen_vorige_12m]),
    SUM(fct_klant_product[flessen_12m])
)

Omzet tabel =
VAR S = SELECTEDVALUE(fct_klant_product[regelstatus], "meerdere")
RETURN IF(S IN { "gestopt", "kans" },
    SUM(fct_klant_product[omzet_vorige_12m]),
    SUM(fct_klant_product[omzet_12m])
)

Sorteerwaarde =
    MAX(
        SUM(fct_klant_product[omzet_12m]),
        SUM(fct_klant_product[omzet_vorige_12m])
    )
```

`SELECTEDVALUE(..., "meerdere")` rather than plain `SELECTEDVALUE`: two distinct
`product_id`s can carry the same `product_naam`, and a table grouped on the name
merges them. Without the fallback those rows go blank and look like a bug. With
it they read `meerdere` and fall through the `SWITCH` to show the raw value.

**`Flessen tabel` and `Omzet tabel` mix two windows in one column, and that is a
real hazard.** A row reading *Whispering Angel · 42 · € 706 · Gestopt mei 25* is
prior-year money sitting in the same column as Amie Rosé's current-year money.
The mockup does this implicitly; doing it explicitly at least makes it
inspectable. §7 gives the four-column alternative if you would rather not.

## 4. Canvas and layout

> **DOEN**
>
> - [ ] Format → Canvas settings → Type **Custom**, 1280 × 1400
> - [ ] View → **Actual size** (niet *Fit to page*)
> - [ ] Canvasachtergrond `#FFFFFF`
> - [ ] Positioneer élke visual via Format → General → Properties → **Size and
>       position** met de getallen uit de tabel hieronder. Slepen komt er niet uit.
> - [ ] Elke kaart en de tabel: witte achtergrond, rand 1px `#E4E9E4`, hoeken 8

**Page size:** Format pane → **Canvas settings** → Type = **Custom**,
Width **1280**, Height **1400**. View → **Actual size** (not *Fit to page*), so
the page scrolls vertically like the mockup rather than shrinking to fit.

Set every visual's position exactly: select it → Format pane → **General** →
**Properties** → **Size and position**, and type the numbers. Dragging will not
reproduce this.

**On the menu paths below.** Browser Power BI moves formatting controls between
builds, and **Card (new)** in particular is still gaining options — conditional
`fx` on the *background* is present in some builds and not others, where the
callout-value colour has had it for longer. Where a path here does not match
what you see, the rule matters and the path does not: search the Format pane's
own search box for the property name rather than hunting. Where a control is
genuinely absent, §7's rectangle-behind-the-card construction is the fallback
for every fill, because a shape's fill has taken `fx` for far longer than a
card's background has.

| # | Blok | X | Y | Breedte | Hoogte |
|---|---|---|---|---|---|
| 1 | Slicer (klantnaam) | 0 | 0 | 320 | 40 |
| 2 | Kopregel | 0 | 48 | 940 | 84 |
| 3 | Laatste order | 960 | 48 | 320 | 84 |
| 4 | Signaalbanner | 0 | 144 | 1280 | 76 |
| 5a–5d | KPI-tegels | 0 / 325 / 650 / 975 | 236 | 305 | 132 |
| 6 | Omzet per maand | 0 | 384 | 1280 | 300 |
| 7 | Kop "Wijnportfolio" | 0 | 700 | 400 | 32 |
| 8a–8c | Portfolio-tegels | 0 / 433 / 866 | 740 | 413 | 104 |
| 9 | Wijnentabel | 0 | 864 | 1280 | 320 |
| 10 | Actiepunten | 0 | 1200 | 1280 | 180 |

Background: Canvas settings → Colour **#FFFFFF**. Every card and the table get a
white background with a **1px #E4E9E4 border** and **8px rounded corners**
(Format → General → Effects → Background / Border / Visual border), which is what
gives the mockup its card-on-page feel. The banner is the only block with a
coloured fill.

## 5. Block 1–3 — slicer and header

> **DOEN** — 7 visuals
>
> - [ ] Slicer op `dim_customer[klant_naam]`: Dropdown, **zoeken aan**, **enkelvoudig aan**, *Select all* uit — 0 / 0 / 320 / 40
> - [ ] Text box `Klantdetail` — 0 / 48 / 200 / 18
> - [ ] Card (new) `dim_customer[klant_naam]`, 28px semibold, label uit — 0 / 66 / 460 / 40
> - [ ] Card (new) `fct_klant[klant_segment]` als badge, kleur via regels — 470 / 70 / 90 / 26
> - [ ] Card (new) `[Risicovlag]` als badge, **rand uit** — 560 / 70 / 90 / 26
> - [ ] Card (new) `[Kopregel sub]` — 0 / 110 / 940 / 22
> - [ ] Blok 3: text box + 2 cards, rechts uitgelijnd — 960 / 48
> - [ ] Voetnoot met `[Actualiteit label]` óf `[Peildatum label]` — kies er één

### Slicer

Exactly as `powerbi_klantdetail.md` §1, and for the same reasons — it must be
`dim_customer[klant_naam]`, dropdown, search on, single select on, *Select all*
off. **Select a customer before saving**, or the page defaults to all 774
aggregated and looks like one implausibly good customer.

### Block 2 — Kopregel

Three stacked elements in one region. Power BI has no composite text card, so
this is **three separate visuals** positioned to look like one:

**2a. Eyebrow** — a Text box, literal text `Klantdetail`, 11px, letter-spacing
via uppercase, colour `#839182` (house light green). Position 0 / 48 / 200 / 18.

**2b. Naam + badges** — a **Card (new)** visual.
- Fields: `dim_customer[klant_naam]`
- Format → Callout value → Font 28px, Semibold, colour `#1B2523`
- Format → Card → Label → **Off**
- Position 0 / 66 / 460 / 40

**2c. Badges** — two more Card (new) visuals side by side, at 470 / 70 and
560 / 70, each 90 × 26.
- First: field `fct_klant[klant_segment]`. Second: measure `[Risicovlag]`.
- Both: Callout value 12px, label off, **Background on**, rounded corners 13px.
- Segment badge colour: Format → Card → Background → **fx** → Format by
  **Rules**, on `[klant_segment]`:

  | Waarde | Achtergrond | Tekst |
  |---|---|---|
  | kern | `#DCEAE7` | `#577D79` |
  | actief | `#DCEAE7` | `#577D79` |
  | nieuw | `#E8EFE4` | `#5A7048` |
  | afglijdend | `#FBEBE4` | `#C3715C` |
  | slapend / verloren / eenmalig / nooit besteld | `#F6E7EA` | `#A2515F` |

- Risk badge: fixed `#F6E7EA` / `#A2515F`. It is blank when there is no risk, and
  a Card with a blank measure renders empty — which is the behaviour you want,
  but **it still occupies its rectangle**, so 2c's second card must not have a
  visible border or you get an empty box on healthy customers. Turn Border off on
  that one card specifically.

**The ⚠ glyph:** prefix it in the measure — change `"Risico"` to
`UNICHAR(9888) & " Risico"`. Cards cannot show an icon beside a value.

**2d. Subregel** — a **Multi-row card** or a Card (new) with a concatenation
measure. The concatenation is cleaner:

```dax
Kopregel sub =
VAR Branche = SELECTEDVALUE(fct_klant[branche])
VAR Plaats  = SELECTEDVALUE(fct_klant[plaats])
VAR AM      = SELECTEDVALUE(fct_klant[accountmanager])
VAR Mail    = SELECTEDVALUE(fct_klant[email])
VAR Delen =
    FILTER(
        { Branche, Plaats, IF(NOT ISBLANK(AM), "Accountmanager " & AM), Mail },
        NOT ISBLANK([Value]) && [Value] <> ""
    )
RETURN CONCATENATEX(Delen, [Value], " · ")
```

The `{ … }` table constructor names its single column `[Value]`; that is a DAX
convention, not a typo. Every element must be text or the constructor fails to
type-check — hence the `IF` around the accountmanager rather than a bare
concatenation, which would yield `"Accountmanager "` for a customer with none.

Renders `Horeca · Noordwijk · Accountmanager Dennis · crew@beachclubcnoordwijk.nl`.
The `FILTER` matters: `dim_customer` has customers with no `plaats` and
`fct_klant` has two records where the ERP detail page could not be fetched
(`detail_compleet = false`), and without it those render as `Horeca ·  ·  · `.

Position 0 / 110 / 940 / 22, 12px, `#5C6B66`.

### Block 3 — Laatste order

Three right-aligned elements, mirroring 2a–2c:

- Text box `Laatste order`, 11px, `#839182`, right-aligned — 960 / 48 / 320 / 18
- Card (new) on `[Laatste order label]`, 20px semibold — 960 / 66 / 320 / 26
- Card (new) on `fct_klant[laatste_order_datum]`, 12px `#5C6B66`, format
  `d MMM yyyy` — 960 / 94 / 320 / 20

Beachclub C reads **8 dagen geleden / 2 aug 2026**. The mockup says *2 dagen
geleden / 9 aug 2026*.

**Do not compute this from `TODAY()`.** `dagen_sinds_laatste_order` is measured
from `peildatum` (2026-08-10 on prod), and every other figure on this page is
too. A
`TODAY()`-based version drifts one day every morning while the underlying data
does not move — so the customer silently ages between refreshes and the card
disagrees with the segment reason directly beside it. Keep it on peildatum, and
put the peildatum somewhere on the page so the discrepancy with the wall
calendar is explained rather than discovered. A small footer Card (new) on:

```dax
Peildatum label = "Cijfers per " & FORMAT([Peildatum], "d MMMM yyyy", "nl-NL")
```

— currently *"Cijfers per 10 augustus 2026"*. **Read it from the measure, not a
literal**, or it goes stale on the next pipeline run and nobody notices.

Prefer `[Actualiteit label]` from §3.1 if there is room: it carries the load
time *and* the peildatum, which answer two different questions. Pick one of the
two and use it everywhere — two competing footers saying almost the same thing
is how a reader concludes neither is reliable.

## 6. Block 4 — Signaalbanner

> **DOEN** — 1 visual
>
> - [ ] Card (new) op `[Signaal]` — 0 / 144 / 1280 / 76
> - [ ] Callout value 13px, **word wrap aan**, links uitgelijnd, label uit
> - [ ] Achtergrond → **fx** → Field value → `[Signaal kleur]`
> - [ ] Tekstkleur → **fx** → Field value → `[Signaal tekstkleur]`
> - [ ] Rand 1px `#F2D6D2`, hoeken 8
> - [ ] Geef `[Signaal]` een neutrale terugvaltekst in plaats van BLANK (zie hieronder)

A **Card (new)** visual, not a text box — text boxes cannot show a measure.

- Fields: `[Signaal]`
- Format → Callout value → Font 13px, **Word wrap on**, alignment left
- Format → Card → Label **off**
- Format → General → Effects → Background → **fx** → Format by **Field value** →
  `[Signaal kleur]`
- Callout value colour → **fx** → Field value → `[Signaal tekstkleur]`
- Border 1px, colour `#F2D6D2`, rounded 8px
- Padding: there is no padding control on Card (new). Fake it by making the card
  1280 wide but positioning a 1240-wide card at X = 20 — or accept the tight fit.

**Empty state.** `[Signaal]` is BLANK for any customer with no growth basis and
no stopped wines. The card then renders as an empty coloured strip, which looks
broken. Two options:

1. **Recommended:** give `[Signaal]` a neutral fallback rather than BLANK — e.g.
   `"Geen bijzonderheden in de cijfers van de laatste twaalf maanden."` The band
   stays, the colour goes neutral via `[Signaal kleur]`, and the layout never
   shifts.
2. Conditional visibility, which Power BI does not do natively — it needs a
   bookmark per state and a button, and it is not worth it for one band.

**The two-line rendering.** `UNICHAR(10)` inside a Card (new) callout value
renders as a line break **only with Word wrap on**. If it comes out as one long
line, that setting is off. Some builds strip it regardless; the fallback is
` — ` as a separator on one line, which fits at 13px in 1280px.

## 7. Block 5 — de vier KPI-tegels

> **DOEN** — 4 rechthoeken + 12 visuals
>
> Per tegel: één rechthoek als achtergrond (`Send to back`), daarop drie
> visuals — label, waarde, subregel. Alle vier op Y = 236, hoogte 132.
>
> - [ ] Tegel A op X = **0** — `Omzet 12 mnd` · `[Omzet 12m rollend label]` · `[Groei JoJ label]`
> - [ ] Tegel B op X = **325** — `Omzet YTD` · `[Omzet YTD label]` · periodetekst
> - [ ] Tegel C op X = **650** — `Orders 12 mnd` · `[Orders 12m label]` · `[Gem. orderwaarde 12m label]`
> - [ ] Tegel D op X = **975** — `Flessen 12 mnd` · `[Flessen 12m label]` · `[Flessen verschil label]`
> - [ ] Subregelkleur op A en D via **fx → Rules** (rood/groen/grijs)
> - [ ] Sla de jaardoel-balk over — die data bestaat niet (§8.4)

Each tile is **three stacked visuals** in a 305 × 132 region: a label, a value,
and a sub-line. Power BI's Card (new) does support a label above the value, but
not a second line below it, and the sub-line is where the whole comparison lives.

Use a **rectangle shape** as the tile background (Insert → Shapes → Rectangle,
fill `#FFFFFF`, border `#E4E9E4`, rounded 8) and place the three visuals on top.
Send the rectangle to the back: right-click → **Send backward** → *Send to back*,
or the Selection pane.

### Tegel A — Omzet 12 mnd

| Element | Visual | Veld / meting | Positie (X/Y/B/H) | Opmaak |
|---|---|---|---|---|
| Label | Text box | `Omzet 12 mnd` | 16 / 250 / 200 / 18 | 11px, `#5C6B66` |
| Waarde | Card (new) | `[Omzet 12m rollend label]` | 16 / 270 / 280 / 34 | 26px semibold, `#1B2523`, label off |
| Subregel | Card (new) | `[Groei JoJ label]` | 16 / 308 / 280 / 20 | 11px, kleur via fx (zie hieronder) |

Sub-line colour → fx → Format by **Rules** on `[Omzet groei JoJ]`:
`< 0` → `#A2515F`; `>= 0` → `#577D79`; `is blank` → `#8A9691`.

Reads **€ 43.565** / *↘ 32% vs. zelfde 6 mnd vorig jaar*.

**Cross-check:** `[Omzet 12m rollend]` must equal `[Omzet 12m]` (the mart
column). If not, revisit the `Start + 1` note in §3.2. Use `[Omzet 12m label]`
instead if you prefer to read straight from the mart — but then the page has one
figure from `fct_klant` and three from `fct_sales`, and a future divergence
between them becomes invisible. Reading all four from `fct_sales` and checking
against the mart is the better arrangement.

### Tegel B — Omzet YTD

Same three-element structure at X = 325.

- Label: `Omzet YTD`
- Waarde: `[Omzet YTD label]` → **€ 22.067** (exact match with the mockup)
- Subregel: the mockup's progress bar. **There is no target data in the
  warehouse**, so the honest sub-line today is
  `FORMAT([Omzet YTD], ...) & " van € " & FORMAT([Omzet 12m rollend], ...) & " over 12 mnd"` —
  or simply the period, read from the anchor:
`"1 jan t/m " & FORMAT([Peildatum], "d MMM yyyy", "nl-NL")`.

If you want the bar, §8.2 gives the full recipe including the seed. Do not fake
it against an invented target.

**`[Omzet YTD]` ends at the last date in filter context, which is 2026-12-31.**
`dim_date` runs to year-end and no orders exist after the snapshot, so today it
happens to equal 1 Jan – 10 Aug. Correct by accident. **Never put a date slicer on
this page** — it stops being a year-to-date the moment you do. This is inherited
verbatim from `powerbi_klantdetail.md` §0b and it is the single easiest thing on
this page to break by accident.

A customer with no 2026 orders gets **blank, not € 0**. Wrap in
`COALESCE([Omzet YTD], 0)` inside the label measure if a zero reads better.

### Tegel C — Orders 12 mnd

At X = 650.

- Label: `Orders 12 mnd`
- Waarde: `[Orders 12m label]` → **62** (not 121 — see §0)
- Subregel: `[Gem. orderwaarde 12m label]` → *gem. € 703 · 5,2 per maand*

The mockup's 121 / € 360 / 2,3 comes from `n_orders_verkocht`, which is the
**all-time** count from `klant_segment_reden` (*"€ 43565 in 12 mnd, 121 orders"*
— the reason string mixes a 12-month revenue figure with an all-time order
count, which is where the confusion started).

If you genuinely want the all-time figure on the page, label it *"Orders totaal"*
and use `SUM(fct_klant[n_orders_verkocht])`. Do not label an all-time count
"12 mnd".

### Tegel D — Flessen 12 mnd

At X = 975.

- Label: `Flessen 12 mnd`
- Waarde: `[Flessen 12m label]` → **6.869**
- Subregel: `[Flessen verschil label]` → *↗ 1.055 meer dan vorig jaar*

Sub-line colour → fx → Rules on `[Flessen verschil 12m]`: `> 0` → `#577D79`,
`< 0` → `#A2515F`, else `#8A9691`.

**Note the sign.** The mockup shows a fall of 1.940 bottles; the data shows a
rise of 1.055. The mockup's 5.720 is the `actief` portfolio subtotal (block 8a),
not the customer's total. Two different numbers that look like the same number is
the most expensive kind of mistake on a page like this — which is why the
portfolio tiles in §9 carry an explicit *"in actieve wijnen"* subtitle.

## 8. Block 6 — Omzet per maand

> **DOEN** — 1 visual
>
> - [ ] Line and clustered column chart — 0 / 384 / 1280 / 300
> - [ ] X-as `dim_date[maand_naam]`; kolom `[Omzet]`; lijn `[Omzet vorig jaar]`
> - [ ] Model view → `dim_date[maand_naam]` → **Sort by column** → `jaar_maand`
> - [ ] Visual-level filter `[In laatste 12 maanden]` **is 1**
> - [ ] Sorteer de as oplopend op `jaar_maand`
> - [ ] Lijnstijl **Dashed**, 2px, `#8A9691`; kolommen `#577D79`
> - [ ] Legenda aan, rechtsboven
> - [ ] Kies wat je met de halve augustusmaand doet — §8.3, optie 1 is de aanbeveling

**Visual: Line and clustered column chart.**

| Well | Veld |
|---|---|
| X-axis | `dim_date[jaar_maand]` |
| Column y-axis | `[Omzet]` |
| Line y-axis | `[Omzet vorig jaar]` |

`[Omzet vorig jaar]` already exists (`powerbi_sales_dashboard.md` §2:
`CALCULATE([Omzet], SAMEPERIODLASTYEAR(dim_date[datum]))`).

### 8.1 Restricting to the last twelve months

`dim_date` covers whole calendar years, so without a filter the axis shows every
month from 2024-01. Add a measure and use it as a visual-level filter:

```dax
In laatste 12 maanden =
VAR Eind  = [Peildatum]
VAR Start = EDATE(Eind, -12)
VAR M     = MAX(dim_date[datum])
RETURN IF(M > Start && M <= EOMONTH(Eind, 0), 1, 0)
```

Filters pane → visual-level → drag `[In laatste 12 maanden]` → *Show items when
the value* **is** `1` → Apply.

Axis then runs **2025-09 … 2026-08**, matching the mockup's sep→aug.

**Sorting:** click the visual's `…` → Sort axis → `jaar_maand` → ascending.
`jaar_maand` is `YYYY-MM` text and sorts correctly as text — that is exactly why
the column exists (`_marts.yml`: *"Sortable as text, unlike month names"*). Do
**not** switch the axis to `maand_naam`; it will sort alphabetically and put
april first.

**Axis labels:** the mockup shows `sep okt nov …`, not `2025-09`. To get that you
need `maand_naam` as the display with `jaar_maand` as the sort key — Model view →
select `dim_date[maand_naam]` → Column tools → **Sort by column** →
`jaar_maand`. Then put `maand_naam` on the axis. This is safe *because* of the
sort-by-column, and only because of it.

### 8.2 The dashed prior-year line

Format pane → **Lines** → select the `Omzet vorig jaar` series →
**Line style: Dashed**, Width 2, Colour `#8A9691`. Column series: `#577D79`.

Legend: Format → Legend → **On**, Position *Top right*, so it reads
`Dit jaar ▪ Vorig jaar --` as in the mockup. Rename the series by renaming the
measures if the legend text matters (Power BI shows the measure name) — or accept
`Omzet` / `Omzet vorig jaar`.

### 8.3 Three things that will look wrong

**The last bar is a stub.** Peildatum is 10 August, so `2026-08` holds ten days:
€ 1.088 against July's € 3.652. It reads as a collapse. Options, in order of
preference:

1. **Exclude it.** Change `EOMONTH(Eind, 0)` to `EOMONTH(Eind, -1)` in
   `[In laatste 12 maanden]` so the axis ends at the last *complete* month, and
   shift the start to `EDATE(Eind, -13)`. Twelve complete months, no stub.
2. Keep it and add a footnote — the `[Peildatum label]` card from §5 already
   says it, so placing that card under the chart is enough.
3. Leave it unexplained. Do not do this.

**The prior-year line is empty before October 2024.** Order history starts
2024-10-02. For the current window (sep 2025 – aug 2026) the comparison year is
sep 2024 – aug 2025, so **September 2024 has no prior-year data** and the dashed
line starts at October. Expected, not a bug. It stops being visible once the
snapshot moves past October 2026.

**The chart and the banner disagree in sign.** Covered in §0. The banner's
window label is the mitigation.

### 8.4 If you want the jaardoel bar after all

It needs a target, which does not exist. The smallest honest route:

1. Create `dbt/wijngalerij/seeds/klant_doelen.csv` with columns
   `klant_id,jaar,omzet_doel`.
2. `dbt seed`, then a mart or a direct reference from Power BI.
3. Relate `klant_doelen[klant_id]` → `dim_customer[klant_id]`, many-to-one,
   single. (A second fact against `dim_customer` is fine — it does not close a
   cycle, because `klant_doelen` touches no other dimension.)
4. `Doelrealisatie = DIVIDE([Omzet YTD], SUM(klant_doelen[omzet_doel]))`
5. Visual: **not** a card. Use a 100% stacked bar chart 280 × 8 with the axis,
   legend and labels all off — or the standard **Gauge** visual, which is uglier
   but one click.

Whoever owns those targets owns the seed. Until somebody does, leave the bar out.

## 9. Block 7–8 — Wijnportfolio

> **DOEN** — 1 text box + 3 rechthoeken + 9 visuals + 3 metingen
>
> - [ ] Maak eerst `Wijnen actief label`, `Wijnen gestopt label`, `Wijnen kans label` (codeblok hieronder)
> - [ ] Text box `Wijnportfolio` — 0 / 700 / 400 / 32
> - [ ] Tegel 8a op X = **0** — Actief, groen `#577D79`
> - [ ] Tegel 8b op X = **433** — Gestopt, rood `#A2515F`
> - [ ] Tegel 8c op X = **866** — Kans, groen `#577D79`
> - [ ] Alle drie op Y = 740, 413 × 104, zelfde opbouw als §7
> - [ ] **Zet `— laatste 12 mnd` / `— vorige 12 mnd` in de subregels.** Niet optioneel: 8a en 8b tonen geld uit verschillende jaren
> - [ ] Label 8c als *"eerder besteed"*, niet *"potentieel"*

**Block 7** is a Text box: `Wijnportfolio`, 16px semibold, `#1B2523`.

**Blocks 8a–8c** are three tiles, same three-visual construction as §7.

| | 8a Actief | 8b Gestopt | 8c Kans |
|---|---|---|---|
| Label | `Actief` | `Gestopt` | `Kans` |
| Waarde | `[Wijnen actief] & " wijnen"` | `[Wijnen gestopt] & " wijnen"` | `[Wijnen kans] & " wijnen"` |
| Kleur waarde | `#577D79` | `#A2515F` | `#577D79` |
| Subregel | `[Omzet actief label] & " · " & [Flessen actief] & " fl. — laatste 12 mnd"` | `[Omzet gemist label] & " · " & [Flessen gemist] & " fl. — vorige 12 mnd"` | `[Kans eerdere omzet label] & " eerder besteed"` |
| Beachclub C | **21 wijnen** · € 35.878 · 5.720 fl. | **22 wijnen** · € 4.485 · 278 fl. | **18 wijnen** · € 1.956 |

Wrap each value in a label measure so the `& " wijnen"` concatenation works —
Card (new) shows a measure, and a measure returning text is fine:

```dax
Wijnen actief label  = FORMAT([Wijnen actief],  "#,##0", "nl-NL") & " wijnen"
Wijnen gestopt label = FORMAT([Wijnen gestopt], "#,##0", "nl-NL") & " wijnen"
Wijnen kans label    = FORMAT([Wijnen kans],    "#,##0", "nl-NL") & " wijnen"
```

**The `— laatste 12 mnd` / `— vorige 12 mnd` suffixes are not optional.** 8a and
8b sit 20 pixels apart showing money from **different years**. Without the
suffix a reader compares € 35.878 with € 4.485 and concludes the stopped wines
were 11% of the business, which is not what either number means.

**Why the counts differ so much from the mockup** (22 gestopt vs 7): the mart's
`gestopt` test is 182 days of silence plus at least
`klant_gestopt_min_flessen` bottles beforehand. It has no revenue floor, so a
wine worth € 12 counts the same as one worth € 1.490. If 22 is too noisy for a
sales conversation, add a visual-level filter `[Omzet tabel] >= 100` on the
table — but leave the tile count unfiltered, or the tile and the table disagree.
The cleaner fix is a revenue floor in `fct_klant_product` itself, which is a dbt
change and belongs in the mart, not the report.

## 10. Block 9 — de wijnentabel

> **DOEN** — 1 visual
>
> - [ ] Table (géén Matrix) — 0 / 864 / 1280 / 320
> - [ ] Kolommen: `product_naam` → *Wijn*, `[Flessen tabel]` → *Flessen*, `[Omzet tabel]` → *Omzet*, `[Statuslabel]` → *Status*
> - [ ] Hernoem elke kolom via **Rename for this visual**
> - [ ] Visual-level filter: `regelstatus` **is not** `incidenteel`
> - [ ] Optioneel: Top 12 op `[Sorteerwaarde]`
> - [ ] Sorteer op `[Sorteerwaarde]` aflopend, verberg die kolom daarna
> - [ ] Cell elements → Background colour → fx → **Rules op `regelstatus`** (niet op `[Statuslabel]`)
> - [ ] Cell elements → Font colour → dezelfde regels
> - [ ] De SVG-pillen zijn **optioneel** — sla ze over tenzij je ze echt wilt

**Visual: Table** (not Matrix — a matrix adds a hierarchy this does not need).

| Well | Veld | Kolomkop |
|---|---|---|
| Columns | `fct_klant_product[product_naam]` | `Wijn` |
| Columns | `[Flessen tabel]` | `Flessen` |
| Columns | `[Omzet tabel]` | `Omzet` |
| Columns | `[Statuslabel]` | `Status` |

Rename each column: click the field in the Columns well → **Rename for this
visual**.

### Sorting

Click the `…` → **Sort by** → `Sorteerwaarde` → Descending. Then hide
`Sorteerwaarde`: it must be **in the visual** to sort by it. Add it as a fifth
column, then Format → **Columns** → select it → *Show* off. (Some builds do not
offer per-column hiding; the fallback is to sort by `Omzet` descending, which is
nearly the same order because `[Omzet tabel]` already switches window by status.)

### Filtering

Filters pane → visual-level → `regelstatus` → **is not** `incidenteel`. The
incidental pairs are one-off trial orders and there are seven of them for
Beachclub C, worth € 185 in total; they add rows and no conversation.

Optionally also a Top N filter: `Top 12` by `Sorteerwaarde`, so the table never
outgrows its 320px. Beachclub C has 61 non-incidental pairs; all 61 in a
scrolling table is worse than the 12 that matter.

### The status pills

Power BI tables do **cell background colour**, not rounded pills. You get a
coloured rectangle filling the cell, which at this size reads acceptably close.

Format → **Cell elements** → Series = `Statuslabel` → **Background colour** → On
→ fx → Format by **Rules**, Based on field `[Statuslabel]`:

Rules match on a value, and `Gestopt · mei 25` is a different string per row, so
rules on the label will not work. **Base the rules on `regelstatus` instead** —
the fx dialog lets you colour one column by a different field:

| Als `regelstatus` is | Achtergrond |
|---|---|
| actief | `#DCEAE7` |
| gestopt | `#F6E7EA` |
| kans | `#E3EAF2` |

Then Cell elements → **Font colour** → same rules → `#577D79` / `#A2515F` /
`#3F5A7A`.

**If you want true rounded pills**, the only route is an SVG measure rendered in
an Image column:

```dax
Statuspil SVG =
VAR S     = SELECTEDVALUE(fct_klant_product[regelstatus], "")
VAR T     = [Statuslabel]
VAR Vul   = SWITCH(S, "actief", "%23DCEAE7", "gestopt", "%23F6E7EA", "kans", "%23E3EAF2", "%23EFEFEF")
VAR Inkt  = SWITCH(S, "actief", "%23577D79", "gestopt", "%23A2515F", "kans", "%233F5A7A", "%23555555")
VAR Breed = 12 + LEN(T) * 6.6
RETURN "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='"
    & INT(Breed) & "' height='22'><rect x='0' y='0' width='" & INT(Breed)
    & "' height='22' rx='11' fill='" & Vul & "'/><text x='" & INT(Breed/2)
    & "' y='15' font-family='Segoe UI,sans-serif' font-size='11' fill='" & Inkt
    & "' text-anchor='middle'>" & T & "</text></svg>"
```

Then Model view → select the measure → Column tools → **Data category** =
**Image URL**, and add it to the table instead of `[Statuslabel]`. Set
Format → Cell elements → Image height to 22.

This works, and it is a maintenance item: the `%23` are URL-escaped `#`, the
width is estimated from string length, and a wine name with an `&` in it will
break the SVG. Take it only if the pills genuinely matter. The cell-background
version is 90% of the look for 5% of the fragility.

### What the table shows for Beachclub C

Top rows, sorted by `Sorteerwaarde` descending, `incidenteel` excluded:

| Wijn | Flessen | Omzet | Status |
|---|---|---|---|
| U Mes U Cygnus Albireo Cava Brut | 1.272 | € 9.889 | Actief |
| Descombe Louise Sauvignon Blanc | 888 | € 4.822 | Actief |
| Caves Da Cerca Soleda Vinho Verde | 1.284 | € 5.547 | Actief |
| Amie Rosé | 599 | € 4.439 | Actief |
| Mosquita Muerta Cordero con Piel de Lobo Malbec | 534 | € 3.124 | Actief |
| Bodegas Peñafiel Alma Serena Ribera Del Duero Barrica | 240 | € 1.668 | Actief |
| Ruinart Blanc de Blancs | 24 | € 1.490 | Gestopt · aug 25 |
| Bodegas Peñafiel Casa De Las Locas Albariño | 102 | € 1.056 | Actief |
| Cantina Tollo Gufo Pinot Grigio | 288 | € 1.359 | Actief |
| Dom Pérignon White 2015 | 6 | € 948 | Kans |
| Pierre Chavin Pierre Zéro (0%) | 166 | € 789 | Actief |
| Whispering Angel Provence Rosé | 42 | € 706 | Gestopt · mei 25 |

**The Omzet column is not monotonically descending, and that is correct.** The
sort is on `[Sorteerwaarde]` — the greater of the two windows — so Descombe
Louise sits above Caves Da Cerca on € 6.204 of prior-year revenue while
displaying € 4.822 of current. If a strictly descending Omzet column matters
more to you than ranking wines by their peak, sort on `[Omzet tabel]` instead
and accept that a wine which collapsed this year drops out of view — which is
the opposite of what this page is for.

Note **Dom Pérignon White 2015 as a `kans`**: an agreed price of € 158/case,
six bottles bought 12–24 months ago, nothing since. That is the row that earns
this page its place in a meeting, and it only appears at all because
`fct_klant_product`'s grain includes price-agreement pairs with no recent sale.

### Four-column alternative

If the mixed-window column bothers you — and it reasonably might — replace
`[Flessen tabel]` / `[Omzet tabel]` with four explicit columns:
`flessen_12m`, `omzet_12m`, `flessen_vorige_12m`, `omzet_vorige_12m`, headed
*Flessen nu / Omzet nu / Flessen vorig jaar / Omzet vorig jaar*. It is honest,
it is wider, and it stops being a phone-compatible visual. At 1280px there is
room. The mockup's version is the compact one; this one is the defensible one.

## 11. Block 10 — Actiepunten

> **DOEN** — 2 cards + 1 knop
>
> Van de drie punten in de mockup is er één te bouwen en zijn er twee geblokkeerd
> op data die niet bestaat. Bouw dus dit:
>
> - [ ] Meting `Piekmaanden` + Card (new) — 0 / 1200 / 1280 / 40
> - [ ] Meting `Grootste verlies` + Card (new) — 0 / 1244 / 1280 / 40
> - [ ] Meting `Pierre verkoopadvies` (§11.1)
> - [ ] Knop: Insert → Buttons → Blank, tekst `Vraag het Pierre` — 1100 / 1200 / 180 / 36
> - [ ] Action → **On**, Type = **Web URL**, URL via **fx → Field value** → `[Pierre verkoopadvies]`
>
> **Niet doen:** proberen "rosé en champagne" of een laatste-bezoekdatum te
> bouwen. Zie §12.

**This block cannot be built from the warehouse as specified.** What the mockup
shows is three sentences requiring three things that do not exist:

| Mockup bullet | Wat het nodig heeft | Status |
|---|---|---|
| "Rosé-omzet halveerde na het stoppen van Whispering Angel — vergelijkbare klanten stapten over op Amie Rosé Magnum. Potentie € 3.400" | (a) wine category, (b) a cross-customer substitution mart, (c) a potential estimate | ❌ (a) blocked, (b) is the demand-matching PoC, (c) has no basis |
| "Geen champagne meer sinds aug 2025, terwijl het terrasseizoen piekt" | wine category + seasonality per category | ❌ blocked on category |
| "Piekmaanden zijn juni en september — nu is het moment voor de najaarsafspraak. Laatste bezoek: 4 mrt 2026" | peak months ✅ derivable; **visit history** ❌ not in the warehouse at all | ⚠ half |

### What you can build today

One derivable bullet, honestly:

```dax
Piekmaanden =
VAR Eind  = [Peildatum]
VAR Start = EDATE(Eind, -24)
VAR PerMaand =
    ADDCOLUMNS(
        VALUES(dim_date[maand_naam]),
        "@Omzet",
        CALCULATE([Omzet], DATESBETWEEN(dim_date[datum], Start + 1, Eind))
    )
VAR Top2 = TOPN(2, PerMaand, [@Omzet], DESC)
RETURN
    IF(HASONEVALUE(dim_customer[klant_naam]),
        "Piekmaanden over de laatste twee jaar: "
        & CONCATENATEX(Top2, dim_date[maand_naam], " en ", [@Omzet], DESC) & ".")
```

`ADDCOLUMNS(VALUES(...))` rather than `ADDCOLUMNS(SUMMARIZE(...))` on purpose:
`SUMMARIZE` over a filtered table does not carry that filter into the
`CALCULATE` below it, and the measure would silently return whole-history
totals per month. The `DATESBETWEEN` overrides only the filter on
`dim_date[datum]`, so the month filter from row-context transition survives.

For Beachclub C this returns **mei en augustus**, not the mockup's *juni en
september*. Another figure worth checking rather than assuming.

And a second from data that does exist:

```dax
Grootste verlies =
VAR Rij = TOPN(1,
    FILTER(fct_klant_product, fct_klant_product[regelstatus] = "gestopt"),
    fct_klant_product[omzet_vorige_12m], DESC)
VAR Naam  = MAXX(Rij, fct_klant_product[product_naam])
VAR Bedrag = MAXX(Rij, fct_klant_product[omzet_vorige_12m])
VAR Datum = MAXX(Rij, fct_klant_product[laatste_order_datum])
RETURN IF(NOT ISBLANK(Naam),
    "Grootste weggevallen wijn: " & Naam & " — " &
    FORMAT(Bedrag, "€ #,##0", "nl-NL") & " in de twaalf maanden ervoor, laatst besteld " &
    FORMAT(Datum, "d MMMM yyyy", "nl-NL") & ".")
```

For Beachclub C: *"Grootste weggevallen wijn: Ruinart Blanc de Blancs — € 1.490
in de twaalf maanden ervoor, laatst besteld 18 augustus 2025."*

Render both as Card (new) visuals stacked in the block, each with a leading
Unicode glyph in the measure string. The mockup's icons (🍷 ✨ 📅) are decorative;
a `·` or `→` prefix is less charming and never renders as a fallback box.

### The honest recommendation

**Do not try to make Power BI generate this block.** Two DAX-derived sentences
in a card is the ceiling, and the mockup's version reads as insight because it
combines category knowledge, cross-customer behaviour and CRM history — none of
which are visuals.

This block belongs to **Pierre**. Ask it *"waar liggen de kansen bij Beachclub
C?"* and it can join the marts, explain its reasoning and show the SQL. That is
the surface built for open-ended questions; Power BI is the surface built for
figures that are always the same shape.

### 11.1 The button to Pierre — built, and how to wire it

So put a **button** in this block that hands the customer over to Pierre with
the question already typed. The app side exists: `agent/prefill.py`,
`GET /api/prefill`, and the client hook in `web/app.js`.

**The link carries a customer id and an intent slug, never the question text.**

That is the whole design decision, and it is worth stating why, because writing
the sentence in DAX is the obvious approach and it is a trap. DAX has no URL
encoder. A worthwhile share of these customer names contain a space, a period,
an apostrophe or an accent — `Le French Café Utrecht B.V.`, `Sarina's
Wijnwereld`, `V.O.F. Sequenza`, `Smelt Runstraat B.V.` — and encoding those in
nested `SUBSTITUTE` calls works on the six names you tested it with. An id needs
no encoding at all.

It also puts the wording in the repo instead of in a Power BI measure, which is
the same rule the marts follow: version-controlled, reviewable, and changeable
without opening the BI tool.

#### The measure

```dax
Pierre verkoopadvies =
VAR Id = SELECTEDVALUE(dim_customer[klant_id])
RETURN
    IF(NOT ISBLANK(Id),
        "https://wijngalerij-agent.fly.dev/?klant=" & Id & "&vraag=verkoopadvies")
```

**No `FORMAT` or `VALUE` around `Id`.** `klant_id` is `character varying` in the
marts — every column arrives from the scrape as text and stays that way — so it
concatenates directly. (This bit the endpoint during development: comparing that
column to a bare integer raises `operator does not exist: character varying =
integer` rather than politely returning nothing.)

The `IF` guard matters. With no single customer selected, `SELECTEDVALUE`
returns blank, the measure returns blank, and **Power BI disables the button** —
which is the behaviour you want. Without it the button stays live and sends
`?klant=`, which the endpoint rejects with a 422.

#### The button

1. **Insert → Buttons → Blank.**
2. Format → **Style → Text** → on, `Vraag het Pierre`. Fill `#577D79`, text
   `#FFFFFF`, rounded 6.
3. Format → **Action** → **On**, Type = **Web URL**.
4. Next to the *Web URL* field click **fx** → Format by **Field value** → pick
   `[Pierre verkoopadvies]`.
5. Position it at the top-right of block 10, e.g. 1100 / 1200 / 180 / 36.

#### The four available intents

Change the `&vraag=` slug to pick a different question. All four are defined in
`agent/prefill.py`; add one there rather than inventing one in DAX, or the
button will land on a 400.

| slug | vraagt Pierre |
|---|---|
| `verkoopadvies` | wat er in twaalf maanden veranderde, welke wijnen wegvielen, wat die waard waren |
| `kansen` | prijsafspraken zonder bestellingen, plus wat vergelijkbare klanten in dezelfde branche afnemen |
| `risico` | bestelritme en omzet tegen dezelfde periode vorig jaar, en waar de terugval zit |
| `gestopt` | welke wijnen gestopt zijn, wanneer, en of andere klanten dezelfde wijn lieten vallen |

Two buttons is a reasonable maximum here — `verkoopadvies` and `kansen`. Four
turns a narrative block into a toolbar.

#### What happens on the other end

The link **types the question and stops. It does not send it.** Deliberate, on
two grounds: an answer costs money and a mis-click should not spend any, and
somebody about to put a figure in front of an owner should read what was asked
before asking it. The composer is filled and focused; one keypress sends.

If the question box already contains typed text, the prefill is discarded rather
than overwriting it.

#### The cold-click case, which needed a fix

Entra returns everybody to `/` after sign-in, so a link carrying parameters lost
them across a cold sign-in — and a click from Power BI is the case *most* likely
to be cold, since it arrives from another tab on another domain. The index route
now stashes the query string in the session and the auth callback restores it.

Verified end to end: `/?klant=51&vraag=kansen` with no session → `/auth/login` →
back to `/?klant=51&vraag=kansen` → composer filled with the Beachclub C
question. Only a `/?…` string this app built itself is ever restored, so a
tampered session cookie cannot turn it into an open redirect.

#### On the iOS app

A Web URL button in the Power BI mobile app opens the system browser. Pierre is
a PWA with its own Entra session, so the first tap there may require a sign-in
that the desktop browser already has. Works; just not seamless.

## 12. What is blocked, and what it would take

Three things on the mockup are not Power BI problems. Ranked by what they unlock:

### 12.1 Wine category — the big one

`dim_product` has `product_naam`, `leverancier`, `wijnhuis` and nothing about
what is in the bottle. No grape, no colour, no region, no vintage, no
champagne/rosé/still classification.

So *"grootste verlies zit in rosé en champagne"* cannot be computed. String
matching on `product_naam` gets you Whispering Angel **Provence Rosé** and
**Amie Rosé** but misses any rosé that does not say so — and it is a lower bound
you cannot quantify, which is the failure mode CLAUDE.md documents at length for
the agent.

**Fix:** enrich `dim_product` from a reviewed seed, following the precedent of
the existing alias seed. Check the ERP for the fields first. This is the single
highest-value data addition on the backlog and it unlocks category analysis
across every surface — Power BI, Evidence and Pierre at once.

### 12.2 Sales targets

No budget, target or quota anywhere. §8.4 has the seed recipe. Cheap to build;
the hard part is somebody owning the numbers.

### 12.3 Visit history

*"Laatste bezoek: 4 mrt 2026"* — there is no CRM activity data in the warehouse.
Whether the ERP records visits at all is an open question for the ERP developer,
and it belongs on the same list as read-only database access.

## 13. Verificatie

> **DOEN** — de hele paragraaf is een actie. Loop alle 25 regels langs met
> **Beachclub C** geselecteerd, en dan nog drie randgevallen (rij 20, 21, 22).
> Eindig met rij 23: opslaan mét een klant geselecteerd.

Run through this with **Beachclub C** selected, against a model pointed at
**prod**. Every figure verified on `main` on 2026-08-11, peildatum 2026-08-10.

| # | Controle | Verwacht |
|---|---|---|
| 0 | Peildatum-card | 10 augustus 2026 (niet 5 augustus — dat is `dev`) |
| 1 | `[Omzet 12m rollend]` = `[Omzet 12m]` | beide € 43.565 |
| 2 | Omzet YTD | € 22.067 |
| 3 | Orders 12 mnd | 62 (**niet** 121) |
| 4 | Gem. orderwaarde 12m | € 703 |
| 5 | Flessen 12 mnd | 6.869 |
| 6 | Flessen verschil | **↗ 1.055 meer** (niet ↘ 1.940) |
| 7 | Groei JoJ | ↘ 32%, met venstertekst |
| 8 | Laatste order | 2 aug 2026 · 8 dagen geleden |
| 9 | Wijnen actief / gestopt / kans | 21 / 22 / 18 |
| 10 | Omzet actief · gemist · kans | € 35.878 · € 4.485 · € 1.956 |
| 11 | Flessen actief · gemist | 5.720 · 278 |
| 12 | Grafiek: as loopt sep 2025 – aug 2026 (of jul 2026 met §8.3 optie 1) | 12 punten |
| 13 | Grafiek: stippellijn begint bij okt, niet sep | leeg vóór 2024-10-02 |
| 14 | Tabelrij Whispering Angel | 42 fl · € 706 · Gestopt · mei 25 |
| 15 | Tabelrij Ruinart Blanc de Blancs | 24 fl · € 1.490 · Gestopt · aug 25 |
| 16 | Tabelrij Dom Pérignon White 2015 | 6 fl · € 948 · Kans |
| 17 | Segmentbadge | `kern`, groen |
| 18 | Risicobadge | zichtbaar (JoJ ≤ −25%; `recency_ratio` is 1,14 en tript níet) |
| 19 | Signaalbanner | twee regels, rood, venster benoemd |
| 20 | Selecteer een klant zonder JoJ-basis (686 van de 774) | banner en delta tonen een nette lege staat, geen leeg gekleurd blok |
| 21 | Selecteer een klant met `detail_compleet = false` (281 of 482) | subregel toont geen `· ·` |
| 22 | Geen datumslicer op de pagina | anders is Omzet YTD geen YTD meer |
| 23 | Sla op met een klant geselecteerd | anders opent de pagina met alle 774 |
| 24 | Pierre-knop met Beachclub C geselecteerd | opent `…/?klant=51&vraag=verkoopadvies`, vraag staat ingevuld, **niet verstuurd** |
| 25 | Pierre-knop zonder klantselectie | knop is uitgeschakeld (measure geeft blank) |

**Row 0 is not a formality.** `dev` and `prod` currently hold different
snapshots, and the growth figure differs between them (−30,8% vs −32,2%) while
every other figure on this page is identical. A page built against `dev` looks
entirely correct and reports the wrong percentage. `powerbi_klantdetail.md`
already says to point any real model at `main`; this is what it costs when you
do not.

## 14. Verschillen met `powerbi_klantdetail.md`

Both pages are legitimate and can coexist in one report. What they share, and
where they part:

| | Phone (`powerbi_klantdetail.md`) | Desktop (dit document) |
|---|---|---|
| Doel | verkoopgesprek, één hand, in de trein | voorbereiding, breed scherm |
| Wijntabellen | drie gescheiden tabellen per status | één tabel met statuskolom |
| Vensters | alles laatste 12 mnd | gemengd — statuskolom bepaalt het venster |
| Grafiek | geen | omzet per maand, dit jaar vs vorig |
| Verhaal | `klant_segment_reden` | `[Signaal]` banner + actiepunten |
| Kolommen per tabel | max 3 | 4–5 |
| Metingen | bestaande set | + 25 nieuwe (§3) |

**The three-table phone layout is not obsolete.** It is a better *conversation*
tool: three lists with three headings ask three different questions, where one
table with a status column asks the reader to do the grouping. This page is for
the twenty minutes before the meeting; that one is for the meeting.

If both exist in one report, the phone layout stays on the existing page and this
becomes a new page — **do not** author a phone layout for this page. Its combined
table and its chart are exactly what §3 of the other document says not to put on
a phone.
