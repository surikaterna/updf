import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type qrcode from "qrcode-generator";
import type { QRMatrix } from "../../packages/barcodes/src/qr-encoder/encoder.js";
import type { Level } from "../../packages/barcodes/src/qr-encoder/profile.js";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../../node_modules/qrcode-generator/dist/qrcode.mjs", import.meta.url), "utf8");
const selector = "makeImpl(false, getBestMaskPattern() );";
assert.equal(source.split(selector).length, 2, "Pinned reference mask selector changed");
const references: (typeof qrcode)[] = [];
for (let mask = 0; mask < 8; mask++) {
  const text = source.replace(selector, `makeImpl(false, ${mask});`);
  const module = await import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);
  references.push(module.default);
}

/** Reference algorithm unchanged; only its private mask choice is forced for exact matrix comparisons. */
export function reference(value: string, level: Level, version: number, mask: number): readonly number[] {
  const matrix = references[mask]!(version as Parameters<typeof qrcode>[0], level);
  matrix.addData(value, "Byte");
  matrix.make();
  const size = matrix.getModuleCount();
  return Array.from({ length: size * size }, (_, i) => Number(matrix.isDark(Math.floor(i / size), i % size)));
}

interface MatrixView {
  getWidth(): number;
  getHeight(): number;
  getArray(): readonly (readonly number[])[];
}
const masks = require("@zxing/library/cjs/core/qrcode/encoder/MaskUtil.js").default as {
  applyMaskPenaltyRule1(matrix: MatrixView): number;
  applyMaskPenaltyRule2(matrix: MatrixView): number;
  applyMaskPenaltyRule3(matrix: MatrixView): number;
  applyMaskPenaltyRule4(matrix: MatrixView): number;
  getDataMaskBit(mask: number, x: number, y: number): boolean;
};

export function referencePenalty(matrix: QRMatrix): number {
  const view = {
    getWidth: () => matrix.size,
    getHeight: () => matrix.size,
    getArray: () =>
      Array.from({ length: matrix.size }, (_, y) => matrix.cells.slice(y * matrix.size, (y + 1) * matrix.size)),
  };
  return (
    masks.applyMaskPenaltyRule1(view) +
    masks.applyMaskPenaltyRule2(view) +
    masks.applyMaskPenaltyRule3(view) +
    masks.applyMaskPenaltyRule4(view)
  );
}

export const referenceMask = masks.getDataMaskBit.bind(masks);

export function sample(length: number, seed = length): string {
  let state = seed;
  return Array.from({ length }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return String.fromCharCode(32 + (state % 95));
  }).join("");
}
