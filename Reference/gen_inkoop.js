// Generator: Wijngalerij Inkoop DEV — vijfde rapport ("Bestellen"), gebonden
// aan het gedeelde model. Bron van waarheid voor de rapportbestanden:
// handmatige Desktop-wijzigingen hier terugvouwen.
//
// De pagina beantwoordt "wat moet ik bestellen?" — het spiegelbeeld van de
// Voorraad-pagina ("waar zit te veel kapitaal"). Structuur volgt de
// DemandForecasting-POC (welke wijnen, in volgorde van urgentie, per
// leverancier te consolideren); het hoeveelheid-advies is een bewuste
// non-goal zolang de minimum-bestelhoeveelheid per leverancier ontbreekt.
//
// Page-id en visual-ids zijn GEPIND. Eigen reeks (f0NN…) naast Voorraads e0NN.
const {
  lit, column, measure, vcoPlain, SCHEMA_VC,
  run, eyebrowStyle, topEyebrowStyle, titleStyle, sectionStyle, caveatStyle, SEC,
  textbox, card, subCard, hairline,
  fColumn, fIn, cmp, fNotBlank, conditionalFontEntry,
  pivot, writeProject, pageDef
} = require('./pbir_lib');

const ROOT = 'C:/pbi';
const PAGE_ID = '81b7f3c2d5a9e604c1f2';
const LOGICAL_ID = 'c8f4b1d2-63e2-4a9f-8b17-d4e8f2a69c31';

// Stabiele visual-ids: f0 + volgnummer + vaste staart (20 hex).
const vid = n => 'f0' + String(n).padStart(2, '0') + '3e1d5c7b9a8f6e42';

const visuals = [];
let n = 1;
const id = () => vid(n++);

// -- kop --
visuals.push(textbox(id(), { x: 24, y: 56, w: 193, h: 18 }, [run('INKOOP', topEyebrowStyle)], 1000));
visuals.push(textbox(id(), { x: 24, y: 74, w: 700, h: 50 }, [run('Inkoop & bestellen', titleStyle)], 2000));
const kopregel = subCard(id(), { x: 24, y: 126, w: 905, h: 22 }, '_Metingen', 'Inkoop kopregel sub', 3000);
kopregel.visual.objects.value[0].properties.fontSize = lit('12D');
visuals.push(kopregel);
visuals.push(textbox(id(), { x: 993, y: 56, w: 263, h: 18 }, [run('PEILDATUM', topEyebrowStyle)], 4000));
visuals.push(card(id(), { x: 948, y: 74, w: 308, h: 35 }, '_Metingen', 'Peildatum label', 5000, { fontSize: 16, align: 'right' }));

// -- KPI-rij --
const kpiX = [40, 282, 523, 764, 1006], KW = 229;
const EY = 168, VY = 190, SY = 234;
const kpis = [
  { eye: 'Open inkoopwaarde',     val: 'Open inkoopwaarde label',      sub: 'Open orders sub' },
  { eye: 'Flessen in bestelling', val: 'Flessen in bestelling label',  sub: 'Leveranciers in bestelling sub' },
  { eye: 'Te laat',               val: 'Inkoop te laat label',         sub: 'Inkoop te laat sub' },
  { eye: 'Bestellen nu',          val: 'Bestellen nu label',           sub: 'Bestellen nu sub' },
  { eye: 'Uitverkocht mét vraag', val: 'Uitverkocht met vraag label',  sub: null }
];
kpis.forEach((k, i) => {
  const x = kpiX[i], z = 6000 + i * 3000;
  visuals.push(textbox(id(), { x, y: EY, w: KW, h: 19 }, [run(k.eye, eyebrowStyle)], z));
  visuals.push(card(id(), { x, y: VY, w: KW, h: 40 }, '_Metingen', k.val, z + 1000));
  if (k.sub) {
    visuals.push(subCard(id(), { x, y: SY, w: KW, h: 20 }, '_Metingen', k.sub, z + 2000));
  } else {
    // statische subregel: geen meting nodig voor een vaste tekst
    visuals.push(textbox(id(), { x, y: SY, w: KW, h: 20 }, [run('hier wordt nu omzet gemist', { fontFamily: 'Segoe UI', fontSize: '11px', color: SEC })], z + 2000));
  }
});

// -- bestellijst --
visuals.push(hairline(id(), { x: 24, y: 292, w: 1232 }, 21000));
visuals.push(textbox(id(), { x: 24, y: 310, w: 650, h: 26 }, [run('Bestellijst — bijna of niet leverbaar, mét vraag', sectionStyle)], 22000));
// leverancier-slicer: consolideren per leverancier (POC-structuur). Dropdown,
// hoogte ≥ 76 en selfFilterEnabled voor de zoekbox (huisregels). GEEN
// voorselectie; selecteren via de dropdown, niet via typen+enter — typen laat
// Desktop een corrupt general.selfFilter wegschrijven (gedocumenteerde val).
visuals.push({
  $schema: SCHEMA_VC, name: id(),
  position: { x: 948, y: 296, z: 23000, height: 76, width: 308, tabOrder: 23000 },
  visual: {
    visualType: 'slicer',
    query: { queryState: { Values: { projections: [column('fct_voorraad', 'leverancier', { active: true })] } } },
    objects: {
      data: [{ properties: { mode: lit("'Dropdown'") } }],
      header: [{ properties: { show: lit('true'), text: lit("'Leverancier'") } }],
      general: [{ properties: { selfFilterEnabled: lit('true') } }]
    },
    visualContainerObjects: vcoPlain()
  }
});
const bestellijstFilters = [
  fIn('FilterBestellijstStatus', 'fct_voorraad', 'voorraadstatus', ['Niet leverbaar', 'Onder kritisch', 'Let op']),
  fColumn('FilterBestellijstVraag', 'fct_voorraad', 'flessen_12w', cmp(1, 'flessen_12w', '0D')),
  fColumn('FilterBestellijstCollectie', 'fct_voorraad', 'is_collectiepost', cmp(0, 'is_collectiepost', 'false')),
  fNotBlank('FilterBestellijstLeverancier', 'fct_voorraad', 'leverancier')
];
visuals.push(pivot(id(), { x: 24, y: 392, w: 1232, h: 560 }, 24000,
  [column('fct_voorraad', 'product_label', { active: true, displayName: 'Wijn' })],
  [
    measure('_Metingen', 'Bestellijst status', 'Status'),
    measure('_Metingen', 'Effectief tabel', 'Effectief'),
    measure('_Metingen', 'Bestellijst vraag per week', 'Vraag/wk'),
    measure('_Metingen', 'Dekking tabel', 'Dekking (wk)'),
    measure('_Metingen', 'Levertijd tabel', 'Levertijd'),
    measure('_Metingen', 'Bestellijst leverancier', 'Leverancier')
  ],
  bestellijstFilters,
  { name: 'Bestellijst sortering', direction: 'Ascending' },
  [
    { metadata: 'fct_voorraad.product_label', w: 320 },
    { metadata: '_Metingen.Bestellijst status', w: 105 },
    { metadata: '_Metingen.Effectief tabel', w: 75 },
    { metadata: '_Metingen.Bestellijst vraag per week', w: 75 },
    { metadata: '_Metingen.Dekking tabel', w: 85 },
    { metadata: '_Metingen.Levertijd tabel', w: 85 },
    { metadata: '_Metingen.Bestellijst leverancier', w: 200 }
  ],
  // rood voor Niet leverbaar / Onder kritisch (Let op blijft inkt — de tekst zegt het al)
  [conditionalFontEntry('Bestellijst statuscode', [{ code: '1D', color: '#CC3B2F' }], 'Bestellijst status')]));

// -- openstaande inkooporders (verhuisd van de Voorraad-pagina, 2026-08-20) --
visuals.push(hairline(id(), { x: 24, y: 980, w: 1232 }, 25000));
visuals.push(textbox(id(), { x: 24, y: 1000, w: 600, h: 26 }, [run('Openstaande inkooporders', sectionStyle)], 26000));
visuals.push(pivot(id(), { x: 24, y: 1034, w: 1232, h: 350 }, 27000,
  [column('fct_inkoop_open', 'inkoop_label', { active: true, displayName: 'Inkooporder' })],
  [
    measure('_Metingen', 'Inkoop besteld tabel', 'Besteld'),
    measure('_Metingen', 'Inkoop dagen open', 'Dagen open'),
    measure('_Metingen', 'Inkoop levering tabel', 'Levering'),
    measure('_Metingen', 'Inkoop flessen tabel', 'Flessen'),
    measure('_Metingen', 'Inkoop waarde tabel', 'Waarde')
  ],
  null, 'Inkoop dagen open', null,
  [conditionalFontEntry('Inkoop te laat code', [{ code: '1D', color: '#CC3B2F' }], 'Inkoop levering tabel')]));

visuals.push(textbox(id(), { x: 24, y: 1400, w: 1200, h: 18 },
  [run('Bestellijst: alleen wijnen mét vraag in de laatste 12 weken en mét leverancier · te laat is een bellijst, geen vonnis · alleen verzonden inkooporders tellen · levertijd met ~ is de 21-dagen standaardaanname · bestelhoeveelheid-advies volgt zodra de minimum-bestelhoeveelheid per leverancier bekend is', caveatStyle)], 28000));

// ---------- pagina ----------
const page = pageDef({
  pageId: PAGE_ID,
  displayName: 'Bestellen',
  height: 1436,
  filters: [
    fColumn('FilterInkoopIsWijn', 'fct_voorraad', 'is_wijn', cmp(0, 'is_wijn', '1L'))
  ]
});

writeProject({
  root: ROOT,
  reportDir: 'Wijngalerij Inkoop DEV.Report',
  pbipFile: 'Wijngalerij Inkoop DEV.pbip',
  displayName: 'Wijngalerij Inkoop DEV',
  logicalId: LOGICAL_ID,
  pageId: PAGE_ID,
  page, visuals
});
console.log(`written: ${visuals.length} visuals, page ${PAGE_ID}`);
