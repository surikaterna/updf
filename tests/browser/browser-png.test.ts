import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import { chunk, container, header } from "../../packages/png/test/helpers.js";
import { browserPngProofInput } from "../../scripts/browser-png-proof-input.js";

interface Proof {
  raster: number[];
  pdf: number[];
  control: number[];
  again: number[];
  rgba: number[];
  first: { fetches: number; decodes: number; encodes: number };
  total: { fetches: number; decodes: number; encodes: number };
  width: number;
  height: number;
  pageWidth: number;
  portable: string;
}

function synthetic(color: number, extras: Buffer[] = []) {
  const samples: Record<number, number[]> = {
    0: [0, 65535, 32768, 65535],
    2: [65535, 0, 0, 0, 65535, 0, 0, 0, 65535, 65535, 65535, 0],
    4: [65535, 65535, 32768, 32768, 0, 0, 0, 65535],
    6: [65535, 0, 0, 65535, 0, 65535, 0, 32768, 0, 0, 65535, 0, 65535, 65535, 0, 65535],
  };
  const values = samples[color]!;
  const bytes = Buffer.alloc(values.length * 2);
  values.forEach((sample, i) => {
    bytes.writeUInt16BE(sample, i * 2);
  });
  const rows = Buffer.concat([
    Buffer.from([0]),
    bytes.subarray(0, bytes.length / 2),
    Buffer.from([0]),
    bytes.subarray(bytes.length / 2),
  ]);
  return container(header(color, 2, 2, 16), ...extras, chunk("IDAT", deflateSync(rows)), chunk("IEND"));
}

async function run(page: Page, bytes: Uint8Array, dom = false): Promise<Proof> {
  return page.evaluate(
    async ({ input, dom }) => {
      const api = (
        globalThis as unknown as { BrowserPngProof: { proof(input: number[], dom: boolean): Promise<Proof> } }
      ).BrowserPngProof;
      const proof = await api.proof(input, dom);
      const raster = await (
        api as unknown as { raster(pdf: number[], width: number, height: number): Promise<number[]> }
      ).raster(proof.pdf, proof.width, proof.height);
      return { ...proof, raster };
    },
    { input: [...bytes], dom },
  );
}

async function assertProof(proof: Proof, out: string, label: string) {
  assert.deepEqual(proof.pdf, proof.control);
  assert.deepEqual(proof.again, proof.control);
  assert.deepEqual(
    { ...proof.first, policies: undefined },
    { fetches: 1, decodes: 1, encodes: 1, policies: undefined },
  );
  assert.equal(proof.total.fetches, 3);
  assert.equal(proof.total.decodes, 2);
  assert.equal(proof.total.encodes, 2);
  assert.equal(proof.portable, "PNG_PROFILE");
  assertRaster(proof);
  const pdf = Buffer.from(proof.pdf);
  assert.equal((pdf.toString("latin1").match(/\/SMask /gu) ?? []).length, 1);
  assert.equal((pdf.toString("latin1").match(/\/Subtype \/Image/gu) ?? []).length, 2);
  await writeFile(`${out}/${label}.pdf`, pdf);
  execFileSync("qpdf", ["--check", `${out}/${label}.pdf`]);
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", `${out}/${label}.pdf`, `${out}/${label}`]);
  execFileSync("pdfimages", [`${out}/${label}.pdf`, `${out}/${label}-image`]);
  const rgb = await readFile(`${out}/${label}-image-000.ppm`);
  const alpha = await readFile(`${out}/${label}-image-001.ppm`);
  assertPixels(
    proof,
    rgb.subarray(rgb.indexOf(Buffer.from("\n255\n")) + 5),
    alpha.subarray(alpha.indexOf(Buffer.from("\n255\n")) + 5),
  );
}

function assertPixels(proof: Proof, pixels: Buffer, mask: Buffer) {
  for (let y = 0; y < proof.height; y++)
    for (let x = 0; x < proof.width; x++) {
      const source = (y * proof.width + x) * 4;
      const target = (y * proof.width + x) * 3;
      assert.ok(Math.abs(mask[(y * proof.width + x) * 3]! - proof.rgba[source + 3]!) <= 1);
      if (proof.rgba[source + 3] === 0) continue;
      for (let channel = 0; channel < 3; channel++) {
        const expected = proof.rgba[source + channel]!;
        assert.ok(
          Math.abs(pixels[target + channel]! - expected) <= 1,
          `pixel ${x},${y},${channel}: ${pixels[target + channel]} expected ${expected}`,
        );
      }
    }
}

function assertRaster(proof: Proof) {
  for (let offset = 0; offset < proof.rgba.length; offset += 4) {
    const alpha = proof.rgba[offset + 3]! / 255;
    for (let channel = 0; channel < 3; channel++) {
      const expected = Math.round(proof.rgba[offset + channel]! * alpha + 255 * (1 - alpha));
      assert.ok(Math.abs(proof.raster[offset + channel]! - expected) <= 1, `PDF.js pixel ${offset},${channel}`);
    }
    assert.equal(proof.raster[offset + 3], 255);
  }
}

test("selected browser PNG normalizes synthetic color/alpha profiles through native PDFs entirely offline", async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  });
  const out = await mkdtemp("/tmp/opencode/browser-png-proof-");
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const requests: string[] = [];
    await context.route("**/*", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    const built = await build({
      stdin: { contents: browserPngProofInput(), resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "iife",
      globalName: "BrowserPngProof",
      write: false,
      target: "es2022",
    });
    await page.addScriptTag({ content: built.outputFiles[0]!.text });
    for (const color of [0, 2, 4, 6]) await assertProof(await run(page, synthetic(color)), out, `color-${color}`);
    await extraProfiles(page, out);
    assert.deepEqual(requests, []);
    console.log({ out, ambientRequests: requests.length });
  } finally {
    await browser.close();
  }
});

async function extraProfiles(page: Page, out: string) {
  const gamma = Buffer.alloc(4);
  gamma.writeUInt32BE(45455);
  const chroma = Buffer.alloc(32);
  [31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000].forEach((value, index) => {
    chroma.writeUInt32BE(value, index * 4);
  });
  await assertProof(
    await run(page, synthetic(6, [chunk("gAMA", gamma), chunk("cHRM", chroma), chunk("sRGB", Buffer.from([0]))])),
    out,
    "metadata",
  );
  await assertProof(await run(page, synthetic(0, [chunk("tRNS", Buffer.from([255, 255]))])), out, "trns-gray");
  await assertProof(
    await run(page, synthetic(2, [chunk("tRNS", Buffer.from([255, 255, 0, 0, 0, 0]))])),
    out,
    "trns-rgb",
  );
  const dom = await run(page, synthetic(6), true);
  await assertProof(dom, out, "dom-canvas");
  assert.deepEqual(dom.rgba, [255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 0, 0, 255, 255, 0, 255]);
  if (process.env.BROWSER_PNG_REFERENCE) {
    const bytes = await readFile(process.env.BROWSER_PNG_REFERENCE);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      "7a201582d435201a92a092bd3aef7150029da0bc9b2e86d89e692ab9278b474a",
    );
    await assertProof(await run(page, bytes), out, "cached-reference");
  }
}
