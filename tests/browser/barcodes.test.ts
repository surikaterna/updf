import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { barcodeExample } from "../../examples/barcodes.js";

test("Native barcode TSX renders byte-identical PDFs in Chromium without DOM/image encoding APIs", async () => {
  const bundle = await build({
    entryPoints: ["examples/barcodes.tsx"],
    bundle: true,
    write: false,
    platform: "browser",
    conditions: ["browser"],
    format: "iife",
    globalName: "Barcodes",
    target: "es2022",
  });
  const browser = await chromium.launch({
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const bytes = await page.evaluate("Array.from(Barcodes.barcodeExample())");
    assert.ok(Array.isArray(bytes) && bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255));
    assert.deepEqual(new Uint8Array(bytes), barcodeExample());
  } finally {
    await browser.close();
  }
});
