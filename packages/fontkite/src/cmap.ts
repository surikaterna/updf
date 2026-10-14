import { fail } from "@updf/core/internal";
import { scalar } from "@updf/fonts";
import { invalid, type Reader } from "./reader.js";

function supported(code: number): boolean {
  if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) || code === 10) return false;
  try {
    scalar(String.fromCodePoint(code), "/font/profile");
    return true;
  } catch {
    return false;
  }
}

function select(cmap: Reader): Reader {
  if (cmap.u16(0) !== 0) invalid("Invalid cmap version");
  const count = cmap.u16(2);
  if (!count || count > 128) invalid("Invalid cmap directory");
  cmap.check(4, count * 8);
  let best: Reader | undefined,
    priority = -1;
  for (let i = 0; i < count; i++) {
    const at = 4 + i * 8,
      platform = cmap.u16(at),
      encoding = cmap.u16(at + 2),
      offset = cmap.u32(at + 4);
    if (offset < 4 + count * 8) invalid("Invalid cmap pointer");
    const format = cmap.u16(offset);
    if (
      !((platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) && (format === 4 || format === 12))
    )
      continue;
    const length = format === 12 ? cmap.u32(offset + 4) : cmap.u16(offset + 2);
    const candidate = cmap.slice(offset, length);
    const rank = (format === 12 ? 10 : 0) + (platform === 3 ? 1 : 0);
    if (rank > priority) {
      best = candidate;
      priority = rank;
    }
  }
  if (!best) invalid("Fontkite requires a Unicode cmap format 4 or 12");
  return best;
}

function append(result: Map<number, number>, code: number, id: number, glyphCount: number): void {
  if (id >= glyphCount) invalid("cmap glyph ID out of range");
  if (id && supported(code)) result.set(code, id);
}

function format4(cmap: Reader, glyphCount: number): Map<number, number> {
  const doubled = cmap.u16(6),
    count = doubled / 2;
  if (!count || doubled % 2) invalid("Invalid cmap segments");
  cmap.check(0, 16 + count * 8);
  const result = new Map<number, number>();
  let previous = -1;
  for (let i = 0; i < count; i++) {
    const end = cmap.u16(14 + i * 2),
      start = cmap.u16(16 + count * 2 + i * 2);
    const delta = cmap.i16(16 + count * 4 + i * 2),
      at = 16 + count * 6 + i * 2,
      range = cmap.u16(at);
    if (start > end || start <= previous || range % 2) invalid("Invalid/overlapping cmap segments");
    if (range && at + range < 16 + count * 8) invalid("cmap points outside glyph array");
    if (range) cmap.check(at + range, (end - start + 1) * 2);
    for (let code = start; code <= end; code++) {
      const raw = range ? cmap.u16(at + range + (code - start) * 2) : code;
      append(result, code, range && !raw ? 0 : (raw + delta) & 0xffff, glyphCount);
    }
    previous = end;
  }
  if (previous !== 0xffff) invalid("Missing cmap sentinel");
  return result;
}

function format12(cmap: Reader, glyphCount: number): Map<number, number> {
  const count = cmap.u32(12);
  if (count > 65535) fail("LIMIT", "/font/cmap", "cmap group budget exceeded");
  cmap.check(16, count * 12);
  const result = new Map<number, number>();
  let previous = -1,
    inventory = 0;
  for (let i = 0; i < count; i++) {
    const at = 16 + i * 12,
      start = cmap.u32(at),
      end = cmap.u32(at + 4),
      first = cmap.u32(at + 8);
    if (start > end || end > 0x10ffff || start <= previous || first + end - start >= glyphCount)
      invalid("Invalid cmap group");
    inventory += end - start + 1;
    if (inventory > 65535) fail("LIMIT", "/font/cmap", "Font inventory exceeds 65535 codepoints");
    for (let code = start; code <= end; code++) append(result, code, first + code - start, glyphCount);
    previous = end;
  }
  return result;
}

export function mappings(cmap: Reader, glyphCount: number): ReadonlyMap<number, number> {
  const selected = select(cmap);
  return selected.u16(0) === 4 ? format4(selected, glyphCount) : format12(selected, glyphCount);
}
