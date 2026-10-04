import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { type NodeDefinition, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, Column, Document, Flow, layout, Paragraph, Row, type RowAlignment } from "@updf/layout";
import { rowExample } from "../../apps/showcase/src/rows.js";

function fixture(align: RowAlignment) {
  const border = { width: 2, color: [0, 1, 0] as const };
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 100 },
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      children: h(Row, {
        align,
        style: { height: 60, padding: 2, gap: 10, border: { width: 2, color: [0, 0, 0] } },
        children: [
          h(Column, {
            width: 60,
            style: { padding: 2, border, backgroundColor: [1, 0, 0] },
            children: h(Paragraph, { children: "LEFT" }),
          }),
          h(Column, {
            style: { padding: 2, border, backgroundColor: [0, 0, 1] },
            children: h(Block, {
              style: { height: 30, overflow: "hidden" },
              children: {
                type: "fixed",
                height: 50,
                children: [
                  { type: "rect", x: 0, y: 0, width: 10, height: 50, paint: { fill: [1, 0, 1], stroke: null } },
                ],
              },
            }),
          }),
        ],
      }),
    }),
  });
}
function pixel(rgb: Buffer, x: number, y: number) {
  const offset = (Math.floor(y * 2) * 400 + Math.floor(x * 2)) * 3;
  return [...rgb.subarray(offset, offset + 3)];
}
function color(rgb: Buffer, x: number, y: number, expected: readonly number[]) {
  assert.deepEqual(pixel(rgb, x, y), expected, `Color at ${x},${y}`);
}
function assertRaster(rgb: Buffer, align: RowAlignment) {
  const top = align === "middle" ? 31 : align === "bottom" ? 48 : 14;
  const rightTop = align === "middle" ? 21 : align === "bottom" ? 28 : 14;
  const leftHeight = align === "stretch" ? 52 : 18;
  color(rgb, 30, top + 14, [255, 0, 0]);
  color(rgb, 30, top - 1, [255, 255, 255]);
  color(rgb, 30, top + leftHeight + 1, [255, 255, 255]);
  for (let x = 17; x < 71; x++) color(rgb, x, top + 1, [0, 255, 0]);
  for (let y = top + 3; y < top + leftHeight - 3; y++) color(rgb, 15, y, [0, 255, 0]);
  color(rgb, 78, 40, [255, 255, 255]);
  color(rgb, 100, rightTop + 20, [0, 0, 255]);
  color(rgb, 90, rightTop + 20, [255, 0, 255]);
  color(rgb, 90, rightTop + 35, [0, 0, 255]);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 400; x++) {
      if (x >= 20 && x < 380 && y >= 20 && y < 140) continue;
      assert.deepEqual([...rgb.subarray((y * 400 + x) * 3, (y * 400 + x) * 3 + 3)], [255, 255, 255]);
    }
  }
}
function negativeControls(rgb: Buffer, align: RowAlignment) {
  const top = align === "middle" ? 31 : align === "bottom" ? 48 : 14;
  const rightTop = align === "middle" ? 21 : align === "bottom" ? 28 : 14;
  for (const [x, y, value] of [
    [30, top + 14, [255, 255, 255]],
    [40, top + 1, [255, 255, 255]],
    [90, rightTop + 35, [255, 0, 255]],
    [5, 5, [0, 0, 0]],
  ] as const) {
    const broken = Buffer.from(rgb);
    const offset = (y * 2 * 400 + x * 2) * 3;
    broken.set(value, offset);
    assert.throws(() => assertRaster(broken, align), assert.AssertionError);
  }
}
async function raster(bytes: Uint8Array, name: string) {
  const directory = new URL("../../artifacts/rows/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL(`${name}.pdf`, directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  execFileSync("pdftoppm", ["-r", "144", "-singlefile", path, path]);
  const ppm = await readFile(`${path}.ppm`);
  const header = /^P6\s+400 200\s+255\s/u.exec(ppm.subarray(0, 40).toString("ascii"));
  assert.ok(header);
  const rgb = ppm.subarray(header[0].length);
  assert.equal(rgb.length, 400 * 200 * 3);
  return { path, rgb };
}
function brokenNodes(nodes: readonly NodeDefinition[], mode: "border" | "clip"): NodeDefinition[] {
  return nodes.flatMap((node): NodeDefinition[] => {
    if (node.type === "rect" && mode === "border" && JSON.stringify(node.paint?.fill) === "[0,1,0]") return [];
    if (node.type !== "paintGroup") return [node];
    const { clip, ...rest } = node;
    return [{ ...rest, children: brokenNodes(node.children, mode), ...(mode === "clip" || !clip ? {} : { clip }) }];
  });
}
test("#44 real Poppler raster independently checks all alignments, stretch borders, containment and explicit clipping with negative controls", async () => {
  for (const align of ["top", "middle", "bottom", "stretch"] as const) {
    const bytes = render(layout(fixture(align)).document);
    const { path, rgb } = await raster(bytes, align);
    assertRaster(rgb, align);
    negativeControls(rgb, align);
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    assert.match(bbox, /xMin="18\.000000"[^>]*>LEFT<\/word>/);
  }
});
test("#44 raster oracle rejects actual PDFs with wrong alignment, missing borders and removed clips", async () => {
  const source = layout(fixture("top")).document;
  const wrongAlignment = await raster(render(layout(fixture("bottom")).document), "negative-alignment");
  assert.throws(() => assertRaster(wrongAlignment.rgb, "top"), assert.AssertionError);
  for (const mode of ["border", "clip"] as const) {
    const document = {
      ...source,
      pages: source.pages.map((page) => ({ ...page, children: brokenNodes(page.children, mode) })),
    };
    const { rgb } = await raster(render(document), `negative-${mode}`);
    assert.throws(() => assertRaster(rgb, "top"), assert.AssertionError);
  }
});
test("#44 mixed showcase PDF has five atomic pages, chart/SVG/nested text geometry and no text beyond page insets", async () => {
  const { bytes } = rowExample("ROW PROOF");
  const path = new URL("../../artifacts/rows/mixed.pdf", import.meta.url).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
  const pages = bbox.match(/<page\b[^>]*>[\s\S]*?<\/page>/g) ?? [];
  assert.equal(pages.length, 5);
  for (const page of pages.slice(1)) {
    assert.match(page, />External<\/word>/);
    assert.match(page, />SVG<\/word>/);
    assert.match(page, />A<\/word>/);
    assert.match(page, />B<\/word>/);
    for (const word of page.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">/g)) {
      assert.ok(Number(word[1]) >= 10 && Number(word[3]) <= 350);
      assert.ok(Number(word[2]) >= 10 && Number(word[4]) <= 170);
    }
  }
  assert.deepEqual(rowExample("ROW PROOF").bytes, bytes);
});
