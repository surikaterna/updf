import { foreground } from "./foreground.js";

export interface Image {
  readonly width: number;
  readonly height: number;
  readonly rgb: Uint8Array;
}
const difference = (a: Image, b: Image, index: number): number =>
  Math.max(...[0, 1, 2].map((c) => Math.abs((a.rgb[index * 3 + c] ?? 255) - (b.rgb[index * 3 + c] ?? 255))));
function edges(image: Image, mask: Uint8Array): void {
  const { width, height, rgb } = image;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const edge = [-1, 1, -width, width].some((delta) =>
        [0, 1, 2].some((c) => Math.abs((rgb[i * 3 + c] ?? 0) - (rgb[(i + delta) * 3 + c] ?? 0)) > 3),
      );
      if (edge) mark(mask, width, x, y);
    }
  }
}
function mark(mask: Uint8Array, width: number, x: number, y: number): void {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mask[(y + dy) * width + x + dx] = 1;
}
function bounds(image: Image): readonly [number, number, number, number] {
  let x1 = image.width,
    y1 = image.height,
    x2 = -1,
    y2 = -1;
  for (let i = 0; i < image.width * image.height; i++) {
    if (![0, 1, 2].some((c) => (image.rgb[i * 3 + c] ?? 255) < 252)) continue;
    const x = i % image.width,
      y = Math.floor(i / image.width);
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
  }
  return [x1, y1, x2, y2];
}
export function compare(a: Image, b: Image) {
  if (a.width !== b.width || a.height !== b.height) throw new Error("Reference dimensions differ");
  const mask = new Uint8Array(a.width * a.height);
  edges(a, mask);
  edges(b, mask);
  let interiorMismatches = 0,
    compared = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) continue;
    compared++;
    if (difference(a, b, i) > 3) interiorMismatches++;
  }
  const left = bounds(a),
    right = bounds(b);
  const bboxDelta = Math.max(...left.map((value, i) => Math.abs(value - (right[i] ?? value))));
  return {
    interiorMismatchRatio: interiorMismatches / Math.max(1, compared),
    interiorMismatches,
    compared,
    bboxDelta,
    ...foreground(a, b),
  };
}
export function acceptable(result: ReturnType<typeof compare>): boolean {
  return (
    result.bboxDelta <= 1 &&
    result.interiorMismatchRatio <= 0.005 &&
    result.foregroundMismatchRatio <= 0.005 &&
    result.inkMassDeltaRatio <= 0.03
  );
}
