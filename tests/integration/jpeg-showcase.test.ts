import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { jpegExample } from "../../apps/showcase/src/jpeg.js";

async function source(variant: "color" | "gray") {
  return new Uint8Array(
    await readFile(new URL(`../fixtures/jpeg/${variant === "color" ? "color-1x1" : "gray"}.jpg`, import.meta.url)),
  );
}

function pixels(ppm: Buffer) {
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("latin1"));
  assert.ok(header);
  assert.equal(Number(header[1]), 480);
  assert.equal(Number(header[2]), 600);
  const data = ppm.subarray(header[0].length);
  return (x: number, y: number) => [...data.subarray((y * 480 + x) * 3, (y * 480 + x) * 3 + 3)];
}

function near(actual: readonly number[], expected: readonly number[]) {
  assert.ok(
    expected.every((value, i) => Math.abs(value - actual[i]!) < 45),
    `${actual} vs ${expected}`,
  );
}

test("JPEG showcase reuses one original stream for four placements at either display size", async () => {
  const directory = new URL("../../artifacts/jpeg-showcase/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const variant of ["color", "gray"] as const) {
    const original = await source(variant);
    for (const width of [96, 192]) {
      const example = jpegExample(original, "JPEG image placement", { variant, width });
      assert.deepEqual(example.bytes, jpegExample(original, "JPEG image placement", { variant, width }).bytes);
      assert.deepEqual(example.metadata, {
        pixelWidth: 32,
        pixelHeight: 24,
        components: variant === "color" ? 3 : 1,
        placementCount: 4,
        pageCount: 1,
      });
      const binary = Buffer.from(example.bytes);
      assert.ok(binary.includes(Buffer.from(original)));
      assert.equal((binary.toString("latin1").match(/\/Subtype \/Image/gu) ?? []).length, 1);
      assert.equal((binary.toString("latin1").match(/\/X\d+ Do/gu) ?? []).length, 4);
      const path = new URL(`${variant}-${width}.pdf`, directory).pathname;
      await writeFile(path, example.bytes);
      execFileSync("qpdf", ["--check", path]);
      const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
      assert.match(text, /PNG and alpha are not supported/u);
      assert.match(text, /Horizontal reflection/u);
      inspectPixels(pixels(execFileSync("pdftoppm", ["-r", "72", "-singlefile", path])), variant, width);
    }
  }
});

function inspectPixels(pixel: ReturnType<typeof pixels>, variant: "color" | "gray", width: number) {
  const q = width / 4,
    y = (width * 3) / 16;
  const topLeft = pixel(24 + q, 138 + y);
  if (variant === "color") {
    near(topLeft, [230, 30, 20]);
    near(pixel(24 + 3 * q, 138 + y), [20, 210, 40]);
    near(pixel(24 + q, 138 + 3 * y), [30, 40, 220]);
    near(pixel(24 + 3 * q, 138 + 3 * y), [240, 220, 30]);
  } else {
    assert.ok(topLeft[0]! > 20 && topLeft[0]! < 230);
    assert.ok(Math.max(...topLeft) - Math.min(...topLeft) <= 2);
  }
  near(pixel(264 + q, 162), topLeft);
  near(pixel(24 + 3 * q, 354 + y), topLeft);
  near(pixel(264 + q, 354 + y), topLeft);
  near(pixel(264 + 3 * q, 354 + y), [255, 255, 255]);
}

test("JPEG showcase validates controls and does not pretend to support PNG", async () => {
  const bytes = await source("color");
  for (const width of [NaN, Infinity, 95, 193, 100.5])
    assert.throws(() => jpegExample(bytes, "Sample", { variant: "color", width }), /integer from 96 to 192/u);
  assert.throws(() => jpegExample(bytes, "W".repeat(41)), /at most 40/u);
  assert.throws(() => jpegExample(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "PNG"));
  const unchanged = new Uint8Array(bytes);
  jpegExample(bytes, "W".repeat(40));
  assert.deepEqual(bytes, unchanged);
});
