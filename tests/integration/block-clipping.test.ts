import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { type DocumentDefinition, render } from "@updf/core";
import { flow, paragraph } from "../../packages/layout/test/fixtures.js";
import { block, type FlowBlock, layoutFlow } from "../fixtures/transitional-layout.js";

const padding = 4;
function definition(nested = false): DocumentDefinition {
  const fixed: FlowBlock = {
    type: "fixed",
    height: 60,
    children: [
      { type: "rect", x: 0, y: 0, width: nested ? 80 : 88, height: 60, paint: { fill: [1, 0, 0], stroke: null } },
      {
        type: "text",
        x: 0,
        y: 40,
        width: 80,
        height: 8,
        fontSize: 6,
        lineHeight: 8,
        align: "left",
        text: "HIDDEN SECRET",
      },
    ],
  };
  const child = nested
    ? block({
        children: [fixed],
        style: {
          height: 50,
          overflow: "hidden",
          padding: 2,
          border: { width: 1, color: [0, 0, 1] },
        },
      })
    : fixed;
  const result = layoutFlow(
    flow(
      [
        block({
          children: [child],
          style: { height: 40, overflow: "hidden", padding, border: { width: 2, color: [0, 1, 0] } },
        }),
        { type: "spacer", height: 4 },
        { type: "paragraph", paragraph: paragraph("After") },
      ],
      { width: 120, height: 80, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
    ),
  );
  assert.equal(result.pageCount, 1);
  assert.equal(result.placements[2]?.box.y, 54);
  return result.document;
}
async function pdf(document: DocumentDefinition, name: string): Promise<Buffer> {
  const directory = new URL("../../artifacts/blocks/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL(`${name}.pdf`, directory).pathname;
  await writeFile(path, render(document));
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.match(text, /HIDDEN SECRET[\s\S]*After/u);
  const prefix = new URL(name, directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, prefix]);
  return readFile(`${prefix}.ppm`);
}
function spatial(ppm: Buffer): void {
  assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+120 80\s+255\s/u);
  const rgb = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  let red = 0;
  for (let offset = 0; offset < rgb.length; offset += 3) {
    if ((rgb[offset] ?? 0) < 200 || (rgb[offset + 1] ?? 255) > 50 || (rgb[offset + 2] ?? 255) > 50) continue;
    const x = (offset / 3) % 120,
      y = Math.floor(offset / 3 / 120);
    assert.ok(x >= 12 && x < 108 && y >= 12 && y < 48, `red overflow at ${x},${y}`);
    red++;
  }
  assert.ok(red > 1000);
  for (const y of [10, 11, 48, 49]) {
    for (let x = 10; x < 110; x++) {
      const offset = (y * 120 + x) * 3;
      assert.ok(
        (rgb[offset] ?? 255) < 50 && (rgb[offset + 1] ?? 0) > 200 && (rgb[offset + 2] ?? 255) < 50,
        `border absent at ${x},${y}`,
      );
    }
  }
}
test("hidden padding-edge PDF clip contains colored ink, retains outside border and is not redaction", async () => {
  spatial(await pdf(definition(), "hidden"));
});
test("nested hidden clip stacks cannot escape their ancestor padding edge", async () => {
  spatial(await pdf(definition(true), "hidden-nested"));
});
test("spatial clip oracle rejects removed clips despite retained text and borders", async () => {
  const withoutClips = JSON.parse(
    JSON.stringify(definition(), (key, value: unknown) => (key === "clip" ? undefined : value)),
  ) as DocumentDefinition;
  const raster = await pdf(withoutClips, "negative-no-clip");
  assert.throws(() => spatial(raster), /red overflow/u);
});
test("spatial border oracle rejects dropped border rectangles despite proper clipping", async () => {
  const original = definition();
  const withoutBorder: DocumentDefinition = {
    ...original,
    pages: original.pages.map((page) => ({
      ...page,
      children: page.children.map((node) =>
        node.type !== "paintGroup"
          ? node
          : { ...node, children: node.children.filter((child) => child.type !== "rect") },
      ),
    })),
  };
  const raster = await pdf(withoutBorder, "negative-no-border");
  assert.throws(() => spatial(raster), /border absent/u);
});
