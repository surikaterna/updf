import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { resolveWidths } from "@updf/layout-boxes";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { compile } from "../dist/cjs/block-compiler.js";
import { deferColumnBody } from "../dist/cjs/column-content.js";
import type { PreparedBlock } from "../dist/cjs/protocol.js";

const spacer = (height: number) => ({ type: "spacer" as const, height });
const column = (children: unknown[] = [], extra: Record<string, unknown> = {}) => ({
  type: "column",
  children,
  ...extra,
});

function prepare(
  value: unknown,
  width = 80,
  onPrepared?: (value: object, block: PreparedBlock, width: number) => void,
) {
  return compile(
    [value],
    width,
    "/column",
    {
      operation: createLayoutOperation({}),
      lifetime: { active: true },
      freshHeight: 10,
      ...(onPrepared ? { onPrepared } : {}),
    },
    true,
  )[0]!;
}
function fragment(block: PreparedBlock, offset = 0, freshHeight = 10, usedHeight = 0) {
  return block.fragment({
    offset,
    width: block.naturalSize.width,
    freshHeight,
    usedHeight,
    availableHeight: freshHeight - usedHeight,
    atFreshRegion: usedHeight === 0,
  });
}
function diagnostic(run: () => unknown, code: string, path: string) {
  assert.throws(run, (error) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    assert.equal(error.diagnostics[0]?.path, path);
    return true;
  });
}

test("standalone Column retains natural body size and splittable extent across finite pages", () => {
  const block = prepare(column([spacer(6), spacer(6)]));
  assert.deepEqual(block.naturalSize, { width: 80, height: 12 });
  assert.equal(block.fragmentation, "splittable");
  assert.equal(block.extent, 2);
  assert.equal(fragment(block)?.height, 6);
  assert.equal(fragment(block)?.nextOffset, 1);
  assert.equal(fragment(block, 1)?.height, 6);
  assert.equal(fragment(block, 1)?.nextOffset, 2);
});

test("keepTogether remains host atomicity rather than a synthetic authored height", () => {
  const block = prepare(column([spacer(3), spacer(3)], { keepTogether: true }));
  assert.equal(block.fragmentation, "atomic");
  assert.equal(block.extent, 1);
  assert.equal(fragment(block, 0, 10, 5), undefined);
  assert.equal(fragment(block)?.height, 6);
  const tooTall = prepare(column([spacer(6), spacer(6)], { keepTogether: true }));
  assert.equal(tooTall.naturalSize.height, 12);
  assert.equal(fragment(tooTall), undefined);
});

test("single-track Column allocation preserves fixed and bounded weighted binary64 widths", () => {
  for (const width of [undefined, 0.3, { weight: 2 }, { weight: 1, min: 0.1, max: 0.3 }]) {
    const input = column([], width === undefined ? {} : { width });
    const expected = resolveWidths({ availableWidth: 0.7, tracks: [width ?? { weight: 1 }] }).widths[0];
    assert.equal(prepare(input, 0.7).naturalSize.width, expected);
  }
  const block = prepare(column([spacer(0.2)], { width: 0.3, style: { paddingLeft: 0.1, paddingRight: 0.1 } }), 0.7);
  assert.equal(block.naturalSize.width, 0.3);
  diagnostic(() => prepare(column([], { width: { weight: 1, min: 2, max: 1 } })), "GEOMETRY", "/column/tracks/0/max");
  diagnostic(() => prepare(column([], { width: 81 })), "GEOMETRY", "/column/tracks");
});

test("Column exact inset and track preflight precedes deferred body expansion", () => {
  for (const extra of [{ width: 4, style: { padding: 2 } }, { width: 81 }]) {
    let expansions = 0;
    const input = column([], extra);
    deferColumnBody(input, () => {
      expansions++;
      return [spacer(1)];
    });
    assert.throws(() => prepare(input), DocumentError);
    assert.equal(expansions, 0);
  }
});

test("hidden fixed/max Column constraints retain full bodies and prepare every child once", () => {
  for (const bound of [{ height: 4 }, { maxHeight: 4 }]) {
    const children = [spacer(10), spacer(20)];
    const counts = new Map<object, number>();
    const block = prepare(column(children, { style: { ...bound, padding: 1, overflow: "hidden" } }), 80, (value) =>
      counts.set(value, (counts.get(value) ?? 0) + 1),
    );
    assert.equal(block.naturalSize.height, 4);
    assert.equal(block.fragmentation, "atomic");
    assert.equal(fragment(block)?.height, 4);
    assert.deepEqual(
      children.map((child) => counts.get(child)),
      [1, 1],
    );
  }
  diagnostic(
    () =>
      prepare(
        column([spacer(Number.MAX_VALUE), spacer(Number.MAX_VALUE)], { style: { height: 1, overflow: "hidden" } }),
      ),
    "GEOMETRY",
    "/column",
  );
});

test("hidden fractional maxHeight clamps remain atomic with and without controls", () => {
  for (const control of [false, true]) {
    const children = [spacer(0.1), ...(control ? [{ type: "pageBreak" }] : []), spacer(0.2)];
    const block = prepare(column(children, { style: { maxHeight: 0.3, overflow: "hidden" } }));
    assert.equal(block.naturalSize.height, 0.3);
    assert.equal(block.fragmentation, "atomic");
    assert.equal(block.extent, 1);
    if (control) diagnostic(() => fragment(block), "TYPE", "/column");
    else {
      assert.equal(fragment(block)?.height, 0.3);
      assert.equal(fragment(block)?.nextOffset, 1);
    }
  }
});

test("standalone and Row-contained Column share height constraints and diagnostics", () => {
  for (const style of [
    {},
    { minHeight: 8 },
    { height: 8 },
    { maxHeight: 4, overflow: "hidden" },
    { height: 4, overflow: "hidden", padding: 1 },
  ]) {
    const input = column([spacer(6)], { style });
    const alone = prepare(input);
    const contained = prepare({ type: "row", children: [input] });
    assert.equal(alone.naturalSize.height, contained.naturalSize.height);
  }
  for (const [style, code] of [
    [{ height: 4 }, "VERTICAL_OVERFLOW"],
    [{ maxHeight: 4 }, "VERTICAL_OVERFLOW"],
    [{ height: 1, padding: 1 }, "VERTICAL_OVERFLOW"],
    [{ height: 1, padding: 1, overflow: "hidden" }, "GEOMETRY"],
  ] as const) {
    const input = column([spacer(6)], { style });
    diagnostic(() => prepare(input), code, "/column");
    diagnostic(() => prepare({ type: "row", children: [input] }), code, "/column/children/0");
  }
  diagnostic(() => prepare(column([], { style: { minHeight: 2, maxHeight: 1 } })), "GEOMETRY", "/column/style");
});

test("Column metric fractional bounds accept derived fit but reject material overflow", () => {
  const block = prepare(column([spacer(0.2)], { style: { height: 0.3, paddingTop: 0.1 } }));
  assert.equal(block.naturalSize.height, 0.3);
  assert.equal(fragment(block)?.height, 0.3);
  diagnostic(
    () => prepare(column([spacer(0.21)], { style: { height: 0.3, paddingTop: 0.1 } })),
    "VERTICAL_OVERFLOW",
    "/column",
  );
});

test("Column controls retain actual stack gaps and page advancement", () => {
  const block = prepare(column([spacer(0.1), { type: "pageBreak" }, spacer(0.1)], { style: { gap: 0.1 } }));
  assert.equal(block.naturalSize.height, 0.30000000000000004);
  const first = fragment(block);
  assert.equal(first?.advance, true);
  assert.equal(first?.height, 0.1);
  assert.equal(fragment(block, first!.nextOffset)?.height, 0.2);
});

test("empty/padded/bordered Columns and nested Rows keep natural geometry", () => {
  assert.equal(prepare(column()).naturalSize.height, 0);
  assert.equal(
    prepare(column([], { style: { padding: 1, border: { width: 1, color: [0, 0, 0] } } })).naturalSize.height,
    4,
  );
  const nested = { type: "row", children: [column([spacer(3)])] };
  const block = prepare(column([nested, spacer(2)], { style: { gap: 1, padding: 1 } }));
  assert.equal(block.naturalSize.height, 8);
  assert.equal(block.fragmentation, "splittable");
  assert.equal(fragment(block)?.height, 8);
});
