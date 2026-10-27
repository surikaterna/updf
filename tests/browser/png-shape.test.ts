import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { png16 } from "../../packages/png/test/normalization-fixture.js";
import { pngShapeBrowserInput } from "../../scripts/png-shape-browser-input.js";
import type { PngShape } from "@updf/text-flow/png-shape";
import { rectangles } from "../../packages/text-flow/test/png-shape-fixture.js";

interface Proof {
  shapes: { shapeImageThreshold: number; shape?: PngShape; error?: string }[];
  width: number;
  height: number;
  alpha: number[] | null;
  resourceBytes: number;
  afterResourceBytes: number;
  before: object;
  after: object;
  fetches: number;
  sameResource: boolean;
  frozen: boolean;
  pdf: number[];
  again: number[];
}

function check(proof: Proof, synthetic: boolean) {
  assert.deepEqual(proof.before, proof.after);
  assert.equal(proof.resourceBytes, proof.afterResourceBytes);
  assert.equal(proof.sameResource, true);
  assert.equal(proof.frozen, true);
  assert.equal(proof.fetches, 1);
  assert.deepEqual(proof.pdf, proof.again);
  for (const entry of proof.shapes) {
    if (entry.error) {
      assert.equal(synthetic, false);
      assert.equal(entry.error, "LIMIT");
      continue;
    }
    assert.ok(entry.shape);
    const boxes = rectangles(entry.shape);
    for (let i = 0; i < proof.width * proof.height; i++) {
      const x = (i % proof.width) + 0.5,
        y = Math.floor(i / proof.width) + 0.5;
      assert.equal(
        boxes.some((b) => b.left < x && x < b.right && b.top < y && y < b.bottom),
        (proof.alpha?.[i] ?? 255) / 255 > entry.shapeImageThreshold,
      );
    }
  }
}

async function browserBundle() {
  const bundle = await build({
    stdin: { contents: pngShapeBrowserInput(), resolveDir: process.cwd() },
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "PngShapeProof",
    write: false,
    target: "es2022",
  });
  return bundle.outputFiles[0]!.text;
}

test("offline browser-normalized PNG resources, including warm S6 cache handles, expose bounded immutable shapes", async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  });
  try {
    const page = await browser.newPage({ serviceWorkers: "block" });
    const requests: string[] = [];
    await page.route("**/*", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.addScriptTag({ content: await browserBundle() });
    const inputs = [png16(6), png16(4)];
    if (process.env.PNG_SHAPE_REFERENCE) inputs.push(await readFile(process.env.PNG_SHAPE_REFERENCE));
    const receipts = [];
    for (const [i, bytes] of inputs.entries()) {
      const proof = await page.evaluate(
        (input) =>
          (globalThis as unknown as { PngShapeProof: { proof(input: number[]): Promise<Proof> } }).PngShapeProof.proof(
            input,
          ),
        [...bytes],
      );
      check(proof, i < 2);
      const { pdf: _pdf, again: _again, alpha, ...receipt } = proof;
      receipts.push({
        ...receipt,
        alphaBytes: alpha?.length ?? 0,
        commands: proof.shapes.map((x) => (x.shape?.kind === "contours" ? x.shape.commands.length : (x.error ?? 0))),
      });
    }
    assert.deepEqual(requests, []);
    if (process.env.PNG_SHAPE_OUT) {
      await mkdir(process.env.PNG_SHAPE_OUT, { recursive: true });
      await writeFile(`${process.env.PNG_SHAPE_OUT}/browser.json`, JSON.stringify(receipts, null, 2), { flag: "wx" });
    }
    console.log(receipts.map(({ width, height, commands, alphaBytes }) => ({ width, height, commands, alphaBytes })));
  } finally {
    await browser.close();
  }
});
