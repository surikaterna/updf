import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { pngAlphaProofInput } from "../../scripts/png-alpha-proof-input.js";
import { alphaPng } from "../../packages/text-flow/test/png-shape-fixture.js";
import { assertAlphaClearance, type AlphaProof } from "./png-alpha-raster.js";

interface Proof extends AlphaProof {
  fetches: number;
  snapshot: { entries: number; pending: number; consumers: number };
  results: (AlphaProof["results"][number] & { pdf: number[]; sameResource: boolean; imageBytes: number })[];
}
async function checkProof(proof: Proof, out: string, index: number) {
  assertAlphaClearance(proof);
  assert.equal(proof.fetches, 1);
  assert.equal(proof.snapshot.entries, 1);
  assert.equal(proof.snapshot.pending, 0);
  assert.equal(proof.snapshot.consumers, 0);
  for (const row of proof.results) {
    assert.ok(row.sameResource);
    assert.equal(row.rects.length, 2);
    assert.equal(row.imageBytes, proof.results[0]!.imageBytes);
    const path = `${out}/${index}-${row.threshold}.pdf`;
    await writeFile(path, Buffer.from(row.pdf));
    execFileSync("qpdf", ["--check", path]);
    const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    assert.equal(text.match(/Automatic/g)?.length, 10);
  }
  await writeFile(
    `${out}/${index}.json`,
    JSON.stringify(
      {
        ...proof,
        plane: { width: proof.plane.width, height: proof.plane.height },
        results: proof.results.map(({ pdf, textPdf, ...row }) => ({
          ...row,
          pdfBytes: pdf.length,
          textPdfBytes: textPdf.length,
        })),
      },
      null,
      2,
    ),
  );
}
test("offline automatic URL masks share browser-normalized PNG across thresholds and occurrences", async () => {
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
      stdin: { contents: pngAlphaProofInput(true), resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "iife",
      globalName: "PngAlphaProof",
      write: false,
    });
    await page.addScriptTag({ content: built.outputFiles[0]!.text });
    const inputs = [alphaPng(4, 4, [255, 255, 0, 0, 255, 0, 0, 64, 0, 0, 255, 0, 0, 255, 255, 0])];
    if (process.env.BROWSER_PNG_REFERENCE) inputs.push(await readFile(process.env.BROWSER_PNG_REFERENCE));
    const out = await mkdtemp("/tmp/opencode/png-alpha-browser-");
    for (const [index, bytes] of inputs.entries()) {
      const proof = await page.evaluate(
        (input) =>
          (globalThis as unknown as { PngAlphaProof: { proof(input: number[]): Promise<Proof> } }).PngAlphaProof.proof(
            input,
          ),
        [...bytes],
      );
      await checkProof(proof, out, index);
    }
    assert.deepEqual(requests, []);
    console.log({ out, ambientRequests: requests.length, inputs: inputs.length });
  } finally {
    await browser.close();
  }
});
