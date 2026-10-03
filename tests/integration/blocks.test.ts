import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createExtensions, layoutFlow } from "@updf/layout";
import { flow, paragraph } from "../../packages/layout/test/fixtures.js";
import { chart, chartAdapter } from "../fixtures/chart.js";

test("external public chart adapter produces an atomic PDF between paragraphs without engine changes", async () => {
  const extensions = createExtensions([chartAdapter]);
  const input = flow(
    [
      { type: "paragraph", paragraph: paragraph("Before") },
      chart({ height: 60, values: [0.2, 0.6, 0.9] }),
      { type: "paragraph", paragraph: paragraph("After") },
    ],
    { width: 200, height: 100 },
  );
  const result = layoutFlow(input, {}, extensions);
  assert.equal(result.pageCount, 1);
  assert.deepEqual(
    result.placements.map((placement) => placement.sourceIndex),
    [0, 1, 2],
  );
  const directory = new URL("../../artifacts/blocks/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("chart.pdf", directory).pathname;
  await writeFile(path, render(result.document));
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.match(text, /Before\s+External chart\s+After/u);
  const prefix = new URL("chart", directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, prefix]);
  const ppm = await readFile(`${prefix}.ppm`);
  assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+200 100\s+255\s/u);
  const pixels = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  let blue = 0;
  for (let offset = 0; offset < pixels.length; offset += 3) {
    if ((pixels[offset] ?? 255) > 80 || (pixels[offset + 2] ?? 0) < 150) continue;
    const x = (offset / 3) % 200;
    const y = Math.floor(offset / 3 / 200);
    assert.ok(x >= 10 && x < 196 && y >= 10 && y < 70);
    blue++;
  }
  assert.ok(blue > 1000);
});

test("external chart atomicity moves once and rejects oversize without shrinking", () => {
  const extensions = createExtensions([chartAdapter]);
  const result = layoutFlow(
    flow([{ type: "spacer", height: 50 }, chart({ height: 60, values: [0.5] })], { width: 200, height: 100 }),
    {},
    extensions,
  );
  assert.equal(result.placements[1]?.pageIndex, 1);
  assert.equal(result.placements[1]?.box.height, 60);
  assert.throws(
    () => layoutFlow(flow([chart({ height: 101, values: [0.5] })], { width: 200, height: 100 }), {}, extensions),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LAYOUT_OVERSIZED",
  );
});
