import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { encodeQR } from "../../packages/barcodes/src/qr-encoder/encoder.js";
import { vectorPDF } from "../../scripts/qr-experiment/vector.js";

test("Dependency-free QR matrices and vector PDFs agree in Chromium and Node", async () => {
  const result = await build({
    stdin: {
      contents:
        "export {encodeQR} from './packages/barcodes/src/qr-encoder/encoder.ts'; export {vectorPDF} from './scripts/qr-experiment/vector.ts';",
      resolveDir: process.cwd(),
      loader: "ts",
    },
    platform: "browser",
    conditions: ["browser"],
    target: "es2022",
    format: "iife",
    globalName: "QRExperiment",
    bundle: true,
    write: false,
    metafile: true,
  });
  assert.ok(!Object.keys(result.metafile.inputs).some((path) => path.includes("qrcode-generator")));
  const browser = await chromium.launch({
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: result.outputFiles[0]!.text });
    for (const level of ["M", "H"] as const) {
      const value = "https://example.com/ship/12345";
      const expression = `QRExperiment.encodeQR(${JSON.stringify(value)},${JSON.stringify(level)})`;
      assert.deepEqual(await page.evaluate(expression), encodeQR(value, level));
      assert.deepEqual(await page.evaluate(`Array.from(QRExperiment.vectorPDF(${expression}))`), [
        ...vectorPDF(encodeQR(value, level)),
      ]);
    }
  } finally {
    await browser.close();
  }
});
