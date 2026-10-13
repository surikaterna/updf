import assert from "node:assert/strict";
import test from "node:test";
import { Code39, code39 } from "@updf/barcodes/code39";
import { QRCode, qrCode } from "@updf/barcodes/qr";
import { DocumentError, render } from "@updf/core";
import { h, lower, type VNode } from "@updf/core/vdom";
import { barcodeExample } from "../../examples/barcodes.js";
import { BarcodeFormat, decode, rasterize } from "../fixtures/barcode-decode.js";

function pdf(node: VNode, width: number, height: number): Uint8Array {
  return render(lower(h("document", { version: 1, children: h("page", { width, height, children: node }) })));
}

test("Code 39 actual PDFs decode independently, including full alphabet, max length, ratio and checksum", async () => {
  for (const [value, moduleWidth, barHeight, wideRatio, checksum, dpi] of [
    ["SHIP-12345", 1, 40, 3, "none", 144],
    ["0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%", 1, 40, 2, "none", 216],
    ["A".repeat(80), 0.25, 1, 3, "none", 600],
    ["CHECK-43", 0.8, 30, 3, "mod43", 300],
  ] as const) {
    const options = { moduleWidth, barHeight, wideRatio, checksum };
    const measured = code39(value, options);
    const bytes = pdf(h(Code39, { value, x: 10, y: 10, ...options }), measured.width + 20, measured.height + 20);
    assert.deepEqual(
      bytes,
      pdf(h(Code39, { value, x: 10, y: 10, ...options }), measured.width + 20, measured.height + 20),
    );
    const raster = await rasterize(bytes, dpi);
    assert.equal(decode(raster, BarcodeFormat.CODE_39, checksum === "mod43"), value);
    raster.pixels.fill(255);
    assert.throws(() => decode(raster, BarcodeFormat.CODE_39));
  }
});

test("QR actual PDFs decode independently at multiple sizes and the payload boundary", async () => {
  for (const [value, moduleSize, dpi] of [
    ["https://example.com/ship/12345", 2, 144],
    ["A", 0.25, 600],
    ["x".repeat(192), 1, 300],
    [String.fromCharCode(...Array.from({ length: 95 }, (_, i) => i + 32)), 2, 216],
  ] as const) {
    const measured = qrCode(value, { moduleSize });
    const bytes = pdf(h(QRCode, { value, x: 10, y: 10, moduleSize }), measured.width + 20, measured.height + 20);
    const raster = await rasterize(bytes, dpi);
    assert.equal(decode(raster, BarcodeFormat.QR_CODE), value);
    raster.pixels.fill(255);
    assert.throws(() => decode(raster, BarcodeFormat.QR_CODE));
  }
});

test("Native components reject invalid placement, width overflow and runtime output quotas", () => {
  const width = code39("A").width;
  assert.ok(pdf(h(Code39, { value: "A", x: 0, y: 0, maxWidth: width }), 200, 100).length > 0);
  assert.throws(() => pdf(h(Code39, { value: "A", x: 0, y: 0, maxWidth: width - 1 }), 200, 100), DocumentError);
  assert.throws(() => pdf(h(QRCode, { value: "A", x: NaN, y: 0 }), 200, 100), DocumentError);
  const node = h("document", {
    version: 1,
    children: h("page", { width: 200, height: 200, children: h(QRCode, { value: "A", x: 0, y: 0 }) }),
  });
  const limited = (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT";
  assert.throws(() => render(lower(node), { limits: { outputBytes: 1 } }), limited);
  assert.throws(() => lower(node, { limits: { pathCommands: 10 } }), limited);
  assert.deepEqual(barcodeExample(), barcodeExample());
});

test("Components paint opaque white quiet zones over existing artwork", async () => {
  for (const [node, format] of [
    [h(Code39, { value: "A", x: 10, y: 10 }), BarcodeFormat.CODE_39],
    [h(QRCode, { value: "A", x: 10, y: 10 }), BarcodeFormat.QR_CODE],
  ] as const) {
    const group = h("group", {
      children: [h("rect", { x: 0, y: 0, width: 200, height: 120, paint: { fill: [0, 0, 0], stroke: null } }), node],
    });
    const raster = await rasterize(pdf(group, 200, 120), 216);
    assert.equal(decode(raster, format), "A");
    assert.equal(raster.pixels[33 * raster.width + 33], 255);
  }
});
