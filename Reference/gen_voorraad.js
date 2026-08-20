// Generator: Wijngalerij Voorraad DEV — vierde rapport, gebonden aan het
// gedeelde model. Bron van waarheid voor de rapportbestanden (huisregel):
// handmatige Desktop-wijzigingen hier terugvouwen.
//
// Page-id en visual-ids zijn GEPIND (huisregel 3): een geregenereerd id
// verandert de pagina-identiteit en Desktop raakt de weg kwijt.
//
// Bouwstenen komen uit Reference/pbir_lib.js — idiomen dáár wijzigen en
// daarna elk rapport regenereren.
const {
  SCHEMA_VC, INK, SEC, BLUE, HAIR,
  lit, col, measure, column, vcoPlain,
  run, eyebrowStyle, topEyebrowStyle, titleStyle, sectionStyle, tableHeadStyle, caveatStyle,
  textbox, card, subCard, hairline,
  fMeasureEq1, fColumn, fIn, cmp, conditionalFontEntry,
  pivot, writeProject, pageDef
} = require('./pbir_lib');

const ROOT = 'C:/pbi';
const PAGE_ID = '70a6e2d94c1b8f35e7d0';
const LOGICAL_ID = 'b7e3a9c4-52d1-4f8e-9a06-c3d7f1e58b20';

// Stabiele visual-ids: e0 + volgnummer + vaste staart (20 hex).
const vid = n => 'e0' + String(n).padStart(2, '0') + '4f2a9b8c7d6e5f31';

const wijnRow = () => [column('fct_voorraad', 'product_label', { active: true, displayName: 'Wijn' })];

// ---------- visuals opbouwen ----------
const visuals = [];
let n = 1;
const id = () => vid(n++);

// -- kop --
visuals.push(textbox(id(), { x: 24, y: 56, w: 193, h: 18 }, [run('VOORRAAD', topEyebrowStyle)], 1000));
visuals.push(textbox(id(), { x: 24, y: 74, w: 700, h: 50 }, [run('Voorraad & werkkapitaal', titleStyle)], 2000));
const kopregel = subCard(id(), { x: 24, y: 126, w: 905, h: 22 }, '_Metingen', 'Voorraad kopregel sub', 3000);
kopregel.visual.objects.value[0].properties.fontSize = lit('12D');
visuals.push(kopregel);
// positie uit Desktop gevouwen (2026-08-20): rechter rand gelijk, linker rand naar rechts
visuals.push(textbox(id(), { x: 993, y: 56, w: 263, h: 18 }, [run('PEILDATUM', topEyebrowStyle)], 4000));
visuals.push(card(id(), { x: 948, y: 74, w: 308, h: 35 }, '_Metingen', 'Peildatum label', 5000, { fontSize: 16, align: 'right' }));

// -- KPI-rij --
const kpiX = [40, 282, 523, 764, 1006], KW = 229;
const EY = 168, VY = 190, SY = 234;
const kpis = [
  { eye: 'Voorraadwaarde',      val: ['fct_voorraad', 'Voorraadwaarde label'],   sub: ['_Metingen', 'Voorraadwaarde kaart sub'] },
  { eye: 'Flessen op voorraad', val: ['fct_voorraad', 'Voorraad flessen label'], sub: ['_Metingen', 'Waarde per fles sub'] },
  { eye: 'Dagen voorraad',      val: ['_Metingen', 'Dagen voorraad label'],      sub: ['_Metingen', 'Omloopsnelheid sub'] },
  { eye: 'Uitverkocht 12 mnd',  val: ['_Metingen', 'Uitverkocht 12m label'],     sub: ['_Metingen', 'Uitverkocht 12m sub'] }
];
kpis.forEach((k, i) => {
  const x = kpiX[i], z = 6000 + i * 3000;
  visuals.push(textbox(id(), { x, y: EY, w: KW, h: 19 }, [run(k.eye, eyebrowStyle)], z));
  visuals.push(card(id(), { x, y: VY, w: KW, h: 40 }, k.val[0], k.val[1], z + 1000));
  visuals.push(subCard(id(), { x, y: SY, w: KW, h: 20 }, k.sub[0], k.sub[1], z + 2000));
});
// open inkoopwaarde: live sinds 2026-08-20 — afgeleid uit verzonden open
// inkooporders in de ERP-database (was een gereserveerd blok zonder bron).
// Zelfde volgordeposities als de oude textboxen, dus dezelfde gepinde ids.
visuals.push(textbox(id(), { x: kpiX[4], y: EY, w: KW, h: 19 }, [run('Open inkoopwaarde', eyebrowStyle)], 18000));
visuals.push(card(id(), { x: kpiX[4], y: VY, w: KW, h: 40 }, '_Metingen', 'Open inkoopwaarde label', 19000));
visuals.push(subCard(id(), { x: kpiX[4], y: SY, w: KW, h: 20 }, '_Metingen', 'Open inkoopwaarde sub', 20000));

// -- scheidingslijn + grafiek --
visuals.push(hairline(id(), { x: 24, y: 292, w: 1232 }, 21000));
const chart = {
  $schema: SCHEMA_VC, name: id(),
  position: { x: 24, y: 310, z: 22000, height: 308, width: 1232, tabOrder: 22000 },
  visual: {
    visualType: 'lineChart',
    query: {
      queryState: {
        Category: { projections: [column('dim_date', 'jaar_maand', { active: true, displayName: 'Maand' })] },
        Y: { projections: [measure('_Metingen', 'Voorraadwaarde op datum wijn', 'Voorraadwaarde')] }
      },
      sortDefinition: {
        sort: [{ field: { Column: { Expression: { SourceRef: { Entity: 'dim_date' } }, Property: 'jaar_maand' } }, direction: 'Ascending' }],
        isDefaultSort: true
      }
    },
    objects: {
      dataPoint: [{ properties: { defaultColor: col(BLUE) } }],
      legend: [{ properties: { show: lit('false') } }],
      categoryAxis: [{ properties: {
        show: lit('true'), showAxisTitle: lit('false'), gridlineShow: lit('false'),
        labelColor: col(SEC), fontSize: lit('10D') } }],
      valueAxis: [{ properties: {
        show: lit('true'), showAxisTitle: lit('false'), gridlineShow: lit('true'),
        gridlineColor: col(HAIR), labelColor: col(SEC), labelDisplayUnits: lit('1000D'), fontSize: lit('10D') } }]
    },
    visualContainerObjects: {
      ...vcoPlain(),
      title: [{ properties: { show: lit('true'), text: lit("'Voorraadwaarde per maand'"), fontSize: lit('16D'), fontColor: col(INK) } }]
    }
  }
};
// filterConfig NA visual (Desktop-canonieke volgorde)
chart.filterConfig = { filters: [
  fColumn('FilterVoorraadDatumVanaf', 'dim_date', 'datum', cmp(2, 'datum', "datetime'2025-02-01T00:00:00'")),
  fColumn('FilterVoorraadSnapshot', 'dim_date', 'is_in_snapshot', cmp(0, 'is_in_snapshot', 'true'))
] };
visuals.push(chart);
visuals.push(textbox(id(), { x: 24, y: 622, w: 800, h: 18 }, [run('Waardering tegen de huidige inkoopprijs — historische kostprijs bestaat niet in het model.', caveatStyle)], 23000));

// -- rij 2: producenten (links) en uitverkocht (rechts) --
visuals.push(textbox(id(), { x: 24, y: 658, w: 500, h: 26 }, [run('Voorraadwaarde per producent — top 15', sectionStyle)], 24000));
const bar = {
  $schema: SCHEMA_VC, name: id(),
  position: { x: 24, y: 692, z: 25000, height: 380, width: 600, tabOrder: 25000 },
  visual: {
    visualType: 'barChart',
    query: {
      queryState: {
        Category: { projections: [column('fct_voorraad', 'wijnhuis', { active: true, displayName: 'Wijnhuis' })] },
        Y: { projections: [measure('_Metingen', 'Voorraadwaarde tabel', 'Voorraadwaarde')] }
      },
      sortDefinition: {
        sort: [{ field: { Measure: { Expression: { SourceRef: { Entity: '_Metingen' } }, Property: 'Voorraadwaarde tabel' } }, direction: 'Descending' }],
        isDefaultSort: true
      }
    },
    objects: {
      dataPoint: [{ properties: { defaultColor: col(BLUE) } }],
      legend: [{ properties: { show: lit('false') } }],
      categoryAxis: [{ properties: { show: lit('true'), showAxisTitle: lit('false'), gridlineShow: lit('false'), labelColor: col(INK), fontSize: lit('10D') } }],
      valueAxis: [{ properties: { show: lit('true'), showAxisTitle: lit('false'), gridlineShow: lit('true'), gridlineColor: col(HAIR), labelColor: col(SEC), labelDisplayUnits: lit('1000D'), fontSize: lit('10D') } }],
      labels: [{ properties: { show: lit('false') } }]
    },
    visualContainerObjects: { ...vcoPlain(), title: [{ properties: { show: lit('false') } }] }
  }
};
bar.filterConfig = { filters: [fMeasureEq1('FilterVoorraadTop15Wijnhuis', 'Wijnhuis in top 15 voorraad')] };
visuals.push(bar);
visuals.push(textbox(id(), { x: 656, y: 658, w: 560, h: 26 }, [run('Uitverkocht in de afgelopen 12 maanden', sectionStyle)], 26000));
visuals.push(pivot(id(), { x: 656, y: 692, w: 600, h: 380 }, 27000, wijnRow(),
  [
    measure('_Metingen', 'Uitverkocht status tabel', 'Status'),
    measure('_Metingen', 'Voorraad tabel', 'Flessen'),
    measure('_Metingen', 'Voorraadwaarde tabel', 'Waarde')
  ],
  [fMeasureEq1('FilterUitverkocht12m', 'Uitverkocht 12m vlag')],
  // geen expliciete kolombreedtes: growToFit past hier vanzelf (v2 was goed);
  // een cap van 110px liet 'weer op voorraad' juist over twee regels breken
  'Voorraadwaarde tabel'));

// -- rij 3: slow movers & dead stock --
visuals.push(hairline(id(), { x: 24, y: 1108, w: 1232 }, 28000));
visuals.push(textbox(id(), { x: 24, y: 1128, w: 600, h: 26 }, [run('Slow movers & dead stock', sectionStyle)], 29000));
const trioX = [40, 456, 873], TW = 366;
const trio = [
  { eye: 'Niet verkocht ≥ 6 mnd',  val: 'Trage voorraad 6m label', sub: 'Trage voorraad 6m sub' },
  { eye: 'Niet verkocht ≥ 9 mnd',  val: 'Trage voorraad 9m label', sub: 'Trage voorraad 9m sub' },
  { eye: 'Dead stock ≥ 12 mnd of nooit verkocht', val: 'Dead stock 12m label', sub: 'Dead stock 12m sub' }
];
trio.forEach((t, i) => {
  const x = trioX[i], z = 30000 + i * 3000;
  visuals.push(textbox(id(), { x, y: 1168, w: TW, h: 19 }, [run(t.eye, eyebrowStyle)], z));
  visuals.push(card(id(), { x, y: 1190, w: TW, h: 40 }, '_Metingen', t.val, z + 1000));
  visuals.push(subCard(id(), { x, y: 1234, w: TW, h: 20 }, '_Metingen', t.sub, z + 2000));
});

// tabellen: top 20 op waarde
const tableWidths = () => [
  { metadata: 'fct_voorraad.product_label', w: 305 },
  { metadata: '_Metingen.Mnd geen verkoop tabel', w: 100 },
  { metadata: '_Metingen.Voorraad tabel', w: 75 },
  { metadata: '_Metingen.Voorraadwaarde tabel', w: 90 }
];
const tableCols = () => [
  measure('_Metingen', 'Mnd geen verkoop tabel', 'Niet verkocht'),
  measure('_Metingen', 'Voorraad tabel', 'Flessen'),
  measure('_Metingen', 'Voorraadwaarde tabel', 'Waarde')
];
visuals.push(textbox(id(), { x: 24, y: 1290, w: 600, h: 24 }, [run('6–12 mnd niet verkocht — top 20 op waarde', tableHeadStyle)], 39000));
visuals.push(pivot(id(), { x: 24, y: 1320, w: 600, h: 330 }, 40000, wijnRow(), tableCols(),
  [
    fIn('FilterSlowBucket', 'fct_voorraad', 'niet_verkocht_bucket', ['6-12 mnd']),
    fColumn('FilterSlowVoorraad', 'fct_voorraad', 'voorraad', cmp(1, 'voorraad', '0D')),
    fMeasureEq1('FilterSlowTop20', 'In top 20 voorraad')
  ], 'Voorraadwaarde tabel', tableWidths()));
visuals.push(textbox(id(), { x: 656, y: 1290, w: 600, h: 24 }, [run('Dead stock: ≥ 12 mnd of nooit verkocht — top 20 op waarde', tableHeadStyle)], 41000));
visuals.push(pivot(id(), { x: 656, y: 1320, w: 600, h: 330 }, 42000, wijnRow(), tableCols(),
  [
    fIn('FilterDeadBucket', 'fct_voorraad', 'niet_verkocht_bucket', ['12-18 mnd', '18-24 mnd', '> 24 mnd', 'nooit verkocht']),
    fColumn('FilterDeadVoorraad', 'fct_voorraad', 'voorraad', cmp(1, 'voorraad', '0D')),
    fMeasureEq1('FilterDeadTop20', 'In top 20 voorraad')
  ], 'Voorraadwaarde tabel', tableWidths()));
// rij 4 (openstaande inkooporders, ids e044-e046) is op 2026-08-20 verhuisd
// naar het Inkoop-rapport (Reference/gen_inkoop.js); de clausule over
// verzonden inkooporders in de caveat blijft, want de KPI blijft hier staan.
visuals.push(textbox(id(), { x: 24, y: 1666, w: 1200, h: 18 },
  [run('Uitverkocht op maandeinde-basis · voorraadhistorie vanaf feb 2025 (het mutatieboek heeft geen beginvoorraad) · slow movers volgens laatste verkoopdatum · open inkoopwaarde telt alleen verzonden inkooporders', caveatStyle)], 43000));

// ---------- pagina ----------
const page = pageDef({
  pageId: PAGE_ID,
  displayName: 'Voorraad',
  height: 1700,
  filters: [
    // paginabreed: alleen echte wijnen — dienstregels (Statiegeld e.d.) en de
    // lege unknown-member rij tellen nergens mee
    fColumn('FilterVoorraadIsWijn', 'fct_voorraad', 'is_wijn', cmp(0, 'is_wijn', '1L'))
  ]
});

// ---------- schrijven ----------
writeProject({
  root: ROOT,
  reportDir: 'Wijngalerij Voorraad DEV.Report',
  pbipFile: 'Wijngalerij Voorraad DEV.pbip',
  displayName: 'Wijngalerij Voorraad DEV',
  logicalId: LOGICAL_ID,
  pageId: PAGE_ID,
  page, visuals
});
console.log(`written: ${visuals.length} visuals, page ${PAGE_ID}`);
