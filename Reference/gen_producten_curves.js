// Additieve patch: sectie "Verkoop per wijnsoort" op Producten algemeen.
// Deze pagina dateert van vóór de generator-conventie (haar generator is
// verloren), dus dit script BEZIT de pagina niet — het schrijft alleen de
// drie eigen visuals en zet de paginahoogte. Draai het gerust opnieuw; het
// raakt niets anders aan.
const fs = require('fs');
const path = require('path');
const {
  SCHEMA_VC, INK, SEC, HAIR,
  lit, col, measure, column,
  run, sectionStyle, caveatStyle,
  textbox, hairline, vcoPlain,
  fColumn, cmp
} = require('./pbir_lib');

const PAGE_DIR = 'C:/pbi/Wijngalerij Producten DEV.Report/definition/pages/bcc30b9ef6174c3bad05';

// vaste ids, eigen reeks
const IDS = {
  hairline: 'aa01c7e5d3b9f8a6e401',
  header:   'aa02c7e5d3b9f8a6e401',
  chart:    'aa03c7e5d3b9f8a6e401',
  caveat:   'aa04c7e5d3b9f8a6e401'
};

// wijn-intuïtieve serie-kleuren; scopeId-selectors per legendawaarde.
// Valt het stil terug op themakleuren, dan is dat een acceptabele degradatie
// — de screenshot-review beslist.
const SOORT_KLEUREN = {
  'Wit':        '#C9A227',
  'Rood':       '#8C2F39',
  'Rosé':       '#D98E9C',
  'Mousserend': '#3B6FD4',
  'Champagne':  '#8A6D1B',
  'Oranje':     '#D97C3B',
  'Dessert':    '#B08968',
  'Alcoholvrij':'#7FB5AE',
  'Overig':     '#8A9691'
};
const seriesFill = (waarde, kleur) => ({
  properties: { fill: { solid: { color: { expr: { Literal: { Value: `'${kleur}'` } } } } } },
  selector: { data: [{ scopeId: { Comparison: { ComparisonKind: 0,
    Left: { Column: { Expression: { SourceRef: { Entity: 'fct_sales' } }, Property: 'wijnsoort' } },
    Right: { Literal: { Value: `'${waarde}'` } } } } }] }
});

const visuals = [];

visuals.push(hairline(IDS.hairline, { x: 40, y: 1400, w: 1216 }, 24000));
visuals.push(textbox(IDS.header, { x: 40, y: 1420, w: 600, h: 26 }, [run('Verkoop per wijnsoort', sectionStyle)], 25000));

visuals.push({
  $schema: SCHEMA_VC, name: IDS.chart,
  position: { x: 40, y: 1454, z: 26000, height: 340, width: 1216, tabOrder: 26000 },
  visual: {
    visualType: 'lineChart',
    query: {
      queryState: {
        Category: { projections: [column('dim_date', 'jaar_maand', { active: true, displayName: 'Maand' })] },
        Series: { projections: [column('fct_sales', 'wijnsoort', { displayName: 'Wijnsoort' })] },
        Y: { projections: [measure('_Metingen', 'Flessen per maand', 'Flessen')] }
      },
      sortDefinition: {
        sort: [{ field: { Column: { Expression: { SourceRef: { Entity: 'dim_date' } }, Property: 'jaar_maand' } }, direction: 'Ascending' }],
        isDefaultSort: true
      }
    },
    objects: {
      dataPoint: Object.entries(SOORT_KLEUREN).map(([w, k]) => seriesFill(w, k)),
      legend: [{ properties: { show: lit('true'), position: lit("'Top'"), showTitle: lit('false'), labelColor: col(INK) } }],
      categoryAxis: [{ properties: {
        show: lit('true'), showAxisTitle: lit('false'), gridlineShow: lit('false'),
        labelColor: col(SEC), fontSize: lit('10D') } }],
      valueAxis: [{ properties: {
        show: lit('true'), showAxisTitle: lit('false'), gridlineShow: lit('true'),
        gridlineColor: col(HAIR), labelColor: col(SEC), labelDisplayUnits: lit('1000D'), fontSize: lit('10D') } }]
    },
    visualContainerObjects: { ...vcoPlain(), title: [{ properties: { show: lit('false') } }] }
  },
  // filterConfig NA visual (Desktop-canonieke volgorde)
  filterConfig: { filters: [
    fColumn('FilterWijnsoortSnapshot', 'dim_date', 'is_in_snapshot', cmp(0, 'is_in_snapshot', 'true'))
  ] }
});

visuals.push(textbox(IDS.caveat, { x: 40, y: 1802, w: 1216, h: 18 },
  [run('Wijnsoort uit de ERP-classificaties (kleur/type/streek) · voorrang: champagne > alcoholvrij > mousserend > dessert > kleur · verkoopdata vanaf okt 2024', caveatStyle)], 27000));

// ---------- schrijven ----------
for (const v of visuals) {
  const dir = path.join(PAGE_DIR, 'visuals', v.name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'visual.json'), JSON.stringify(v, null, 2), { encoding: 'utf8' });
}
// paginahoogte: alleen verhogen, nooit iets anders aanraken
const pagePath = path.join(PAGE_DIR, 'page.json');
const page = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
if (page.height < 1840) { page.height = 1840; }
fs.writeFileSync(pagePath, JSON.stringify(page, null, 2), { encoding: 'utf8' });

console.log(`patched: ${visuals.length} visuals, page height ${page.height}`);
