import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { createExtensions, document, flow, nativeInline, Paragraph, paragraph, Span, span } from "@updf/layout";
import { table, Table, tableExtension } from "@updf/tables";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";

const red = [1, 0, 0] as const;
const sparse: unknown[] = [];
sparse.length = 1;
const rect = (width = 4, height = 8) => ({
  type: "rect" as const,
  x: 0,
  y: 0,
  width,
  height,
  paint: { fill: red, stroke: null },
});
const visual = () => nativeInline({ advance: 4, ascent: 6, descent: 2, nodes: [rect()] });
function rejection(callback: () => unknown, code: string, path?: RegExp): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!path || path.test(error.diagnostics[0].path)),
  );
}
function flatten(nodes: readonly NodeDefinition[]): NodeDefinition[] {
  return nodes.flatMap((n) => (n.type === "paintGroup" ? flatten(n.children) : [n]));
}

test("nativeInline snapshots data into the existing owned inline grammar and rejects copies", () => {
  const nodes = [rect()];
  const input = { advance: 4, ascent: 6, descent: 2, nodes };
  const value = nativeInline(input);
  input.advance = 99;
  nodes[0]!.width = 99;
  nodes.push(rect());
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.props));
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(nodes), false);
  const result = measure(paragraph({ children: value }), { width: 20 });
  assert.equal(result.lines[0]?.advance, 4);
  assert.deepEqual(result.lines[0]?.fragments[0]?.inkBounds, {
    empty: false,
    left: 0,
    right: 4,
    top: result.lines[0]!.baseline - 6,
    bottom: result.lines[0]!.baseline + 2,
  });
  rejection(() => measure(paragraph({ children: { ...value } }), { width: 20 }), "TYPE");
  rejection(
    () => measure(paragraph({ children: { type: "inlineVisual", props: input } as never }), { width: 20 }),
    "TYPE",
  );
});

test("native inline data and JSX paragraphs/spans share mixed text baseline and highlight geometry", () => {
  const value = visual();
  const style = { backgroundColor: [1, 1, 0] as const };
  const data = paragraph({ children: ["A ", span({ style, children: value }), " B"] });
  const jsx = h(Paragraph, { children: ["A ", h(Span, { style, children: value }), " B"] });
  const result = measure(data, { width: 50 });
  assert.deepEqual(measure(jsx, { width: 50 }), result);
  const fragment = result.lines[0]!.fragments.find((f) => f.role === "visual")!;
  assert.deepEqual(fragment.inkBounds, {
    empty: false,
    left: fragment.x,
    right: fragment.x + 4,
    top: result.lines[0]!.baseline - 6,
    bottom: result.lines[0]!.baseline + 2,
  });
  const output = layout(
    document({
      children: flow({
        pageSize: { width: 50, height: 50 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: data,
      }),
    }),
  );
  const painted = flatten(output.document.pages[0]!.children).filter((n) => n.type === "rect");
  assert.equal(painted.length, 2);
  assert.equal(painted[0]!.width, 4);
  assert.equal(painted[0]!.height, 8);
  assert.equal(painted[0]!.y, result.lines[0]!.baseline - 6);
  assert.ok(render(output.document).length > 0);
});

test("native inline wraps without scaling, permits empty spacing and zero-ascent positive descent", () => {
  const value = visual();
  const result = measure(paragraph({ children: [value, " ", value] }), { width: 5 });
  assert.equal(result.lines.length, 2);
  assert.ok(
    result.lines.every((line) => line.fragments.filter((f) => f.role === "visual").every((f) => f.advance === 4)),
  );
  rejection(() => measure(paragraph({ children: value }), { width: 3 }), "TOKEN_OVERFLOW");
  const below = nativeInline({ advance: 4, ascent: 0, descent: 8, nodes: [rect()] });
  const belowLine = measure(paragraph({ children: below }), { width: 10 }).lines[0]!;
  assert.deepEqual(belowLine.fragments[0]!.inkBounds, {
    empty: false,
    left: 0,
    right: 4,
    top: belowLine.baseline,
    bottom: belowLine.baseline + 8,
  });
  const empty = nativeInline({ advance: 4, ascent: 8, nodes: [] });
  const line = measure(paragraph({ children: empty }), { width: 10 }).lines[0]!;
  assert.equal(line.advance, 4);
  assert.deepEqual(line.inkBounds, { empty: true });
  assert.deepEqual((empty.props as { descent: number }).descent, 0);
});

test("native inline works in implicit table cells in both data and JSX without native extensions", () => {
  const value = visual();
  const data = table({ columns: [{ width: 20 }], body: [{ cells: [{ children: value }] }] });
  const jsx = h(Table, {
    columns: [{ width: 20 }],
    children: h(Table.Body, { children: h(Table.Row, { children: h(Table.Cell, { children: value }) }) }),
  });
  const options = { adapters: createExtensions([tableExtension]) };
  assert.deepEqual(measure(data, { width: 20 }, options), measure(jsx, { width: 20 }, options));
});

test("native inline rejects explicit undefined, invalid metric domains and malformed data", () => {
  const input = { advance: 4, ascent: 6, nodes: [] };
  for (const advance of [undefined, 0, -1, NaN, Infinity, null, "4"])
    rejection(() => nativeInline({ ...input, advance } as never), "GEOMETRY", /advance$/u);
  for (const key of ["ascent", "descent"])
    for (const value of [undefined, -1, NaN, Infinity, null, "4"])
      rejection(() => nativeInline({ ...input, [key]: value } as never), "GEOMETRY", new RegExp(`${key}$`, "u"));
  rejection(() => nativeInline({ ...input, ascent: 0 }), "GEOMETRY", /height$/u);
  rejection(
    () => nativeInline({ ...input, ascent: Number.MAX_VALUE, descent: Number.MAX_VALUE }),
    "GEOMETRY",
    /height$/u,
  );
  rejection(() => nativeInline({ ...input, inkBounds: { empty: true } } as never), "KEY", /inkBounds$/u);
  rejection(
    () =>
      nativeInline({
        ...input,
        get advance(): number {
          throw Error("not invoked");
        },
      }),
    "TYPE",
    /advance$/u,
  );
  for (const nodes of [undefined, {}, sparse, [() => {}]])
    rejection(() => nativeInline({ ...input, nodes } as never), "TYPE", /nodes/u);
});

test("native inline operation validates its exact authored box, native grammar and resources", () => {
  for (const nodes of [[rect(5)], [rect(4, 9)], [{ ...rect(), x: -1 }], [{ type: "unknown" }]]) {
    rejection(
      () => measure(paragraph({ children: nativeInline({ advance: 4, ascent: 8, nodes } as never) }), { width: 20 }),
      nodes[0]!.type === "unknown" ? "TYPE" : "BOUNDS",
    );
  }
  const value = nativeInline({
    advance: 4,
    ascent: 8,
    nodes: [{ type: "xObject", resource: "missing", x: 0, y: 0, width: 4, height: 8 }],
  });
  rejection(() => measure(paragraph({ children: value }), { width: 20 }), "RESOURCE");
});

test("legitimate native descriptors can be reused across paragraphs and independent operations", () => {
  const value = visual();
  const content = [paragraph({ children: value }), paragraph({ children: span({ children: value }) })];
  const first = measure(content, { width: 20 });
  assert.equal(first.lines.length, 2);
  assert.deepEqual(measure(content, { width: 20 }), first);
  measure(content[0]!, { width: 20 }, { limits: { pathCommands: 5 } });
  rejection(() => measure(content, { width: 20 }, { limits: { pathCommands: 5 } }), "LIMIT");
  rejection(() => measure(content, { width: 20 }, { limits: { nodes: 1 } }), "LIMIT");
  assert.deepEqual(measure(content, { width: 20 }), first);
});
