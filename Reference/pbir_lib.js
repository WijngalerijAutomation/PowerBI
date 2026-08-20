// Gedeelde PBIR-bouwstenen voor de rapportgenerators (gen_voorraad.js,
// gen_inkoop.js, ...). Eén bron voor het huis-idioom: kleuren, tekststijlen,
// kaart/textbox/hairline/pivot-builders, filter-encoders en de project-
// scaffold. Wijzig idiomen HIER, nooit per generator — en regenereer daarna
// elk rapport dat de lib gebruikt.
const fs = require('fs');
const path = require('path');

const SCHEMA_VC = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.11.0/schema.json';

// ---------- kleuren / stijl ----------
const INK = '#1B2523', SEC = '#5C6B66', EYE = '#839182', BLUE = '#3B6FD4', HAIR = '#E4E9E4', RED = '#CC3B2F';

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

// ---------- tekststijlen ----------
const run = (value, style) => ({ value, textStyle: style });
const eyebrowStyle = { fontFamily: 'Segoe UI', fontSize: '10.5pt', color: SEC };
const topEyebrowStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI', fontSize: '11px', color: EYE };
const titleStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI', fontSize: '28pt', color: INK };
const sectionStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI Semibold', fontSize: '16px', color: INK };
const tableHeadStyle = { fontWeight: 'bold', fontFamily: 'Segoe UI Semibold', fontSize: '13px', color: INK };
const caveatStyle = { fontFamily: 'Segoe UI', fontSize: '10px', color: EYE };

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
const fIn = (name, entity, prop, values) => ({
  name,
  field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } },
  type: 'Categorical',
  filter: { Version: 2, From: [{ Name: 'f', Entity: entity, Type: 0 }],
    Where: [{ Condition: { In: {
      Expressions: [{ Column: { Expression: { SourceRef: { Source: 'f' } }, Property: prop } }],
      Values: values.map(v => [{ Literal: { Value: `'${v}'` } }]) } } }] },
  howCreated: 'User'
});
const cmp = (kind, prop, rightLit) => src => ({
  Comparison: { ComparisonKind: kind,
    Left: { Column: { Expression: { SourceRef: { Source: src } }, Property: prop } },
    Right: { Literal: { Value: rightLit } } }
});
// "is niet leeg": sluit zowel NULL als '' uit — twee Where-condities (AND).
// Een IN {''}-filter mist NULL; dit is de robuuste vorm.
const fNotBlank = (name, entity, prop) => ({
  name,
  field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } },
  type: 'Advanced',
  filter: { Version: 2, From: [{ Name: 'f', Entity: entity, Type: 0 }],
    Where: [
      { Condition: { Not: { Expression: { Comparison: { ComparisonKind: 0,
        Left: { Column: { Expression: { SourceRef: { Source: 'f' } }, Property: prop } },
        Right: { Literal: { Value: 'null' } } } } } } },
      { Condition: { Not: { Expression: { Comparison: { ComparisonKind: 0,
        Left: { Column: { Expression: { SourceRef: { Source: 'f' } }, Property: prop } },
        Right: { Literal: { Value: "''" } } } } } } }
    ] },
  howCreated: 'User'
});

// Conditional-fontColor entry voor een pivotkolom (huispatroon Statuscode):
// kleurt de cellen van `targetMeasure` via een verborgen codemeting.
const conditionalFontEntry = (codeMeasure, cases, targetMeasure) => ({
  properties: { fontColor: { solid: { color: { expr: { Conditional: { Cases: cases.map(c => (
    { Condition: { Comparison: { ComparisonKind: 0,
        Left: { Measure: { Expression: { SourceRef: { Entity: '_Metingen' } }, Property: codeMeasure } },
        Right: { Literal: { Value: c.code } } } },
      Value: { Literal: { Value: `'${c.color}'` } } }
  )), DefaultValue: { Literal: { Value: `'${INK}'` } } } } } } } },
  selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: `_Metingen.${targetMeasure}` }
});

// ---------- pivotTable ----------
// widths: [{metadata, w}] — expliciete kolombreedtes (Klantdetail-encoding).
// Nodig omdat één extreem lange naam een kolom anders zo breed duwt dat zelfs
// growToFit de laatste kolom uit beeld drukt.
// extraValuesEntries: extra objects.values-entries (bv. conditionalFontEntry).
function pivot(id, pos, z, rowsProjections, valuesProjections, filters, sortProp, widths, extraValuesEntries) {
  return {
    $schema: SCHEMA_VC, name: id,
    position: { x: pos.x, y: pos.y, z, height: pos.h, width: pos.w, tabOrder: z },
    ...(filters ? { filterConfig: { filters } } : {}),
    visual: {
      visualType: 'pivotTable',
      query: {
        queryState: {
          Rows: { projections: rowsProjections },
          Values: { projections: valuesProjections }
        },
        sortDefinition: {
          sort: [{ field: { Measure: { Expression: { SourceRef: { Entity: '_Metingen' } }, Property: sortProp.name || sortProp } }, direction: sortProp.direction || 'Descending' }],
          isDefaultSort: true
        }
      },
      objects: {
        columnHeaders: [{ properties: {
          autoSizeColumnWidth: lit('true'), columnAdjustment: lit("'growToFit'"),
          fontColor: col(SEC), backColor: col('#FFFFFF'), defaultColumnWidth: lit('90D') } }],
        values: [
          { properties: { fontColor: col(INK), backColorPrimary: col('#FFFFFF'), backColorSecondary: col('#FFFFFF') } },
          ...(extraValuesEntries || [])
        ],
        grid: [{ properties: { gridVertical: lit('false'), gridHorizontalColor: col(HAIR) } }],
        subTotals: [{ properties: { rowSubtotals: lit('false'), columnSubtotals: lit('false') } }],
        ...(widths ? { columnWidth: widths.map(cw => ({
          properties: { value: lit(cw.w + 'D') },
          selector: { metadata: cw.metadata }
        })) } : {})
      },
      visualContainerObjects: {
        stylePreset: [{ properties: { name: lit("'None'") } }],
        ...vcoPlain()
      }
    }
  };
}

// ---------- project-scaffold ----------
// Schrijft pbip + .Report-map. Geen slotnewline: Desktop serialiseert zonder,
// en elke save churnt anders.
function writeProject({ root, reportDir, pbipFile, displayName, logicalId, pageId, page, visuals }) {
  const RPT = path.join(root, reportDir);
  const w = (rel, obj) => {
    const p = path.join(RPT, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), { encoding: 'utf8' });
  };

  w('.platform', {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
    metadata: { type: 'Report', displayName },
    config: { version: '2.0', logicalId }
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
  fs.copyFileSync(path.join(root, 'Wijngalerij Klanten DEV.Report/definition/report.json'), path.join(RPT, 'definition/report.json'));
  fs.mkdirSync(path.join(RPT, 'StaticResources/SharedResources/BaseThemes'), { recursive: true });
  fs.copyFileSync(
    path.join(root, 'Wijngalerij Klanten DEV.Report/StaticResources/SharedResources/BaseThemes/CY26SU07.json'),
    path.join(RPT, 'StaticResources/SharedResources/BaseThemes/CY26SU07.json'));

  w('definition/pages/pages.json', {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json',
    pageOrder: [pageId],
    activePageName: pageId
  });
  w(`definition/pages/${pageId}/page.json`, page);
  for (const v of visuals) w(`definition/pages/${pageId}/visuals/${v.name}/visual.json`, v);
  // wees-visuals opruimen: PBIR ontdekt visuals per map, dus een verwijderde
  // push zou anders gewoon blijven renderen
  const visDir = path.join(RPT, `definition/pages/${pageId}/visuals`);
  const keep = new Set(visuals.map(v => v.name));
  if (fs.existsSync(visDir)) {
    for (const d of fs.readdirSync(visDir)) {
      if (!keep.has(d)) fs.rmSync(path.join(visDir, d), { recursive: true, force: true });
    }
  }

  fs.writeFileSync(path.join(root, pbipFile), JSON.stringify({
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json',
    version: '1.0',
    artifacts: [{ report: { path: reportDir } }],
    settings: { enableAutoRecovery: true }
  }, null, 2), { encoding: 'utf8' });
}

// Standaard paginaobject (wit canvas, FitToPage)
function pageDef({ pageId, displayName, height, filters }) {
  return {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json',
    name: pageId,
    displayName,
    displayOption: 'FitToPage',
    height,
    width: 1280,
    objects: {
      background: [{ properties: { color: col('#FFFFFF'), transparency: lit('0D') } }]
    },
    ...(filters ? { filterConfig: { filters } } : {})
  };
}

module.exports = {
  SCHEMA_VC, INK, SEC, EYE, BLUE, HAIR, RED,
  lit, col, measure, column, vcoPlain,
  run, eyebrowStyle, topEyebrowStyle, titleStyle, sectionStyle, tableHeadStyle, caveatStyle,
  textbox, card, subCard, hairline,
  fMeasureEq1, fColumn, fIn, cmp, fNotBlank, conditionalFontEntry,
  pivot, writeProject, pageDef
};
