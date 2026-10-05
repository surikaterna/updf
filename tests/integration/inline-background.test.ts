import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import type { DocumentDefinition, NodeDefinition } from "@updf/core";
import { document, flow, paragraph, pt, span } from "@updf/layout";
import { layout, render } from "../fixtures/text-options.js";

const yellow = [1, 1, 0] as const;
const cyan = [0, 1, 1] as const;
function fixture(highlight = true, tight = false, preserve = true): DocumentDefinition {
  return layout(
    document({
      children: flow({
        pageSize: { width: 120, height: 120 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        children: paragraph({
          style: { fontSize: 16, color: [1, 0, 0], lineHeight: pt(tight ? 4 : 20) },
          whiteSpace: preserve ? "preserve" : "collapse",
          breakLongWords: "codePoint",
          children: [
            span({ style: highlight ? { backgroundColor: yellow } : {}, children: "A A  A " }),
            span({ style: highlight ? { backgroundColor: cyan } : {}, children: "A A A\nA A" }),
          ],
        }),
      }),
    }),
  ).document;
}
function raster(tree: DocumentDefinition): Buffer {
  const ppm = execFileSync("pdftoppm", ["-r", "144", "-aa", "no", "-aaVector", "no", "-singlefile", "-"], {
    input: render(tree),
  });
  const header = /^P6\s+240 240\s+255\s/u.exec(ppm.subarray(0, 40).toString("ascii"));
  assert.ok(header);
  return ppm.subarray(header[0].length);
}
function mask(rgb: Buffer, color: readonly number[]): number[] {
  const pixels: number[] = [];
  for (let offset = 0; offset < rgb.length; offset += 3)
    if (color.every((value, channel) => rgb[offset + channel] === value)) pixels.push(offset / 3);
  return pixels;
}
function oracle(actual: Buffer, plain: Buffer): void {
  assert.deepEqual(mask(actual, [255, 0, 0]), mask(plain, [255, 0, 0]), "Foreground obscured");
  assert.ok(mask(actual, [255, 255, 0]).length > 50, "Missing/wrong yellow highlight");
  assert.ok(mask(actual, [0, 255, 255]).length > 50, "Missing/wrong cyan highlight");
}
function mutate(tree: DocumentDefinition, mode: "missing" | "wrong" | "obscure"): DocumentDefinition {
  const visit = (values: Iterable<NodeDefinition>): NodeDefinition[] => {
    const result = [...values].flatMap((node): NodeDefinition[] => {
      if (node.type === "rect")
        return mode === "missing"
          ? []
          : [
              {
                ...node,
                paint: { fill: mode === "wrong" ? ([0, 0, 1] as const) : (node.paint?.fill ?? null), stroke: null },
              },
            ];
      if (node.type !== "paintGroup") return [node];
      const children = visit(node.children);
      return [{ ...node, children }];
    });
    if (mode === "obscure") result.sort((a, b) => Number(hasBackground(a)) - Number(hasBackground(b)));
    return result;
  };
  return { ...tree, pages: tree.pages.map((page) => ({ ...page, children: visit(page.children) })) };
}
function hasBackground(node: NodeDefinition): boolean {
  return node.type === "rect" || (node.type === "paintGroup" && [...node.children].some(hasBackground));
}
test("#43 RGB raster oracle covers wrapped adjacent highlights, retained/collapsed spaces and overlapping tight lines", () => {
  for (const tight of [false, true]) {
    for (const preserve of [false, true]) {
      const tree = fixture(true, tight, preserve);
      oracle(raster(tree), raster(fixture(false, tight, preserve)));
      assert.match(execFileSync("pdftotext", ["-raw", "-", "-"], { input: render(tree), encoding: "utf8" }), /A/u);
    }
  }
});
test("#43 raster oracle rejects actual PDFs with missing/wrong fills or backgrounds obscuring glyphs", () => {
  const tree = fixture();
  const plain = raster(fixture(false));
  for (const mode of ["missing", "wrong", "obscure"] as const)
    assert.throws(() => oracle(raster(mutate(tree, mode)), plain), /Missing\/wrong|Foreground obscured/u);
});
