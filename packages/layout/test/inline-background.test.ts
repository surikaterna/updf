import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition, type RenderOptions, render } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { h } from "@updf/core/vdom";
import {
  Block,
  createExtensions,
  defineInlineAdapter,
  document,
  type Extensions,
  flow,
  inline,
  layout,
  measure,
  Paragraph,
  paragraph,
  pt,
  Span,
  span,
} from "@updf/layout";
import { badge, badgeAdapter } from "../../../apps/showcase/src/inline-badge.js";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { contentProducer } from "../dist/cjs/content-producer.js";

const yellow = [1, 1, 0] as const;
const blue = [0, 0, 1] as const;
function nodes(content: ReturnType<typeof paragraph>, options = {}) {
  const { extensions, ...renderOptions } = options as RenderOptions & { readonly extensions?: Extensions };
  return layout(
    document({
      children: flow({
        ...(extensions ? { extensions } : {}),
        pageSize: { width: 140, height: 160 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        children: content,
      }),
    }),
    renderOptions,
  ).document;
}
function flatten(input: Iterable<NodeDefinition>): NodeDefinition[] {
  return [...input].flatMap((node) => (node.type === "paintGroup" ? flatten(node.children) : [node]));
}
test("#43 highlights use measured advances, raw inherited participant heights, nested overrides and source order", () => {
  const content = paragraph({
    style: { fontSize: 12, lineHeight: 1.2 },
    whiteSpace: "preserve",
    children: [
      span({
        style: { ...{ backgroundColor: blue }, ...{ backgroundColor: yellow } },
        children: [
          "A ",
          span({ style: { fontSize: 20 }, children: "B" }),
          span({ style: { backgroundColor: blue, lineHeight: pt(8) }, children: " C" }),
          "D",
        ],
      }),
      " E",
    ],
  });
  const measured = measure(content, { width: 100 });
  const output = flatten(nodes(content).pages[0]!.children);
  const rectangles = output.filter((node) => node.type === "rect");
  const fragments = measured.lines.flatMap((line) => line.fragments);
  assert.equal(rectangles.length, 4);
  assert.deepEqual(
    rectangles.map((rect) => rect.width),
    fragments.slice(0, 4).map((fragment) => fragment.advance),
  );
  assert.deepEqual(
    rectangles.map((rect) => rect.x),
    fragments.slice(0, 4).map((fragment) => fragment.x),
  );
  for (const [index, expected] of [7, 0, 10.2, 7].entries())
    assert.ok(Math.abs(rectangles[index]!.y - expected) < 1e-12);
  assert.deepEqual(
    rectangles.map((rect) => Math.round(rect.height * 10) / 10),
    [14.4, 24, 8, 14.4],
  );
  assert.deepEqual(
    rectangles.map((rect) => rect.paint?.fill),
    [yellow, yellow, blue, yellow],
  );
  assert.deepEqual(
    output.slice(0, 4).map((node) => node.type),
    ["rect", "rect", "rect", "rect"],
  );
});
test("#43 generated highlight counts reject before output allocation and are charged during measurement", () => {
  const content = paragraph({ children: span({ style: { backgroundColor: yellow }, children: "A" }) });
  assert.throws(() => measure(content, { width: 100 }, { limits: { pathCommands: 4 } }), DocumentError);
  const measured = measure(paragraph({ children: "A" }), { width: 100 });
  const operation = createLayoutOperation({ limits: { pathCommands: 4 } });
  let allocated = false;
  const producer = contentProducer(
    {
      lines: measured.lines,
      height: measured.size.height,
      backgroundCount: () => 1,
      emissionCounts: () => ({ nodes: 2, text: 1, commands: 0, work: 0 }),
      paintLine: () => {
        allocated = true;
        return [];
      },
    },
    100,
    false,
    "/highlight",
  );
  const request = { availableHeight: 100, atFreshRegion: true, offset: 0, width: 100, freshHeight: 100, usedHeight: 0 };
  assert.throws(() => producer.fragment({ ...request, budget: new OutputBudget(operation.policy) }), DocumentError);
  assert.equal(allocated, false);
  const nodeOperation = createLayoutOperation({ limits: { nodes: 1 } });
  assert.throws(() => producer.fragment({ ...request, budget: new OutputBudget(nodeOperation.policy) }), DocumentError);
  assert.equal(allocated, false);
  operation.close();
  nodeOperation.close();
});
test("#43 highlight metadata never enters visual text callbacks; invalid inherited resources fail before callbacks", () => {
  const styles: unknown[] = [];
  const adapter = defineInlineAdapter({
    name: "highlight-proof",
    validate: (value) => value,
    measure: (_value, context) => {
      styles.push(context.style);
      return { advance: 4, ascent: 6, descent: 2, inkBounds: { empty: true as const }, nodes: [] };
    },
  });
  const extensions = createExtensions([adapter]);
  const make = (highlight: boolean, font = "Helvetica") =>
    paragraph({
      style: { color: blue, font },
      children: span({ style: highlight ? { backgroundColor: yellow } : {}, children: ["A", inline(adapter, {})] }),
    });
  const plain = measure(make(false), { width: 100 }, { extensions });
  const painted = measure(make(true), { width: 100 }, { extensions });
  assert.deepEqual(painted.lines, plain.lines);
  assert.deepEqual(styles, [
    { font: "Helvetica", fontSize: 10, color: blue },
    { font: "Helvetica", fontSize: 10, color: blue },
  ]);
  assert.throws(() => measure(make(true, "Missing"), { width: 100 }, { extensions }), DocumentError);
  assert.equal(styles.length, 2);
});
test("#43 wrapping and tight lines paint every background before every foreground without reflow", () => {
  const make = (highlight: boolean) =>
    paragraph({
      style: { fontSize: 12, lineHeight: pt(4) },
      children: span({ style: highlight ? { backgroundColor: yellow } : {}, children: "AA AA AA AA\nAA" }),
    });
  const plain = make(false),
    highlighted = make(true);
  assert.deepEqual(measure(highlighted, { width: 30 }).lines, measure(plain, { width: 30 }).lines);
  assert.deepEqual(measure(highlighted, { width: 30 }).size, measure(plain, { width: 30 }).size);
  const normalNodes = flatten(nodes(plain).pages[0]!.children);
  const painted = flatten(nodes(highlighted).pages[0]!.children);
  const rectangles = painted.filter((node) => node.type === "rect");
  assert.ok(rectangles.length >= 2);
  assert.ok(rectangles.every((rect) => rect.height === 4));
  assert.ok(painted.slice(0, rectangles.length).every((node) => node.type === "rect"));
  assert.deepEqual(
    painted.filter((node) => node.type !== "rect"),
    normalNodes,
  );
  assert.ok(render(nodes(highlighted)).length);
});
test("#43 retained whitespace is highlighted; collapsed, LF and empty spans invent no rectangles", () => {
  const make = (whiteSpace: "collapse" | "preserve") =>
    paragraph({
      whiteSpace,
      children: [
        span({ style: { backgroundColor: yellow }, children: "  A " }),
        span({ style: { backgroundColor: blue }, children: "  B\n\n" }),
        span({ style: { fontSize: 30, backgroundColor: yellow }, children: "" }),
      ],
    });
  for (const whiteSpace of ["collapse", "preserve"] as const) {
    const content = make(whiteSpace);
    const measured = measure(content, { width: 100 });
    const rectangles = flatten(nodes(content).pages[0]!.children).filter((node) => node.type === "rect");
    assert.deepEqual(
      rectangles.map((rect) => rect.width),
      measured.lines.flatMap((line) => line.fragments.map((f) => f.advance)),
    );
    assert.equal(rectangles.length, 2);
    assert.equal(measured.lines.at(-1)!.height, 10);
  }
  assert.equal(
    flatten(
      nodes(paragraph({ children: span({ style: { backgroundColor: yellow }, children: "\n" }) })).pages[0]!.children,
    ).filter((n) => n.type === "rect").length,
    0,
  );
});
test("#43 strict RGB and role validation preserves structured author paths even for empty spans", () => {
  for (const value of [undefined, null, "yellow", [], [1, 0], [1, 0, 2], [NaN, 0, 0], [0, Infinity, 0]]) {
    assert.throws(
      () =>
        measure(h(Paragraph, { children: h(Span, { style: { backgroundColor: value } } as never) }), { width: 100 }),
      (error: unknown) =>
        error instanceof DocumentError && /\/style\/backgroundColor(?:\/\d)?$/u.test(error.diagnostics[0]!.path),
    );
  }
  for (const style of [{ background: yellow }, { padding: 1 }, { backgroundColor: yellow }]) {
    const component = "backgroundColor" in style ? Paragraph : Span;
    const content =
      component === Paragraph
        ? h(component, { style } as never)
        : h(Paragraph, { children: h(component, { style } as never) });
    assert.throws(() => measure(content, { width: 100 }), DocumentError);
  }
});
test("#43 explicit box backgrounds do not cascade; immutable highlights charge nodes and path commands", () => {
  const rgb = [1, 1, 0];
  const child = span({ style: { backgroundColor: rgb as unknown as typeof yellow }, children: "A" });
  rgb[0] = 0;
  const content = paragraph({ children: child });
  assert.deepEqual(
    flatten(nodes(content).pages[0]!.children).find((node) => node.type === "rect")?.paint?.fill,
    yellow,
  );
  const boxed = measure(h(Block, { style: { backgroundColor: yellow }, children: paragraph({ children: "A" }) }), {
    width: 100,
  });
  assert.equal(boxed.lines[0]!.fragments.length, 1);
  assert.throws(() => nodes(content, { limits: { pathCommands: 4 } }), DocumentError);
  assert.ok(nodes(paragraph({ children: "A" }), { limits: { pathCommands: 4 } }));
});
test("#43 mixed prepared fonts, inherited foreground color and visual callbacks retain metrics and foreground", async () => {
  const font = await fixtureFont();
  const options = { resources: { Demo: font }, extensions: createExtensions([badgeAdapter]) };
  const make = (highlight: boolean) =>
    paragraph({
      style: { font: "Demo", color: blue, lineHeight: 1.2 },
      children: span({
        style: highlight ? { backgroundColor: yellow } : {},
        children: ["A ", badge(12), span({ style: { font: "Helvetica", fontSize: 14 }, children: " B" })],
      }),
    });
  assert.deepEqual(
    measure(make(true), { width: 100 }, options).lines,
    measure(make(false), { width: 100 }, options).lines,
  );
  assert.deepEqual(
    measure(make(true), { width: 100 }, options).size,
    measure(make(false), { width: 100 }, options).size,
  );
  const plain = flatten(nodes(make(false), options).pages[0]!.children);
  const highlighted = flatten(nodes(make(true), options).pages[0]!.children);
  assert.deepEqual(highlighted.slice(3), plain);
  assert.equal(highlighted.slice(0, 3).filter((node) => node.type === "rect").length, 3);
});
