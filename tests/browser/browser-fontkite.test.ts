import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { prepareFont } from "@updf/fontkit";
import { fixture } from "../../packages/fontkite/test/helpers.js";

test("actual Chromium Fontkite root and optional load exports match Fontkit metadata", async () => {
  const built = await build({
    stdin: {
      contents: "export {prepareFont} from '@updf/fontkite'; export {loadFont} from '@updf/fontkite/load';",
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "browser",
    conditions: ["browser"],
    target: "es2022",
    format: "iife",
    globalName: "fontkite",
    write: false,
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: built.outputFiles[0]!.text });
    for (const weight of ["Regular", "Bold"]) {
      const bytes = await fixture(weight);
      const actual = await page.evaluate(async (values) => {
        const api = (
          globalThis as unknown as { fontkite: typeof import("@updf/fontkite") & typeof import("@updf/fontkite/load") }
        ).fontkite;
        const input = new Uint8Array(values);
        return { prepared: api.prepareFont(input).metadata, loaded: (await api.loadFont(input)).metadata };
      }, Array.from(bytes));
      assert.deepEqual(actual.prepared, prepareFont(bytes).metadata);
      assert.deepEqual(actual.loaded, actual.prepared);
    }
    assert.equal(await page.evaluate(() => typeof Buffer), "undefined");
    assert.equal(await page.evaluate(() => typeof process), "undefined");
  } finally {
    await browser.close();
  }
});
