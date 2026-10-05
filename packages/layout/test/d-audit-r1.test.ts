import assert from "node:assert/strict";
import test from "node:test";
import { type DocumentDefinition, type NodeDefinition, render } from "@updf/core";
import { measureText, type ParagraphDefinition } from "@updf/core/measurement";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import {
  block,
  type Content,
  type ContentMeasurement,
  createDecorationPlan,
  layoutFlow,
  measure,
  Paragraph,
  paragraph,
  span,
} from "../../../tests/fixtures/transitional-layout.js";
import { Document } from "../dist/cjs/transitional-vdom.js";

const template = (height: number) => ({ width: 100, height, margins: { top: 0, right: 0, bottom: 0, left: 0 } });
const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
function layout(content: Content, height: number) {
  return layoutFlow({ pageTemplate: template(height), body: [content as ReturnType<typeof paragraph>] });
}
function definition(fontSize: number, align: ParagraphDefinition["align"], text: string): ParagraphDefinition {
  return {
    defaultStyle: { font: "Helvetica", fontSize, color: [0, 0, 0] },
    lineHeight: Math.max(12, fontSize * 1.2),
    align,
    whiteSpace: "preserve",
    breakLongWords: "error",
    runs: [{ text }],
  };
}
function geometry(result: ContentMeasurement) {
  return {
    size: result.size,
    inkBounds: result.inkBounds,
    lines: result.lines.map(({ top, height, baseline, advance, inkBounds }) => ({
      top,
      height,
      baseline,
      advance,
      inkBounds,
    })),
  };
}
test("D-F1: preserved fractional text emits on its exact-height zero-margin page", () => {
  const content = paragraph({ style: { fontSize: 10.3 }, whiteSpace: "preserve", children: "  second line " });
  const measured = measure(content, { width: 100 });
  const result = layout(content, measured.size.height);
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length);
  const group = result.document.pages[0]?.children[0];
  assert.ok(group?.type === "paintGroup" && group.clip);
  const node = group.children[0];
  assert.ok(node?.type === "richText" && node.x < 0);
  near(measured.lines[0]?.baseline ?? NaN, paintedText(result.document)[0]?.baseline ?? NaN);
});
test("D-F1: segmentation, alignment, fractional sizes and core context preserve measured/painted geometry", () => {
  for (const fontSize of [10.3, 10.51, 11.7, 14.2]) {
    for (const align of ["left", "center", "right"] as const) verifyFractional(fontSize, align);
  }
});
function verifyFractional(fontSize: number, align: ParagraphDefinition["align"]): void {
  const text = "  second line ";
  const style = {
    fontSize,
    textAlign: align,
    lineHeight: { unit: "pt" as const, value: Math.max(12, fontSize * 1.2) },
  };
  const plain = paragraph({ style, whiteSpace: "preserve", children: text });
  const split = paragraph({
    style,
    whiteSpace: "preserve",
    children: ["  ", span({ children: "second" }), " ", span({ children: "line" }), " "],
  });
  const Theme = createContext({ fontSize });
  const Author = () =>
    h(Paragraph, {
      style: { ...style, fontSize: useContext(Theme).fontSize },
      whiteSpace: "preserve" as const,
      children: text,
    });
  const contextual = h(Theme.Provider, { value: { fontSize }, children: h(Author, {}) });
  const expected = measure(plain, { width: 100 });
  assert.deepEqual(geometry(measure(contextual, { width: 100 })), geometry(expected));
  const segmented = measure(split, { width: 100 });
  near(segmented.lines[0]?.advance ?? NaN, expected.lines[0]?.advance ?? NaN);
  near(segmented.lines[0]?.baseline ?? NaN, expected.lines[0]?.baseline ?? NaN);
  for (const content of [plain, split]) {
    const measured = measure(content, { width: 100 });
    const result = layout(content, measured.size.height);
    assert.deepEqual(
      render(lower(h(Document, { pageTemplate: template(measured.size.height), children: content }))),
      render(result.document),
    );
    verifyPainted(measured, result.document);
  }
  verifyRichControl(definition(fontSize, align, text), expected);
}
function verifyRichControl(old: ParagraphDefinition, expected: ContentMeasurement): void {
  const oldMeasured = measureText({ kind: "rich", width: 100, paragraphs: [old] });
  near(oldMeasured.lines[0]?.baseline ?? NaN, expected.lines[0]?.baseline ?? NaN);
  assert.ok(
    render({
      version: 1,
      pages: [
        {
          width: 100,
          height: oldMeasured.consumedHeight,
          children: [
            { type: "richText", x: 0, y: 0, width: 100, height: oldMeasured.consumedHeight, paragraphs: [old] },
          ],
        },
      ],
    }).length,
  );
}
test("D-F2: all unpaginated before/after repeat policies position frozen metadata like native painting", () => {
  for (const repeat of ["first", "all", "last"] as const) {
    for (const edge of ["before", "after"] as const) {
      const content = block({
        decorations: createDecorationPlan([{ edge, repeat, height: 5, nodes: [] }]),
        children: [paragraph({ children: "A" })],
      });
      const measured = measure(content, { width: 100 });
      assert.equal(measured.size.height, 15);
      assert.equal(measured.lines[0]?.top, edge === "before" ? 5 : 0);
      assert.equal(measured.lines[0]?.baseline, edge === "before" ? 12.75 : 7.75);
      verifyPainted(measured, layout(content, 15).document);
      assert.ok(Object.isFrozen(measured) && Object.isFrozen(measured.lines[0]?.fragments[0]?.inkBounds));
    }
  }
});
test("D-F2: nested mixed reservations, insets, gaps and following siblings match actual native placement", () => {
  const plan = createDecorationPlan([
    { edge: "before", repeat: "first", height: 2, nodes: [] },
    { edge: "before", repeat: "all", height: 3, nodes: [] },
    { edge: "before", repeat: "last", height: 4, nodes: [] },
    { edge: "after", repeat: "first", height: 1, nodes: [] },
    { edge: "after", repeat: "all", height: 2, nodes: [] },
    { edge: "after", repeat: "last", height: 3, nodes: [] },
  ]);
  const inset = 1;
  const inner = block({
    decorations: createDecorationPlan([
      { edge: "before", repeat: "last", height: 5, nodes: [] },
      { edge: "after", repeat: "all", height: 7, nodes: [] },
    ]),
    style: { padding: inset, border: { width: 1, color: [0, 1, 0] } },
    children: [paragraph({ children: "B" })],
  });
  const content = block({
    decorations: plan,
    style: { padding: inset, gap: 3 },
    children: [paragraph({ children: "A" }), inner, paragraph({ children: "C" })],
  });
  const measured = measure(content, { width: 100 });
  assert.deepEqual(measured.size, { width: 100, height: 69 });
  assert.deepEqual(
    measured.lines.map((line) => line.top),
    [10, 30, 52],
  );
  assert.deepEqual(
    measured.lines.map((line) => line.fragments[0]?.x),
    [1, 3, 1],
  );
  verifyPainted(measured, layout(content, measured.size.height).document);
});
interface Painted {
  text: string;
  x: number;
  baseline: number;
  ink: ContentMeasurement["inkBounds"];
}
function paintedText(document: DocumentDefinition): Painted[] {
  const result: Painted[] = [];
  const tasks = document.pages.flatMap((page) => page.children.map((node) => ({ node, x: 0, y: 0 })));
  while (tasks.length) {
    const task = tasks.pop();
    if (task) readPainted(task.node, task.x, task.y, result, tasks);
  }
  return result.sort((a, b) => a.baseline - b.baseline || a.x - b.x);
}
function readPainted(
  node: NodeDefinition,
  x: number,
  y: number,
  result: Painted[],
  tasks: { node: NodeDefinition; x: number; y: number }[],
): void {
  if (node.type === "paintGroup") {
    const matrix = node.transform ?? ([1, 0, 0, 1, 0, 0] as const);
    assert.deepEqual(matrix.slice(0, 4), [1, 0, 0, 1]);
    for (const child of node.children) tasks.push({ node: child, x: x + matrix[4], y: y + matrix[5] });
    return;
  }
  if (node.type !== "richText") return;
  const measured = measureText({ kind: "rich", width: node.width, height: node.height, paragraphs: node.paragraphs });
  for (const line of measured.lines) {
    for (const fragment of line.fragments) {
      const ink = fragment.inkBounds;
      result.push({
        text: fragment.text,
        x: x + node.x + fragment.x,
        baseline: y + node.y + line.baseline,
        ink: ink.empty
          ? ink
          : {
              empty: false,
              left: ink.left + x + node.x,
              right: ink.right + x + node.x,
              top: ink.top + y + node.y,
              bottom: ink.bottom + y + node.y,
            },
      });
    }
  }
}
function verifyPainted(measured: ContentMeasurement, document: DocumentDefinition): void {
  assert.ok(render(document).length);
  const actual = paintedText(document);
  const expected = measured.lines.flatMap((line) =>
    line.fragments
      .filter((fragment) => fragment.role === "text")
      .map((fragment) => ({ text: fragment.text, x: fragment.x, baseline: line.baseline, ink: fragment.inkBounds })),
  );
  assert.equal(actual.length, expected.length);
  actual.forEach((item, index) => {
    const target = expected[index];
    assert.ok(target);
    assert.equal(item.text, target.text);
    near(item.x, target.x);
    near(item.baseline, target.baseline);
    assert.equal(item.ink.empty, target.ink.empty);
    if (!item.ink.empty && !target.ink.empty) {
      near(item.ink.left, target.ink.left);
      near(item.ink.right, target.ink.right);
      near(item.ink.top, target.ink.top);
      near(item.ink.bottom, target.ink.bottom);
    }
  });
}
