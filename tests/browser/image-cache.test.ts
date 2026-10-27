import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import { png16 } from "../../packages/png/test/normalization-fixture.js";
import { imageCacheProofInput } from "../../scripts/image-cache-proof-input.js";

interface Proof {
  cold: number[];
  warm: number[];
  counts: object;
  total: object;
  portable: string;
  snapshot: { entries: number; pending: number; consumers: number };
}
async function run(page: Page, bytes: Uint8Array) {
  return page.evaluate(
    async (input) => {
      const api = (globalThis as unknown as { ImageCacheProof: { proof(input: number[]): Promise<Proof> } })
        .ImageCacheProof;
      return api.proof(input);
    },
    [...bytes],
  );
}

test("explicit cross-render cache avoids repeated real browser PNG conversion; portable policy cannot borrow it", async () => {
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
      stdin: { contents: imageCacheProofInput(), resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "iife",
      globalName: "ImageCacheProof",
      write: false,
      target: "es2022",
    });
    await page.addScriptTag({ content: built.outputFiles[0]!.text });
    const inputs = [png16()];
    if (process.env.BROWSER_PNG_REFERENCE) inputs.push(await readFile(process.env.BROWSER_PNG_REFERENCE));
    const out = await mkdtemp("/tmp/opencode/image-cache-proof-");
    for (const [index, bytes] of inputs.entries()) {
      const proof = await run(page, bytes);
      assert.deepEqual(proof.cold, proof.warm);
      assert.deepEqual(proof.counts, { fetches: 1, decodes: 1, encodes: 1 });
      assert.deepEqual(proof.total, { fetches: 2, decodes: 1, encodes: 1 });
      assert.equal(proof.portable, "PNG_PROFILE");
      assert.equal(proof.snapshot.entries, 1);
      assert.equal(proof.snapshot.pending, 0);
      assert.equal(proof.snapshot.consumers, 0);
      await writeFile(`${out}/${index}.pdf`, Buffer.from(proof.warm));
      execFileSync("qpdf", ["--check", `${out}/${index}.pdf`]);
    }
    assert.deepEqual(requests, []);
    console.log({ out, ambientRequests: requests.length });
  } finally {
    await browser.close();
  }
});
