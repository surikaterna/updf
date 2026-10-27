import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { resourcePreparationCostInput } from "../../scripts/resource-preparation-cost-input.js";

test("private asynchronous preparation works in a real browser without transport or codecs", async () => {
  const built = await build({
    stdin: { contents: resourcePreparationCostInput(), resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "PreparationProof",
    target: "es2022",
    write: false,
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  });
  try {
    const page = await browser.newPage();
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.addScriptTag({ content: built.outputFiles[0]!.text });
    const result = await page.evaluate(async () => {
      const api = (
        globalThis as unknown as {
          PreparationProof: {
            proof(): Promise<{
              calls: number;
              geometry: number;
              resolutions: number;
              values: string[];
              bindings: string[];
              bytes: number[];
            }>;
          };
        }
      ).PreparationProof;
      return api.proof();
    });
    assert.equal(result.calls, 2);
    assert.equal(result.resolutions, 2);
    assert.ok(result.geometry > 0);
    assert.deepEqual(result.values, ["left", "right"]);
    assert.deepEqual(result.bindings, ["Prepared0"]);
    assert.deepEqual(requests, []);
    const pdf = Buffer.from(result.bytes).toString("latin1");
    assert.equal((pdf.match(/\/Subtype \/Form/g) ?? []).length, 1);
    assert.equal((pdf.match(/\/X1 Do/g) ?? []).length, 2);
  } finally {
    await browser.close();
  }
});
