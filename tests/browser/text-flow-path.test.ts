import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { pathCostInput } from "../../scripts/text-flow-path-cost-input.js";

test("Path public consumer has identical Chromium/Node placements, nodes and complete PDF bytes", async () => {
  const common = {
    stdin: { contents: pathCostInput(), resolveDir: process.cwd(), loader: "ts" as const },
    bundle: true,
    write: false,
    target: "es2022",
  };
  const node = await build({ ...common, platform: "node", format: "esm", conditions: ["node", "import"] });
  const expected = await import(
    `data:text/javascript;base64,${Buffer.from(node.outputFiles![0]!.contents).toString("base64")}`
  );
  const code = await build({
    ...common,
    platform: "browser",
    format: "iife",
    globalName: "pathProof",
    conditions: ["browser"],
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: code.outputFiles![0]!.text });
    const result = await page.evaluate(() => {
      const proof = (globalThis as unknown as { pathProof: { pdf: Uint8Array; result: unknown } }).pathProof;
      return { pdf: Array.from(proof.pdf), result: proof.result };
    });
    assert.ok(expected.result.pageCount > 1);
    assert.deepEqual(result.result, expected.result);
    assert.deepEqual(new Uint8Array(result.pdf), expected.pdf);
  } finally {
    await browser.close();
  }
});
