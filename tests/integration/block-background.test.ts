import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { render } from "@updf/core";
import { block, layoutFlow } from "@updf/layout";
import { flow } from "../../packages/layout/test/fixtures.js";

const child = {
  type: "fixed" as const,
  height: 10,
  children: [
    { type: "rect" as const, x: 0, y: 0, width: 20, height: 10, paint: { fill: [1, 0, 0] as const, stroke: null } },
  ],
};
async function raster(name: string, input: Parameters<typeof layoutFlow>[0]): Promise<readonly Buffer[]> {
  const result = layoutFlow(input);
  const directory = new URL("../../artifacts/blocks/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL(`${name}.pdf`, directory).pathname;
  await writeFile(path, render(result.document));
  execFileSync("qpdf", ["--check", path]);
  const prefix = new URL(name, directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", path, prefix]);
  return Promise.all(Array.from({ length: result.pageCount }, (_, index) => readFile(`${prefix}-${index + 1}.ppm`)));
}
function colors(ppm: Buffer): { red: number; yellow: number; green: number } {
  const rgb = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  const counts = { red: 0, yellow: 0, green: 0 };
  for (let offset = 0; offset < rgb.length; offset += 3) {
    const r = rgb[offset] ?? 255,
      g = rgb[offset + 1] ?? 255,
      b = rgb[offset + 2] ?? 255;
    if (r > 200 && g < 50 && b < 50) counts.red++;
    if (r > 200 && g > 200 && b < 50) counts.yellow++;
    if (r < 50 && g > 200 && b < 50) counts.green++;
  }
  return counts;
}
test("C-F1: actual PDF child red ink paints over a yellow background", async () => {
  const images = await raster("background", flow([block({ children: [child], style: { background: [1, 1, 0] } })]));
  assert.deepEqual(colors(images[0]!), { red: 200, yellow: 800, green: 0 });
});
test("C-F1: fragmented and hidden backgrounds never obscure children; borders remain outside the clip", async () => {
  const fragments = await raster(
    "background-fragments",
    flow([
      block({
        children: [child, child, child, child],
        style: { padding: { top: 1, right: 1, bottom: 1, left: 1 }, background: [1, 1, 0] },
      }),
    ]),
  );
  assert.equal(fragments.length, 2);
  assert.deepEqual(
    fragments.map((ppm) => colors(ppm).red),
    [600, 200],
  );
  const hidden = await raster(
    "background-hidden",
    flow([
      block({
        children: [child],
        style: { height: 8, overflow: "hidden", border: { width: 2, color: [0, 1, 0] }, background: [1, 1, 0] },
      }),
    ]),
  );
  const counts = colors(hidden[0]!);
  assert.equal(counts.red, 80);
  assert.ok(counts.yellow > 0 && counts.green > 0);
});
