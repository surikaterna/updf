import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWidths } from "../../packages/layout/src/width-resolver.js";
import { intervals } from "../../scripts/tui-layout-proof/intervals.js";
import type { ProofSnapshot } from "../../scripts/tui-layout-proof/profile.js";
import { render, wrap } from "../../scripts/tui-layout-proof/terminal.js";

// Owned portable geometry fixture, not evidence of Formbar execution.
const fixture: ProofSnapshot = Object.freeze({
  tree: Object.freeze({
    key: "root",
    nodeId: "root",
    type: "group",
    children: Object.freeze([
      Object.freeze({ key: "name", nodeId: "name", type: "field", label: "Full name" }),
      Object.freeze({ key: "description", nodeId: "description", type: "output" }),
    ]),
  }),
  controls: Object.freeze([
    Object.freeze({ key: "name", nodeId: "name", type: "field", rendererId: "text", visible: true, value: "Ada" }),
  ]),
  outputs: Object.freeze([
    Object.freeze({ key: "description", nodeId: "description", value: "A description", format: "plain" }),
  ]),
});

test("ordered floor edges use unchanged shared allocation, gaps, fractional widths and caps", () => {
  for (const width of [24, 31, 32, 79, 80, 160]) {
    const tracks = Object.freeze([
      Object.freeze({ weight: 1, min: 8, max: 24 }),
      Object.freeze({ weight: 2, min: 12, max: 100 }),
    ]);
    const actual = intervals(width, tracks);
    assert.deepEqual(actual.resolved, resolveWidths({ availableWidth: width, tracks, gap: 1, maxTracks: 64 }));
    assert.equal(actual.boxes[1]?.start, (actual.boxes[0]?.end ?? 0) + 1);
    assert.equal(actual.unused, width - (actual.boxes[1]?.end ?? 0));
    assert.ok(actual.boxes.every((box) => box.width >= 0 && box.end <= width));
  }
  assert.deepEqual(intervals(32, [{ weight: 1 }, { weight: 2 }]).boxes, [
    { start: 0, end: 10, width: 10 },
    { start: 11, end: 31, width: 20 },
  ]);
  assert.equal(
    intervals(80, [
      { weight: 1, max: 10 },
      { weight: 1, max: 20 },
    ]).unused,
    49,
  );
  assert.throws(() => intervals(32, [-1, 3]));
  assert.throws(() => intervals(32, [{ weight: -1 }]));
  assert.throws(() => intervals(32, Array(65).fill(0)));
});

test("wrap preserves LF paragraphs, whitespace and splits long words deterministically", () => {
  assert.deepEqual(wrap("ab  cd\n\nabcdefgh", 4), ["ab  ", "cd", "", "abcd", "efgh"]);
  assert.deepEqual(wrap("  a  ", 2), ["  ", "a ", " "]);
  assert.throws(() => wrap("ok", 0));
});

test("exact fixed endpoints preserve near-integer gutters and fractional carry", () => {
  const near = 7.999999999999999;
  const actual = intervals(32, [near, 1]);
  assert.deepEqual(actual.boxes, [
    { start: 0, end: 7, width: 7 },
    { start: 8, end: 9, width: 1 },
  ]);
  assert.equal(actual.unused, 23);
  assert.equal(Math.floor(near + 1), 9); // Negative control: native addition loses the fraction.
  assert.notDeepEqual(actual.boxes, intervals(32, [near, 1], 2).boxes);
  assert.notDeepEqual(actual.boxes, intervals(32, [8, 1]).boxes);
  assert.deepEqual(intervals(32, [near, 0.5, 0.5], 0).boxes, [
    { start: 0, end: 7, width: 7 },
    { start: 7, end: 8, width: 1 },
    { start: 8, end: 8, width: 0 },
  ]);
  assert.equal(intervals(32, [Number.MIN_VALUE, 1 - Number.EPSILON / 2], 0).boxes[1]?.end, 0);
});

test("solver capped and min/max binary64 widths retain exact endpoint floors", () => {
  const near = 7.999999999999999;
  for (const tracks of [
    [
      { weight: 1, max: near },
      { weight: 2, max: 1 },
    ],
    [
      { weight: 1, min: near, max: near },
      { weight: 2, min: 1, max: 1 },
    ],
  ]) {
    const actual = intervals(32, tracks);
    assert.deepEqual(actual.resolved.widths, [near, 1]);
    assert.deepEqual(actual.resolved, resolveWidths({ availableWidth: 32, tracks, gap: 1, maxTracks: 64 }));
    assert.deepEqual(actual.boxes, [
      { start: 0, end: 7, width: 7 },
      { start: 8, end: 9, width: 1 },
    ]);
    assert.equal(actual.unused, 23);
    assert.ok(actual.boxes.every((box) => box.start >= 0 && box.end <= 32));
  }
});

test("field policy exact projection characterizes native rounding at every CLI integer width", () => {
  const tracks = [
    { weight: 1, min: 8, max: 24 },
    { weight: 2, min: 12, max: 100 },
  ];
  const roundedUp = [26, 29, 32, 35, 38, 41, 44, 47, 51, 54, 57, 60, 63, 66, 69, 72];
  for (let width = 24; width <= 160; width++) {
    const actual = intervals(width, tracks);
    let edge = 0;
    const baseline = actual.resolved.widths.map((size) => {
      const start = Math.floor(edge);
      edge += size;
      const end = Math.floor(edge);
      edge += 1;
      return { start, end, width: end - start };
    });
    if (roundedUp.includes(width)) {
      const last = baseline[1];
      assert.ok(last);
      last.end--;
      last.width--;
    }
    assert.deepEqual(actual.boxes, baseline);
    assert.equal(actual.boxes[1]?.start, (actual.boxes[0]?.end ?? 0) + 1);
    assert.equal(actual.unused, width - (actual.boxes[1]?.end ?? 0));
    assert.ok(actual.boxes.every((box) => box.width >= 0 && box.end <= width));
  }
  assert.equal(intervals(160, tracks).unused, 35);
});

test("fractional fixed/min/max edges preserve quantized unused trailing space", () => {
  assert.deepEqual(intervals(32, [9.7, 10.7]).boxes, [
    { start: 0, end: 9, width: 9 },
    { start: 10, end: 21, width: 11 },
  ]);
  const capped = intervals(80, [
    { weight: 1, min: 8.5, max: 10.5 },
    { weight: 2, min: 12.5, max: 20.5 },
  ]);
  assert.equal(capped.unused, 48);
  assert.equal(capped.boxes[1]?.start, (capped.boxes[0]?.end ?? 0) + 1);
  assert.throws(() => intervals(32, [8, 12], 0.5), /gutter/);
});

test("raster boxes never overlap and the full-width footer owns the same projection", () => {
  for (const width of [24, 31, 32, 79, 80, 160]) {
    const output = render(fixture, width);
    const cells = new Set<string>();
    for (const box of output.boxes) checkCells(box, width, cells);
    assert.equal(output.boxes.at(-1)?.width, intervals(width, [width]).boxes[0]?.width);
  }
});

function checkCells(
  box: { x: number; y: number; width: number; lines: readonly string[] },
  width: number,
  cells: Set<string>,
) {
  for (let y = box.y; y < box.y + box.lines.length; y++) {
    for (let x = box.x; x < box.x + box.width; x++) {
      const cell = `${x},${y}`;
      assert.equal(cells.has(cell), false);
      assert.ok(x >= 0 && x < width && y < 80);
      cells.add(cell);
    }
  }
}

test("frozen geometry fixture has exact accessible textual body and stable order on resize", () => {
  const before = JSON.stringify(fixture);
  const output = render(fixture, 32);
  assert.equal(
    output.body,
    [
      "Full name  Ada".padEnd(32),
      "A description".padEnd(32),
      "+------------------------------+",
      "|STATIC / cell units           |",
      "+------------------------------+",
    ].join("\n"),
  );
  assert.deepEqual(output, render(fixture, 32));
  assert.deepEqual(output.order, render(fixture, 80).order);
  assert.equal(JSON.stringify(fixture), before);
  assert.throws(() => render(fixture, 32, 1), /overflow/);
});

test("bounded ASCII profile rejects terminal injection, Unicode and unsafe dimensions", () => {
  for (const value of ["\x1b[31m", "\t", "\r", "\x7f", "é", "😀", "x".repeat(8193)]) {
    const invalid = {
      ...fixture,
      outputs: [{ ...fixture.outputs[0], key: "description", nodeId: "description", format: "plain", value }],
    };
    assert.throws(() => render(invalid, 32));
  }
  for (const width of [NaN, Infinity, 23, 161, 32.5]) assert.throws(() => render(fixture, width));
  for (const height of [NaN, Infinity, 0, 81, 1.5]) assert.throws(() => render(fixture, 32, height));
  assert.equal(render(fixture, 160, 80).body.split("\n")[0]?.length, 160);
});

test("unsupported kinds, missing controls, over-budget node counts/depth fail closed", () => {
  assert.throws(() => render({ ...fixture, tree: { key: "a", nodeId: "a", type: "repeater" } }, 32));
  assert.throws(() => render({ ...fixture, controls: [] }, 32), /control/);
  assert.throws(() => render({ ...fixture, tree: { ...fixture.tree, items: [] } }, 32), /presentation/);
  assert.throws(() => render(fixture, 32, 20, "\x1b[0m"), /ASCII/);
  const excessive = {
    ...fixture,
    outputs: [{ key: "description", nodeId: "description", value: "x".repeat(8192), format: "plain" }],
  };
  assert.throws(() => render(excessive, 32), /Character budget/);
  const leaf = { key: "last", nodeId: "last", type: "group" };
  let tree = leaf;
  for (let i = 0; i < 9; i++)
    tree = { key: String(i), nodeId: String(i), type: "group", children: [tree] } as typeof leaf;
  assert.throws(() => render({ ...fixture, tree }, 32), /depth/);
  const children = Array.from({ length: 64 }, (_, i) => ({ key: String(i), nodeId: String(i), type: "group" }));
  assert.throws(() => render({ ...fixture, tree: { ...leaf, children } }, 32), /Node/);
});
