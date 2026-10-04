import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { type DocumentDefinition, type NodeDefinition, render } from "@updf/core";
import { table, tableExtension } from "@updf/tables";
import { block, createExtensions, layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { bands, base, blue, red, row, run } from "./border-fixtures.js";

async function raster(document: DocumentDefinition): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "updf-b2-border-"));
  try {
    const pdf = join(directory, "table.pdf"),
      image = join(directory, "table");
    await writeFile(pdf, render(document));
    execFileSync("qpdf", ["--check", pdf]);
    execFileSync("pdftoppm", ["-r", "72", "-aa", "no", "-aaVector", "no", "-singlefile", pdf, image]);
    const ppm = await readFile(`${image}.ppm`);
    const header = /^P6\s+100 100\s+255\s/u.exec(ppm.subarray(0, 30).toString("ascii"));
    assert.ok(header);
    return ppm.subarray(header[0].length);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
function checkStrip(pixels: Buffer): void {
  for (let y = 24; y < 36; y++) {
    const offset = (y * 100 + 30) * 3;
    assert.deepEqual([...pixels.subarray(offset, offset + 3)], y >= 28 && y < 32 ? [255, 0, 0] : [255, 255, 255]);
  }
}
const documentFor = (children: readonly NodeDefinition[]): DocumentDefinition => ({
  version: 1,
  pages: [{ width: 100, height: 100, children }],
});
const strip: NodeDefinition = {
  type: "rect",
  x: 10,
  y: 28,
  width: 80,
  height: 4,
  paint: { fill: red.color, stroke: null },
};
function checkPrimitive(document: DocumentDefinition): void {
  const pdf = new TextDecoder().decode(render(document));
  assert.equal((pdf.match(/1 0 0 rg\n(?:(?!\nQ)[\s\S])*?\nh\nf\n/gu) ?? []).length, 1);
  const values = bands(document.pages[0]!.children).filter((band) => band.color[0] === 1);
  assert.deepEqual(values, [{ x: 10, y: 28, width: 80, height: 4, color: red.color }]);
  assert.equal((pdf.match(/1 0 0 rg/gu) ?? []).length, 1);
}
test("#42-B2 actual native PDF single interval, independent raster and duplicated/displaced/wrong-color negative PDFs", async () => {
  const result = run({
    ...base,
    head: { height: 20, rows: [{ ...row, style: { borderBottom: red } }] },
    body: [{ ...row, style: { borderTop: blue } }],
  });
  checkPrimitive(result.document);
  const pdf = new TextDecoder().decode(render(result.document));
  assert.equal((pdf.match(/\nh\nf\n/gu) ?? []).length, 6);
  assert.equal((pdf.match(/0 18 m\n80 18 l\n80 22 l\n0 22 l\nh\nf\n/gu) ?? []).length, 1);
  checkStrip(await raster(result.document));
  assert.throws(() => checkPrimitive(documentFor([strip, strip])));
  const controls: NodeDefinition[] = [
    { ...strip, y: 29 },
    { ...strip, y: 26, height: 8 },
    { ...strip, paint: { fill: blue.color, stroke: null } },
  ];
  for (const control of controls) {
    const document = documentFor([control]);
    assert.throws(() => checkPrimitive(document));
    const pixels = await raster(document);
    assert.throws(() => checkStrip(pixels));
  }
});
test("#42-B2 actual clipped PDF exposes only real edges, with no phantom cut and no ink outside parent", async () => {
  const result = layoutFlow(
    {
      pageTemplate: { width: 100, height: 100, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
      body: [
        block({
          style: { height: 30, overflow: "hidden" },
          children: [
            table({ ...base, style: { padding: 0, border: red }, body: [{ minHeight: 40, cells: [{}, {}] }] }),
          ],
        }),
      ],
    },
    {},
    createExtensions([tableExtension]),
  );
  const pixels = await raster(result.document);
  for (const [x, y, expected] of [
    [30, 10, [255, 0, 0]],
    [30, 39, [255, 255, 255]],
    [9, 20, [255, 255, 255]],
    [30, 40, [255, 255, 255]],
  ] as const) {
    const offset = (y * 100 + x) * 3;
    assert.deepEqual([...pixels.subarray(offset, offset + 3)], expected);
  }
});
