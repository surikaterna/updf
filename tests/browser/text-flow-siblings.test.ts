import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { siblingCostInput } from "../../scripts/text-flow-sibling-cost-input.js";

test("styled sibling Block/Paragraph public consumer has identical Chromium/Node placements and PDF bytes", async () => {
  const common = {
    stdin: { contents: siblingCostInput(), resolveDir: process.cwd(), loader: "ts" as const },
    bundle: true,
    write: false,
    target: "es2022",
  };
  const node = await build({ ...common, platform: "node", format: "esm", conditions: ["node", "import"] });
  const expected = await import(
    `data:text/javascript;base64,${Buffer.from(node.outputFiles![0]!.contents).toString("base64")}`
  );
  const browserCode = await build({
    ...common,
    platform: "browser",
    format: "iife",
    globalName: "siblingProof",
    conditions: ["browser"],
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: browserCode.outputFiles![0]!.text });
    const result = await page.evaluate(() => {
      const proof = (globalThis as unknown as { siblingProof: { pdf: Uint8Array; result: unknown } }).siblingProof;
      return { pdf: Array.from(proof.pdf), result: proof.result };
    });
    assert.ok(expected.result.pageCount > 1);
    assert.deepEqual(result.result, expected.result);
    assert.deepEqual(new Uint8Array(result.pdf), expected.pdf);
  } finally {
    await browser.close();
  }
});
