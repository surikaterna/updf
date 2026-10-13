import { fail } from "@updf/core/internal";
import { invalid, type Reader } from "./reader.js";
import type { OutlineTables } from "./sfnt.js";
import { type Contours, type Point, simple } from "./simple.js";

function transform(reader: Reader, flags: number): readonly number[] {
  const mode = flags & (8 | 64 | 128);
  if (mode && mode !== 8 && mode !== 64 && mode !== 128) invalid("Conflicting composite transforms");
  if (mode === 8) {
    const scale = reader.signed() / 16384;
    return [scale, 0, 0, scale];
  }
  if (mode === 64) return [reader.signed() / 16384, 0, 0, reader.signed() / 16384];
  if (mode === 128)
    return [reader.signed() / 16384, reader.signed() / 16384, reader.signed() / 16384, reader.signed() / 16384];
  return [1, 0, 0, 1];
}

function byteSigned(reader: Reader): number {
  const value = reader.byte();
  return value > 127 ? value - 256 : value;
}

function moved(contours: Contours, matrix: readonly number[], dx: number, dy: number): Contours {
  return contours.map((contour) =>
    contour.map((point) => ({
      x: point.x * matrix[0]! + point.y * matrix[2]! + dx,
      y: point.x * matrix[1]! + point.y * matrix[3]! + dy,
      on: point.on,
    })),
  );
}

/** Budgets cover decoded points AND composite expansion, including cache reuse. */
export class Outlines {
  private remaining = 1_000_000;
  private components = 65535;
  private readonly active = new Set<number>();
  private readonly cache = new Map<number, Contours>();
  constructor(private readonly tables: OutlineTables) {}
  private spend = (points: number): void => {
    this.remaining -= points;
    if (this.remaining < 0) fail("LIMIT", "/font/glyf", "Decoded/expanded point budget exceeded");
  };
  get(id: number): Contours {
    if (id < 0 || id >= this.tables.count) invalid("Composite glyph ID out of range");
    if (this.active.has(id)) invalid("Composite glyph cycle");
    const cached = this.cache.get(id);
    if (cached) return cached;
    if (this.active.size >= 16) fail("LIMIT", "/font/glyf", "Composite depth exceeds 16");
    this.active.add(id);
    const start = this.tables.offsets[id]!,
      end = this.tables.offsets[id + 1]!;
    const result = start === end ? [] : this.decode(this.tables.glyf.slice(start, end - start));
    this.active.delete(id);
    this.cache.set(id, result);
    return result;
  }
  private decode(reader: Reader): Contours {
    const count = reader.i16(0);
    reader.skip(10);
    if (count >= 0) return simple(reader, count, this.spend);
    if (count !== -1) invalid("Invalid composite contour count");
    return this.composite(reader);
  }
  private composite(reader: Reader): Contours {
    const result: (readonly Point[])[] = [];
    let flags = 32,
      instructions = false;
    while (flags & 32) {
      if (--this.components < 0) fail("LIMIT", "/font/glyf", "Composite component budget exceeded");
      flags = reader.word();
      const id = reader.word();
      if (!(flags & 2) || flags & ~0x1fef || flags & 0x800)
        invalid("Fontkite requires XY composites with unscaled offsets");
      const dx = flags & 1 ? reader.signed() : byteSigned(reader),
        dy = flags & 1 ? reader.signed() : byteSigned(reader);
      const matrix = transform(reader, flags);
      const child = this.get(id);
      this.spend(child.reduce((sum, contour) => sum + contour.length, 0));
      for (const contour of moved(child, matrix, dx, dy)) result.push(contour);
      instructions ||= !!(flags & 256);
    }
    if (instructions) reader.skip(reader.word());
    return result;
  }
}
