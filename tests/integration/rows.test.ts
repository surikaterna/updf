import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { render } from "@updf/core";
import { column, document, flow, layout, measure, paragraph, row } from "@updf/layout";

test("#44 data Row real PDF geometry retains resolved widths, alignment and atomic page transition", async () => {
  const item = row({
    align: "bottom",
    style: { padding: 2, gap: 4 },
    children: [
      column({ width: 40, style: { padding: 1 }, children: [paragraph({ children: "LEFT" })] }),
      column({
        width: { weight: 1, min: 80, max: 140 },
        style: { padding: 3, minHeight: 26 },
        children: [paragraph({ children: "RIGHT" })],
      }),
    ],
  });
  const measured = measure(item, { width: 180 });
  assert.equal(measured.size.height, 30);
  const input = document({
    children: flow({
      pageSize: { width: 200, height: 70 },
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      children: [{ type: "spacer", height: 30 }, item],
    }),
  });
  const result = layout(input);
  assert.equal(result.pageCount, 2);
  const bytes = render(result.document);
  assert.deepEqual(render(layout(input).document), bytes);
  const directory = new URL("../../artifacts/rows/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("geometry.pdf", directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
  checkBbox(bbox);
  assert.deepEqual(
    measured.lines.map((line) => line.fragments[0]?.x),
    [49, 3],
  );
});
function checkBbox(bbox: string): void {
  const pages = bbox.match(/<page\b[^>]*>[\s\S]*?<\/page>/g) ?? [];
  assert.equal(pages.length, 2);
  assert.doesNotMatch(pages[0] ?? "", /<word/);
  const words = [
    ...(pages[1] ?? "").matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]+)<\/word>/g),
  ];
  assert.deepEqual(
    words.map((word) => word[5]),
    ["RIGHT", "LEFT"],
  );
  const right = words[0],
    left = words[1];
  assert.ok(right && left);
  assert.equal(Number(left[1]), 13);
  assert.equal(Number(right[1]), 59);
  assert.ok(Math.abs(Number(left[2]) - Number(right[2]) - 12) < 1e-6);
  assert.ok(Number(left[3]) <= 51 && Number(right[3]) <= 185);
  for (const word of words) assert.ok(Number(word[2]) >= 10 && Number(word[4]) <= 40);
}
