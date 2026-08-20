// Generator: Wijngalerij Voorraad DEV — vierde rapport, gebonden aan het
// gedeelde model. Bron van waarheid voor de rapportbestanden (huisregel):
// handmatige Desktop-wijzigingen hier terugvouwen.
//
// Page-id en visual-ids zijn GEPIND (huisregel 3): een geregenereerd id
// verandert de pagina-identiteit en Desktop raakt de weg kwijt.
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/pbi';
const RPT = path.join(ROOT, 'Wijngalerij Voorraad DEV.Report');
const PAGE_ID = '70a6e2d94c1b8f35e7d0';
const LOGICAL_ID = 'b7e3a9c4-52d1-4f8e-9a06-c3d7f1e58b20';
const SCHEMA_VC = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.11.0/schema.json';

// Stabiele visual-ids: e0 + volgnummer + vaste staart (20 hex).
const vid = n => 'e0' + String(n).padStart(2, '0') + '4f2a9b8c7d6e5f31';

// ---------- kleuren / stijl ----------
const INK = '#1B2523', SEC = '#5C6B66', EYE = '#839182', BLUE = '#3B6FD4', HAIR = '#E4E9E4';

const lit = v => ({ expr: { Literal: { Value: v } } });
const col = c => ({ solid: { color: { expr: { Literal: { Value: `'${c}'` } } } } });
const measure = (entity, prop, displayName) => ({
  field: { Measure: { Expression: { SourceRef: { Entity: entity } }, Property: prop } },
  queryRef: `${entity}.${prop}`, nativeQueryRef: prop,
  ...(displayName ? { displayName } : {})
});
const column = (entity, prop, extra) => ({
  field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } },
  queryRef: `${entity}.${prop}`, nativeQueryRef: prop, ...(extra || {})
});

// VCO: geen achtergrond/rand, padding 0 (huis-idioom)
const vcoPlain = () => ({
  background: [{ properties: { show: lit('false') } }],
  border: [{ properties: { show: lit('false') } }],
  padding: [{ properties: { top: lit('0D'), bottom: lit('0D'), left: lit('0D'), right: lit('0D') } }]
});

// ---------- bouwstenen ----------
function textbox(id, pos, runs, z) {
  return {
    $schema: SCHEMA_VC, name: id,
    position: { x: pos.x, y: pos.y, z, height: pos.h, width: pos.w, tabOrder: z },
    visual: {
      visualType: 'textbox',
      objects: { general: [{ properties: { paragraphs: [{ textRuns: runs }] } }] },
      visualContainerObjects: vcoPlain()
    }
  };
}
const run = (value, style) => ({ value, textStyle: style });
const eyebrowStyle = { fontFamily: 'Segoe UI', fontSize: '10.5pt', color: SEC };
const topEyebrowStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI', fontSize: '11px', color: EYE };
const sectionStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI Semibold', fontSize: '16px', color: INK };
const tableHeadStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI Semibold', fontSize: '13px', color: INK };
const caveatStyle = { fontFamily: 'Segoe UI', fontSize: '10px', color: EYE };

function card(id, pos, entity, prop, z, opts) {
  const o = opts || {};
  const valueProps = {
    fontSize: lit((o.fontSize || 26) + 'D'),
    horizontalAlignment: lit(`'${o.align || 'left'}'`),
    fontColor: col(o.color || INK)
  };
  if (!o.color || o.color === INK) valueProps.bold = lit('true');
  return {
    $schema: SCHEMA_VC, name: id,
    position: { x: pos.x, y: pos.y, z, height: pos.h, width: pos.w, tabOrder: z },
    visual: {
      visualType: 'cardVisual',
      query: { queryState: { Data: { projections: [measure(entity, prop)] } } },
      objects: {
        value: [{ properties: valueProps, selector: { id: 'default' } }],
        label: [{ properties: { show: lit('false') }, selector: { id: 'default' } }],
        outline: [{ properties: { show: lit('false') }, selector: { id: 'default' } }],
        padding: [{ properties: { paddingIndividual: lit('false'), paddingUniform: lit('0L') }, selector: { id: 'default' } }],
        layout: [{ properties: {
          paddingIndividual: lit('false'), paddingUniform: lit('0L'),
          topOuterMargin: lit('0L'), bottomOuterMargin: lit('0L'),
          leftOuterMargin: lit('0L'), rightOuterMargin: lit('0L') }, selector: { id: 'default' } }],
        spacing: [{ properties: { verticalSpacing: lit('0D') }, selector: { id: 'default' } }]
      },
      visualContainerObjects: vcoPlain()
    }
  };
}
// sub-kaart: 11D secundair, niet vet
const subCard = (id, pos, entity, prop, z) => card(id, pos, entity, prop, z, { fontSize: 11, color: SEC });

function hairline(id, pos, z) {
  return {
    $schema: SCHEMA_VC, name: id,
    position: { x: pos.x, y: pos.y, z, height: 1, width: pos.w, tabOrder: z },
    visual: {
      visualType: 'shape',
      objects: {
        shape: [{ properties: { tileShape: lit("'rectangle'") }, selector: { id: 'default' } }],
        fill: [{ properties: { show: lit('true'), fillColor: col(HAIR), transparency: lit('0D') }, selector: { id: 'default' } }],
        // dubbele entry (met en zonder selector): anders tekent het thema een 1px accentlijn
        outline: [
          { properties: { show: lit('false') }, selector: { id: 'default' } },
          { properties: { show: lit('false') } }
        ]
      },
      visualContainerObjects: { border: [{ properties: { show: lit('false') } }], background: [{ properties: { show: lit('false') } }] }
    }
  };
}

// ---------- filterbouwstenen ----------
const fMeasureEq1 = (name, prop) => ({
  name,
  field: { Measure: { Expression: { SourceRef: { Entity: '_Metingen' } }, Property: prop } },
  type: 'Advanced',
  filter: { Version: 2, From: [{ Name: 'm', Entity: '_Metingen', Type: 0 }],
    Where: [{ Condition: { Comparison: { ComparisonKind: 0,
      Left: { Measure: { Expression: { SourceRef: { Source: 'm' } }, Property: prop } },
      Right: { Literal: { Value: '1L' } } } } }] },
  howCreated: 'User'
});
const fColumn = (name, entity, prop, condition) => ({
  name,
  field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } },
  type: 'Advanced',
  filter: { Version: 2, From: [{ Name: 'f', Entity: entity, Type: 0 }], Where: [{ Condition: condition('f') }] },
  howCreated: 'User'
});
const fBucketIn = (name, values) => ({
  name,
  field: { Column: { Expression: { SourceRef: { Entity: 'fct_voorraad' } }, Property: 'niet_verkocht_bucket' } },
  type: 'Categorical',
  filter: { Version: 2, From: [{ Name: 'f', Entity: 'fct_voorraad', Type: 0 }],
    Where: [{ Condition: { In: {
      Expressions: [{ Column: { Expression: { SourceRef: { Source: 'f' } }, Property: 'niet_verkocht_bucket' } }],
      Values: values.map(v => [{ Literal: { Value: `'${v}'` } }]) } } }] },
  howCreated: 'User'
});
const cmp = (kind, prop, rightLit) => src => ({
  Comparison: { ComparisonKind: kind,
    Left: { Column: { Expression: { SourceRef: { Source: src } }, Property: prop } },
    Right: { Literal: { Value: rightLit } } }
});

// ---------- pivotTable ----------
function pivot(id, pos, z, valuesProjections, filters, sortProp) {
  return {
    $schema: SCHEMA_VC, name: id,
    position: { x: pos.x, y: pos.y, z, height: pos.h, width: pos.w, tabOrder: z },
    ...(filters ? { filterConfig: { filters } } : {}),
    visual: {
      visualType: 'pivotTable',
      query: {
        queryState: {
          Rows: { projections: [column('fct_voorraad', 'product_label', { active: true, displayName: 'Wijn' })] },
          Values: { projections: valuesProjections }
        },
        sortDefinition: {
          sort: [{ field: { Measure: { Expression: { SourceRef: { Entity: '_Metingen' } }, Property: sortProp } }, direction: 'Descending' }],
          isDefaultSort: true
        }
      },
      objects: {
        columnHeaders: [{ properties: {
          autoSizeColumnWidth: lit('true'), columnAdjustment: lit("'fitToContent'"),
          fontColor: col(SEC), backColor: col('#FFFFFF'), defaultColumnWidth: lit('90D') } }],
        values: [{ properties: { fontColor: col(INK), backColorPrimary: col('#FFFFFF'), backColorSecondary: col('#FFFFFF') } }],
        grid: [{ properties: { gridVertical: lit('false'), gridHorizontalColor: col(HAIR) } }],
        subTotals: [{ properties: { rowSubtotals: lit('false'), columnSubtotals: lit('false') } }]
      },
      visualContainerObjects: {
        stylePreset: [{ properties: { name: lit("'None'") } }],
        ...vcoPlain()
      }
    }
  };
}

// ---------- visuals opbouwen ----------
const visuals = [];
let n = 1;
const id = () => vid(n++);

// -- kop --
visuals.push(textbox(id(), { x: 24, y: 56, w: 193, h: 18 }, [run('VOORRAAD', topEyebrowStyle)], 1000));
visuals.push(textbox(id(), { x: 24, y: 74, w: 700, h: 44 }, [run('Voorraad & werkkapitaal', { fontWeight: 'bold', fontFamily: 'Segoe UI', fontSize: '28pt', color: INK })], 2000));
const kopregel = subCard(id(), { x: 24, y: 122, w: 905, h: 22 }, '_Metingen', 'Voorraad kopregel sub', 3000);
kopregel.visual.objects.value[0].properties.fontSize = lit('12D');
visuals.push(kopregel);
visuals.push(textbox(id(), { x: 948, y: 56, w: 308, h: 18 }, [run('PEILDATUM', topEyebrowStyle)], 4000));
visuals.push(card(id(), { x: 948, y: 74, w: 308, h: 35 }, '_Metingen', 'Peildatum label', 5000, { fontSize: 20, align: 'right' }));

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
// gereserveerd blok: open inkoopwaarde heeft nog geen bron (in_bestelling niet gevalideerd)
visuals.push(textbox(id(), { x: kpiX[4], y: EY, w: KW, h: 19 }, [run('Open inkoopwaarde', eyebrowStyle)], 18000));
visuals.push(textbox(id(), { x: kpiX[4], y: VY, w: KW, h: 42 }, [run('—', { fontWeight: 'bold', fontFamily: 'Segoe UI', fontSize: '26pt', color: EYE })], 19000));
visuals.push(textbox(id(), { x: kpiX[4], y: SY, w: KW, h: 34 }, [run('geen bron — in_bestelling wacht op validatie', { fontFamily: 'Segoe UI', fontSize: '11px', color: SEC })], 20000));

// -- scheidingslijn + grafiek --
visuals.push(hairline(id(), { x: 24, y: 292, w: 1232 }, 21000));
const chart = {
  $schema: SCHEMA_VC, name: id(),
  position: { x: 24, y: 310, z: 22000, height: 308, width: 1232, tabOrder: 22000 },
  filterConfig: { filters: [
    fColumn('FilterVoorraadDatumVanaf', 'dim_date', 'datum', cmp(2, 'datum', "datetime'2025-02-01T00:00:00'")),
    fColumn('FilterVoorraadSnapshot', 'dim_date', 'is_in_snapshot', cmp(0, 'is_in_snapshot', 'true'))
  ] },
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
visuals.push(chart);
visuals.push(textbox(id(), { x: 24, y: 622, w: 800, h: 18 }, [run('Waardering tegen de huidige inkoopprijs — historische kostprijs bestaat niet in het model.', caveatStyle)], 23000));

// -- rij 2: producenten (links) en uitverkocht (rechts) --
visuals.push(textbox(id(), { x: 24, y: 658, w: 500, h: 26 }, [run('Voorraadwaarde per producent — top 15', sectionStyle)], 24000));
const bar = {
  $schema: SCHEMA_VC, name: id(),
  position: { x: 24, y: 692, z: 25000, height: 380, width: 600, tabOrder: 25000 },
  filterConfig: { filters: [fMeasureEq1('FilterVoorraadTop15Wijnhuis', 'Wijnhuis in top 15 voorraad')] },
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
visuals.push(bar);
visuals.push(textbox(id(), { x: 656, y: 658, w: 560, h: 26 }, [run('Uitverkocht in de afgelopen 12 maanden', sectionStyle)], 26000));
visuals.push(pivot(id(), { x: 656, y: 692, w: 600, h: 380 }, 27000,
  [
    measure('_Metingen', 'Uitverkocht status tabel', 'Status'),
    measure('_Metingen', 'Voorraad tabel', 'Flessen nu'),
    measure('_Metingen', 'Voorraadwaarde tabel', 'Waarde nu')
  ],
  [fMeasureEq1('FilterUitverkocht12m', 'Uitverkocht 12m vlag')],
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
const tableCols = () => [
  measure('_Metingen', 'Mnd geen verkoop tabel', 'Niet verkocht'),
  measure('_Metingen', 'Voorraad tabel', 'Flessen'),
  measure('_Metingen', 'Voorraadwaarde tabel', 'Waarde')
];
visuals.push(textbox(id(), { x: 24, y: 1290, w: 600, h: 24 }, [run('6–12 mnd niet verkocht — top 20 op waarde', tableHeadStyle)], 39000));
visuals.push(pivot(id(), { x: 24, y: 1320, w: 600, h: 330 }, 40000, tableCols(),
  [
    fBucketIn('FilterSlowBucket', ['6-12 mnd']),
    fColumn('FilterSlowVoorraad', 'fct_voorraad', 'voorraad', cmp(1, 'voorraad', '0D')),
    fMeasureEq1('FilterSlowTop20', 'In top 20 voorraad')
  ], 'Voorraadwaarde tabel'));
visuals.push(textbox(id(), { x: 656, y: 1290, w: 600, h: 24 }, [run('Dead stock: ≥ 12 mnd of nooit verkocht — top 20 op waarde', tableHeadStyle)], 41000));
visuals.push(pivot(id(), { x: 656, y: 1320, w: 600, h: 330 }, 42000, tableCols(),
  [
    fBucketIn('FilterDeadBucket', ['12-18 mnd', '18-24 mnd', '> 24 mnd', 'nooit verkocht']),
    fColumn('FilterDeadVoorraad', 'fct_voorraad', 'voorraad', cmp(1, 'voorraad', '0D')),
    fMeasureEq1('FilterDeadTop20', 'In top 20 voorraad')
  ], 'Voorraadwaarde tabel'));
visuals.push(textbox(id(), { x: 24, y: 1666, w: 1100, h: 18 },
  [run('Uitverkocht op maandeinde-basis · voorraadhistorie vanaf feb 2025 (het mutatieboek heeft geen beginvoorraad) · slow movers volgens laatste verkoopdatum', caveatStyle)], 43000));

// ---------- pagina ----------
const page = {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json',
  name: PAGE_ID,
  displayName: 'Voorraad',
  displayOption: 'FitToPage',
  height: 1700,
  width: 1280,
  objects: {
    background: [{ properties: { color: col('#FFFFFF'), transparency: lit('0D') } }]
  },
  filterConfig: {
    filters: [
      // paginabreed: alleen echte wijnen — dienstregels (Statiegeld e.d.) en de
      // lege unknown-member rij tellen nergens mee
      fColumn('FilterVoorraadIsWijn', 'fct_voorraad', 'is_wijn', cmp(0, 'is_wijn', '1L'))
    ]
  }
};

// ---------- schrijven ----------
const w = (rel, obj) => {
  const p = path.join(RPT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', { encoding: 'utf8' });
};

w('.platform', {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
  metadata: { type: 'Report', displayName: 'Wijngalerij Voorraad DEV' },
  config: { version: '2.0', logicalId: LOGICAL_ID }
});
w('definition.pbir', {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json',
  version: '4.0',
  datasetReference: { byPath: { path: '../Wijngalerij Semantic Model DEV.SemanticModel' } }
});
w('definition/version.json', {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json',
  version: '2.0.0'
});
// report.json + thema: kopie van het Klanten-rapport (zelfde thema, zelfde instellingen)
fs.mkdirSync(path.join(RPT, 'definition'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'Wijngalerij Klanten DEV.Report/definition/report.json'), path.join(RPT, 'definition/report.json'));
fs.mkdirSync(path.join(RPT, 'StaticResources/SharedResources/BaseThemes'), { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'Wijngalerij Klanten DEV.Report/StaticResources/SharedResources/BaseThemes/CY26SU07.json'),
  path.join(RPT, 'StaticResources/SharedResources/BaseThemes/CY26SU07.json'));

w('definition/pages/pages.json', {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json',
  pageOrder: [PAGE_ID],
  activePageName: PAGE_ID
});
w(`definition/pages/${PAGE_ID}/page.json`, page);
for (const v of visuals) w(`definition/pages/${PAGE_ID}/visuals/${v.name}/visual.json`, v);

// .pbip in de projectroot
fs.writeFileSync(path.join(ROOT, 'Wijngalerij Voorraad DEV.pbip'), JSON.stringify({
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json',
  version: '1.0',
  artifacts: [{ report: { path: 'Wijngalerij Voorraad DEV.Report' } }],
  settings: { enableAutoRecovery: true }
}, null, 2) + '\n', { encoding: 'utf8' });

console.log(`written: ${visuals.length} visuals, page ${PAGE_ID}`);
