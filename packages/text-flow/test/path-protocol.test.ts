import assert from "node:assert/strict";
import test from "node:test";
import type { NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Paragraph, Span, createExtensions, defineInlineAdapter, inline, pt, type ContentLine } from "@updf/layout";
import { pathFlow as flow } from "../../../tests/fixtures/text-flow/siblings.js";
import { protocolFixture } from "./path-protocol-fixture.js";
import { prepareFragmentPaint } from "../../layout/dist/cjs/fragment-paint-preparation.js";
import { collectPreparedLines } from "../../layout/dist/cjs/prepared-line-reports.js";
import { resolvePaint } from "../../layout/dist/cjs/protocol-runtime.js";

function report(f: ReturnType<typeof protocolFixture>, x = 0, y = 0) {
  const { state: _state, ...request } = f.request;
  const selected = f.block.fragment(request)!;
  const prepared = prepareFragmentPaint(selected, { x, y }, f.request.budget, "/path");
  const lines: ContentLine[] = [];
  collectPreparedLines(prepared.root, lines);
  return { lines, selected, root: prepared.root };
}
function flatten(nodes: readonly NodeDefinition[]): readonly NodeDefinition[] {
  return nodes.flatMap((node) => (node.type === "paintGroup" ? flatten([...node.children]) : [node]));
}
test("path protocol fixture requires explicit children from its matching factory", () => {
  assert.equal<[] extends Parameters<typeof protocolFixture> ? true : false>(false, false);
  const f = protocolFixture([
    h(flow.Block, { style: { width: 72, height: 36, float: "left" } }),
    h(Paragraph, { children: "explicit path-factory rectangle and paragraph" }),
  ]);
  try {
    const { lines, selected } = report(f);
    assert.ok(selected.nextOffset > 0);
    assert.ok(lines.length > 0);
    assert.ok(lines[0]!.fragments[0]!.x >= 72);
  } finally {
    f.close();
  }
});
for (const side of ["left", "right"] as const)
  test(`${side}: variable widths and actual tops span two paragraphs`, () => {
    const d = side === "left" ? "M0 0H100L20 96H0Z" : "M0 0H100V96H80Z";
    const f = protocolFixture([
      h(flow.Path, { d, fill: "#3498db", style: { width: 100, height: 96, float: side } }),
      h(Paragraph, { children: "first paragraph ordinary text" }),
      h(Paragraph, { children: "second paragraph content with changing available widths. ".repeat(8) }),
    ]);
    try {
      const { lines, selected } = report(f, 3, 5);
      assert.ok(lines.length >= 3);
      assert.ok(lines.some((l) => l.fragments.some((p) => p.source.path.startsWith("/siblings/2"))));
      if (side === "left") assert.ok(lines[1]!.fragments[0]!.x < lines[0]!.fragments[0]!.x);
      else assert.ok(lines.every((l) => l.fragments[0]!.x === 3));
      assert.ok(lines.every((l, i) => i === 0 || l.top > lines[i - 1]!.top));
      const { state: _state, ...request } = f.request;
      const tail = f.block.fragment({ ...request, offset: selected.nextOffset })!;
      const tailLines: ContentLine[] = [];
      collectPreparedLines(prepareFragmentPaint(tail, { x: 3, y: 5 }, f.request.budget, "/tail").root, tailLines);
      assert.equal(tailLines[0]!.fragments[0]!.x, 3);
    } finally {
      f.close();
    }
  });
test("blocked word retries at nominal rich tops and fits later inside the shape", () => {
  const f = protocolFixture([
    h(flow.Path, { d: "M0 0H198L10 96H0Z", fill: "transparent", style: { width: 200, height: 96, float: "left" } }),
    h(Paragraph, { children: "considerable continuation" }),
  ]);
  try {
    const { lines, selected } = report(f);
    assert.ok(lines[0]!.top > 0 && lines[0]!.top < 96);
    assert.ok(selected.nextOffset > 1);
    assert.equal(
      lines
        .flatMap((l) => l.fragments)
        .map((p) => (p.role === "text" ? p.text : ""))
        .join(" "),
      "considerable continuation",
    );
  } finally {
    f.close();
  }
});
function visual(counter: { calls: number }) {
  return defineInlineAdapter({
    name: "path-inline",
    validate: (v) => v,
    measure: () => {
      counter.calls++;
      return {
        advance: 10,
        ascent: 16,
        descent: 3,
        inkBounds: { empty: false as const, left: 0, right: 10, top: -16, bottom: 3 },
        nodes: [
          {
            type: "rect" as const,
            x: 0,
            y: 0,
            width: 10,
            height: 19,
            paint: { fill: [0, 1, 0] as const, stroke: null },
          },
        ],
      };
    },
  });
}
test("mixed points/normal struts, negative leading and inline ink retain prepared positions and background ordering", () => {
  const counter = { calls: 0 },
    adapter = visual(counter);
  const f = protocolFixture(
    [
      h(flow.Path, { d: "M0 0H100L20 96H0Z", fill: [0, 0, 1], style: { width: 100, height: 96, float: "left" } }),
      h(Paragraph, {
        style: { lineHeight: pt(2) },
        children: [
          h(Span, {
            style: { fontSize: 20, lineHeight: "normal", backgroundColor: [0.9, 0.2, 0.1] },
            children: ["large ", inline(adapter, {})],
          }),
          h(Span, {
            style: { lineHeight: pt(4), backgroundColor: [0.8, 0.2, 0.1] },
            children: "tail text ".repeat(12),
          }),
        ],
      }),
      h(Paragraph, { style: { lineHeight: "normal" }, children: "second paragraph ".repeat(8) }),
    ],
    createExtensions([adapter]),
  );
  try {
    const first = report(f, 3, 20),
      second = report(f, 3, 20);
    assert.equal(counter.calls, 1);
    assert.deepEqual(first.lines, second.lines);
    assert.equal(first.lines.flatMap((l) => l.fragments).filter((p) => p.role === "visual").length, 1);
    const nodes = flatten(resolvePaint(first.root));
    const firstGlyph = nodes.findIndex((n) => n.type === "richText");
    const backgrounds = nodes.map((n, i) => (n.type === "rect" && n.paint?.fill?.[0] !== 0 ? i : -1));
    assert.ok(Math.max(...backgrounds) < firstGlyph);
    f.close();
    assert.throws(() => f.block.fragment(f.request), /closed/u);
  } finally {
    f.close();
  }
});
test("Path rejects stroke/transforms and invalid contours before any native painter", () => {
  for (const extra of [{ stroke: [0, 0, 0] }, { transform: [1, 0, 0, 1, 0, 0] }, { children: null }])
    assert.throws(() =>
      protocolFixture([
        h(flow.Path, { d: "M0 0H20V20H0Z", fill: "blue", style: { width: 20, height: 20, float: "left" }, ...extra }),
      ]),
    );
  const f = protocolFixture([
    h(flow.Path, { d: "M0 0H20V20H0Z", fill: "none", style: { width: 20, height: 20, float: "left" } }),
    h(Paragraph, { children: "source text" }),
  ]);
  try {
    let paints = 0;
    const fragment = f.block.fragment(f.request)!;
    const children = fragment.geometry.children.map((child, i) => ({
      ...child,
      fragment: {
        ...child.fragment,
        paint: () => {
          paints++;
          return [];
        },
        ...(i
          ? {
              geometry: {
                ...child.fragment.geometry,
                parts: [{ offset: NaN, height: 1, reservation: "slot" as const }],
              },
            }
          : {}),
      },
    }));
    assert.throws(() =>
      prepareFragmentPaint(
        { ...fragment, geometry: { ...fragment.geometry, children } },
        { x: 0, y: 0 },
        f.request.budget,
        "/bad",
      ),
    );
    assert.equal(paints, 0);
  } finally {
    f.close();
  }
});
