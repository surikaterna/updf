import assert from "node:assert/strict";
import test from "node:test";
import { code39Defaults, qrDefaults } from "../../apps/showcase/src/barcode-controls.js";
import { code39Demo } from "../../apps/showcase/src/code39.js";
import { qrDemo } from "../../apps/showcase/src/qr.js";
import { BarcodeFormat, decode, rasterize } from "../fixtures/barcode-decode.js";

test("Showcase Code 39 and M/H QR documents decode with their real captioned page layout", async () => {
  const code = code39Demo("Barcode showcase", { ...code39Defaults, checksum: "mod43" });
  assert.equal(decode(await rasterize(code.bytes), BarcodeFormat.CODE_39, true), code39Defaults.value);
  for (const errorCorrection of ["M", "H"] as const) {
    const result = qrDemo("Barcode showcase", { ...qrDefaults, errorCorrection });
    assert.equal(decode(await rasterize(result.bytes), BarcodeFormat.QR_CODE), qrDefaults.value);
  }
});

test("Showcase validates its page-safe controls, preserves payloads and rejects width/capacity overflow", () => {
  assert.throws(() => code39Demo("Title", { ...code39Defaults, value: "lowercase" }));
  assert.throws(() => code39Demo("Title", { ...code39Defaults, value: "A".repeat(80), moduleWidth: 4 }));
  assert.throws(() => code39Demo("Title", { ...code39Defaults, barHeight: 181 }));
  assert.throws(() => qrDemo("Title", { ...qrDefaults, value: "x".repeat(120), errorCorrection: "H" }));
  assert.throws(() => qrDemo("Title", { ...qrDefaults, moduleSize: 6.5 }));
  assert.throws(() => qrDemo("Two\nlines"));
  const controls = Object.freeze({ ...qrDefaults, errorCorrection: "H" as const });
  assert.deepEqual(qrDemo("Title", controls).bytes, qrDemo("Title", controls).bytes);
});
