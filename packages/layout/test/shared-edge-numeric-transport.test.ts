import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import {
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  flow,
  flowBody,
  type LocalEdgeClaim,
} from "@updf/layout";
import { layout } from "../../../tests/fixtures/text-options.js";

const edge: LocalEdgeClaim = {
  axis: "horizontal",
  interval: [0, 80],
  coordinate: 0,
  ownerSide: "top",
  provenance: "grid",
  width: 2,
  color: [0, 0, 0],
  sourcePath: "/row",
};
function bands(nodes: readonly NodeDefinition[], x = 0, y = 0): NodeDefinition[] {
  return nodes.flatMap((node) => {
    if (node.type === "paintGroup")
      return bands(node.children, x + (node.transform?.[4] ?? 0), y + (node.transform?.[5] ?? 0));
    return node.type === "rect" ? [{ ...node, x: node.x + x, y: node.y + y }] : [];
  });
}
function headerAdapter(headerHeight: number) {
  return defineBlockAdapter({
    name: "numeric.header",
    validate: () => ({}),
    measure(_props, context) {
      const marker = context.edgeRegion({
        width: 80,
        height: headerHeight,
        nodes: [],
        claims: [{ ...edge, coordinate: headerHeight, ownerSide: "bottom" }],
      });
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: headerHeight },
        fragment: () => ({ status: "placed", nextOffset: 1, height: headerHeight, nodes: [marker] }),
      };
    },
  });
}
function fixture(headerHeight: number, bodyHeight: number, deferred = false, distinct = false) {
  const header = headerAdapter(headerHeight);
  const parent = defineBlockAdapter({
    name: "numeric.parent",
    validate: () => ({}),
    measure(_props, context) {
      const input = {
        width: 80,
        height: headerHeight,
        nodes: [],
        claims: [{ ...edge, coordinate: headerHeight, ownerSide: "bottom" as const }],
      };
      const decorations = deferred
        ? context.reserveDecorations([
            { edge: "before", repeat: "all", height: headerHeight, content: extension(header, {}) },
          ])
        : createDecorationPlan([
            { edge: "before", repeat: "all", height: headerHeight, nodes: [context.edgeRegion(input)] },
          ]);
      const marker = context.edgeRegion({
        width: 80,
        height: bodyHeight,
        nodes: [],
        claims: [{ ...edge, coordinate: distinct ? headerHeight * Number.EPSILON : 0 }],
      });
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: bodyHeight },
        decorations,
        fragment: () => ({ status: "placed", nextOffset: 1, height: bodyHeight, nodes: [marker] }),
      };
    },
  });
  const extensions = createExtensions([header, parent]);
  return (top: number, pathCommands = 5) =>
    layout(
      document({
        children: flow({
          pageSize: { width: 100, height: 100 },
          margins: { top, left: 10, right: 10, bottom: 0 },
          extensions,
          children: flowBody({ children: extension(parent, {}) }),
        }),
      }),
      { profile: "service", limits: { pathCommands } },
    );
}

for (const deferred of [false, true]) {
  test(`decimal shared boundary retains identity at nonzero origins (deferred=${deferred})`, () => {
    const run = fixture(10.1, 10.2, deferred);
    for (const origin of [0, 20.3]) {
      const result = bands(run(origin).document.pages[0]!.children);
      assert.equal(result.length, 1);
      assert.deepEqual(result[0], {
        type: "rect",
        x: 10,
        y: origin + 9.1,
        width: 80,
        height: 2,
        paint: { fill: [0, 0, 0], stroke: null },
      });
    }
    assert.throws(
      () => run(20.3, 4),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
  });

  test(`fractional allocations fit using native binary64 containment (deferred=${deferred})`, () => {
    const run = fixture(1 / 3, 2 / 3, deferred);
    const baseline = bands(run(0).document.pages[0]!.children);
    const translated = bands(run(10.1).document.pages[0]!.children);
    assert.equal(translated.length, 1);
    assert.deepEqual(
      translated,
      baseline.map((node) => (node.type === "rect" ? { ...node, y: node.y + 10.1 } : node)),
    );
  });

  test(`nearby but distinct centerlines are not merged (deferred=${deferred})`, () => {
    const run = fixture(10.1, 10.2, deferred, true);
    assert.equal(bands(run(20.3, 10).document.pages[0]!.children).length, 2);
    assert.throws(
      () => run(20.3),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
  });
}
