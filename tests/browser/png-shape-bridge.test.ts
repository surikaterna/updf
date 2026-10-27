import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { bridgeCostInput } from "../../scripts/png-shape-bridge-cost-input.js";
import { fixture } from "../../packages/png/test/helpers.js";

interface Proof {
  readonly pdf: number[];
  readonly reports: object[];
  readonly resources: string[];
}
test("offline browser bridge prepares two native PNG slots and publishes the actual Image reference", async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  });
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const requests: string[] = [];
    await context.route("**/*", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    const built = await build({
      stdin: { contents: bridgeCostInput(), resolveDir: process.cwd() },
      platform: "browser",
      format: "iife",
      globalName: "ImageBridge",
      bundle: true,
      write: false,
    });
    await page.addScriptTag({
      content: `${built.outputFiles[0]!.text}
      globalThis.imageBridgeRun=async bytes=>{
        const loader=ImageBridge.createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>new Response(new Uint8Array(bytes))});
        const result=await ImageBridge.inspect(loader,'visual.png','mask.png');
        return {...result,pdf:Array.from(result.pdf)};
      };`,
    });
    const proof = await page.evaluate(
      (bytes) =>
        (globalThis as unknown as { imageBridgeRun: (bytes: number[]) => Promise<Proof> }).imageBridgeRun(bytes),
      [...fixture()],
    );
    assert.deepEqual(proof.resources, ["Prepared0", "Prepared1"]);
    assert.deepEqual(proof.reports, [{ x: 5.625, y: 0, width: 20, height: 20 }]);
    assert.ok(proof.pdf.length > 0);
    assert.deepEqual(requests, []);
  } finally {
    await browser.close();
  }
});
