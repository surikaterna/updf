import type { FontDescriptor } from "@updf/fonts";
import { invalid, type Reader } from "./reader.js";
import { table, type Tables } from "./sfnt.js";

function unicodeName(names: Reader, offset: number, length: number): string {
  names.check(offset, length);
  if (length % 2 || length > 256) invalid("Invalid PostScript name encoding/length");
  let result = "";
  for (let i = 0; i < length; i += 2) result += String.fromCharCode(names.u16(offset + i));
  return result;
}

function postscriptName(names: Reader): string {
  if (names.u16(0) !== 0) invalid("Fontkite requires name table format 0");
  const count = names.u16(2),
    storage = names.u16(4);
  names.check(6, count * 12);
  if (storage < 6 + count * 12) invalid("Invalid name storage offset");
  let fallback: string | undefined;
  for (let i = 0; i < count; i++) {
    const at = 6 + i * 12,
      platform = names.u16(at),
      encoding = names.u16(at + 2);
    const length = names.u16(at + 8),
      offset = storage + names.u16(at + 10);
    names.check(offset, length);
    if (names.u16(at + 6) !== 6 || !(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))))
      continue;
    const value = unicodeName(names, offset, length);
    if (platform === 3 && names.u16(at + 4) === 0x409) return value;
    fallback ??= value;
  }
  if (!fallback) invalid("Missing Unicode PostScript name");
  return fallback;
}

export function descriptor(tables: Tables): FontDescriptor {
  const head = table(tables, "head", 54),
    hhea = table(tables, "hhea", 36);
  const post = table(tables, "post", 32),
    os2 = table(tables, "OS/2", 90);
  const italicAngle = post.i32(4) / 65536;
  return {
    postscriptName: postscriptName(table(tables, "name", 6)),
    bounds: [head.i16(36), head.i16(38), head.i16(40), head.i16(42)],
    ascent: hhea.i16(4),
    descent: hhea.i16(6),
    capHeight: os2.i16(88),
    italicAngle,
    stemV: 80,
    flags: 32 | (italicAngle ? 64 : 0),
  };
}
