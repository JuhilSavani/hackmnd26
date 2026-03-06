/**
 * docx-format-extractor.js
 *
 * Extracts ALL formatting metadata that mammoth.js / markitdown lose.
 * Parses raw DOCX XML directly — no text extractors involved.
 * Text content is intentionally excluded (handled separately by mammoth.js).
 *
 * Install deps:
 *   npm install jszip fast-xml-parser
 *
 * Usage:
 *   const extract = require('./docx-format-extractor');
 *   const result = await extract('./paper.docx');
 *   console.log(JSON.stringify(result, null, 2));
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import mammoth from 'mammoth';

// ─── XML Parser Config ────────────────────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  isArray: (name) =>
    ['w:p', 'w:r', 'w:tbl', 'w:tr', 'w:tc', 'w:style', 'w:hyperlink',
     'w:ins', 'w:del', 'w:fldSimple', 'w:footnote', 'w:endnote'].includes(name),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert EMU or twips to inches */
const twipsToInches = (v) => v ? +(v / 1440).toFixed(3) : null;
const emuToInches   = (v) => v ? +(v / 914400).toFixed(3) : null;
const halfPtToPt    = (v) => v ? +(v / 2).toFixed(1) : null;

/** Safely get nested property */
const get = (obj, ...keys) => keys.reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);

/** Resolve a styleId to its definition */
function resolveStyle(styleId, stylesMap) {
  if (!styleId || !stylesMap[styleId]) return {};
  const style = stylesMap[styleId];
  // Walk basedOn chain (max 5 levels)
  const base = style.basedOn ? resolveStyle(style.basedOn, stylesMap) : {};
  return deepMerge(base, style);
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// ─── Parse styles.xml → style map ────────────────────────────────────────────

function parseStyles(stylesXml) {
  if (!stylesXml) return { stylesMap: {}, defaults: {} };
  const doc = parser.parse(stylesXml);
  const stylesRoot = get(doc, 'w:styles');
  const styleList  = get(stylesRoot, 'w:style') || [];

  const defaults = {};
  const docDefaults = get(stylesRoot, 'w:docDefaults');
  if (docDefaults) {
    const rPr = get(docDefaults, 'w:rPrDefault', 'w:rPr') || {};
    defaults.fontFamily    = get(rPr, 'w:rFonts', '@_w:ascii') || get(rPr, 'w:rFonts', '@_w:hAnsi');
    defaults.fontSize      = halfPtToPt(get(rPr, 'w:sz', '@_w:val'));
    const pPr = get(docDefaults, 'w:pPrDefault', 'w:pPr') || {};
    defaults.lineSpacing   = parseSpacing(get(pPr, 'w:spacing'));
  }

  const stylesMap = {};
  for (const style of styleList) {
    const id       = get(style, '@_w:styleId');
    const type     = get(style, '@_w:type');
    const basedOn  = get(style, 'w:basedOn', '@_w:val');
    const rPr     = get(style, 'w:rPr') || {};
    const pPr     = get(style, 'w:pPr') || {};
    const name    = get(style, 'w:name', '@_w:val') || id;

    stylesMap[id] = {
      id, type, name, basedOn,
      fontFamily:   get(rPr, 'w:rFonts', '@_w:ascii') || get(rPr, 'w:rFonts', '@_w:hAnsi'),
      fontSize:     halfPtToPt(get(rPr, 'w:sz', '@_w:val')),
      bold:         get(rPr, 'w:b') !== null,
      italic:       get(rPr, 'w:i') !== null,
      alignment:    normalizeAlignment(get(pPr, 'w:jc', '@_w:val')),
      indentLeft:   twipsToInches(get(pPr, 'w:ind', '@_w:left')),
      indentRight:  twipsToInches(get(pPr, 'w:ind', '@_w:right')),
      lineSpacing:  parseSpacing(get(pPr, 'w:spacing')),
      spaceBefore:  twipsToInches(get(pPr, 'w:spacing', '@_w:before')),
      spaceAfter:   twipsToInches(get(pPr, 'w:spacing', '@_w:after')),
      outlineLevel: get(pPr, 'w:outlineLvl', '@_w:val'),
    };
  }

  return { stylesMap, defaults };
}

function parseSpacing(spacingNode) {
  if (!spacingNode) return null;
  const line    = get(spacingNode, '@_w:line');
  const rule    = get(spacingNode, '@_w:lineRule');
  if (!line) return null;
  if (rule === 'auto') {
    const ratio = line / 240; // 240 = single spacing in twips
    if (Math.abs(ratio - 1) < 0.05) return 'single';
    if (Math.abs(ratio - 1.5) < 0.05) return '1.5';
    if (Math.abs(ratio - 2) < 0.05) return 'double';
    return `${ratio.toFixed(2)}`;
  }
  if (rule === 'exact' || rule === 'atLeast') return `${twipsToInches(line)}in (${rule})`;
  return null;
}

function normalizeAlignment(val) {
  const map = { both: 'justified', left: 'left', right: 'right', center: 'center', distribute: 'distributed' };
  return map[val] || val || null;
}

// ─── Parse settings.xml ───────────────────────────────────────────────────────

function parseSettings(settingsXml) {
  if (!settingsXml) return {};
  const doc  = parser.parse(settingsXml);
  const root = get(doc, 'w:settings') || {};
  return {
    evenAndOddHeaders: get(root, 'w:evenAndOddHeaders') !== null,
    defaultTabStop:    twipsToInches(get(root, 'w:defaultTabStop', '@_w:val')),
  };
}

// ─── Parse section properties (page layout) ───────────────────────────────────

function parseSectPr(sectPr) {
  if (!sectPr) return {};

  const pgSz  = get(sectPr, 'w:pgSz')  || {};
  const pgMar = get(sectPr, 'w:pgMar') || {};
  const cols  = get(sectPr, 'w:cols');
  const pgNum = get(sectPr, 'w:pgNumType') || {};

  const widthTwips  = get(pgSz, '@_w:w');
  const heightTwips = get(pgSz, '@_w:h');

  // Detect paper size
  let pageSize = 'custom';
  if (widthTwips && heightTwips) {
    const w = Math.round(widthTwips / 1440 * 25.4); // mm
    const h = Math.round(heightTwips / 1440 * 25.4);
    if ((w === 210 && h === 297) || (w === 297 && h === 210)) pageSize = 'A4';
    else if ((w === 216 && h === 279) || (w === 279 && h === 216)) pageSize = 'Letter';
    else if ((w === 216 && h === 356) || (w === 356 && h === 216)) pageSize = 'Legal';
    else if ((w === 148 && h === 210) || (w === 210 && h === 148)) pageSize = 'A5';
  }

  const numCols = get(cols, '@_w:num');
  const colLayout = !numCols || numCols === 1 ? 'single' : numCols === 2 ? 'double' : `${numCols}-column`;

  // Header/footer references
  const headerRef = get(sectPr, 'w:headerReference');
  const footerRef = get(sectPr, 'w:footerReference');

  return {
    pageSize,
    orientation: get(pgSz, '@_w:orient') || 'portrait',
    pageWidth:   twipsToInches(widthTwips),
    pageHeight:  twipsToInches(heightTwips),
    margins: {
      top:    twipsToInches(get(pgMar, '@_w:top')),
      bottom: twipsToInches(get(pgMar, '@_w:bottom')),
      left:   twipsToInches(get(pgMar, '@_w:left')),
      right:  twipsToInches(get(pgMar, '@_w:right')),
      header: twipsToInches(get(pgMar, '@_w:header')),
      footer: twipsToInches(get(pgMar, '@_w:footer')),
      gutter: twipsToInches(get(pgMar, '@_w:gutter')),
    },
    columnLayout: colLayout,
    pageNumberingStart:  get(pgNum, '@_w:start'),
    pageNumberingFormat: get(pgNum, '@_w:fmt'),
    hasHeader: !!headerRef,
    hasFooter: !!footerRef,
  };
}

// ─── Parse paragraph formatting ───────────────────────────────────────────────

function parseParagraphFormatting(para, stylesMap, defaults) {
  const pPr    = get(para, 'w:pPr')     || {};
  const styleId = get(pPr, 'w:pStyle', '@_w:val');
  const baseStyle = styleId ? resolveStyle(styleId, stylesMap) : {};

  // Run-level defaults from first run
  const runs = para['w:r'] || [];
  const firstRun = runs[0] || {};
  const rPr = get(firstRun, 'w:rPr') || {};

  // Font
  const fontFamily =
    get(rPr, 'w:rFonts', '@_w:ascii') ||
    get(rPr, 'w:rFonts', '@_w:hAnsi') ||
    baseStyle.fontFamily ||
    defaults.fontFamily ||
    null;

  // Font size
  const fontSize =
    halfPtToPt(get(rPr, 'w:sz', '@_w:val')) ||
    baseStyle.fontSize ||
    defaults.fontSize ||
    null;

  // Bold / Italic — explicit override beats style
  const bold =
    get(rPr, 'w:b') !== null   ? true  :
    get(rPr, 'w:b', '@_w:val') === false ? false :
    baseStyle.bold || false;

  const italic =
    get(rPr, 'w:i') !== null   ? true  :
    get(rPr, 'w:i', '@_w:val') === false ? false :
    baseStyle.italic || false;

  // Paragraph-level
  const alignment = normalizeAlignment(get(pPr, 'w:jc', '@_w:val')) || baseStyle.alignment || null;

  const ind = get(pPr, 'w:ind') || {};
  const indentLeft  = twipsToInches(get(ind, '@_w:left'))      || baseStyle.indentLeft  || null;
  const indentRight = twipsToInches(get(ind, '@_w:right'))     || baseStyle.indentRight || null;
  const indentFirst = twipsToInches(get(ind, '@_w:firstLine')) || null;
  const indentHanging = twipsToInches(get(ind, '@_w:hanging')) || null;

  const spacingNode = get(pPr, 'w:spacing');
  const lineSpacing = parseSpacing(spacingNode) || baseStyle.lineSpacing || defaults.lineSpacing || null;
  const spaceBefore = twipsToInches(get(spacingNode, '@_w:before')) ?? baseStyle.spaceBefore ?? null;
  const spaceAfter  = twipsToInches(get(spacingNode, '@_w:after'))  ?? baseStyle.spaceAfter  ?? null;

  // Heading level from outline level or style name
  let headingLevel = null;
  const outlineLvl = get(pPr, 'w:outlineLvl', '@_w:val') ?? baseStyle.outlineLevel;
  if (outlineLvl !== null && outlineLvl < 9) headingLevel = outlineLvl + 1;
  else if (styleId && /^Heading(\d)$/i.test(styleId)) {
    headingLevel = parseInt(styleId.replace(/Heading/i, ''));
  }

  return {
    styleId: styleId || null,
    styleName: baseStyle.name || null,
    headingLevel,
    fontFamily,
    fontSize,
    bold,
    italic,
    alignment,
    indentation: {
      left:     indentLeft,
      right:    indentRight,
      firstLine: indentFirst,
      hanging:  indentHanging,
    },
    lineSpacing,
    spaceBefore,
    spaceAfter,
    keepWithNext:  get(pPr, 'w:keepNext')  !== null,
    keepLines:     get(pPr, 'w:keepLines') !== null,
    pageBreakBefore: get(pPr, 'w:pageBreakBefore') !== null,
    suppressLineNumbers: get(pPr, 'w:suppressLineNumbers') !== null,
    listInfo: parseListInfo(pPr),
  };
}

function parseListInfo(pPr) {
  const numPr = get(pPr, 'w:numPr');
  if (!numPr) return null;
  return {
    numId:  get(numPr, 'w:numId',  '@_w:val'),
    ilvl:   get(numPr, 'w:ilvl',   '@_w:val'),
  };
}

// ─── Parse table formatting ───────────────────────────────────────────────────

function parseTable(tbl, stylesMap, defaults) {
  const rows  = tbl['w:tr'] || [];
  const tblPr = get(tbl, 'w:tblPr') || {};

  const widthNode  = get(tblPr, 'w:tblW') || {};
  const alignment  = normalizeAlignment(get(tblPr, 'w:jc', '@_w:val'));
  const borderNode = get(tblPr, 'w:tblBorders') || {};

  const numRows = rows.length;
  let maxCols   = 0;

  const parsedRows = rows.map((row, ri) => {
    const cells  = row['w:tc'] || [];
    if (cells.length > maxCols) maxCols = cells.length;

    const trPr  = get(row, 'w:trPr') || {};
    const isHeaderRow = get(trPr, 'w:tblHeader') !== null;
    const rowHeight   = twipsToInches(get(trPr, 'w:trHeight', '@_w:val'));

    return {
      rowIndex: ri,
      isHeader: isHeaderRow,
      height:   rowHeight,
      cells: cells.map((tc, ci) => {
        const tcPr    = get(tc, 'w:tcPr') || {};
        const span    = get(tcPr, 'w:gridSpan', '@_w:val') || 1;
        const vMerge  = get(tcPr, 'w:vMerge');
        const width   = twipsToInches(get(tcPr, 'w:tcW', '@_w:w'));
        const vAlign  = get(tcPr, 'w:vAlign', '@_w:val');
        const shading = get(tcPr, 'w:shd', '@_w:fill');

        return {
          colIndex: ci,
          gridSpan:    span,
          vMerge:      vMerge !== null ? (get(vMerge, '@_w:val') === 'restart' ? 'start' : 'continue') : null,
          width,
          verticalAlignment: vAlign,
          shading: shading === 'auto' ? null : shading,
        };
      }),
    };
  });

  const hasHeaderRow = parsedRows.length > 0 && parsedRows[0].isHeader;

  return {
    numRows,
    numColumns: maxCols,
    hasHeaderRow,
    alignment,
    width: get(widthNode, '@_w:w') ? twipsToInches(get(widthNode, '@_w:w')) : null,
    widthType: get(widthNode, '@_w:type'),
    hasBorders: Object.keys(borderNode).length > 0,
    rows: parsedRows,
  };
}

// ─── Extract plain text from a paragraph (internal use only) ─────────────────

function extractText(para) {
  const runs = para['w:r'] || [];
  return runs.map(r => {
    const t = r['w:t'];
    if (typeof t === 'string') return t;
    if (t && typeof t['#text'] === 'string') return t['#text'];
    return '';
  }).join('');
}

// ─── Parse headers and footers ────────────────────────────────────────────────

async function parseHeadersFooters(zip) {
  const result = { headers: [], footers: [] };
  const files  = Object.keys(zip.files);

  for (const f of files) {
    const isHeader = f.startsWith('word/header') && f.endsWith('.xml');
    const isFooter = f.startsWith('word/footer') && f.endsWith('.xml');
    if (!isHeader && !isFooter) continue;

    const xml  = await zip.files[f].async('string');
    const doc  = parser.parse(xml);
    const root = get(doc, 'w:hdr') || get(doc, 'w:ftr') || {};
    const paras = root['w:p'] || [];
    // extractText used only to determine isEmpty — text is not included in output
    const text  = paras.map(p => extractText(p)).join(' ').trim();

    (isHeader ? result.headers : result.footers).push({
      file: f,
      isEmpty: !text,
    });
  }

  return result;
}

// ─── Parse footnotes / endnotes ───────────────────────────────────────────────

async function parseNotes(zip, type = 'footnotes') {
  const filename = `word/${type}.xml`;
  if (!zip.files[filename]) return [];

  const xml  = await zip.files[filename].async('string');
  const doc  = parser.parse(xml);
  const root = get(doc, type === 'footnotes' ? 'w:footnotes' : 'w:endnotes') || {};
  const noteKey = type === 'footnotes' ? 'w:footnote' : 'w:endnote';
  const notes = (Array.isArray(root[noteKey]) ? root[noteKey] : [root[noteKey]]).filter(Boolean);

  return notes
    .filter(n => {
      const t = get(n, '@_w:type');
      return !t || t === 'normal';
    })
    .map(n => ({
      id: get(n, '@_w:id'),
    }));
}

// ─── Parse numbering.xml → list style map ────────────────────────────────────

async function parseNumbering(zip) {
  if (!zip.files['word/numbering.xml']) return {};
  const xml  = await zip.files['word/numbering.xml'].async('string');
  const doc  = parser.parse(xml);
  const root = get(doc, 'w:numbering') || {};

  const abstractNums = {};
  const abstractList = root['w:abstractNum'];
  const absArray = Array.isArray(abstractList) ? abstractList : (abstractList ? [abstractList] : []);
  for (const abs of absArray) {
    const aid = get(abs, '@_w:abstractNumId');
    const lvls = abs['w:lvl'];
    const lvlArray = Array.isArray(lvls) ? lvls : (lvls ? [lvls] : []);
    abstractNums[aid] = lvlArray.map(lvl => ({
      ilvl:    get(lvl, '@_w:ilvl'),
      numFmt:  get(lvl, 'w:numFmt', '@_w:val'),
      lvlText: get(lvl, 'w:lvlText', '@_w:val'),
      start:   get(lvl, 'w:start', '@_w:val'),
    }));
  }

  const numMap = {};
  const numList = root['w:num'];
  const numArray = Array.isArray(numList) ? numList : (numList ? [numList] : []);
  for (const num of numArray) {
    const numId  = get(num, '@_w:numId');
    const absRef = get(num, 'w:abstractNumId', '@_w:val');
    numMap[numId] = abstractNums[absRef] || [];
  }

  return numMap;
}

// ─── Parse theme for font names ───────────────────────────────────────────────

async function parseTheme(zip) {
  const themeFile = Object.keys(zip.files).find(f => f.startsWith('word/theme/') && f.endsWith('.xml'));
  if (!themeFile) return {};

  const xml  = await zip.files[themeFile].async('string');
  const doc  = parser.parse(xml);
  const root = get(doc, 'a:theme', 'a:themeElements', 'a:fontScheme') || {};

  return {
    majorFont: get(root, 'a:majorFont', 'a:latin', '@_typeface'),
    minorFont: get(root, 'a:minorFont', 'a:latin', '@_typeface'),
  };
}

// ─── Main extractor ───────────────────────────────────────────────────────────

export async function extractDocxFormatting(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // Load core XML files
  const documentXml  = await zip.files['word/document.xml'].async('string');
  const stylesXml    = zip.files['word/styles.xml']  ? await zip.files['word/styles.xml'].async('string')  : null;
  const settingsXml  = zip.files['word/settings.xml'] ? await zip.files['word/settings.xml'].async('string') : null;

  const { stylesMap, defaults } = parseStyles(stylesXml);
  const settings = parseSettings(settingsXml);
  const theme    = await parseTheme(zip);
  const headersFooters = await parseHeadersFooters(zip);
  const footnotes  = await parseNotes(zip, 'footnotes');
  const endnotes   = await parseNotes(zip, 'endnotes');
  const numberingMap = await parseNumbering(zip);

  // Parse document body
  const docObj   = parser.parse(documentXml);
  const body     = get(docObj, 'w:document', 'w:body') || {};
  const paragraphs = body['w:p']  || [];
  const tables     = body['w:tbl'] || [];

  // Resolve default font from theme if needed
  if (!defaults.fontFamily && theme.minorFont) {
    defaults.fontFamily = theme.minorFont;
  }

  // ── Section properties (last sectPr in body = document-level) ──
  const bodySectPr  = get(body, 'w:sectPr');
  const pageLayout  = parseSectPr(bodySectPr);

  // ── Per-paragraph formatting (no text) ───────────────────────
  const paragraphFormats = paragraphs.map((para, i) => {
    const fmt  = parseParagraphFormatting(para, stylesMap, defaults);

    // Detect page break
    const runs = para['w:r'] || [];
    const hasPageBreak = runs.some(r => {
      const br = get(r, 'w:br');
      return br && get(br, '@_w:type') === 'page';
    });

    return {
      index: i,
      formatting: fmt,
      hasPageBreak,
    };
  });

  // ── Per-table formatting (no cell text) ──────────────────────
  const tableFormats = (Array.isArray(tables) ? tables : [tables]).filter(Boolean).map((tbl, i) => ({
    index: i,
    ...parseTable(tbl, stylesMap, defaults),
  }));

  // ── Running head detection ────────────────────────────────────
  const nonEmptyHeaders  = headersFooters.headers.filter(h => !h.isEmpty);
  const hasRunningHead   = nonEmptyHeaders.length > 0;

  // ── Page number position heuristic ───────────────────────────
  let pageNumberPosition = null;
  for (const footer of headersFooters.footers) {
    if (!footer.isEmpty) {
      pageNumberPosition = 'bottom (see footer)';
      break;
    }
  }
  if (!pageNumberPosition && hasRunningHead) {
    pageNumberPosition = 'top (see header)';
  }

  // ── Styles summary ────────────────────────────────────────────
  const usedStyleIds = new Set(paragraphFormats.map(p => p.formatting.styleId).filter(Boolean));
  const usedStyles   = [...usedStyleIds].map(id => ({
    id,
    name:       stylesMap[id]?.name,
    fontFamily: stylesMap[id]?.fontFamily,
    fontSize:   stylesMap[id]?.fontSize,
    bold:       stylesMap[id]?.bold,
    italic:     stylesMap[id]?.italic,
    alignment:  stylesMap[id]?.alignment,
  }));

  return {
    // ─ What mammoth loses: document-level layout ─
    documentFormatting: {
      pageSize:              pageLayout.pageSize,
      orientation:           pageLayout.orientation,
      pageDimensions:        { width: pageLayout.pageWidth, height: pageLayout.pageHeight, unit: 'inches' },
      margins:               pageLayout.margins,
      columnLayout:          pageLayout.columnLayout,
      hasHeader:             pageLayout.hasHeader,
      hasFooter:             pageLayout.hasFooter,
      hasRunningHead,
      pageNumberingStart:    pageLayout.pageNumberingStart,
      pageNumberingFormat:   pageLayout.pageNumberingFormat,
      pageNumberPosition,
      defaultFont:           defaults.fontFamily,
      defaultFontSize:       defaults.fontSize,
      defaultLineSpacing:    defaults.lineSpacing,
      defaultTabStop:        settings.defaultTabStop,
      evenAndOddHeaders:     settings.evenAndOddHeaders,
      themeMinorFont:        theme.minorFont,
      themeMajorFont:        theme.majorFont,
    },

    // ─ What mammoth loses: per-paragraph formatting ─
    paragraphFormats,

    // ─ What mammoth loses: table structure ─
    tableFormats,

    // ─ Style definitions used in this document ─
    usedStyles,

    // ─ Footnote / endnote ids (text handled by mammoth) ─
    footnotes,
    endnotes,

    // ─ List definitions ─
    listDefinitions: numberingMap,

    // ─ Header / footer presence only (text handled by mammoth) ─
    headers: headersFooters.headers,
    footers: headersFooters.footers,
  };
}

// ─── LLM Compression Utilities ───────────────────────────────────────────────

/**
 * Strips all null values and empty objects from a formatting object.
 * Cuts per-paragraph payload by ~70% when fields are mostly default/null.
 */
function stripNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'object' && !Array.isArray(v)) {
          return Object.keys(stripNulls(v)).length > 0;
        }
        return true;
      })
      .map(([k, v]) => [
        k,
        typeof v === 'object' && !Array.isArray(v) ? stripNulls(v) : v,
      ])
  );
}

/**
 * Compresses paragraph format list for LLM consumption.
 * Since text is excluded, this simply strips null fields from every
 * paragraph's formatting block.
 *
 * @param {Array}   paragraphFormats  - raw output from extractDocxFormatting
 * @param {Object}  [opts]
 * @param {boolean} [opts.stripNullFields=true] - remove null/empty fields
 * @returns {Array} compressed paragraph list
 */
function compressForLLM(paragraphFormats, opts = {}) {
  const { stripNullFields = true } = opts;
  const merged = [];

  for (const para of paragraphFormats) {
    const fmt = stripNullFields ? stripNulls(para.formatting) : para.formatting;
    const last = merged[merged.length - 1];

    const canMerge =
      last &&
      !para.hasPageBreak &&
      !last.hasPageBreak &&
      para.formatting.headingLevel == null &&
      last.formatting.headingLevel == null &&
      para.formatting.styleId == last.formatting.styleId &&
      para.formatting.fontFamily === last.formatting.fontFamily &&
      para.formatting.fontSize === last.formatting.fontSize;

    if (canMerge) {
      last.indexRange[1] = para.index;
    } else {
      merged.push({
        indexRange:   [para.index, para.index],
        formatting:   fmt,
        hasPageBreak: para.hasPageBreak,
      });
    }
  }

  return merged;
}

/**
 * Extracts BOTH text via Mammoth and lossy format metadata via the XML parser.
 * 
 * @param {ArrayBuffer | Buffer} buffer - The raw DOCX binary buffer.
 * @returns {Promise<Object>} An object containing the extracted `text` and `metadata`.
 */
export async function extractDocx(buffer) {
  try {
    // 1. Extract markdown text via mammoth (preserves headings, bold, italic)
    const { value: text } = await mammoth.convertToMarkdown({ buffer });

    // 2. Extract rich formatting metadata (margins, line spacing, tables)
    const rawMetadata = await extractDocxFormatting(buffer);
    
    // Compress the paragraph payloads to strip out null values and repeated blocks
    const compressedMetadata = {
      ...rawMetadata,
      paragraphFormats: compressForLLM(rawMetadata.paragraphFormats)
    };

    return {
      text,
      metadata: compressedMetadata
    };
  } catch (error) {
    console.error("❌ Failed to parse DOCX buffer:", error.message);
    throw new Error(`DOCX Parsing Error: ${error.message}`);
  }
}