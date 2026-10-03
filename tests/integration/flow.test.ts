import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { layoutFlow } from "@updf/layout";
import { Flow } from "@updf/layout/vdom";
import { fixed, flow, paragraph } from "../../packages/layout/test/fixtures.js";

test("multi-page flow qpdf, extraction order, contained raster boxes and identical repeated regions", async () => {
  const result = layoutFlow(
    flow(
      [
        {
          type: "paragraph",
          paragraph: paragraph("L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9", {
            defaultStyle: { font: "Helvetica", fontSize: 10, color: [1, 0, 0] },
            lineHeight: 12,
          }),
        },
        {
          type: "fixed",
          height: 15,
          children: [{ type: "rect", x: 0, y: 0, width: 40, height: 5, paint: { fill: [0, 1, 0], stroke: null } }],
        },
      ],
      {
        width: 200,
        height: 100,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        header: { height: 10, children: [fixed("HEADER")] },
        footer: { height: 10, children: [fixed("FOOTER")] },
        headerBodyGap: 5,
        bodyFooterGap: 5,
      },
    ),
  );
  assert.equal(result.pageCount, 3);
  const directory = new URL("../../artifacts/flow/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("flow.pdf", directory).pathname;
  await writeFile(path, render(result.document));
  execFileSync("qpdf", ["--check", path]);
  const pages = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).trim().split("\f");
  assert.equal(pages.length, 3);
  for (const page of pages) assert.match(page, /HEADER[\s\S]*L\d[\s\S]*FOOTER/u);
  const lines = pages.join("").match(/L\d/gu);
  assert.deepEqual(
    lines,
    Array.from({ length: 9 }, (_, i) => `L${i + 1}`),
  );
  const prefix = new URL("flow", directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", path, prefix]);
  const rasters = await Promise.all(Array.from({ length: 3 }, (_, i) => readFile(`${prefix}-${i + 1}.ppm`)));
  raster(rasters);
});
function raster(rasters: readonly Buffer[]): void {
  const images = rasters.map((ppm) => {
    assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+200 100\s+255\s/u);
    const start = ppm.indexOf(Buffer.from("\n255\n")) + 5;
    assert.ok(start > 4);
    return ppm.subarray(start);
  });
  let red = 0,
    green = 0;
  for (const rgb of images) {
    for (let i = 0; i < rgb.length; i += 3) {
      const r = rgb[i] ?? 255,
        g = rgb[i + 1] ?? 255,
        b = rgb[i + 2] ?? 255;
      if (Math.min(r, g, b) >= 150) continue;
      const x = (i / 3) % 200,
        y = Math.floor(i / 3 / 200);
      assert.ok(x >= 10 && x < 190);
      assert.ok((y >= 10 && y < 20) || (y >= 25 && y < 75) || (y >= 80 && y < 90));
      if (r > 150 && g < 100 && b < 100) red++;
      if (g > 150 && r < 100 && b < 100) green++;
    }
    assert.deepEqual(rgb.subarray(10 * 200 * 3, 20 * 200 * 3), images[0]?.subarray(10 * 200 * 3, 20 * 200 * 3));
    assert.deepEqual(rgb.subarray(80 * 200 * 3, 90 * 200 * 3), images[0]?.subarray(80 * 200 * 3, 90 * 200 * 3));
  }
  assert.ok(red > 50 && green >= 200);
}
test("R1 fractional translated PDF retains exact paragraph/region order and contained raster ink", async () => {
  const input = fractionalDefinition();
  const result = layoutFlow(input);
  assert.equal(result.pageCount, 1);
  const bytes = render(result.document);
  assert.deepEqual(render(lower(h(Flow.Document, input))), bytes);
  const directory = new URL("../../artifacts/flow/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("fractional.pdf", directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.match(text, /H\s+AAAAAAAAA\s+AAAAAAAAA\s+AAAAAAAAA\s+F/u);
  const prefix = new URL("fractional", directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, prefix]);
  fractionalRaster(await readFile(`${prefix}.ppm`));
});
function fractionalDefinition() {
  return flow(
    [
      {
        type: "paragraph",
        keepTogether: true,
        paragraph: paragraph("AAAAAAAAA\nAAAAAAAAA\nAAAAAAAAA", {
          defaultStyle: { font: "Helvetica", fontSize: 10, color: [1, 0, 0] },
          lineHeight: 10.3,
          breakLongWords: "error",
        }),
      },
    ],
    {
      width: 800.28,
      height: 800.9,
      margins: { top: 600.125, right: 40.25, bottom: 40.25, left: 700 },
      header: { height: 99.625, children: [{ ...fixed("H"), width: 20 }] },
      headerBodyGap: 0.25,
      footer: { height: 29.5, children: [{ ...fixed("F"), width: 20 }] },
      bodyFooterGap: 0.25,
    },
  );
}
function fractionalRaster(ppm: Buffer): void {
  assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+801 801\s+255\s/u);
  const offset = ppm.indexOf(Buffer.from("\n255\n")) + 5;
  assert.ok(offset > 4);
  const rgb = ppm.subarray(offset);
  let red = 0,
    black = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i] ?? 255,
      g = rgb[i + 1] ?? 255,
      b = rgb[i + 2] ?? 255;
    if (Math.min(r, g, b) >= 150) continue;
    const x = (i / 3) % 801,
      y = Math.floor(i / 3 / 801);
    assert.ok(x >= 700 && x < 761);
    if (r > 150 && g < 150 && b < 150) {
      assert.ok(y >= 700 && y < 731);
      red++;
    } else {
      assert.ok((y >= 600 && y < 700) || (y >= 731 && y < 761));
      black++;
    }
  }
  assert.ok(red > 100 && black > 20);
}
