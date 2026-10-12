import { invalid, type Reader } from "./reader.js";

export interface Point {
  readonly x: number;
  readonly y: number;
  readonly on: boolean;
}
export type Contours = readonly (readonly Point[])[];

function flags(reader: Reader, count: number): number[] {
  const result: number[] = [];
  while (result.length < count) {
    const flag = reader.byte();
    if (flag & 0x80) invalid("Reserved simple glyph flag");
    const repeat = flag & 8 ? reader.byte() : 0;
    if (result.length + repeat + 1 > count) invalid("Glyph flag repeat exceeds point count");
    for (let i = 0; i <= repeat; i++) result.push(flag);
  }
  return result;
}

function coordinates(reader: Reader, bits: readonly number[], short: number, same: number): number[] {
  const result: number[] = [];
  let position = 0;
  for (const flag of bits) {
    const delta = flag & short ? reader.byte() * (flag & same ? 1 : -1) : flag & same ? 0 : reader.signed();
    position += delta;
    if (position < -32768 || position > 32767) invalid("Simple glyph coordinate out of range");
    result.push(position);
  }
  return result;
}

export function simple(reader: Reader, count: number, spend: (points: number) => void): Contours {
  const ends: number[] = [];
  for (let i = 0; i < count; i++) {
    const end = reader.word();
    if (end <= (ends[i - 1] ?? -1)) invalid("Invalid contour endpoints");
    ends.push(end);
  }
  reader.skip(reader.word());
  const points = count ? ends[count - 1]! + 1 : 0;
  spend(points);
  const bits = flags(reader, points),
    x = coordinates(reader, bits, 2, 16),
    y = coordinates(reader, bits, 4, 32);
  const contours: Point[][] = [];
  let first = 0;
  for (const end of ends) {
    const contour: Point[] = [];
    for (let i = first; i <= end; i++) contour.push({ x: x[i]!, y: y[i]!, on: !!(bits[i]! & 1) });
    contours.push(contour);
    first = end + 1;
  }
  return contours;
}
