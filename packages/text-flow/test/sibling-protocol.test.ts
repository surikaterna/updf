import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Paragraph, Span, createExtensions, defineInlineAdapter, inline, pt, type ContentLine } from "@updf/layout";
import { siblingFlow as flow } from "../../../tests/fixtures/text-flow/siblings.js";
import { protocolFixture } from "./sibling-protocol-fixture.js";
import { prepareFragmentPaint } from "../../layout/dist/cjs/fragment-paint-preparation.js";
import { collectPreparedLines } from "../../layout/dist/cjs/prepared-line-reports.js";
import { provenanceAt, provenanceRange } from "../../layout/dist/cjs/source-provenance.js";
import { resolvePaint } from "../../layout/dist/cjs/protocol-runtime.js";

test("pure lookahead, candidate forks, selected-only adoption, exact source extent and closed lifetime", () => {
  const f = protocolFixture();
  try {
    const expected = f.sources.slice(1).reduce(
      (total, source) =>
        total +
        Array.from(
          source
            .author!.definition.runs.map((r) => r.text)
            .join("")
            .trim(),
        ).length +
        1,
      1,
    );
    assert.equal(f.block.extent, expected);
    const candidate = f.request.state.fork();
    const first = f.block.fragment({ ...f.request, state: candidate })!;
    const repeat = f.block.fragment({ ...f.request, state: f.request.state.fork() })!;
    assert.equal(first.nextOffset, repeat.nextOffset);
    assert.equal(first.height, repeat.height);
    assert.equal(
      f.block.fragment({
        ...f.request,
        availableHeight: 1,
        usedHeight: 99,
        atFreshRegion: false,
        state: f.request.state.fork(),
      }),
      undefined,
    );
    f.request.state.adopt(candidate);
    assert.throws(() => f.block.fragment(f.request), /checkpoint/u);
    const next = f.block.fragment({ ...f.request, offset: first.nextOffset })!;
    assert.ok(next.nextOffset > first.nextOffset);
    assert.throws(
      () => f.block.fragment({ ...f.request, offset: next.nextOffset, width: 201 }),
      /fixed authored width/u,
    );
  } finally {
    f.close();
  }
  const { state: _state, ...closed } = f.request;
  assert.throws(() => f.block.fragment(closed));
});
test("compact provenance maps partial scalar ranges to authored sibling intervals and diagnostics", () => {
  const f = protocolFixture();
  try {
    const entries = f.block.provenance!;
    assert.equal(entries.length, 3);
    assert.deepEqual(provenanceRange(f.block, 2, entries[2]!.start + 1).range, { start: 1, end: 3 });
    assert.deepEqual(provenanceRange(f.block, entries[2]!.start + 1, f.block.extent).keys, ["two"]);
    assert.equal(provenanceAt(f.block, 2, "/unused"), f.sources[1]!.path);
    assert.ok(Object.isFrozen(entries) && entries.every(Object.isFrozen));
  } finally {
    f.close();
  }
});
test("whole selected child graph prepares before any visual or text painter", () => {
  const f = protocolFixture();
  let painted = 0;
  try {
    const selected = f.block.fragment(f.request)!;
    const children = selected.geometry.children.map((child, index) => {
      const { paintSteps: _steps, ...fragment } = child.fragment;
      return {
        ...child,
        fragment: {
          ...fragment,
          paint: () => {
            painted++;
            return [];
          },
          ...(index === selected.geometry.children.length - 1
            ? {
                geometry: {
                  ...child.fragment.geometry,
                  parts: [{ offset: NaN, height: 1, reservation: "slot" as const }],
                },
              }
            : {}),
        },
      };
    });
    assert.throws(() =>
      prepareFragmentPaint(
        { ...selected, geometry: { ...selected.geometry, children } },
        { x: 0, y: 0 },
        f.request.budget,
        "/selected",
      ),
    );
    assert.equal(painted, 0);
  } finally {
    f.close();
  }
});
test("rich bridge retains inline visual/background emission and prepared source-coordinate reports", () => {
  const adapter = defineInlineAdapter({
    name: "sibling-visual",
    validate: (v) => v,
    measure: () => ({
      advance: 8,
      ascent: 6,
      descent: 2,
      inkBounds: { empty: false as const, left: 0, right: 8, top: -6, bottom: 2 },
      nodes: [
        { type: "rect" as const, x: 0, y: 0, width: 8, height: 8, paint: { fill: [0, 1, 0] as const, stroke: null } },
      ],
    }),
  });
  const f = protocolFixture(
    [
      h(flow.Block, { style: { width: 72, height: 36, float: "left" } }),
      h(Paragraph, {
        children: [
          h(Span, { style: { backgroundColor: [0.9, 0.2, 0.1] }, children: ["A ", inline(adapter, {})] }),
          " tail text ".repeat(40),
        ],
      }),
    ],
    createExtensions([adapter]),
  );
  try {
    const first = f.block.fragment(f.request)!;
    const prepared = prepareFragmentPaint(first, { x: 3, y: 5 }, f.request.budget, "/selected");
    const lines: ContentLine[] = [];
    collectPreparedLines(prepared.root, lines);
    assert.ok(lines.length > 0 && lines[0]!.fragments[0]!.x >= 75);
    assert.equal(lines.flatMap((l) => l.fragments).filter((p) => p.role === "visual").length, 1);
    assert.ok(lines.flatMap((l) => l.fragments).every((p) => p.source.path.startsWith("/siblings/1")));
    assert.ok(resolvePaint(prepared.root).length > 0);
    const { state: _state, ...request } = f.request;
    const tail = f.block.fragment({ ...request, offset: first.nextOffset })!;
    const below = prepareFragmentPaint(tail, { x: 3, y: 50 }, f.request.budget, "/tail");
    const tailLines: ContentLine[] = [];
    collectPreparedLines(below.root, tailLines);
    assert.equal(tailLines[0]!.fragments[0]!.x, 3);
  } finally {
    f.close();
  }
});
test("selected multiline paragraph retains ordinary all-backgrounds-before-glyphs order for tight leading", () => {
  const f = protocolFixture([
    h(flow.Block, { style: { width: 72, height: 20, float: "left" } }),
    h(Paragraph, {
      style: { lineHeight: pt(2) },
      children: h(Span, { style: { backgroundColor: [0.9, 0.2, 0.1] }, children: "highlighted word ".repeat(30) }),
    }),
  ]);
  try {
    const selected = f.block.fragment(f.request)!;
    const prepared = prepareFragmentPaint(selected, { x: 0, y: 0 }, f.request.budget, "/tight");
    const flatten = (
      nodes: readonly import("@updf/core").NodeDefinition[],
    ): readonly import("@updf/core").NodeDefinition[] =>
      nodes.flatMap((node) => (node.type === "paintGroup" ? flatten([...node.children]) : [node]));
    const nodes = flatten(resolvePaint(prepared.root));
    assert.ok(nodes.filter((n) => n.type === "rect").length > 1);
    assert.ok(nodes.map((n) => n.type).lastIndexOf("rect") < nodes.findIndex((n) => n.type === "richText"));
  } finally {
    f.close();
  }
});
test("an atomic inline visual blocked by the side width remains unconsumed for the full-width tail", () => {
  const adapter = defineInlineAdapter({
    name: "wide-sibling-visual",
    validate: (v) => v,
    measure: () => ({
      advance: 160,
      ascent: 6,
      descent: 2,
      inkBounds: { empty: false as const, left: 0, right: 160, top: -6, bottom: 2 },
      nodes: [
        { type: "rect" as const, x: 0, y: 0, width: 160, height: 8, paint: { fill: [0, 1, 0] as const, stroke: null } },
      ],
    }),
  });
  const f = protocolFixture(
    [
      h(flow.Block, { style: { width: 72, height: 36, float: "left" } }),
      h(Paragraph, { children: inline(adapter, {}) }),
    ],
    createExtensions([adapter]),
  );
  try {
    const first = f.block.fragment(f.request)!;
    assert.equal(first.nextOffset, 1);
    assert.equal(first.height, 36);
    const tail = f.block.fragment({ ...f.request, offset: 1 })!;
    assert.equal(tail.nextOffset, 3);
    const lines: ContentLine[] = [];
    collectPreparedLines(prepareFragmentPaint(tail, { x: 0, y: 36 }, f.request.budget, "/visual").root, lines);
    assert.equal(lines.flatMap((line) => line.fragments).filter((part) => part.role === "visual").length, 1);
  } finally {
    f.close();
  }
});
