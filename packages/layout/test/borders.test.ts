import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, type BorderEdge, block, expandBorders, measure, mergeBorders, paragraph } from "@updf/layout";
import { layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { paragraph as fixedParagraph, flow } from "./fixtures.js";

const edge: BorderEdge = { width: 2, color: [0, 0, 1] };
test("#42-A edges beat uniform fallback independent of enumeration; null suppresses, omission preserves", () => {
  for (const style of [
    { border: edge, borderLeft: null },
    { borderLeft: null, border: edge },
  ]) {
    assert.deepEqual(expandBorders(style), {
      borderTop: edge,
      borderRight: edge,
      borderBottom: edge,
      borderLeft: null,
    });
    const result = measure(h(Block, { style: { ...style, padding: 3 }, children: [paragraph({ children: "A" })] }), {
      width: 100,
    });
    assert.equal(result.size.height, 20);
    assert.equal(result.lines[0]!.top, 5);
    assert.equal(result.lines[0]!.fragments[0]!.x, 3);
  }
  assert.deepEqual(expandBorders({}), {});
  assert.deepEqual(expandBorders({ borderBottom: null }), { borderBottom: null });
  assert.deepEqual(
    mergeBorders([
      { style: { borderLeft: { ...edge, width: 8 } }, path: "/column" },
      { style: { border: edge, borderTop: null }, path: "/row" },
      { style: { borderBottom: null }, path: "/cell" },
    ]),
    { borderTop: null, borderRight: edge, borderBottom: null, borderLeft: edge },
  );
});

test("#42-A strict border validation reports the offending source, even in overridden layers", () => {
  for (const [style, suffix] of [
    [{ borderTop: undefined }, "/borderTop"],
    [{ borderBottom: { width: -1, color: [0, 0, 0] } }, "/borderBottom/width"],
    [{ border: { width: NaN, color: [0, 0, 0] } }, "/border/width"],
    [{ border: { width: Infinity, color: [0, 0, 0] } }, "/border/width"],
    [{ borderLeft: { width: 1, color: [0, 0, 2] } }, "/borderLeft/color/2"],
    [{ borderRight: { width: 1, color: undefined } }, "/borderRight/color"],
    [{ border: { width: 1, color: [0, 0, 0], all: true } }, "/border/all"],
    [{ borderAll: edge }, "/borderAll"],
  ] as const) {
    assert.throws(
      () =>
        mergeBorders([
          { style: style as never, path: "/theme" },
          { style: { border: null }, path: "/override" },
        ]),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.path === `/theme${suffix}`,
    );
    assert.throws(
      () => measure(h(Block, { style: style as never, children: [] }), { width: 100 }),
      (error: unknown) => error instanceof DocumentError && !!error.diagnostics[0]?.path.endsWith(`/style${suffix}`),
    );
  }
  let reads = 0;
  const input = Object.defineProperty({}, "borderTop", {
    enumerable: true,
    get() {
      reads++;
      return edge;
    },
  });
  assert.throws(() => expandBorders(input), DocumentError);
  assert.equal(reads, 0);
});

test("#42-A no-border and zero-width defaults, snapshots and non-inheritance remain explicit", () => {
  for (const style of [{}, { border: null }, { border: { ...edge, width: 0 } }]) {
    const result = measure(h(Block, { style, children: paragraph({ children: "A" }) }), { width: 100 });
    assert.equal(result.size.height, 10);
    assert.equal(result.lines[0]?.top, 0);
    assert.equal(result.lines[0]?.fragments[0]?.x, 0);
  }
  const mutable = { width: 2, color: [0, 0, 1] as [number, number, number] };
  const policy = expandBorders({ border: mutable });
  mutable.width = 9;
  mutable.color[2] = 0;
  assert.deepEqual(policy.borderLeft, edge);
  const nested = measure(
    h(Block, { style: { border: edge }, children: h(Block, { children: paragraph({ children: "A" }) }) }),
    { width: 100 },
  );
  assert.equal(nested.size.height, 14);
  assert.equal(nested.lines[0]?.top, 2);
});

test("#42-A mixed edges reserve exact content insets and clip at the padding edge", () => {
  const style = {
    height: 30,
    overflow: "hidden" as const,
    padding: 3,
    borderTop: edge,
    borderRight: { ...edge, width: 4 },
    borderBottom: { ...edge, width: 5 },
    borderLeft: null,
  };
  const result = layoutFlow(
    flow([block({ style, children: [{ type: "paragraph", paragraph: fixedParagraph("A\nB\nC") }] })]),
  );
  const outer = result.document.pages[0]!.children[0]!;
  assert.equal(outer.type, "paintGroup");
  if (outer.type !== "paintGroup") return;
  const clip = outer.children.find((node) => node.type === "paintGroup");
  assert.ok(clip?.type === "paintGroup");
  assert.deepEqual(clip.clip, { x: 0, y: 2, width: 96, height: 23 });
  const text = clip.children[0]!;
  assert.ok(text.type === "richText");
  assert.deepEqual([text.x, text.y, text.width], [3, 5, 90]);
  assert.deepEqual(
    outer.children.filter((node) => node.type === "rect").map(({ x, y, width, height }) => [x, y, width, height]),
    [
      [0, 0, 100, 2],
      [0, 25, 100, 5],
      [96, 2, 4, 23],
    ],
  );
});

test("#42-A fragmented border allocations remain stable; only first top and last bottom paint", () => {
  const result = layoutFlow(
    flow([
      block({
        style: { border: edge, padding: 2 },
        children: [{ type: "paragraph", paragraph: fixedParagraph("A\nB\nC\nD\nE\nF\nG") }],
      }),
    ]),
  );
  assert.deepEqual(
    result.placements.map(({ box }) => box.height),
    [38, 38, 18],
  );
  const rectangles = result.document.pages.map(({ children }) => {
    const group = children[0]!;
    assert.ok(group.type === "paintGroup");
    return group.children
      .filter((node) => node.type === "rect")
      .map(({ x, y, width, height }) => [x, y, width, height]);
  });
  assert.deepEqual(rectangles, [
    [
      [0, 0, 100, 2],
      [0, 2, 2, 36],
      [98, 2, 2, 36],
    ],
    [
      [0, 0, 2, 38],
      [98, 0, 2, 38],
    ],
    [
      [0, 16, 100, 2],
      [0, 0, 2, 16],
      [98, 0, 2, 16],
    ],
  ]);
});
