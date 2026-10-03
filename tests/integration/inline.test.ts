import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { type DocumentDefinition, render } from "@updf/core";
import type { ContentMeasurement } from "@updf/layout";
import { inlineProof } from "../../apps/browser-fonts/inline-proof.js";
import { fixtureFont } from "../fixtures/fonts/font-fixture.js";
import { layoutFlow, measure, paragraph, span } from "../fixtures/transitional-layout.js";

async function raster(name: string, bytes: Uint8Array): Promise<Buffer> {
  const directory = new URL("../../artifacts/inline/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL(`${name}.pdf`, directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const prefix = new URL(name, directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", path, prefix]);
  execFileSync("pdftoppm", ["-png", "-r", "72", path, prefix]);
  return readFile(`${prefix}-1.ppm`);
}
function visualOracle(ppm: Buffer, measurement: ContentMeasurement): void {
  const rgb = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  const line = measurement.lines[0];
  assert.ok(line);
  for (const [role, color] of [
    ["green", [0, 178, 64]],
    ["red", [255, 0, 0]],
  ] as const) {
    const visual = line.fragments.filter((fragment) => fragment.role === "visual")[role === "green" ? 0 : 1];
    assert.ok(visual);
    let count = 0;
    for (let offset = 0; offset < rgb.length; offset += 3) {
      if (color.every((value, index) => Math.abs((rgb[offset + index] ?? 255) - value) < 5)) {
        const pixel = offset / 3,
          x = pixel % 290,
          y = Math.floor(pixel / 290);
        assert.ok(x >= Math.floor(20 + visual.x) && x <= Math.ceil(20 + visual.x + visual.advance));
        assert.ok(y >= 20 + line.top && y < Math.ceil(20 + line.baseline));
        count++;
      }
    }
    assert.ok(count > (role === "green" ? 500 : 200), `${role} native visual must paint`);
  }
}
test("D: actual inline PDF extracts prepared text and rasterizes native green badge/red SVG at the measured baseline", async () => {
  const proof = inlineProof(await fixtureFont());
  const image = await raster("inline", proof.bytes);
  const path = new URL("../../artifacts/inline/inline.pdf", import.meta.url).pathname;
  const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
  assert.match(text, /Привет/u);
  assert.match(text, /portable/u);
  assert.match(text, /А\s*Б/u);
  visualOracle(image, proof.measurement);
});
test("D: independent raster oracle rejects absent and displaced visual fragments even when text survives", async () => {
  const proof = inlineProof(await fixtureFont());
  const options = { resources: { Demo: await fixtureFont() } };
  const missing: DocumentDefinition = {
    ...proof.document,
    pages: proof.document.pages.map((page) => ({
      ...page,
      children: page.children.filter((node) => node.type !== "paintGroup" || node.clip),
    })),
  };
  const removed = await raster("inline-missing", render(missing, options));
  assert.match(
    execFileSync("pdftotext", [new URL("../../artifacts/inline/inline-missing.pdf", import.meta.url).pathname, "-"], {
      encoding: "utf8",
    }),
    /Привет/u,
  );
  assert.throws(() => visualOracle(removed, proof.measurement));
  const moved: DocumentDefinition = {
    ...proof.document,
    pages: proof.document.pages.map((page) => ({
      ...page,
      children: page.children.map((node) =>
        node.type === "paintGroup" && !node.clip && node.transform
          ? { ...node, transform: [1, 0, 0, 1, node.transform[4], node.transform[5] + 40] }
          : node,
      ),
    })),
  };
  const shifted = await raster("inline-displaced", render(moved, options));
  assert.throws(() => visualOracle(shifted, proof.measurement));
});
test("D: mixed prepared em boxes preserve the common baseline and real ink in an exact-height zero-margin page", async () => {
  const options = { resources: { Demo: await fixtureFont() } };
  const content = paragraph({ children: [span({ style: { font: "Demo", fontSize: 40 }, children: "i" }), "A"] });
  const measured = measure(content, { width: 100 }, options);
  assert.equal(measured.size.height, 40);
  const result = layoutFlow(
    {
      pageTemplate: { width: 100, height: measured.size.height, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
      body: [content],
    },
    options,
  );
  assert.equal(result.pageCount, 1);
  await raster("mixed-em-tight", render(result.document, options));
  const text = execFileSync(
    "pdftotext",
    [new URL("../../artifacts/inline/mixed-em-tight.pdf", import.meta.url).pathname, "-"],
    { encoding: "utf8" },
  );
  assert.match(text.replaceAll(/\s/gu, ""), /iA/u);
  assert.ok(!measured.inkBounds.empty && measured.inkBounds.top >= 0 && measured.inkBounds.bottom <= 40);
});
test("D: prepared negative side bearings retain alignment and native ink instead of reflowing at a Span boundary", async () => {
  const font = await fixtureFont();
  const glyph = font.metadata.glyphs.find(
    (glyph) => glyph.codePoint > 32 && glyph.codePoint < 127 && glyph.bounds[0] < 0,
  );
  assert.ok(glyph);
  const text = String.fromCodePoint(glyph.codePoint);
  const options = { resources: { Demo: font } };
  const content = paragraph({
    defaultStyle: { font: "Demo", fontSize: 20 },
    align: "center",
    children: span({ children: text }),
  });
  const measured = measure(content, { width: 100 }, options);
  const result = layoutFlow(
    {
      pageTemplate: { width: 100, height: measured.size.height, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
      body: [content],
    },
    options,
  );
  await raster("bearing-tight", render(result.document, options));
  assert.ok(!measured.inkBounds.empty && measured.inkBounds.left >= 0 && measured.inkBounds.right <= 100);
  assert.match(
    execFileSync("pdftotext", [new URL("../../artifacts/inline/bearing-tight.pdf", import.meta.url).pathname, "-"], {
      encoding: "utf8",
    }),
    new RegExp(text),
  );
});
