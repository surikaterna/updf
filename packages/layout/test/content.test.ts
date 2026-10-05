import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type ComponentContext, createContext, h, useContext } from "@updf/core/vdom";
import { badge, badgeAdapter } from "../../../apps/showcase/src/inline-badge.js";
import { lower, render } from "../../../tests/fixtures/text-options.js";
import {
  Block,
  block,
  createExtensions,
  defineInlineAdapter,
  inline,
  layoutFlow,
  measure,
  Paragraph,
  paragraph,
  Span,
  span,
} from "../../../tests/fixtures/transitional-layout.js";
import { Document } from "../dist/cjs/transitional-vdom.js";

const pageTemplate = { width: 120, height: 120, margins: { top: 10, right: 10, bottom: 10, left: 10 } };
function reject(callback: () => unknown, code: string, path?: RegExp): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!path || path.test(error.diagnostics[0].path)),
  );
}
function required<T>(value: T | undefined): T {
  assert.ok(value !== undefined);
  return value;
}
test("D: data and semantic JSX share defaults, inherited Span styles, UTF16 source paths and frozen portable results", () => {
  const children = [
    "a",
    span({
      style: { color: [1, 0, 0], fontSize: 14 },
      children: ["b", span({ style: { color: [0, 0, 1] }, children: "c" })],
    }),
    "d",
  ];
  const data = paragraph({ children });
  const result = measure(data, { width: 100 });
  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0]?.height, 14);
  const text = required(result.lines[0]).fragments.filter((item) => item.role === "text");
  assert.deepEqual(
    text.map((item) => item.style.fontSize),
    [10, 14, 14, 10],
  );
  assert.deepEqual(
    text.map((item) => item.style.color),
    [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
      [0, 0, 0],
    ],
  );
  assert.match(required(text[2]).source.path, /children\/1\/children\/1\/children$/u);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.lines) && Object.isFrozen(required(text[0]).source));
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.equal(Object.isFrozen(children), false);
  assert.deepEqual(measure(h(Paragraph, { children }), { width: 100 }).size, result.size);
});
test("D: natural Block measurement uses real capacity, border-box width, insets and native clipping", () => {
  const content = block({
    children: [paragraph({ children: "x" })],
    style: { width: 80, padding: 2, border: { width: 1, color: [0, 1, 0] } },
  });
  const result = measure(content, { width: 100 });
  assert.deepEqual(result.size, { width: 80, height: 16 });
  assert.equal(result.lines[0]?.top, 3);
  assert.equal(result.lines[0]?.fragments[0]?.x, 3);
  const hidden = measure(
    block({ children: [paragraph({ children: "x\ny" })], style: { height: 12, overflow: "hidden" } }),
    { width: 100 },
  );
  assert.equal(hidden.size.height, 12);
  assert.ok(!hidden.inkBounds.empty && hidden.inkBounds.bottom <= 12);
});
test("D: repeated immutable Paragraph and visual descriptors reuse semantic measurements, but emitted occurrences still count", () => {
  let calls = 0;
  const adapter = defineInlineAdapter<{ height: number }>({
    name: "cached",
    validate: (value) => value as { height: number },
    measure: ({ height }, context) => {
      calls++;
      assert.ok(Object.isFrozen(context.style) && Object.isFrozen(context.style.color));
      return { advance: 1, ascent: height, descent: 0, inkBounds: { empty: true }, nodes: [] };
    },
  });
  const visual = inline(adapter, { height: 12 }),
    content = paragraph({ children: ["x", visual] });
  const result = layoutFlow(
    { pageTemplate, body: [content, content] },
    { limits: { textCodePoints: 2 } },
    createExtensions([adapter]),
  );
  assert.equal(result.placements.length, 2);
  assert.equal(calls, 1);
  reject(
    () =>
      layoutFlow(
        { pageTemplate, body: [content, content] },
        { limits: { textCodePoints: 1 } },
        createExtensions([adapter]),
      ),
    "LIMIT",
  );
});
test("D: invalid resources/styles fail before visual callbacks and normalization failures close captured contexts", () => {
  let calls = 0;
  const adapter = defineInlineAdapter<unknown>({
    name: "never",
    validate: (value) => {
      calls++;
      return value;
    },
    measure: () => ({ advance: 1, ascent: 1, descent: 0, inkBounds: { empty: true }, nodes: [] }),
  });
  reject(
    () =>
      measure(
        paragraph({ style: { font: "Absent" }, children: inline(adapter, {}) }),
        { width: 100 },
        { extensions: createExtensions([adapter]) },
      ),
    "FONT_RESOURCE",
  );
  assert.equal(calls, 0);
  let retained: ComponentContext | undefined;
  const Failure = (_props: Record<never, never>, context: ComponentContext) => {
    retained = context;
    throw new Error("failure");
  };
  reject(() => measure(h(Failure, {}), { width: 100 }), "VDOM_COMPONENT");
  reject(
    () =>
      retained?.measurement.measureText({
        kind: "plain",
        text: "x",
        width: 100,
        fontSize: 10,
        lineHeight: 12,
        align: "left",
      }),
    "MEASUREMENT_CONTEXT",
  );
});
test("D: authoring descriptors cannot become forged providers/recipes or context data", () => {
  const content = paragraph({ children: "x" });
  reject(() => measure({ ...content } as typeof content, { width: 100 }), "TYPE");
  reject(() => createContext({ content }), "TYPE");
  reject(
    () => measure({ kind: "component", invoke: () => h(Paragraph, { children: "x" }) } as never, { width: 100 }),
    "KEY",
  );
});
test("D: Span boundaries do not split words; whitespace, empty lines and policy remain explicit", () => {
  reject(
    () => measure(paragraph({ children: ["abc", span({ children: "def" })] }), { width: 20 }),
    "TOKEN_OVERFLOW",
    /children\/0$/u,
  );
  assert.equal(
    measure(paragraph({ children: [" a ", span({ children: "  b " })] }), { width: 100 })
      .lines[0]?.fragments.map((item) => (item.role === "text" ? item.text : ""))
      .join(""),
    "a b",
  );
  assert.equal(measure(paragraph({ children: "\n", whiteSpace: "preserve" }), { width: 100 }).lines.length, 2);
  assert.equal(measure(paragraph({}), { width: 100 }).size.height, 10);
  reject(() => measure(paragraph({ children: "abc" }), { width: 100 }, { limits: { textCodePoints: 2 } }), "LIMIT");
  reject(() => measure(paragraph({ children: "abc" }), { width: 100, height: 9 }), "VERTICAL_OVERFLOW");
});
test("D: actual roles reject nested blocks, naked spans, native drawings and numbers without coercion", () => {
  reject(
    () => measure(h(Paragraph, { children: h(Block, { children: paragraph({ children: "x" }) }) }), { width: 100 }),
    "VDOM_HIERARCHY",
    /children$/u,
  );
  reject(() => measure(h(Span, { children: "x" }), { width: 100 }), "VDOM_HIERARCHY");
  reject(
    () => measure(h(Paragraph, { children: h("rect", { x: 0, y: 0, width: 1, height: 1 }) }), { width: 100 }),
    "VDOM_HIERARCHY",
  );
  reject(() => measure(paragraph({ children: 1 as never }), { width: 100 }), "TYPE");
  assert.equal(measure(paragraph({ children: [false, null, "x"] }), { width: 100 }).lines[0]?.advance, 5);
});
test("D: inline overflow moves a whole line, never shrinks visuals or overlaps adjacent blocks", () => {
  const extensions = createExtensions([badgeAdapter]);
  const content = paragraph({ children: ["A", badge(24), "B", badge(24), "C"] });
  const measured = measure(content, { width: 30 }, { extensions });
  assert.ok(measured.lines.length > 1);
  assert.ok(measured.lines.every((line) => line.advance <= 30));
  const result = layoutFlow(
    {
      pageTemplate,
      body: [
        {
          type: "fixed",
          height: 4,
          children: [{ type: "rect", x: 0, y: 0, width: 10, height: 4, paint: { fill: [1, 0, 0], stroke: null } }],
        },
        paragraph({ children: ["A", badge(24), "B"] }),
        paragraph({ children: "after" }),
      ],
    },
    {},
    extensions,
  );
  assert.equal(result.placements[1]?.box.y, 14);
  assert.equal(result.placements[2]?.box.y, 40.25);
});
test("D: unsupported characters retain the Span source path and original UTF16 range", () => {
  assert.throws(
    () => measure(paragraph({ children: ["safe", span({ children: "xЖ" })] }), { width: 100 }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "CHARACTER" &&
      error.diagnostics[0].path === "/content/children/1/children" &&
      error.diagnostics[0].span?.start === 1 &&
      error.diagnostics[0].span.end === 2,
  );
  reject(
    () => measure(h(Paragraph, { children: h(Span, { style: undefined } as never) }), { width: 100 }),
    "TYPE",
    /style$/u,
  );
  reject(
    () => measure(paragraph({ children: span({ style: { font: "Absent" }, children: "x" }) }), { width: 100 }),
    "FONT_RESOURCE",
    /^\/content\/children\/style\/font$/u,
  );
});
test("D: wrappers execute only in the operation with provider frames, progress checks and closed measurement callbacks", () => {
  const Theme = createContext({ size: 10 });
  let retained: ComponentContext | undefined,
    calls = 0;
  const Wrapper = (_props: Record<never, never>, context: ComponentContext) => {
    calls++;
    retained = context;
    return h(Paragraph, { style: { fontSize: useContext(Theme).size }, children: "x" });
  };
  const tree = h(Theme.Provider, { value: { size: 20 }, children: h(Wrapper, {}) });
  assert.equal(calls, 0);
  assert.equal(measure(tree, { width: 100 }).size.height, 20);
  assert.equal(calls, 1);
  reject(
    () =>
      required(retained).measurement.measureText({
        kind: "plain",
        text: "x",
        width: 100,
        fontSize: 10,
        lineHeight: 12,
        align: "left",
      }),
    "MEASUREMENT_CONTEXT",
  );
  assert.equal(measure(h(Wrapper, {}), { width: 100 }).size.height, 10);
  const Cycle = (): ReturnType<typeof h> => h(Cycle, {});
  reject(() => measure(h(Cycle, {}), { width: 100 }), "VDOM_CYCLE");
  reject(() => useContext(Theme), "MEASUREMENT_CONTEXT");
});
test("D: inline native visuals grow auto height, align to a common baseline, wrap atomically and emit exact data/JSX PDFs", () => {
  const extensions = createExtensions([badgeAdapter]);
  const content = paragraph({ children: ["A", badge(24), "B"] });
  const measured = measure(content, { width: 100 }, { extensions });
  const line = required(measured.lines[0]);
  assert.equal(line.height, 26.25);
  const visual = required(line.fragments.find((item) => item.role === "visual"));
  assert.equal(visual.inkBounds.empty, false);
  if (!visual.inkBounds.empty) assert.equal(visual.inkBounds.bottom, line.baseline);
  const data = layoutFlow({ pageTemplate, body: [content] }, {}, extensions);
  assert.deepEqual(render(lower(h(Document, { pageTemplate, extensions, children: content }))), render(data.document));
  assert.equal(data.placements[0]?.box.height, measured.size.height);
  reject(() => measure(content, { width: 20 }, { extensions }), "TOKEN_OVERFLOW");
  assert.ok(
    measure(paragraph({ style: { lineHeight: 1.2 }, children: badge(24) }), { width: 100 }, { extensions }).size
      .height >= 24,
  );
  reject(() => measure(content, { width: 100 }), "KEY");
  reject(
    () =>
      measure(content, { width: 100 }, { extensions: createExtensions([badgeAdapter]), limits: { pathCommands: 4 } }),
    "LIMIT",
  );
});
test("D: malformed inline output, copied capabilities and callback throws fail structurally", () => {
  const bad = defineInlineAdapter({
    name: "bad",
    validate: (value: unknown) => value,
    measure: () => ({ advance: 1, ascent: NaN, descent: 0, inkBounds: { empty: true as const }, nodes: [] }),
  });
  reject(
    () => measure(paragraph({ children: inline(bad, {}) }), { width: 100 }, { extensions: createExtensions([bad]) }),
    "GEOMETRY",
  );
  const thrown = defineInlineAdapter<unknown>({
    name: "thrown",
    validate: () => {
      throw "failure";
    },
    measure: () => ({ advance: 1, ascent: 1, descent: 0, inkBounds: { empty: true as const }, nodes: [] }),
  });
  reject(
    () =>
      measure(paragraph({ children: inline(thrown, {}) }), { width: 100 }, { extensions: createExtensions([thrown]) }),
    "TYPE",
    /children$/u,
  );
  reject(() => inline({ ...bad }, {}), "TYPE");
});
test("D: cumulative semantic native capture fails before an unvisited accessor and does not copy hidden output", () => {
  let reads = 0;
  const adapter = defineInlineAdapter<{ malicious: boolean }>({
    name: "capture",
    validate: (value) => value as { malicious: boolean },
    measure({ malicious }) {
      const nodes = Array.from({ length: 15 }, () => ({
        type: "rect" as const,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        paint: { fill: [1, 0, 0] as const, stroke: null },
      }));
      if (malicious)
        Object.defineProperty(nodes, "9", {
          enumerable: true,
          get() {
            reads++;
            throw new Error("must not read");
          },
        });
      return {
        advance: 1,
        ascent: 1,
        descent: 0,
        inkBounds: { empty: false, left: 0, right: 1, top: -1, bottom: 0 },
        nodes,
      };
    },
  });
  const content = paragraph({
    children: [inline(adapter, { malicious: false }), inline(adapter, { malicious: true })],
  });
  reject(
    () => measure(content, { width: 100 }, { extensions: createExtensions([adapter]), limits: { nodes: 24 } }),
    "LIMIT",
    /children\/1$/u,
  );
  assert.equal(reads, 0);
});
