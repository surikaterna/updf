import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FONT_SIZE, prepareParagraph } from "../src/pdf.js";
import type { Projection } from "../src/projection.js";

export function artifactDirectory(): string {
  const directory = new URL("../artifacts/", import.meta.url).pathname;
  mkdirSync(directory, { recursive: true });
  return directory;
}

export interface Word {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

export function inspectPDF(
  bytes: Uint8Array,
  name: string,
): { readonly words: readonly Word[]; readonly pages: number; readonly rawWords: readonly string[] } {
  const directory = artifactDirectory();
  const path = `${directory}${name}.pdf`;
  writeFileSync(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const pages = Number(execFileSync("qpdf", ["--show-npages", path], { encoding: "utf8" }).trim());
  const bbox = `${directory}${name}.html`;
  execFileSync("pdftotext", ["-bbox", path, bbox]);
  const xml = readFileSync(bbox, "utf8");
  const words = Array.from(
    xml.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="[^"]+" yMax="[^"]+">([^<]+)<\/word>/gu),
    (match) => ({ x: Number(match[1]), y: Number(match[2]), text: decode(match[3] ?? "") }),
  );
  execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-scale-to", "900", "-png", path, `${directory}${name}`]);
  const rawWords = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).trim().split(/\s+/u);
  return { words, pages, rawWords };
}

function decode(text: string): string {
  return text.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"');
}

export function assertPDFGeometry(projection: Projection, actual: ReturnType<typeof inspectPDF>): void {
  assert.equal(actual.pages, projection.pages.length);
  const expected = projection.pages.flatMap((page) =>
    page.lines.flatMap((line) => {
      const text = line.line.fragments.map((fragment) => fragment.text).join("");
      return Array.from(text.matchAll(/[^ ]+/gu), (match) => {
        const prefix = text.slice(0, match.index);
        const advance = prefix ? (prepareParagraph(prefix, line.width).lines[0]?.advance ?? 0) : 0;
        // Poppler uses Helvetica's physical Ascender (718/1000 em), not the
        // rich line-box origin or the supported-glyph ink envelope (775/1000).
        const baseline = line.y + line.line.baseline - line.line.top;
        return { text: match[0], y: baseline - FONT_SIZE * 0.718, x: line.x + advance };
      });
    }),
  );
  assert.deepEqual(
    actual.words.map((word) => word.text),
    expected.map((word) => word.text),
  );
  assert.deepEqual(
    actual.rawWords,
    expected.map((word) => word.text),
  );
  for (let index = 0; index < expected.length; index++) {
    const word = actual.words[index],
      reference = expected[index];
    assert.ok(word && reference);
    assert.ok(
      Math.abs(word.y - reference.y) < 0.02,
      `word ${index}: PDF bbox top ${word.y} vs accepted ${reference.y}`,
    );
    assert.ok(Math.abs(word.x - reference.x) < 0.002, `word ${index}: PDF x ${word.x} vs accepted ${reference.x}`);
  }
}
