import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { fractionalSVG } from "../fixtures/svg-fractional.js";

test("fractional SVG layout through public emitted APIs has Node/Chromium page and PDF parity", async () => {
  const bundle = await build({
    entryPoints: ["tests/fixtures/svg-fractional.ts"],
    bundle: true,
    write: false,
    platform: "browser",
    conditions: ["browser"],
    format: "iife",
    globalName: "FractionalSVG",
    target: "es2022",
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    for (const nested of [false, true]) {
      const expected = fractionalSVG(nested);
      assert.equal(expected.pageCount, 1);
      assert.equal(await page.evaluate(`FractionalSVG.fractionalSVG(${nested}).pageCount`), 1);
      assert.deepEqual(await page.evaluate(`Array.from(FractionalSVG.fractionalSVG(${nested}).bytes)`), [
        ...expected.bytes,
      ]);
    }
  } finally {
    await browser.close();
  }
});
