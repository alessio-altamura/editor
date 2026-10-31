// The widths of a text in the base fonts (§0.5), read from their WOFF2 files: the
// character map and the advance widths, at the default instance of the variable font,
// without kerning. The drawing of a chart measures its labels with them, so Vega knows
// when they do not fit; the same files always give the same widths.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { BASE_FONTS, type GenericFamily } from './base-stylesheet.js';

interface Metrics {
  unitsPerEm: number;
  advances: number[];
  glyphOf: (codePoint: number) => number;
}

/** The tags of the table directory of WOFF2, by their index (W3C WOFF2 §5.1), as far as needed. */
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx'];

function readBase128(bytes: Buffer, at: { offset: number }): number {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = bytes[at.offset++]!;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error('UIntBase128 too long');
}

/** The tables of a WOFF2 file: cmap, head, hhea, hmtx, as in the font they come from. */
function woff2Tables(file: Buffer): Map<string, Buffer> {
  if (file.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file');
  const numTables = file.readUInt16BE(12);
  const compressedSize = file.readUInt32BE(20);
  const at = { offset: 48 };
  const entries: Array<{ tag: string; length: number }> = [];
  for (let i = 0; i < numTables; i++) {
    const flags = file[at.offset++]!;
    const index = flags & 0x3f;
    let tag = KNOWN_TAGS[index] ?? `#${index}`;
    if (index === 63) {
      tag = file.toString('latin1', at.offset, at.offset + 4);
      at.offset += 4;
    }
    const version = flags >> 6;
    const origLength = readBase128(file, at);
    // glyf and loca are transformed with version 0, the others with a version other than 0.
    const transformed = index === 10 || index === 11 ? version === 0 : version !== 0;
    const length = transformed ? readBase128(file, at) : origLength;
    if (transformed && tag === 'hmtx') throw new Error('transformed hmtx');
    entries.push({ tag, length });
  }
  const data = brotliDecompressSync(file.subarray(at.offset, at.offset + compressedSize));
  const tables = new Map<string, Buffer>();
  let offset = 0;
  for (const { tag, length } of entries) {
    tables.set(tag, data.subarray(offset, offset + length));
    offset += length;
  }
  return tables;
}

/** The glyph of a code point, from a cmap subtable of format 12, or else 4 (Windows Unicode). */
function characterMap(cmap: Buffer): (codePoint: number) => number {
  const count = cmap.readUInt16BE(2);
  let format4: Buffer | null = null;
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const sub = cmap.subarray(cmap.readUInt32BE(8 + i * 8));
    if (platform === 3 && encoding === 10 && sub.readUInt16BE(0) === 12) {
      const groups = sub.readUInt32BE(12);
      return (codePoint) => {
        for (let g = 0; g < groups; g++) {
          const start = sub.readUInt32BE(16 + g * 12);
          const end = sub.readUInt32BE(20 + g * 12);
          if (codePoint >= start && codePoint <= end) return sub.readUInt32BE(24 + g * 12) + codePoint - start;
        }
        return 0;
      };
    }
    if (platform === 3 && encoding === 1 && sub.readUInt16BE(0) === 4) format4 = sub;
  }
  if (format4 === null) throw new Error('no Unicode cmap');
  const sub = format4;
  const segments = sub.readUInt16BE(6) / 2;
  return (codePoint) => {
    if (codePoint > 0xffff) return 0;
    for (let s = 0; s < segments; s++) {
      const end = sub.readUInt16BE(14 + s * 2);
      if (codePoint > end) continue;
      const start = sub.readUInt16BE(16 + segments * 2 + s * 2);
      if (codePoint < start) return 0;
      const delta = sub.readInt16BE(16 + segments * 4 + s * 2);
      const rangeAt = 16 + segments * 6 + s * 2;
      const range = sub.readUInt16BE(rangeAt);
      if (range === 0) return (codePoint + delta) & 0xffff;
      const glyph = sub.readUInt16BE(rangeAt + range + (codePoint - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

function readMetrics(file: Buffer): Metrics {
  const tables = woff2Tables(file);
  const head = tables.get('head')!;
  const hhea = tables.get('hhea')!;
  const hmtx = tables.get('hmtx')!;
  const metricsCount = hhea.readUInt16BE(34);
  const advances = Array.from({ length: metricsCount }, (_, i) => hmtx.readUInt16BE(i * 4));
  return { unitsPerEm: head.readUInt16BE(18), advances, glyphOf: characterMap(tables.get('cmap')!) };
}

const fontsFolder = fileURLToPath(new URL('../../fonts/', import.meta.url));
const loaded = new Map<string, Metrics>();

/** The metrics of a base font, for a family name or a generic family, normal or italic; null for another font. */
function metricsOf(family: string, italic: boolean): Metrics | null {
  const generic = (Object.keys(BASE_FONTS) as GenericFamily[]).find((key) => key === family || BASE_FONTS[key].family === family);
  if (generic === undefined) return null;
  const file = BASE_FONTS[generic][italic ? 'italic' : 'normal'];
  let metrics = loaded.get(file);
  if (metrics === undefined) loaded.set(file, (metrics = readMetrics(readFileSync(fontsFolder + file))));
  return metrics;
}

/**
 * The width of a text in px: in the first family of the list that is a base font, at its
 * size; null when none is, for the caller to estimate.
 */
export function textWidth(text: string, families: string, size: number, italic = false): number | null {
  for (const family of families.split(',').map((item) => item.trim().replace(/^["']|["']$/g, ''))) {
    const metrics = metricsOf(family, italic);
    if (metrics === null) continue;
    let units = 0;
    for (const character of text) {
      const glyph = metrics.glyphOf(character.codePointAt(0)!);
      units += metrics.advances[Math.min(glyph, metrics.advances.length - 1)] ?? 0;
    }
    return (units / metrics.unitsPerEm) * size;
  }
  return null;
}
