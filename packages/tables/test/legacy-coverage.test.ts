import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type OperationOptions } from "@updf/core";
import { type ComponentContext, h } from "@updf/core/vdom";
import { block, createExtensions, Document, document, flow, paragraph } from "@updf/layout";
import { table, tableExtension, type TableInput } from "@updf/tables";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { layout, lower, render } from "../../../tests/fixtures/text-options.js";

const extensions = createExtensions([tableExtension]);
function input(count = 1): TableInput {
  return {
    columns: [{ width: 60 }, { width: 60 }],
    style: { padding: 0, fontSize: 8, lineHeight: { unit: "pt", value: 10 } },
    head: { repeat: true, rows: [{ cells: [{ children: "Header" }, {}] }] },
    body: Array.from({ length: count }, (_, i) => ({ cells: [{ children: `row${i}` }, {}] })),
  };
}
function root(value: TableInput, height = 60) {
  return document({
    children: flow({
      pageSize: { width: 120, height },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions,
      children: table(value),
    }),
  });
}
function run(value: TableInput, height = 60, options: OperationOptions = {}) {
  return layout(root(value, height), options);
}
function failure(callback: () => unknown, code: string, path?: RegExp) {
  assert.throws(callback, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    if (path) assert.match(error.diagnostics[0]?.path ?? "", path);
    return true;
  });
}
test("retired engine coverage: exact row paging, repeated headers, immutable output and page 21", () => {
  const result = run(input(11));
  assert.equal(result.pageCount, 3);
  assert.equal(result.placements.length, 3);
  assert.deepEqual(
    result.placements.map((p) => p.sourceRange),
    [
      { start: 0, end: 5 },
      { start: 5, end: 10 },
      { start: 10, end: 11 },
    ],
  );
  assert.ok(Object.isFrozen(result.document.pages[0]?.children));
  assert.ok(render(result.document).length > 0);
  assert.equal(run(input(5)).pageCount, 1);
  assert.equal(run(input(100)).pageCount, 20);
  assert.equal(run(input(101)).pageCount, 21);
  failure(() => run(input(101), 60, { profile: "service" }), "LIMIT");
});
test("retired engine coverage: blank cells occupy a line and wrapped cells reserve padding/grid/minimum", () => {
  assert.equal(run({ ...input(), head: { rows: [] }, body: [{ cells: [{}, {}] }] }).placements[0]?.box.height, 10);
  const result = run({
    ...input(),
    head: { rows: [] },
    grid: { width: 1, color: [0, 0, 0] },
    body: [{ minHeight: 30, cells: [{ children: "one\ntwo\nthree", style: { padding: 2 } }, {}] }],
  });
  assert.equal(result.placements[0]?.box.height, 36);
  assert.ok(render(result.document).length > 0);
});
test("retired engine coverage: impossible head/body pair fails with the body source path", () => {
  failure(() => run(input(), 15), "LAYOUT_OVERSIZED", /\/body\/0/u);
  failure(() => run({ ...input(), body: [{ minHeight: 51, cells: [{}, {}] }] }), "LAYOUT_OVERSIZED");
});
test("retired engine coverage: cell input is owned without freezing caller text", () => {
  const cell = { children: "A" };
  const value = { ...input(), body: [{ cells: [cell, {}] }] };
  const content = root(value);
  const before = render(layout(content).document);
  assert.equal(Object.isFrozen(cell), false);
  cell.children = "B";
  assert.deepEqual(render(layout(content).document), before);
  failure(
    () =>
      run({ ...value, body: [{ cells: [{ children: "A".repeat(4097) }, {}] }] }, 60, {
        limits: { textCodePoints: 4096 },
      }),
    "LIMIT",
    /\/body\/0/u,
  );
});
test("retired engine coverage: invalid styles and exact fixed-width overflow reject", () => {
  failure(() => table({ ...input(), style: { padding: Infinity } }), "GEOMETRY");
  failure(() => table({ ...input(), style: { bold: true } } as never), "KEY");
  failure(() => run({ ...input(), columns: [{ width: 60 }, { width: 60.00000000000003 }] }), "GEOMETRY");
  failure(() => run({ ...input(), style: { padding: 30 } }), "GEOMETRY");
});
test("retired engine coverage: body character diagnostics retain authored cell/run context", () => {
  const value = { ...input(), body: [{ cells: [{ children: paragraph({ children: "é" }) }, {}] }] };
  failure(() => lower(h(Document, root(value).props)), "CHARACTER", /\/body\/0\/props\/body\/0\/cells\/0\//u);
});
test("retired engine coverage: repeated text and blank headers enforce generated output quotas", () => {
  const value = {
    ...input(4),
    style: { padding: 0, fontSize: 1, lineHeight: { unit: "pt" as const, value: 2 } },
    head: { repeat: true, rows: [{ cells: [{ children: "A".repeat(80) }, {}] }] },
  };
  failure(() => run(value, 4, { limits: { textCodePoints: 300 } }), "LIMIT");
  assert.equal(run(value, 4).pageCount, 4);
  const blank = {
    ...value,
    body: input(8).body,
    head: { repeat: true, rows: [{ cells: [{ children: "\n".repeat(2000) }, {}] }] },
  };
  const limits = { nodes: 10000 };
  assert.equal(run({ ...blank, body: input(4).body }, 4004, { limits }).pageCount, 4);
  assert.throws(
    () => run(blank, 4004, { limits }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]?.code, "LIMIT");
      assert.equal(error.diagnostics[0]?.message, "Generated nodes limit exceeded (maximum 10000)");
      assert.equal(error.diagnostics[0]?.path, "/document/children/body/0");
      return true;
    },
  );
  assert.equal(run(blank, 4004).pageCount, 8);
});
test("retired engine coverage: head and first row advance together after preceding content", () => {
  const content = document({
    children: flow({
      pageSize: { width: 120, height: 60 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions,
      children: [block({ style: { height: 50 }, children: [] }), table(input())],
    }),
  });
  const result = layout(content);
  assert.equal(result.pageCount, 2);
  assert.equal(result.placements[1]?.pageIndex, 1);
  assert.deepEqual(result.placements[1]?.sourceRange, { start: 0, end: 1 });
});
test("retired engine coverage: fractional translated cells paint while erased cell widths reject", () => {
  const content = (value: TableInput, width: number, origin: number) =>
    document({
      children: flow({
        pageSize: { width, height: 800.9 },
        margins: { top: 700, left: origin, right: 0, bottom: 0 },
        extensions,
        children: table(value),
      }),
    });
  const value = {
    ...input(),
    columns: [{ width: 60.03 }, { width: 60.03 }],
    style: { padding: 0, lineHeight: { unit: "pt" as const, value: 10.3 } },
    body: [{ cells: [{ children: "A\nA\nA" }, {}] }],
  };
  const result = layout(content(value, 820.06, 700));
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length > 0);
  failure(() => layout(content({ ...input(), columns: [{ width: 2 ** 55 }, { width: 1 }] }, 2 ** 56, 0)), "GEOMETRY");
});
test("retired engine coverage: flow origins provide left/center/right narrow-table placement", () => {
  for (const offset of [0, 20, 40]) {
    const content = document({
      children: flow({
        pageSize: { width: 160, height: 60 },
        margins: { top: 0, right: 0, bottom: 0, left: offset },
        extensions,
        children: table({ ...input(), grid: { width: 1, color: [0, 0, 0] } }),
      }),
    });
    const result = layout(content);
    assert.equal(result.placements[0]?.box.x, offset);
    assert.ok(render(result.document).length > 0);
  }
});
test("retired engine coverage: table lowering snapshots fonts, rejects forged fonts and closes context", async () => {
  const font = await fixtureFont();
  const resources = { Demo: font };
  const value = { ...input(), style: { ...input().style, font: "Demo" } };
  const content = root(value);
  let retained: ComponentContext | undefined;
  function Wrapper(_props: object, context: ComponentContext) {
    retained = context;
    Reflect.deleteProperty(resources, "Demo");
    return h(Document, content.props);
  }
  const actual = lower(h(Wrapper, {}), { resources });
  const options = { resources: { Demo: font } };
  assert.deepEqual(render(actual, options), render(lower(h(Document, content.props), options), options));
  assert.ok(retained);
  const closed = retained;
  failure(() => closed.measurement.measureText(richInput("x", 10)), "MEASUREMENT_CONTEXT");
  failure(() => lower(h(Document, content.props), { resources: { Demo: { ...font } } }), "RESOURCE");
});
