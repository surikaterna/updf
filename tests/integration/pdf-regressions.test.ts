import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { type DocumentDefinition, DocumentError, type NodeDefinition, type TextNode } from "@updf/core";
import { type ParagraphDefinition, paintInlineText } from "@updf/text";
import { createLayoutOperation, render } from "../fixtures/text-options.js";

const text = (value: string, overrides: Partial<TextNode> = {}): TextNode => ({
  type: "text",
  x: 10,
  y: 10,
  width: 80,
  height: 10,
  text: value,
  fontSize: 10,
  lineHeight: 10,
  align: "left",
  ...overrides,
});
const document = (children: readonly NodeDefinition[]): DocumentDefinition => ({
  version: 1,
  pages: [{ width: 200, height: 300, children }],
});
const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);

async function withPdf(input: DocumentDefinition, check: (path: string, directory: string) => void | Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "declarative-audit-"));
  const path = join(directory, "regression.pdf");
  try {
    await writeFile(path, render(input));
    execFileSync("qpdf", ["--check", path]);
    await check(path, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function bboxWords(path: string) {
  const xml = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
  const entities: Readonly<Record<string, string>> = { apos: "'", quot: '"', amp: "&", lt: "<", gt: ">" };
  return [...xml.matchAll(/<word ([^>]+)>([^<]*)<\/word>/g)].map((match) => {
    const attributes = match[1];
    const content = match[2];
    assert.ok(attributes !== undefined && content !== undefined);
    const attrs = Object.fromEntries(
      [...attributes.matchAll(/(\w+)="([^"]+)"/g)].map((attr) => [attr[1], Number(attr[2])]),
    );
    return {
      xMin: Number(attrs.xMin),
      xMax: Number(attrs.xMax),
      text: content.replace(/&(apos|quot|amp|lt|gt);/g, (entity: string, key: string) => entities[key] ?? entity),
    };
  });
}

test("WinAnsi quotes/backticks extract exactly and independent bbox widths/align/wrap match", async () => {
  const quotes = "'".repeat(20);
  const graves = "`".repeat(20);
  const input = document([
    text(quotes, { width: 38.2 }),
    text(graves, { y: 40, align: "center" }),
    text(quotes, { y: 70, align: "right" }),
    text("'''' ````", { x: 50, y: 100, width: 15, height: 20, align: "right" }),
  ]);
  await withPdf(input, (path) => {
    const extracted = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    assert.deepEqual(extracted.trim().split("\n"), [quotes, graves, quotes, "''''", "````"]);
    const words = bboxWords(path);
    assert.deepEqual(
      words.map((word) => word.text),
      [quotes, graves, quotes, "''''", "````"],
    );
    const expected: readonly (readonly [number, number])[] = [
      [10, 48.2],
      [16.7, 83.3],
      [51.8, 90],
      [54.58, 62.22],
      [51.68, 65],
    ];
    words.forEach((word, i) => {
      const bounds = expected[i];
      assert.ok(bounds);
      close(word.xMin, bounds[0]);
      close(word.xMax, bounds[1]);
    });
  });
  assert.throws(() => render(document([text(quotes, { width: 38.19 })])), DocumentError);
  assert.throws(() => render(document([text(graves, { width: 44.4 })])), DocumentError);
});

async function raster(path: string, directory: string) {
  const prefix = join(directory, "ink");
  execFileSync("pdftoppm", ["-gray", "-r", "144", "-singlefile", path, prefix]);
  const bytes = await readFile(`${prefix}.pgm`);
  const header = bytes.toString("ascii", 0, 100).match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
  assert.ok(header, "Expected binary 8-bit Poppler graymap");
  const width = Number(header[1]);
  const height = Number(header[2]);
  const pixels = bytes.subarray(header[0].length);
  assert.equal(pixels.length, width * height);
  return { width, height, pixels };
}

function inkRows(image: { width: number; height: number; pixels: Uint8Array }, left: number, right: number): number[] {
  const rows: number[] = [];
  for (let y = 0; y < image.height; y++) {
    const pixels = image.pixels.subarray(y * image.width + left, y * image.width + right);
    if (pixels.some((pixel) => pixel < 128)) rows.push(y);
  }
  return rows;
}

test("internal tight line boxes paint actual ink beyond the line box without clipping", async () => {
  const paragraph: ParagraphDefinition = {
    defaultStyle: { font: "Helvetica", fontSize: 100, color: [0, 0, 0] },
    runs: [{ text: "|" }],
    lineHeight: 100,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
  const operation = createLayoutOperation({});
  const measured = operation.measureInline(paragraph, () => [], 80, { strut: { unit: "pt", value: 40 } }, "/tight")[0];
  assert.ok(measured);
  assert.equal(measured.line.height, 40);
  await withPdf(document(paintInlineText(measured, paragraph, 20, 60)), async (path, directory) => {
    assert.equal(execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).trim(), "|");
    const rows = inkRows(await raster(path, directory), 40, 80);
    assert.ok(rows[0]! < 120, "glyph ink must extend above the line-box top");
    assert.ok(rows.at(-1)! >= 200, "glyph ink must extend below the line-box bottom");
  });
});

test("Poppler raster retains full bar ink at page top and within tight multiline boxes", async () => {
  const input = document([
    text("|", { x: 20, y: 0, width: 30, height: 100, fontSize: 100, lineHeight: 100 }),
    text("|", { x: 80, y: 50, width: 30, height: 100, fontSize: 100, lineHeight: 100 }),
    text("|\n|", { x: 140, y: 50, width: 30, height: 200, fontSize: 100, lineHeight: 100 }),
  ]);
  await withPdf(input, async (path, directory) => {
    const image = await raster(path, directory);
    const top = inkRows(image, 40, 100);
    const inset = inkRows(image, 160, 220);
    const multi = inkRows(image, 280, 340);
    // Compare to unclipped inset ink, not AFM-sized pixels: viewers substitute fonts.
    assert.ok(inset.length > 0, "The independent renderer must actually paint ink");
    assert.deepEqual(
      top,
      inset.map((y) => y - 100),
    );
    assert.ok(top.every((y) => y >= 0 && y < 200));
    assert.ok(inset.every((y) => y >= 100 && y < 300));
    assert.ok(multi.every((y) => y >= 100 && y < 500));
    assert.deepEqual(multi, [...inset, ...inset.map((y) => y + 200)]);
  });
});
