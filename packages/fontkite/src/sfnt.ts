import { fail } from "@updf/core/internal";
import type { FontMetadata } from "@updf/fonts";
import { invalid, Reader } from "./reader.js";

const forbidden = new Set([
  "CFF ",
  "CFF2",
  "fvar",
  "gvar",
  "avar",
  "HVAR",
  "MVAR",
  "VVAR",
  "cvar",
  "COLR",
  "CPAL",
  "sbix",
  "SVG ",
  "CBDT",
  "CBLC",
  "EBDT",
  "EBLC",
  "bdat",
  "bloc",
]);
export type Tables = ReadonlyMap<string, Reader>;

export function table(tables: Tables, name: string, size: number): Reader {
  const result = tables.get(name);
  if (!result) invalid(`Missing TrueType table ${name}`);
  result.check(0, size);
  return result;
}

export function directory(bytes: Uint8Array<ArrayBuffer>): Tables {
  const font = new Reader(bytes);
  const signature = font.u32(0);
  if (signature !== 0x10000 && signature !== 0x74727565)
    invalid("Expected single-face glyf TrueType, not TTC/WOFF/CFF");
  const count = font.u16(4);
  if (!count || count > 128) invalid("Invalid table count");
  const end = 12 + count * 16;
  font.check(0, end);
  const tables = new Map<string, Reader>();
  const ranges: { offset: number; length: number }[] = [];
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(font.u8(at), font.u8(at + 1), font.u8(at + 2), font.u8(at + 3));
    const offset = font.u32(at + 8),
      length = font.u32(at + 12);
    if (!/^[\x20-\x7e]{4}$/u.test(tag) || tables.has(tag) || offset < end || offset % 4)
      invalid("Invalid/duplicate table directory entry");
    if (forbidden.has(tag)) invalid(`Unsupported font table ${tag}`);
    tables.set(tag, font.slice(offset, length));
    if (length) ranges.push({ offset, length });
  }
  ranges.sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i - 1]!.offset + ranges[i - 1]!.length > ranges[i]!.offset) invalid("Overlapping TrueType tables");
  }
  return tables;
}

export function embeddingRights(tables: Tables): FontMetadata["embeddingRights"] {
  const os2 = table(tables, "OS/2", 90);
  if (os2.u16(0) < 2 || os2.u16(0) > 5) invalid("Fontkite requires OS/2 version 2–5 with cap height");
  const rights = os2.u16(8);
  if (rights & 0x0002 || rights & 0x0200 || rights & ~0x030e)
    fail("FONT_RIGHTS", "/font/tables/OS2", "Restricted/bitmap-only/unknown embedding rights");
  return rights & 8 ? "editable" : rights & 4 ? "preview-print" : "installable";
}

export interface OutlineTables {
  readonly count: number;
  readonly metrics: number;
  readonly hmtx: Reader;
  readonly glyf: Reader;
  readonly offsets: readonly number[];
}

export function outlineTables(tables: Tables): OutlineTables {
  const head = table(tables, "head", 54),
    hhea = table(tables, "hhea", 36),
    maxp = table(tables, "maxp", 32);
  if (head.u32(0) !== 0x10000 || head.u32(12) !== 0x5f0f3cf5 || hhea.u32(0) !== 0x10000 || maxp.u32(0) !== 0x10000)
    invalid("Invalid TrueType version/magic");
  const count = maxp.u16(4),
    metrics = hhea.u16(34),
    format = head.i16(50);
  if (count < 2 || !metrics || metrics > count || (format !== 0 && format !== 1))
    invalid("Invalid glyph/metric/loca counts");
  const hmtx = table(tables, "hmtx", metrics * 4 + (count - metrics) * 2);
  const loca = table(tables, "loca", (count + 1) * (format ? 4 : 2)),
    glyf = table(tables, "glyf", 0);
  const offsets: number[] = [];
  for (let i = 0; i <= count; i++) {
    const value = format ? loca.u32(i * 4) : loca.u16(i * 2) * 2;
    const previous = offsets[i - 1] ?? 0;
    if (value < previous || value > glyf.view.byteLength || (value !== previous && value - previous < 10))
      invalid("Invalid loca range");
    offsets.push(value);
  }
  return { count, metrics, hmtx, glyf, offsets };
}
