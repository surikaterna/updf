import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import type { ParagraphDefinition } from "@updf/text";
import { render } from "../fixtures/text-options.js";
import {
  block,
  type Content,
  createDecorationPlan,
  layoutFlow,
  measure,
  paragraph,
  span,
} from "../fixtures/transitional-layout.js";

const directory = new URL("../../artifacts/inline-audit-r1/", import.meta.url);
function laidOut(content: Content) {
  const measured = measure(content, { width: 100 });
  const result = layoutFlow({
    pageTemplate: { width: 100, height: measured.size.height, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    body: [content as ReturnType<typeof paragraph>],
  });
  return { measured, bytes: render(result.document) };
}
async function inspect(name: string, bytes: Uint8Array) {
  await mkdir(directory, { recursive: true });
  const path = new URL(`${name}.pdf`, directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const prefix = new URL(name, directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", path, prefix]);
  execFileSync("pdftoppm", ["-png", "-r", "72", path, prefix]);
  return {
    image: await readFile(`${prefix}-1.ppm`),
    text: execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }),
    bbox: execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" }),
  };
}
test("D-F1: exact-height fractional preserved-space PDFs have identical rich-control and segmented raster ink", async () => {
  for (const align of ["left", "center", "right"] as const) await fractionalRaster(align);
});
async function fractionalRaster(align: ParagraphDefinition["align"]): Promise<void> {
  const fontSize = 10.3,
    text = "  second line ";
  const props = fractionalProps(fontSize, align);
  const whole = laidOut(paragraph({ ...props, children: text }));
  const split = laidOut(
    paragraph({ ...props, children: ["  ", span({ children: "second" }), " ", span({ children: "line" }), " "] }),
  );
  const first = await inspect(`f1-whole-${align}`, whole.bytes);
  const segmented = await inspect(`f1-split-${align}`, split.bytes);
  assert.deepEqual(segmented.image, first.image);
  assert.match(first.text, /second line/u);
  assert.match(segmented.text, /second line/u);
  const height = whole.measured.size.height;
  const rich: ParagraphDefinition = {
    defaultStyle: { font: "Helvetica", fontSize, color: [0, 0, 0] },
    runs: [{ text }],
    lineHeight: height,
    align,
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
  const control = await inspect(
    `f1-rich-${align}`,
    render({
      version: 1,
      pages: [
        { width: 100, height, children: [{ type: "richText", x: 0, y: 0, width: 100, height, paragraphs: [rich] }] },
      ],
    }),
  );
  assert.deepEqual(first.image, control.image);
  const segmentedNative = await inspect(
    `f1-segmented-native-${align}`,
    nativeControl({ ...rich, runs: [{ text: text.slice(0, 3) }, { text: text.slice(3) }] }, height),
  );
  assert.match(segmentedNative.text, /second line/u);
  assert.deepEqual(segmentedNative.image, control.image);
}
function nativeControl(paragraph: ParagraphDefinition, height: number): Uint8Array {
  return render({
    version: 1,
    pages: [
      { width: 100, height, children: [{ type: "richText", x: 0, y: 0, width: 100, height, paragraphs: [paragraph] }] },
    ],
  });
}
test("D-F2: public line/fragment metadata tracks real PDF placement for nested static decoration reservations", async () => {
  const control = await inspect("f2-control", laidOut(paragraph({ children: "A" })).bytes);
  for (const repeat of ["first", "all", "last"] as const) {
    for (const edge of ["before", "after"] as const) {
      const content = block({
        decorations: createDecorationPlan([{ edge, repeat, height: 5, nodes: [] }]),
        children: [paragraph({ children: "A" })],
      });
      const result = laidOut(content);
      const image = await inspect(`f2-${edge}-${repeat}`, result.bytes);
      const offset = word(image.bbox, "A").yMin - word(control.bbox, "A").yMin;
      assert.equal(offset, edge === "before" ? 5 : 0);
      assert.equal(result.measured.lines[0]?.top, offset);
      assert.equal(result.measured.size.height, 15);
      assert.deepEqual(result.measured.lines[0]?.inkBounds, result.measured.inkBounds);
      assert.deepEqual(result.measured.lines[0]?.fragments[0]?.inkBounds, result.measured.inkBounds);
    }
  }
  await nestedReservations(word(control.bbox, "A").yMin);
});
async function nestedReservations(glyphTop: number): Promise<void> {
  const before = createDecorationPlan([
    { edge: "before", repeat: "all", height: 2, nodes: [] },
    { edge: "after", repeat: "last", height: 3, nodes: [] },
  ]);
  const inside = block({
    decorations: createDecorationPlan([
      { edge: "before", repeat: "first", height: 5, nodes: [] },
      { edge: "after", repeat: "all", height: 7, nodes: [] },
    ]),
    style: { padding: 1, gap: 4 },
    children: [paragraph({ children: "A" }), paragraph({ children: "A" })],
  });
  const content = block({
    decorations: before,
    style: { padding: 2, gap: 3 },
    children: [inside, paragraph({ children: "A" })],
  });
  const result = laidOut(content);
  const actual = await inspect("f2-nested", result.bytes);
  const offsets = [...actual.bbox.matchAll(/<word[^>]*yMin="([^"]+)"[^>]*>A<\/word>/gu)].map(
    (match) => Number(match[1]) - glyphTop,
  );
  assert.deepEqual(offsets, [10, 24, 45]);
  assert.deepEqual(
    result.measured.lines.map((line) => line.top),
    offsets,
  );
  assert.deepEqual(
    result.measured.lines.map((line) => line.baseline),
    offsets.map((top) => top + 7.75),
  );
  assert.equal(result.measured.size.height, 60);
  assert.ok(Object.isFrozen(result.measured.lines[0]?.fragments[0]?.source));
}
function word(xml: string, text: string): { yMin: number } {
  const match = [...xml.matchAll(/<word[^>]*yMin="([^"]+)"[^>]*>([^<]+)<\/word>/gu)].find((match) => match[2] === text);
  assert.ok(match);
  return { yMin: Number(match[1]) };
}
function fractionalProps(fontSize: number, textAlign: ParagraphDefinition["align"]) {
  return {
    style: { fontSize, textAlign, lineHeight: { unit: "pt" as const, value: Math.max(12, fontSize * 1.2) } },
    whiteSpace: "preserve" as const,
  };
}
