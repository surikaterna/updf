import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { block, column, document, fixed, flow, Flow, Document, row } from "@updf/layout";
import { table, tableExtension } from "@updf/tables";
import { createExtensions } from "@updf/layout";
import { layout, measure } from "../../../tests/fixtures/text-options.js";

const rect = (width: number) => ({
  type: "rect" as const,
  x: 0,
  y: 0,
  width,
  height: 2,
  paint: { fill: [1, 0, 0] as const, stroke: null },
});
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const sparse: unknown[] = [];
sparse.length = 1;
function rejection(callback: () => unknown, code: string, path: RegExp): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === code && path.test(error.diagnostics[0].path),
  );
}

test("fixed snapshots canonical raw grammar without freezing callers", () => {
  const children = [rect(7)];
  const input = { width: 7, height: 2, children };
  const value = fixed(input);
  children[0]!.width = 9;
  input.height = 20;
  children.push(rect(1));
  assert.deepEqual(value, { type: "fixed", width: 7, height: 2, children: [rect(7)] });
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.children) && Object.isFrozen(value.children[0]));
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(children), false);
  assert.deepEqual(measure(value, { width: 10 }).size, { width: 7, height: 2 });
  assert.deepEqual(measure({ type: "fixed", width: 7, height: 2, children: [rect(7)] }, { width: 10 }).size, {
    width: 7,
    height: 2,
  });
});

test("fixed omission fills host while explicit width reports exactly, including JSX flow children", () => {
  const fill = fixed({ height: 2, children: [] });
  const exact = fixed({ width: 7, height: 2, children: [rect(7)] });
  assert.equal("width" in fill, false);
  assert.deepEqual(measure(fill, { width: 13 }).size, { width: 13, height: 2 });
  assert.deepEqual(measure(fill, { width: 17 }).size, { width: 17, height: 2 });
  const props = { pageSize: { width: 20, height: 20 }, margins, children: [fill, exact] };
  const data = layout(document({ children: flow(props) }));
  const jsx = layout(h(Document, { children: h(Flow, props) }));
  assert.deepEqual(data, jsx);
  assert.deepEqual(
    data.placements.map((p) => p.box.width),
    [20, 7],
  );
});

test("fixed exact width validates children in its own box and never clamps one-successor overruns", () => {
  assert.deepEqual(measure(fixed({ width: 10, height: 2, children: [rect(10)] }), { width: 10 }).size, {
    width: 10,
    height: 2,
  });
  rejection(
    () => measure(fixed({ width: 10 + Number.EPSILON * 8, height: 2, children: [] }), { width: 10 }),
    "GEOMETRY",
    /width$/u,
  );
  rejection(() => measure(fixed({ width: 7, height: 2, children: [rect(8)] }), { width: 10 }), "BOUNDS", /children/u);
  rejection(
    () => measure({ type: "fixed", width: undefined, height: 2, children: [] } as never, { width: 10 }),
    "GEOMETRY",
    /width$/u,
  );
  for (const type of ["paragraph", "spacer", "pageBreak", "extension"]) {
    rejection(
      () => measure({ type, width: 2, height: 1, children: [] } as never, { width: 10 }),
      "KEY",
      /(?:width|height|children)$/u,
    );
  }
});

test("fixed factory rejects invalid domains, fields, accessors and array structure before operations", () => {
  for (const width of [undefined, 0, -1, NaN, Infinity, "2", null])
    rejection(() => fixed({ width, height: 2, children: [] } as never), "GEOMETRY", /fixed\/width$/u);
  for (const height of [undefined, 0, -1, NaN, Infinity])
    rejection(() => fixed({ height, children: [] } as never), "GEOMETRY", /fixed\/height$/u);
  rejection(() => fixed({ height: 2, children: [], unknown: 1 } as never), "KEY", /unknown$/u);
  rejection(
    () =>
      fixed({
        get height(): number {
          throw Error("not invoked");
        },
        children: [],
      }),
    "TYPE",
    /height$/u,
  );
  for (const children of [undefined, {}, sparse, [() => {}]])
    rejection(() => fixed({ height: 2, children } as never), "TYPE", /children/u);
});

test("fixed explicit and fill modes compose with containers, Rows, Columns and table cells", () => {
  const explicit = fixed({ width: 7, height: 2, children: [rect(7)] });
  const fill = fixed({ height: 2, children: [] });
  assert.deepEqual(
    measure(block({ style: { width: 12, padding: 1 }, children: [explicit, fill] }), { width: 20 }).size,
    { width: 12, height: 6 },
  );
  assert.deepEqual(measure(column({ width: 10, children: [explicit, fill] }), { width: 20 }).size, {
    width: 10,
    height: 4,
  });
  assert.deepEqual(
    measure(row({ children: [column({ width: 10, children: [explicit] }), column({ width: 10, children: [fill] })] }), {
      width: 20,
    }).size,
    { width: 20, height: 2 },
  );
  const extensions = createExtensions([tableExtension]);
  assert.equal(
    measure(
      table({ columns: [{ width: 10 }], style: { padding: 0 }, body: [{ cells: [{ children: explicit }] }] }),
      { width: 20 },
      { extensions },
    ).size.width,
    10,
  );
  rejection(() => measure(column({ width: 6, children: [explicit] }), { width: 20 }), "GEOMETRY", /width$/u);
  rejection(
    () =>
      measure(
        table({ columns: [{ width: 6 }], style: { padding: 0 }, body: [{ cells: [{ children: explicit }] }] }),
        { width: 20 },
        { extensions },
      ),
    "GEOMETRY",
    /width$/u,
  );
});
