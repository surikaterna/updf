import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { type ComponentContext, createContext, Fragment, h, lower, useContext } from "@updf/core/vdom";
import { flow, paragraph } from "../../packages/layout/test/fixtures.js";
import { chart, chartAdapter } from "../fixtures/chart.js";
import { fixtureFont } from "../fixtures/fonts/font-fixture.js";
import {
  Block,
  blockComponent,
  createExtensions,
  Document,
  Flow,
  layout,
  layoutFlow,
  Paragraph,
} from "../fixtures/transitional-layout.js";

test("external public chart adapter produces an atomic PDF between paragraphs without engine changes", async () => {
  const extensions = createExtensions([chartAdapter]);
  const input = flow(
    [
      { type: "paragraph", paragraph: paragraph("Before") },
      chart({ height: 60, values: [0.2, 0.6, 0.9] }),
      { type: "paragraph", paragraph: paragraph("After") },
    ],
    { width: 200, height: 100 },
  );
  const result = layoutFlow(input, {}, extensions);
  assert.equal(result.pageCount, 1);
  assert.deepEqual(
    result.placements.map((placement) => placement.sourceIndex),
    [0, 1, 2],
  );
  const directory = new URL("../../artifacts/blocks/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("chart.pdf", directory).pathname;
  await writeFile(path, render(result.document));
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.match(text, /Before\s+External chart\s+After/u);
  const prefix = new URL("chart", directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, prefix]);
  const ppm = await readFile(`${prefix}.ppm`);
  assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+200 100\s+255\s/u);
  const pixels = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  let blue = 0;
  for (let offset = 0; offset < pixels.length; offset += 3) {
    if ((pixels[offset] ?? 255) > 80 || (pixels[offset + 2] ?? 0) < 150) continue;
    const x = (offset / 3) % 200;
    const y = Math.floor(offset / 3 / 200);
    assert.ok(x >= 10 && x < 196 && y >= 10 && y < 70);
    blue++;
  }
  assert.ok(blue > 1000);
});

test("Fragment is not atomic; a real kept Block fits, advances or rejects without clipping fallback", () => {
  const Visual = blockComponent(chartAdapter);
  const extensions = createExtensions([chartAdapter]);
  const children = [
    h(Paragraph, { children: "Headline", style: { lineHeight: 1 } }),
    h(Visual, { height: 40, values: [0.5] }),
  ];
  const document = (content: ReturnType<typeof h>, before = true) =>
    h(Document, {
      children: h(Flow, {
        pageSize: { width: 200, height: 50 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions,
        children: [before ? h(Paragraph, { children: "Before", style: { lineHeight: 1 } }) : null, content],
      }),
    });
  const ungrouped = layout(document(h(Fragment, { children })));
  assert.deepEqual(
    ungrouped.placements.map((p) => p.pageIndex),
    [0, 0, 1],
  );
  for (const overflow of ["error", "hidden"] as const) {
    const group = h(Block, { keepTogether: true, style: { overflow }, children });
    const exact = layout(document(group, false));
    assert.equal(exact.pageCount, 1);
    assert.equal(exact.placements[0]?.box.height, 50);
    const moved = layout(document(group));
    assert.deepEqual(
      moved.placements.map((p) => p.pageIndex),
      [0, 1],
    );
    assert.equal(moved.placements[1]?.box.height, 50);
    const oversized = h(Block, { keepTogether: true, style: { overflow, gap: 1 }, children });
    assert.throws(
      () => layout(document(oversized, false)),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LAYOUT_OVERSIZED",
    );
  }
});

test("atomic grouping preserves component context, callbacks and render resources", async () => {
  const Theme = createContext({ text: "default" });
  let calls = 0;
  function Headline(_props: Record<never, never>, context: ComponentContext) {
    calls++;
    assert.deepEqual(context.resources, [{ id: "Demo", kind: "font" }]);
    assert.equal(useContext(Theme).text, "captured");
    return h(Paragraph, {
      children: useContext(Theme).text,
      style: { font: "Demo", lineHeight: { unit: "pt", value: 16 } },
    });
  }
  const tree = h(Theme.Provider, {
    value: { text: "captured" },
    children: h(Document, {
      children: h(Flow, {
        pageSize: { width: 200, height: 40 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: h(Block, { keepTogether: true, children: h(Headline, {}) }),
      }),
    }),
  });
  const options = { resources: { Demo: await fixtureFont() } };
  const document = lower(tree, options);
  const bytes = render(document, options);
  assert.equal(calls, 1);
  assert.match(new TextDecoder().decode(bytes), /\/FontFile2/u);
  assert.deepEqual(bytes, render(document, options));
  assert.throws(() => render(document), DocumentError);
});

test("external chart atomicity moves once and rejects oversize without shrinking", () => {
  const extensions = createExtensions([chartAdapter]);
  const result = layoutFlow(
    flow([{ type: "spacer", height: 50 }, chart({ height: 60, values: [0.5] })], { width: 200, height: 100 }),
    {},
    extensions,
  );
  assert.equal(result.placements[1]?.pageIndex, 1);
  assert.equal(result.placements[1]?.box.height, 60);
  assert.throws(
    () => layoutFlow(flow([chart({ height: 101, values: [0.5] })], { width: 200, height: 100 }), {}, extensions),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LAYOUT_OVERSIZED",
  );
});
