import assert from "node:assert/strict";

export const mutationVersion = 1;
export const strategies = [
  "bits",
  "truncate",
  "directory",
  "loca",
  "cmap",
  "glyph",
  "metrics",
  "fill",
  "append",
  "noise",
  "composite-cycle",
  "control",
] as const;
export type Strategy = (typeof strategies)[number];
export interface Table {
  readonly offset: number;
  readonly length: number;
  readonly directory: number;
}
export interface MutationContext {
  readonly tables: ReadonlyMap<string, Table>;
  readonly glyphs: readonly { id: number; offset: number; length: number }[];
}
export function random(seed: number): (maximum: number) => number {
  let state = seed >>> 0;
  return (maximum) => {
    assert.ok(Number.isSafeInteger(maximum) && maximum > 0);
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % maximum;
  };
}
export function context(bytes: Uint8Array<ArrayBuffer>): MutationContext {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4),
    tables = new Map<string, Table>();
  assert.ok(count > 0 && count <= 128 && 12 + count * 16 <= bytes.length);
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16,
      offset = view.getUint32(at + 8),
      length = view.getUint32(at + 12);
    assert.ok(offset <= bytes.length - length);
    tables.set(String.fromCharCode(...bytes.subarray(at, at + 4)), { offset, length, directory: at });
  }
  return { tables, glyphs: glyphRanges(view, tables) };
}
function glyphRanges(view: DataView, tables: ReadonlyMap<string, Table>) {
  const head = tables.get("head")!,
    maxp = tables.get("maxp")!,
    loca = tables.get("loca")!,
    glyf = tables.get("glyf")!;
  assert.ok(head && maxp && loca && glyf, "Fuzz seeds must be static glyf TrueType");
  const count = view.getUint16(maxp.offset + 4),
    wide = view.getInt16(head.offset + 50) === 1;
  assert.ok((count + 1) * (wide ? 4 : 2) <= loca.length);
  const offset = (id: number) =>
    wide ? view.getUint32(loca.offset + id * 4) : 2 * view.getUint16(loca.offset + id * 2);
  const glyphs = [];
  for (let id = 0; id < count; id++) {
    const start = offset(id),
      end = offset(id + 1);
    assert.ok(start <= end && end <= glyf.length);
    if (end - start >= 10) glyphs.push({ id, offset: glyf.offset + start, length: end - start });
  }
  assert.ok(glyphs.length);
  return glyphs;
}
function overwrite(bytes: Uint8Array, table: Table, next: (maximum: number) => number): void {
  if (!table.length) return;
  const at = table.offset + next(table.length),
    width = Math.min(1 + next(4), table.offset + table.length - at);
  const value = [0, 1, 0x7f, 0x80, 0xff][next(5)]!;
  bytes.fill(value, at, at + width);
}
function targeted(
  bytes: Uint8Array<ArrayBuffer>,
  data: MutationContext,
  kind: Strategy,
  next: (maximum: number) => number,
): void {
  const names = kind === "metrics" ? ["head", "hhea", "maxp", "hmtx", "name", "OS/2", "post"] : [kind];
  const table = data.tables.get(names[next(names.length)]!);
  if (table) overwrite(bytes, table, next);
}
function glyph(
  bytes: Uint8Array<ArrayBuffer>,
  data: MutationContext,
  cycle: boolean,
  next: (maximum: number) => number,
): void {
  const record = data.glyphs[next(data.glyphs.length)]!,
    view = new DataView(bytes.buffer);
  if (cycle && record.length >= 18) {
    view.setInt16(record.offset, -1);
    view.setUint16(record.offset + 10, 3);
    view.setUint16(record.offset + 12, record.id);
    view.setUint32(record.offset + 14, 0);
    return;
  }
  overwrite(bytes, { ...record, directory: 0 }, next);
}
export function mutate(base: Uint8Array<ArrayBuffer>, data: MutationContext, seed: number, index: number) {
  assert.ok(
    Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff && Number.isInteger(index) && index >= 0 && index < 25000,
  );
  const kind = strategies[index % strategies.length]!,
    next = random(seed ^ Math.imul(index + 1, 0x9e3779b1));
  const bytes = base.slice();
  switch (kind) {
    case "control":
      return { kind, bytes };
    case "truncate":
      return { kind, bytes: bytes.slice(0, next(bytes.length)) };
    case "append": {
      const result = new Uint8Array(bytes.length + 1 + next(256));
      result.set(bytes);
      return { kind, bytes: result };
    }
    case "noise":
      return { kind, bytes: Uint8Array.from({ length: 1 + next(1024) }, () => next(256)) };
    case "bits":
      for (let n = 1 + next(4); n > 0; n--) {
        const at = next(bytes.length);
        bytes[at] = bytes[at]! ^ (1 << next(8));
      }
      break;
    case "directory": {
      const table = [...data.tables.values()][next(data.tables.size)]!;
      overwrite(bytes, { offset: table.directory, length: 16, directory: 0 }, next);
      break;
    }
    case "glyph":
    case "composite-cycle":
      glyph(bytes, data, kind === "composite-cycle", next);
      break;
    case "fill": {
      const at = next(bytes.length);
      bytes.fill(next(2) ? 0xff : 0, at, Math.min(bytes.length, at + 1 + next(64)));
      break;
    }
    default:
      targeted(bytes, data, kind, next);
  }
  return { kind, bytes };
}
