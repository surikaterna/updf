import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { column, row } from "@updf/layout";
import { createLayoutOperation, measure } from "../../../tests/fixtures/text-options.js";
import { compile } from "../dist/cjs/block-compiler.js";
import { compileRow } from "../dist/cjs/row-compiler.js";
import type { PreparedBlock } from "../dist/cjs/protocol.js";

const spacer = (height: number) => ({ type: "spacer" as const, height });
const stretchInput = {
  type: "row",
  align: "stretch",
  children: [
    { type: "column", width: 20, style: { overflow: "hidden", padding: 1 }, children: [] },
    { type: "column", children: [] },
  ],
};
test("Row completion retains full hidden bodies under fixed/max bounds and enforces inset floor", () => {
  for (const constraint of [{ height: 4 }, { maxHeight: 4 }]) {
    const item = row({
      children: [
        column({ style: { ...constraint, overflow: "hidden", padding: 1 }, children: [spacer(10), spacer(20)] }),
      ],
    });
    assert.equal(measure(item, { width: 80 }).size.height, 4);
  }
  assert.throws(
    () =>
      measure(
        row({ children: [column({ style: { height: 1, padding: 1, overflow: "hidden" }, children: [spacer(20)] })] }),
        { width: 80 },
      ),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "GEOMETRY",
  );
  assert.throws(
    () =>
      measure(
        row({
          style: { maxHeight: 3 },
          children: [
            column({
              style: {
                height: 4,
                overflow: "hidden",
              },
              children: [spacer(20)],
            }),
          ],
        }),
        { width: 80 },
      ),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
  );
});

test("hidden Row shells cannot conceal nonfinite full natural stack heights", () => {
  assert.throws(
    () =>
      measure(
        row({
          children: [
            column({
              style: { height: 1, overflow: "hidden" },
              children: [spacer(Number.MAX_VALUE), spacer(Number.MAX_VALUE)],
            }),
          ],
        }),
        { width: 80 },
      ),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "GEOMETRY",
  );
});

test("unconstrained hidden stretch preserves authored clip semantics and measures each body once", () => {
  const tasks: (() => void)[] = [];
  const columns: PreparedBlock[] = [];
  const widths: number[] = [];
  let prepared: PreparedBlock | undefined;
  compileRow(
    stretchInput,
    80,
    "/row",
    createLayoutOperation({}),
    tasks,
    (_values, width, _path, target) => {
      widths.push(width);
      const height = width === 18 ? 2 : 10;
      target.push({
        fragmentation: "atomic",
        naturalSize: { width, height },
        extent: 1,
        fragment: () => ({ height, nextOffset: 1, paint: () => [] }),
      });
    },
    (block) => {
      prepared = block;
    },
    (_value, block) => columns.push(block),
  );
  while (tasks.length) tasks.pop()?.();
  assert.deepEqual(widths, [60, 18]);
  assert.equal(prepared?.naturalSize.height, 10);
  assert.deepEqual(
    columns.map((item) => item.naturalSize),
    [
      { width: 20, height: 10 },
      { width: 60, height: 10 },
    ],
  );
  const fragment = columns[0]?.fragment({
    offset: 0,
    width: 20,
    usedHeight: 0,
    freshHeight: 10,
    availableHeight: 10,
    atFreshRegion: true,
  });
  assert.equal(fragment?.height, 10);
  // Unconstrained hidden is not an authored clipping/definite-height region after stretch.
  assert.equal(columns[0]?.contentAlignment, undefined);
});

test("Row hidden clamps reject controls even when the clamp is within metric tolerance", () => {
  const item = row({
    children: [
      column({
        style: { maxHeight: 0.3, overflow: "hidden" },
        children: [spacer(0.1), { type: "pageBreak" }, spacer(0.2)],
      }),
    ],
  });
  assert.throws(
    () => measure(item, { width: 80 }),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE",
  );
  assert.equal(
    measure(
      row({
        children: [column({ style: { maxHeight: 0.3, overflow: "hidden" }, children: [spacer(0.1), spacer(0.2)] })],
      }),
      { width: 80 },
    ).size.height,
    0.3,
  );
});

test("ordinary metric fit and unconstrained hidden stretch do not become authored clipping", () => {
  for (const align of ["top", "stretch"] as const) {
    for (const overflow of ["error", "hidden"] as const) {
      const item = row({
        align,
        style: { height: 0.3, paddingTop: 0.1 },
        children: [column({ style: { overflow }, children: [spacer(0.2)] })],
      });
      const columns: PreparedBlock[] = [];
      const prepared = compile([item], 80, "/row", {
        operation: createLayoutOperation({}),
        lifetime: { active: true },
        freshHeight: 1,
        onPrepared: (value, block) => {
          if (value === item.children[0]) columns.push(block);
        },
      })[0]!;
      assert.equal(prepared.naturalSize.height, 0.3);
      assert.equal(columns[0]?.naturalSize.height, 0.2);
      assert.equal(columns[0]?.contentAlignment, undefined);
      assert.throws(
        () => measure({ ...item, style: { height: 0.29, paddingTop: 0.1 } }, { width: 80 }),
        (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
      );
    }
  }
});

test("Row completion measures actual stack gaps around controls, not child-count capacity estimates", () => {
  const tasks: (() => void)[] = [];
  let prepared: PreparedBlock | undefined;
  const block = (height: number): PreparedBlock => ({
    fragmentation: "atomic",
    extent: 1,
    naturalSize: { width: 80, height },
    fragment: () => ({ height, nextOffset: 1, paint: () => [] }),
  });
  compileRow(
    { type: "row", children: [{ type: "column", style: { gap: 0.1 }, children: [] }] },
    80,
    "/row",
    createLayoutOperation({}),
    tasks,
    (_values, _width, _path, target) => {
      target.push(block(0.1), { ...block(0), control: "advance" }, block(0.1));
    },
    (item) => {
      prepared = item;
    },
    () => {},
  );
  while (tasks.length) tasks.pop()?.();
  assert.equal(prepared?.naturalSize.height, 0.30000000000000004);
  assert.throws(
    () =>
      prepared?.fragment({
        offset: 0,
        width: 80,
        usedHeight: 0,
        freshHeight: 1,
        availableHeight: 1,
        atFreshRegion: true,
      }),
    DocumentError,
  );
});
