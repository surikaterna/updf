import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import type { DocumentDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, document, flow, paragraph, pt } from "@updf/layout";
import { layout, render } from "../fixtures/text-options.js";

type Rectangle = readonly [x: number, y: number, width: number, height: number];
const blue = { width: 2, color: [0, 0, 1] as const };
function raster(pdf: Uint8Array, page = 1): Buffer {
  const ppm = execFileSync("pdftoppm", ["-r", "144", "-f", String(page), "-l", String(page), "-singlefile", "-"], {
    input: pdf,
  });
  const header = /^P6\s+240 (?:240|120)\s+255\s/u.exec(ppm.subarray(0, 40).toString("ascii"));
  assert.ok(header);
  return ppm.subarray(header[0].length);
}
function assertBorders(rgb: Buffer, rectangles: readonly Rectangle[]): void {
  let colored = 0;
  for (let offset = 0; offset < rgb.length; offset += 3) {
    const x = (offset / 3) % 240,
      y = Math.floor(offset / 3 / 240);
    const expected = rectangles.some(
      ([left, top, width, height]) => x >= left * 2 && x < (left + width) * 2 && y >= top * 2 && y < (top + height) * 2,
    );
    const actual = rgb[offset] === 0 && rgb[offset + 1] === 0 && rgb[offset + 2] === 255;
    assert.equal(actual, expected, `Border coverage/outside stroke at ${x / 2},${y / 2}`);
    if (actual) colored++;
  }
  assert.ok(colored > 400, "Nontrivial border coverage required");
}
function fixture(): DocumentDefinition {
  return layout(
    document({
      children: flow({
        pageSize: { width: 120, height: 120 },
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [
          h(Block, {
            style: { height: 20, padding: 3, borderBottom: blue },
            children: paragraph({ children: "Heading" }),
          }),
          h(Block, {
            style: {
              height: 40,
              overflow: "hidden",
              padding: 3,
              backgroundColor: [1, 1, 0],
              borderTop: blue,
              borderRight: { ...blue, width: 3 },
              borderBottom: { ...blue, width: 4 },
              borderLeft: { ...blue, width: 5 },
            },
            children: paragraph({
              style: { color: [1, 0, 0], lineHeight: pt(10) },
              children: "CLIP\nCLIP\nCLIP\nCLIP\nCLIP\nCLIP",
            }),
          }),
        ],
      }),
    }),
  ).document;
}
const mixed: readonly Rectangle[] = [
  [10, 28, 100, 2],
  [10, 30, 100, 2],
  [10, 66, 100, 4],
  [10, 32, 5, 34],
  [107, 32, 3, 34],
];
test("#42-A bottom heading and mixed outer box paint only inside exact allocated strips, with clipped ink", () => {
  const pdf = render(fixture());
  const rgb = raster(pdf);
  assertBorders(rgb, mixed);
  assert.match(execFileSync("pdftotext", ["-", "-"], { input: pdf, encoding: "utf8" }), /Heading/u);
  let red = 0,
    yellow = 0;
  for (let offset = 0; offset < rgb.length; offset += 3) {
    const x = ((offset / 3) % 240) / 2,
      y = Math.floor(offset / 3 / 240) / 2;
    if (rgb[offset] === 255 && rgb[offset + 1] === 0 && rgb[offset + 2] === 0) {
      assert.ok(x >= 15 && x < 107 && y >= 32 && y < 66, "Ink escaped padding-edge clip");
      red++;
    }
    if (rgb[offset] === 255 && rgb[offset + 1] === 255 && rgb[offset + 2] === 0) yellow++;
  }
  assert.ok(red > 100 && yellow > 1000, "Clipped text must remain in front of background");
});
test("#42-A raster oracle rejects missing strips and actual out-of-box PDF ink", () => {
  const tree = fixture();
  const rgb = raster(render(tree));
  const removed = Buffer.from(rgb);
  removed.fill(255, (28 * 2 * 240 + 40 * 2) * 3, (28 * 2 * 240 + 60 * 2) * 3);
  assert.throws(() => assertBorders(removed, mixed), /Border coverage\/outside stroke/u);
  const outside = {
    ...tree,
    pages: tree.pages.map((page) => ({
      ...page,
      children: [
        ...page.children,
        { type: "rect" as const, x: 8, y: 30, width: 2, height: 40, paint: { fill: blue.color, stroke: null } },
      ],
    })),
  };
  assert.throws(() => assertBorders(raster(render(outside)), mixed), /Border coverage\/outside stroke/u);
});
test("#42-A three fragment rasters retain side edges without interior top/bottom seams", () => {
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 120, height: 60 },
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        children: h(Block, {
          style: { border: blue, padding: 2 },
          children: paragraph({ style: { lineHeight: pt(10) }, children: "A\nB\nC\nD\nE\nF\nG" }),
        }),
      }),
    }),
  );
  assert.deepEqual(
    result.placements.map(({ box }) => box.height),
    [38, 38, 18],
  );
  const expected: readonly (readonly Rectangle[])[] = [
    [
      [10, 10, 100, 2],
      [10, 12, 2, 36],
      [108, 12, 2, 36],
    ],
    [
      [10, 10, 2, 38],
      [108, 10, 2, 38],
    ],
    [
      [10, 26, 100, 2],
      [10, 10, 2, 16],
      [108, 10, 2, 16],
    ],
  ];
  const pdf = render(result.document);
  for (const [page, rectangles] of expected.entries()) assertBorders(raster(pdf, page + 1), rectangles);
});
