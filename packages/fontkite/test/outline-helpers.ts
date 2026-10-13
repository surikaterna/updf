import { Outlines } from "../src/outline.js";
import { Reader } from "../src/reader.js";

export function words(values: readonly number[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(values.length * 2),
    view = new DataView(bytes.buffer);
  for (const [i, value] of values.entries()) view.setUint16(i * 2, value);
  return bytes;
}

export function outlineReader(glyphs: readonly Uint8Array<ArrayBuffer>[]): Outlines {
  const offsets = [0];
  for (const glyph of glyphs) offsets.push(offsets[offsets.length - 1]! + glyph.length);
  const bytes = new Uint8Array(offsets[offsets.length - 1]!);
  for (const [i, glyph] of glyphs.entries()) bytes.set(glyph, offsets[i]!);
  return new Outlines({
    count: glyphs.length,
    metrics: 1,
    hmtx: new Reader(words([100, 0])),
    glyf: new Reader(bytes),
    offsets,
  });
}

export function composite(id: number, flags = 3, extra: readonly number[] = []): Uint8Array<ArrayBuffer> {
  return words([-1, 0, 0, 100, 100, flags, id, 0, 0, ...extra]);
}

export function triangle(): Uint8Array<ArrayBuffer> {
  const header = words([1, 0, 0, 100, 100, 2, 0]);
  const bytes = new Uint8Array(header.length + 3 + 12);
  bytes.set(header);
  bytes.set([1, 1, 1], header.length);
  bytes.set(words([0, 100, -100, 0, 0, 100]), header.length + 3);
  return bytes;
}
