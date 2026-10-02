import type { FontMetadata } from "@updf/core/fonts";
import { fail } from "@updf/core/internal";
import { checkCmap } from "./cmap.js";

interface Table {
  readonly offset: number;
  readonly length: number;
}
const forbidden = [
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
];

function directory(view: DataView): ReadonlyMap<string, Table> {
  if (view.byteLength < 12) fail("FONT_FORMAT", "/font/bytes", "Truncated sfnt header");
  const signature = view.getUint32(0);
  if (signature !== 0x00010000 && signature !== 0x74727565)
    fail("FONT_FORMAT", "/font/bytes", "Only single-face glyf TrueType sfnt is supported (not TTC/WOFF/CFF)");
  const count = view.getUint16(4);
  const end = 12 + 16 * count;
  if (!count || count > 128 || end > view.byteLength)
    fail("FONT_FORMAT", "/font/bytes", "Invalid table directory bounds");
  const tables = new Map<string, Table>();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(at),
      view.getUint8(at + 1),
      view.getUint8(at + 2),
      view.getUint8(at + 3),
    );
    const offset = view.getUint32(at + 8);
    const length = view.getUint32(at + 12);
    if (
      !/^[\x20-\x7e]{4}$/.test(tag) ||
      tables.has(tag) ||
      offset < end ||
      offset % 4 ||
      length > view.byteLength - offset
    ) {
      fail("FONT_FORMAT", "/font/tables", "Duplicate/invalid/out-of-bounds table");
    }
    if (forbidden.includes(tag))
      fail("FONT_FORMAT", `/font/tables/${tag.trim()}`, "CFF/variable/color/bitmap fonts are unsupported");
    tables.set(tag, { offset, length });
  }
  const ordered = [...tables.values()].filter((table) => table.length).sort((a, b) => a.offset - b.offset);
  ordered.forEach((table, i) => {
    const previous = ordered[i - 1];
    if (previous && previous.offset + previous.length > table.offset)
      fail("FONT_FORMAT", "/font/tables", "Overlapping tables");
  });
  return tables;
}

function required(tables: ReadonlyMap<string, Table>, name: string, minimum: number): Table {
  const table = tables.get(name);
  if (!table || table.length < minimum)
    fail("FONT_FORMAT", `/font/tables/${name}`, "Missing/truncated required TrueType table");
  return table;
}

function outlines(view: DataView, tables: ReadonlyMap<string, Table>): void {
  const head = required(tables, "head", 54);
  const hhea = required(tables, "hhea", 36);
  const maxp = required(tables, "maxp", 32);
  if (
    view.getUint32(head.offset + 12) !== 0x5f0f3cf5 ||
    view.getUint32(hhea.offset) !== 0x00010000 ||
    view.getUint32(maxp.offset) !== 0x00010000
  )
    fail("FONT_FORMAT", "/font/tables", "Invalid TrueType table versions/magic");
  const count = view.getUint16(maxp.offset + 4);
  const metrics = view.getUint16(hhea.offset + 34);
  const format = view.getInt16(head.offset + 50);
  if (count < 2 || metrics < 1 || metrics > count || (format !== 0 && format !== 1))
    fail("FONT_FORMAT", "/font/tables", "Invalid glyph/metric/loca counts");
  required(tables, "hmtx", metrics * 4 + (count - metrics) * 2);
  const loca = required(tables, "loca", (count + 1) * (format ? 4 : 2));
  const glyf = required(tables, "glyf", 10);
  let previous = 0;
  for (let i = 0; i <= count; i++) {
    const offset = format ? view.getUint32(loca.offset + i * 4) : view.getUint16(loca.offset + i * 2) * 2;
    if (offset < previous || offset > glyf.length || (offset !== previous && offset - previous < 10))
      fail("FONT_FORMAT", "/font/tables/loca", "Invalid glyph outline bounds");
    previous = offset;
  }
}

export function inspectSfnt(bytes: Uint8Array<ArrayBuffer>): FontMetadata["embeddingRights"] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = directory(view);
  outlines(view, tables);
  required(tables, "name", 6);
  required(tables, "post", 32);
  const cmap = required(tables, "cmap", 4);
  checkCmap(view, cmap.offset, cmap.length);
  const os2 = required(tables, "OS/2", 78);
  const rights = view.getUint16(os2.offset + 8);
  if (rights & 0x0002 || rights & 0x0200 || rights & ~0x030e)
    fail("FONT_RIGHTS", "/font/tables/OS2", "Restricted/bitmap-only/unknown embedding rights");
  if (rights & 8) return "editable";
  if (rights & 4) return "preview-print";
  return "installable";
}
