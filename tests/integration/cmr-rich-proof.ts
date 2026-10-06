import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocumentDefinition } from "@updf/core";
import { measureText } from "@updf/text";
import { measurementOptions } from "../fixtures/text-options.js";

interface Word {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly fontSize: number;
}

function expectedWords(document: DocumentDefinition): Word[] {
  return document.pages.flatMap((page) =>
    page.children.flatMap((node) => {
      if (node.type !== "richText") return [];
      return node.paragraphs.flatMap((paragraph) => {
        const fontSize = paragraph.defaultStyle.fontSize;
        const measured = measureText({ width: node.width, paragraphs: [paragraph] }, measurementOptions({}));
        return measured.lines.flatMap((line) => {
          const baseline = line.top + (paragraph.lineHeight - fontSize) / 2 + fontSize * 0.775;
          assert.ok(Math.abs(line.baseline - baseline) < 1e-12);
          const content = line.fragments.map((fragment) => fragment.text).join("");
          return Array.from(content.matchAll(/\S+/gu), (match) => {
            const prefix = content.slice(0, match.index);
            const advance = (text: string) =>
              measureText(
                {
                  width: node.width,
                  paragraphs: [{ ...paragraph, align: "left", runs: [{ text }] }],
                },
                measurementOptions({}),
              ).lines[0]?.advance ?? 0;
            return {
              text: match[0],
              x: node.x + (line.fragments[0]?.x ?? 0) + advance(prefix),
              y: node.y + baseline - fontSize * 0.718,
              width: advance(match[0]),
              fontSize,
            };
          });
        });
      });
    }),
  );
}

function assertBbox(xml: string, expected: readonly Word[]): void {
  const actual = Array.from(
    xml.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="[^"]+">([^<]+)<\/word>/gu),
    (match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      width: Number(match[3]) - Number(match[1]),
      text: match[4],
    }),
  );
  assert.equal(actual.length, expected.length);
  for (const word of expected) {
    const index = actual.findIndex(
      (item) => item.text === word.text && Math.abs(item.x - word.x) < 1e-5 && Math.abs(item.y - word.y) < 1e-5,
    );
    assert.ok(index >= 0, `missing/displaced CMR word ${JSON.stringify(word)}`);
    const item = actual.splice(index, 1)[0];
    assert.ok(item && Math.abs(item.width - word.width) < 1e-5);
  }
}

async function assertRaster(prefix: string, expected: readonly Word[]): Promise<void> {
  const data = await readFile(`${prefix}.pgm`);
  const header = data.toString("ascii", 0, 100).match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
  assert.ok(header);
  const width = Number(header[1]),
    height = Number(header[2]);
  assert.equal(width, 1190);
  assert.equal(height, 1684);
  const pixels = data.subarray(header[0].length);
  for (const word of expected) {
    const left = Math.floor(word.x * 2),
      right = Math.ceil((word.x + word.width) * 2);
    const top = Math.floor(word.y * 2),
      bottom = Math.ceil((word.y + word.fontSize) * 2);
    let ink = 0;
    for (let y = top; y < bottom; y++)
      ink += pixels.subarray(y * width + left, y * width + right).filter((pixel) => pixel < 128).length;
    assert.ok(ink > 0, `missing raster ink: ${word.text}`);
  }
}

/** Independent physical PDF coordinates, source order and visible labels guard the rich CMR golden. */
export async function assertCmrPDF(bytes: Uint8Array, document: DocumentDefinition): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "cmr-rich-proof-"));
  try {
    const path = join(directory, "cmr.pdf"),
      prefix = join(directory, "cmr");
    await writeFile(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    assert.equal(execFileSync("qpdf", ["--show-npages", path], { encoding: "utf8" }).trim(), "1");
    const expected = expectedWords(document);
    assert.deepEqual(
      execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).trim().split(/\s+/u),
      expected.map((word) => word.text),
    );
    const xml = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    assert.match(xml, /<page width="595\.000000" height="842\.000000">/u);
    assertBbox(xml, expected);
    execFileSync("pdftoppm", ["-r", "144", "-gray", "-singlefile", path, prefix]);
    await assertRaster(prefix, expected);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
