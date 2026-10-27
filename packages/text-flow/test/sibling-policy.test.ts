import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Document, Flow, Paragraph, Block, PageBreak, Row, Column, layout, flow, document } from "@updf/layout";
import { siblingParticipation } from "../src/sibling.js";
import { rectanglePolicy } from "../src/rectangle-policy.js";
import { siblingFlow as f, siblingOptions as options } from "../../../tests/fixtures/text-flow/siblings.js";
import { execFileSync } from "node:child_process";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const float = (style: object = {}) =>
  h(f.Block, { style: { width: 72, height: 36, float: "left", backgroundColor: [0.2, 0.4, 0.6], ...style } } as never);
function run(children: unknown, participation?: unknown, height = 180) {
  return layout(
    h(Document, {
      children: h(Flow, {
        pageSize: { width: 200, height },
        margins,
        ...(participation ? { participation } : {}),
        children,
      } as never),
    }),
    options,
  );
}
function text(children: unknown, style: object = {}, keepTogether = false) {
  return h(Paragraph, { children, style, keepTogether } as never);
}
function extracted(result: ReturnType<typeof run>) {
  return execFileSync("pdftotext", ["-raw", "-", "-"], { input: render(result.document, options), encoding: "utf8" })
    .replace(/\s+/gu, " ")
    .trim();
}
test("a narrow word blockage consumes only the positive-height visual, then resumes at full width", () => {
  const result = run([float({ width: 180 }), text("indivisibleword tail")]);
  assert.deepEqual(result.placements[0]!.sourceRange, { start: 0, end: 1 });
  assert.equal(result.placements[0]!.box.height, 36);
  assert.equal(result.placements[1]!.box.y, 36);
  assert.equal(extracted(result), "indivisibleword tail");
});
test("full-body-width visual has no zero-width text probe and preserves the full-width tail", () => {
  const result = run([float({ width: 200 }), text("tail")]);
  assert.equal(result.placements[0]!.box.height, 36);
  assert.equal(extracted(result), "tail");
});
test("short content reserves actual float height and stops at an ordinary Block", () => {
  const result = run([
    float({ height: 80 }),
    text("short"),
    h(Block, { style: { height: 3 }, children: null }),
    text("after"),
  ]);
  assert.equal(result.placements[0]!.box.height, 80);
  assert.equal(result.placements[1]!.box.y, 80);
  assert.equal(result.placements[2]!.box.y, 83);
  assert.deepEqual(result.placements[2]!.sourceRange, { start: 3, end: 4 });
});
test("kept paragraph, Row, and page break terminate the affected sibling sequence", () => {
  const barriers = [
    text("kept", {}, true),
    h(Row, { children: h(Column, { children: text("row") }) }),
    h(PageBreak, {}),
  ];
  for (const barrier of barriers) {
    const result = run([float(), text("first"), barrier, text("after")]);
    assert.deepEqual(result.placements[0]!.sourceRange, { start: 0, end: 2 });
    assert.equal(result.placements.at(-1)!.sourceRange!.start, 3);
  }
});
test("one-float restriction rejects a second marker rather than silently ending the first policy", () => {
  assert.throws(() => run([float(), text("one"), float(), text("two")]), /Only one floating block/u);
});
test("participation ownership rejects copies, foreign factories, missing installation, and nested markers", () => {
  const other = siblingParticipation(options.capability, rectanglePolicy);
  assert.throws(() => run([float()], Object.freeze({ ...other.participation })), DocumentError);
  assert.throws(() => run([h(other.Block, { style: { width: 10, height: 10, float: "right" } })]), DocumentError);
  assert.throws(
    () =>
      layout(
        h(Document, { children: h(Flow, { pageSize: { width: 200, height: 180 }, margins, children: float() }) }),
        { ...options, extensions: [] },
      ),
    DocumentError,
  );
  assert.throws(() => run([h(Block, { children: float() })]), DocumentError);
});
test("explicit invalid dimensions, margins, side, shape and undefined optional shape reject", () => {
  for (const style of [
    { width: 0 },
    { height: -1 },
    { height: Infinity },
    { width: NaN },
    { marginTop: 0 },
    { marginTop: "auto" },
    { float: "both" },
    { shapeOutside: "circle" },
    { shapeOutside: undefined },
    { width: 201 },
    { height: 181 },
  ])
    assert.throws(() => run([float(style)]), DocumentError);
});
test("an oversized first side line fails boundedly through standard fresh-body diagnostics", () => {
  assert.throws(
    () => run([float(), text("A", { fontSize: 220 })]),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LAYOUT_OVERSIZED",
  );
});
test("the data Flow path snapshots and retains a locally owned participation handle", () => {
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 200, height: 180 },
        margins,
        children: [float(), text("data flow")],
      }),
    }),
    options,
  );
  assert.equal(extracted(result), "data flow");
});
test("the actual floating Block uses normal decoration slots and invokes its late visual once", () => {
  let painted = 0;
  const visual = h(() => {
    painted++;
    return h("rect", { x: 0, y: 0, width: 10, height: 4, paint: { fill: [1, 0, 0], stroke: null } });
  }, {});
  const result = run([
    h(f.Block, {
      style: { width: 72, height: 36, float: "right" },
      children: h(Block.Header, { height: 4, children: visual }),
    }),
    text("normal child text ".repeat(50)),
  ]);
  assert.equal(painted, 1);
  assert.equal(extracted(result), "normal child text ".repeat(50).trim());
});
