import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { fixedAdmissionProof } from "../fixtures/fixed-admission.js";
import { blockUnitProof } from "../fixtures/block-units.js";

test("direct fixed native admission produces identical Node/Chromium placements and PDF bytes", async () => {
  const bundle = await build({
    entryPoints: ["tests/fixtures/fixed-admission.ts"],
    bundle: true,
    write: false,
    platform: "browser",
    conditions: ["browser"],
    format: "iife",
    globalName: "FixedAdmission",
    target: "es2022",
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const actual = await page.evaluate("FixedAdmission.fixedAdmissionProof()");
    assert.deepEqual(actual, fixedAdmissionProof());
  } finally {
    await browser.close();
  }
});

test("width-only public units preserve exact queries, prefixes and PDF bytes in Chromium", async () => {
  const bundle = await build({
    entryPoints: ["tests/fixtures/block-units.ts"],
    bundle: true,
    write: false,
    platform: "browser",
    conditions: ["browser"],
    format: "iife",
    globalName: "BlockUnits",
    target: "es2022",
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const expected = blockUnitProof();
    assert.equal(expected.pages, 2);
    assert.equal(expected.placements[0]?.sourceRange?.end, 2);
    assert.deepEqual(await page.evaluate("BlockUnits.blockUnitProof()"), expected);
  } finally {
    await browser.close();
  }
});
