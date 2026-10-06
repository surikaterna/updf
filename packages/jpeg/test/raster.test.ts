import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { type NodeDefinition, render } from "@updf/core";
import { jpeg, jpegProvider, prepareJpeg } from "@updf/jpeg";
import { fixture } from "./helpers.js";

function raster(children: readonly NodeDefinition[]): { pixels: Buffer; width: number } {
  const directory = mkdtempSync(join(tmpdir(), "updf-jpeg-"));
  try {
    const path = join(directory, "placement.pdf");
    writeFileSync(
      path,
      render(
        { version: 1, pages: [{ width: 100, height: 100, children }] },
        { resources: { photo: prepareJpeg(fixture()) }, providers: [jpegProvider()] },
      ),
    );
    execFileSync("qpdf", ["--check", path]);
    const ppm = execFileSync("pdftoppm", ["-r", "72", "-singlefile", path]);
    const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(ppm.toString("latin1"));
    assert.ok(header);
    assert.equal(Number(header[1]), 100);
    assert.equal(Number(header[2]), 100);
    return { pixels: ppm.subarray(header[0].length), width: 100 };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
function color(image: { pixels: Buffer; width: number }, x: number, y: number, expected: readonly number[]): void {
  const offset = (y * image.width + x) * 3;
  const actual = [...image.pixels.subarray(offset, offset + 3)];
  assert.ok(
    expected.every((value, i) => Math.abs((actual[i] ?? 0) - value) < 45),
    `pixel ${x},${y}: ${actual} vs ${expected}`,
  );
}
const red = [230, 30, 20],
  green = [20, 210, 40],
  blue = [30, 40, 220],
  yellow = [240, 220, 30];
test("qpdf and Poppler confirm asymmetric top-left placement, reflection, nested rotation and explicit clip", () => {
  const leaf = jpeg("photo", { x: 0, y: 0, width: 30, height: 20 });
  const children: NodeDefinition[] = [
    jpeg("photo", { x: 10, y: 60, width: 30, height: 20 }),
    { type: "paintGroup", transform: [-1, 0, 0, 1, 45, 10], children: [leaf] },
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, 70, 20],
      children: [{ type: "paintGroup", transform: [0, 1, -1, 0, 0, 0], children: [leaf] }],
    },
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, 50, 60],
      clip: { x: 0, y: 0, width: 15, height: 20 },
      children: [leaf],
    },
  ];
  const image = raster(children);
  color(image, 17, 65, red);
  color(image, 32, 65, green);
  color(image, 17, 75, blue);
  color(image, 32, 75, yellow);
  color(image, 37, 15, red);
  color(image, 22, 15, green);
  color(image, 37, 25, blue);
  color(image, 22, 25, yellow);
  color(image, 65, 27, red);
  color(image, 65, 42, green);
  color(image, 55, 27, blue);
  color(image, 55, 42, yellow);
  color(image, 57, 65, red);
  color(image, 57, 75, blue);
  color(image, 72, 65, [255, 255, 255]);
  color(image, 72, 75, [255, 255, 255]);
});
