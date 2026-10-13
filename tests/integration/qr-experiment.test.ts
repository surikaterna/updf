import assert from "node:assert/strict";
import test from "node:test";
import { encodeQR } from "../../packages/barcodes/src/qr-encoder/encoder.js";
import { maskBit } from "../../packages/barcodes/src/qr-encoder/mask.js";
import { penalty } from "../../packages/barcodes/src/qr-encoder/penalty.js";
import { capacity } from "../../packages/barcodes/src/qr-encoder/profile.js";
import { reference, referenceMask, referencePenalty, sample } from "../../scripts/qr-experiment/reference.js";
import { vectorPDF } from "../../scripts/qr-experiment/vector.js";
import { BarcodeFormat, decode, rasterize } from "../fixtures/barcode-decode.js";

test("QR rewrite matches reference matrices at every supported version, level and forced mask", () => {
  let cases = 0;
  for (const level of ["M", "H"] as const)
    for (let version = 1; version <= 10; version++) {
      for (let mask = 0; mask < 8; mask++) {
        const value = sample(capacity(version, level), mask + version * 100);
        const matrix = encodeQR(value, level, version, mask);
        assert.deepEqual(matrix.cells, reference(value, level, version, mask), `${version}/${level}/${mask}`);
        assert.equal(penalty(Uint8Array.from(matrix.cells), matrix.size), referencePenalty(matrix));
        cases++;
      }
    }
  assert.equal(cases, 160);
});

test("Every byte capacity boundary and automatic version matches the independent encoder", () => {
  for (const level of ["M", "H"] as const) {
    for (let length = 1; length <= capacity(10, level); length++) {
      const value = sample(length);
      const matrix = encodeQR(value, level);
      assert.deepEqual(matrix.cells, reference(value, level, 0, matrix.mask));
      assert.ok(Object.isFrozen(matrix) && Object.isFrozen(matrix.cells) && Object.isFrozen(matrix.protectedCells));
    }
    for (let version = 1; version <= 10; version++) {
      assert.throws(() => encodeQR("A".repeat(capacity(version, level) + 1), level, version), RangeError);
    }
  }
});

test("Seeded QR cases match independent matrices across versions, masks and correction levels", () => {
  let state = 0x12345678;
  for (let i = 0; i < 2048; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const level = state & 1 ? "M" : "H";
    const version = 1 + ((state >>> 1) % 10);
    const mask = (state >>> 5) % 8;
    const length = 1 + ((state >>> 8) % capacity(version, level));
    const value = sample(length, state);
    assert.deepEqual(encodeQR(value, level, version, mask).cells, reference(value, level, version, mask), `case ${i}`);
  }
});

test("All mask predicates match the independent reference and selection minimizes its complete score", () => {
  for (let mask = 0; mask < 8; mask++)
    for (let y = 0; y < 57; y++)
      for (let x = 0; x < 57; x++) assert.equal(maskBit(mask, x, y), referenceMask(mask, x, y));
  for (const level of ["M", "H"] as const)
    for (const length of [1, 14, 32, 60, 119]) {
      const value = sample(length);
      const selected = encodeQR(value, level);
      const scores = Array.from({ length: 8 }, (_, mask) => referencePenalty(encodeQR(value, level, 0, mask)));
      assert.equal(selected.mask, scores.indexOf(Math.min(...scores)));
    }
});

test("QR rewrite vector PDFs decode independently across versions and both correction levels", async () => {
  for (const level of ["M", "H"] as const)
    for (let version = 1; version <= 10; version++) {
      const value = sample(capacity(version, level), 42 + version);
      const matrix = encodeQR(value, level, version);
      assert.equal(decode(await rasterize(vectorPDF(matrix)), BarcodeFormat.QR_CODE), value);
      const cells = [...matrix.cells];
      const at = matrix.protectedCells.indexOf(0);
      cells[at] = cells[at]! ^ 1;
      assert.equal(decode(await rasterize(vectorPDF({ ...matrix, cells })), BarcodeFormat.QR_CODE), value);
    }
});

test("QR rewrite rejects unsupported input before work and protects fixed function patterns", () => {
  for (const value of ["", "é", "A\n", "😀", "A".repeat(214), 42, null])
    assert.throws(() => encodeQR(value as string), RangeError);
  for (const version of [-1, 11, 1.5, NaN, Infinity]) assert.throws(() => encodeQR("A", "M", version), RangeError);
  for (const mask of [-2, 8, 1.5, NaN]) assert.throws(() => encodeQR("A", "M", 0, mask), RangeError);
  assert.throws(() => encodeQR("A", "Q" as never), RangeError);
  const matrix = encodeQR("A", "H", 7);
  assert.equal(matrix.protectedCells[22 * matrix.size + 22], 1, "Version 7 has a central alignment pattern");
  assert.deepEqual(encodeQR("A"), encodeQR("A"));
});
