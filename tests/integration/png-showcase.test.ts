import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { pngExample } from "../../apps/showcase/src/png.js";
import { samplePng } from "../fixtures/png/generate.js";

function raster(ppm: Buffer) {
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("latin1"));
  assert.ok(header);
  assert.equal(Number(header[1]), 480);
  assert.equal(Number(header[2]), 600);
  const data = ppm.subarray(header[0].length);
  return (x: number, y: number) => [...data.subarray((y * 480 + x) * 3, (y * 480 + x) * 3 + 3)];
}
function near(actual: readonly number[], expected: readonly number[]) {
  assert.ok(
    expected.every((value, index) => Math.abs(value - actual[index]!) <= 3),
    `${actual} vs ${expected}`,
  );
}
function inspect(pixel: ReturnType<typeof raster>, variant: "color" | "gray", width: number) {
  const q = width / 4,
    y = (width * 3) / 16;
  const opaque = variant === "color" ? [230, 30, 20] : [93, 93, 93];
  const half = variant === "color" ? [20, 210, 40] : [90, 90, 90];
  const blue = [51, 102, 204];
  const over = (background: number[]) => half.map((value, index) => (value * 128 + background[index]! * 127) / 255);
  near(pixel(24 + q, 138 + y), opaque);
  near(pixel(24 + 3 * q, 138 + y), over([255, 255, 255]));
  near(pixel(24 + q, 138 + 3 * y), [255, 255, 255]);
  near(pixel(264 + q, 138 + y), opaque);
  near(pixel(264 + 3 * q, 138 + y), over(blue));
  near(pixel(264 + q, 138 + 3 * y), blue);
  near(pixel(24 + 3 * q, 354 + y), opaque);
  near(pixel(24 + q, 354 + y), over(blue));
  near(pixel(264 + q, 354 + y), opaque);
  near(pixel(264 + 3 * q, 354 + y), blue);
}

test("PNG showcase reuses one image/mask, with independent alpha/reflection/clip raster checks", async () => {
  const directory = new URL("../../artifacts/png-showcase/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const variant of ["color", "gray"] as const) {
    const source = await readFile(new URL(`../fixtures/png/${variant}-alpha.png`, import.meta.url));
    assert.deepEqual(source, samplePng(variant === "gray"));
    for (const width of [96, 192]) {
      const result = await pngExample(source, "PNG transparency", { variant, width });
      assert.deepEqual(result.bytes, (await pngExample(source, "PNG transparency", { variant, width })).bytes);
      assert.deepEqual(result.metadata, {
        pixelWidth: 32,
        pixelHeight: 24,
        components: variant === "color" ? 3 : 1,
        alpha: true,
        placementCount: 4,
        pageCount: 1,
      });
      const pdf = Buffer.from(result.bytes).toString("latin1");
      assert.equal((pdf.match(/\/Subtype \/Image/gu) ?? []).length, 2);
      assert.equal((pdf.match(/\/SMask /gu) ?? []).length, 1);
      assert.equal((pdf.match(/\/X\d+ Do/gu) ?? []).length, 4);
      const path = new URL(`${variant}-${width}.pdf`, directory).pathname;
      await writeFile(path, result.bytes);
      execFileSync("qpdf", ["--check", path]);
      assert.match(execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }), /Clipping is not redaction/u);
      inspect(raster(execFileSync("pdftoppm", ["-r", "72", "-singlefile", path])), variant, width);
    }
  }
});

test("PNG showcase validates controls and preserves source ownership", async () => {
  const source = samplePng();
  const original = Buffer.from(source);
  for (const width of [NaN, Infinity, 95, 193, 100.5])
    await assert.rejects(() => pngExample(source, "Sample", { variant: "color", width }), /integer from 96 to 192/u);
  await assert.rejects(() => pngExample(source, "W".repeat(41)), /at most 40/u);
  await assert.rejects(() => pngExample(source, "line\nbreak"), /one line/u);
  await assert.rejects(
    () => pngExample(source, "Sample", { variant: "other" as "color", width: 192 }),
    /Select color/u,
  );
  await pngExample(source, "W".repeat(40));
  assert.deepEqual(source, original);
});
