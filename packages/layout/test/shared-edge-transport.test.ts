import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { h, useContext } from "@updf/core/vdom";
import { createLayoutOperation, render } from "../../../tests/fixtures/text-options.js";
import {
  Block,
  blockComponent,
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  PageContext,
  Paragraph,
} from "../../../tests/fixtures/transitional-layout.js";
import { instantiateEmissionNodes } from "../dist/cjs/emission-nodes.js";
import type { BlockContent, EdgeRegionInput, LocalEdgeClaim, MeasureContext } from "@updf/layout";
import { edgeRegionNode, sharedEdgeEmission } from "../dist/cjs/shared-edge-emission.js";
import { ownEdgeRegion, requireEdgeRegion } from "../dist/cjs/shared-edge-regions.js";
import { flow } from "./fixtures.js";

const top: LocalEdgeClaim = {
  axis: "horizontal",
  interval: [0, 80],
  coordinate: 0,
  ownerSide: "top",
  provenance: "grid",
  width: 2,
  color: [0, 0, 0],
  sourcePath: "/row",
};
function region(height = 10, claims: readonly LocalEdgeClaim[] = [top]): EdgeRegionInput {
  return { width: 80, height, nodes: [], claims };
}
function rectangles(nodes: readonly NodeDefinition[], x = 0, y = 0): NodeDefinition[] {
  return nodes.flatMap((node) => {
    if (node.type !== "paintGroup") return node.type === "rect" ? [{ ...node, x: node.x + x, y: node.y + y }] : [];
    return rectangles(node.children, x + (node.transform?.[4] ?? 0), y + (node.transform?.[5] ?? 0));
  });
}
function rejects(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
function deferredParent(content: BlockContent) {
  return defineBlockAdapter({
    name: "edges.deferred-parent",
    validate: (input) => input,
    measure(_props, context) {
      const decorations = context.reserveDecorations([{ edge: "before", repeat: "all", height: 10, content }]);
      const marker = context.edgeRegion(region());
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        decorations,
        fragment: (request) =>
          request.availableHeight < 10
            ? { status: "defer" }
            : { status: "placed", nextOffset: 1, height: 10, nodes: [marker] },
      };
    },
  });
}

test("direct before/body/after markers share one translated interval and retain region content clips", () => {
  const adapter = defineBlockAdapter({
    name: "edges.direct",
    validate: (input) => input,
    measure(_props, context) {
      const header = context.edgeRegion(region(10, [{ ...top, coordinate: 10, ownerSide: "bottom" }]));
      const body = context.edgeRegion({
        ...region(),
        nodes: [
          {
            type: "paintGroup",
            clip: { x: 0, y: 0, width: 5, height: 5 },
            children: [{ type: "rect", x: 0, y: 0, width: 20, height: 20, paint: { fill: [1, 0, 0], stroke: null } }],
          },
        ],
      });
      const footer = context.edgeRegion(region());
      const decorations = createDecorationPlan([
        { edge: "before", repeat: "first", height: 10, nodes: [header] },
        { edge: "after", repeat: "last", height: 10, nodes: [footer] },
      ]);
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        decorations,
        fragment: () => ({ status: "placed", nextOffset: 1, height: 10, nodes: [body] }),
      };
    },
  });
  const result = layoutFlow(flow([extension(adapter, {})], { height: 100 }), {}, createExtensions([adapter]));
  const bands = rectangles(result.document.pages[0]!.children).filter(
    (node) => node.type === "rect" && node.width === 80,
  );
  assert.equal(bands.length, 2);
  assert.deepEqual(
    bands.map((node) => (node.type === "rect" ? [node.y, node.height] : [])),
    [
      [9, 2],
      [19, 2],
    ],
  );
  assert.match(JSON.stringify(result.document), /"clip":\{"x":0,"y":0,"width":5,"height":5\}/u);
  assert.ok(render(result.document).length > 0);
});

test("deferred root reports join only after rendering with current page context; short roots invent no section boundary", () => {
  const pages: number[] = [];
  const child = defineBlockAdapter({
    name: "edges.deferred-child",
    validate: () => ({}),
    measure(_props, context) {
      const marker = context.edgeRegion(region(4, [{ ...top, coordinate: 4, ownerSide: "bottom" }]));
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 4 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 4, nodes: [marker] }),
      };
    },
  });
  const Child = blockComponent(child);
  function Header() {
    pages.push(useContext(PageContext).docPageNumber);
    return h(Child, {});
  }
  const parent = deferredParent(h(Header, {}));
  const reused = extension(parent, {});
  const result = layoutFlow(flow([reused, reused], { height: 30 }), {}, createExtensions([parent, child]));
  assert.deepEqual(pages, [1, 2]);
  for (const page of result.document.pages) {
    const bands = rectangles(page.children);
    assert.deepEqual(
      bands.map((node) => (node.type === "rect" ? [node.y, node.height] : [])),
      [
        [3, 2],
        [9, 2],
      ],
    );
  }
});

test("B1 deferred aggregate root retains internal logical boundaries and bounded inset metadata", () => {
  const child = defineBlockAdapter({
    name: "edges.inset-aggregate",
    validate: () => ({}),
    measure(_props, context) {
      const bottom = { ...top, coordinate: 5, ownerSide: "bottom" as const, unsharedInset: 2 };
      const before = context.edgeRegion(region(5, [bottom]));
      const after = context.edgeRegion(region(5, [{ ...top, unsharedInset: 2 }, bottom]));
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        fragment: () => ({
          status: "placed",
          nextOffset: 1,
          height: 10,
          nodes: [before, { type: "paintGroup", transform: [1, 0, 0, 1, 0, 5], children: [after] }],
        }),
      };
    },
  });
  const parent = deferredParent(extension(child, {}));
  const result = layoutFlow(flow([extension(parent, {})], { height: 100 }), {}, createExtensions([parent, child]));
  assert.deepEqual(
    rectangles(result.document.pages[0]!.children).map((node) => (node.type === "rect" ? [node.y, node.height] : [])),
    [
      [4, 2],
      [9, 2],
    ],
  );
});

test("serialized marker output is ordinary native content, not a forged shared report", () => {
  const adapter = defineBlockAdapter({
    name: "edges.no-forgery",
    validate: (input) => input,
    measure(_props, context) {
      const marker: NodeDefinition = JSON.parse(JSON.stringify(context.edgeRegion(region())));
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 10, nodes: [marker] }),
      };
    },
  });
  const result = layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  assert.equal(rectangles(result.document.pages[0]!.children).length, 0);
});

test("report allocations, content geometry, ownership and closed factory context cannot be bypassed", () => {
  let captured: MeasureContext | undefined;
  let marker: NodeDefinition | undefined;
  const adapter = defineBlockAdapter({
    name: "edges.invalid",
    validate: (input) => input,
    measure(_props, context) {
      captured = context;
      marker ??= context.edgeRegion(region(20));
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 10, nodes: [marker!] }),
      };
    },
  });
  const run = () => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  rejects(run, "BOUNDS");
  rejects(run, "TYPE");
  rejects(() => captured!.edgeRegion(region()), "MEASUREMENT_CONTEXT");
});

test("generated edge paint participates in node and path-command output budgets", () => {
  const adapter = defineBlockAdapter({
    name: "edges.budget",
    validate: (input) => input,
    measure(_props, context) {
      const marker = context.edgeRegion(region());
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 10, nodes: [marker] }),
      };
    },
  });
  const extensions = createExtensions([adapter]);
  rejects(
    () => layoutFlow(flow([extension(adapter, {})]), { profile: "service", limits: { pathCommands: 4 } }, extensions),
    "LIMIT",
  );
  const result = layoutFlow(
    flow([extension(adapter, {})]),
    { profile: "service", limits: { pathCommands: 5 } },
    extensions,
  );
  assert.equal(rectangles(result.document.pages[0]!.children).length, 1);
  const repeated = flow(
    Array.from({ length: 6 }, () => extension(adapter, {})),
    { height: 100 },
  );
  rejects(() => layoutFlow(repeated, { profile: "service", limits: { nodes: 29 } }, extensions), "LIMIT");
  assert.equal(layoutFlow(repeated, { profile: "service", limits: { nodes: 30 } }, extensions).pageCount, 1);
});

test("occurrence cloning preserves real marker identity, rebases diagnostics and retains operation ownership", () => {
  const operation = createLayoutOperation({});
  const owned = ownEdgeRegion(region(10, [{ ...top, sourcePath: "/old/row" }]), operation, "/old");
  const marker = edgeRegionNode(owned, operation, "/old");
  const first = instantiateEmissionNodes([marker], { from: "/old", to: "/first" })[0]!;
  const second = instantiateEmissionNodes([marker], { from: "/old", to: "/second" })[0]!;
  assert.notEqual(first, second);
  const report = sharedEdgeEmission(first);
  assert.equal(report?.kind, "region");
  if (report?.kind !== "region") return;
  assert.equal(report.path, "/first");
  assert.equal(report.region.claims[0]?.sourcePath, "/first/row");
  assert.equal(requireEdgeRegion(report.region, operation, "/first"), report.region);
  rejects(() => requireEdgeRegion(report.region, createLayoutOperation({}), "/first"), "TYPE");
  assert.equal(sharedEdgeEmission(marker)?.path, "/old");
});

test("a deferred nested child report is painted locally, not lifted as the reserved region's root", () => {
  const child = defineBlockAdapter({
    name: "edges.buried",
    validate: (input) => input,
    measure(_props, context) {
      const marker = context.edgeRegion(region(4, [{ ...top, coordinate: 4, ownerSide: "bottom" }]));
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 4 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 4, nodes: [marker] }),
      };
    },
  });
  const parent = deferredParent(h(Block, { children: extension(child, {}) }));
  const result = layoutFlow(flow([extension(parent, {})]), {}, createExtensions([parent, child]));
  assert.deepEqual(
    rectangles(result.document.pages[0]!.children).map((node) => (node.type === "rect" ? [node.y, node.height] : [])),
    [
      [3, 1],
      [9, 2],
    ],
  );
});

test("deferred content overflow is rejected without retrying the selected body pagination", () => {
  let calls = 0;
  function TooTall() {
    calls++;
    return h(Paragraph, { children: "too\ntall" });
  }
  const parent = deferredParent(h(TooTall, {}));
  rejects(() => layoutFlow(flow([extension(parent, {})]), {}, createExtensions([parent])), "VERTICAL_OVERFLOW");
  assert.equal(calls, 1);
});

test("deferred participating root clips its content but emits shared paint outside the content clip", () => {
  const child = defineBlockAdapter({
    name: "edges.clipped",
    validate: (input) => input,
    measure(_props, context) {
      const marker = context.edgeRegion({
        ...region(10, [{ ...top, coordinate: 10, ownerSide: "bottom" }]),
        nodes: [
          {
            type: "paintGroup",
            clip: { x: 0, y: 0, width: 5, height: 5 },
            children: [{ type: "rect", x: 0, y: 0, width: 40, height: 40, paint: { fill: [1, 0, 0], stroke: null } }],
          },
        ],
      });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 10, nodes: [marker] }),
      };
    },
  });
  const parent = deferredParent(extension(child, {}));
  const result = layoutFlow(flow([extension(parent, {})]), {}, createExtensions([parent, child]));
  const bands = rectangles(result.document.pages[0]!.children).filter(
    (node) => node.type === "rect" && node.width === 80,
  );
  assert.equal(bands.length, 1);
  assert.deepEqual(
    bands.map((node) => (node.type === "rect" ? [node.y, node.height] : [])),
    [[9, 2]],
  );
  assert.match(JSON.stringify(result.document), /"clip":\{"x":0,"y":0,"width":5,"height":5\}/u);
});

test("a cached fragment callback mints reports with the current occurrence's measurement context", () => {
  let measurements = 0;
  const paths: string[] = [];
  const adapter = defineBlockAdapter({
    name: "edges.callback-origin",
    validate: (input) => input,
    measure(_props, context) {
      measurements++;
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 10 },
        fragment() {
          paths.push(context.sourcePath);
          const marker = context.edgeRegion(region(10, [{ ...top, sourcePath: `${context.sourcePath}/row` }]));
          assert.equal(sharedEdgeEmission(marker)?.path, context.sourcePath);
          return { status: "placed", nextOffset: 1, height: 10, nodes: [marker] };
        },
      };
    },
  });
  const reused = extension(adapter, {});
  const result = layoutFlow(flow([reused, reused]), {}, createExtensions([adapter]));
  assert.equal(measurements, 1);
  assert.deepEqual(paths, ["/body/0", "/body/1"]);
  assert.deepEqual(
    rectangles(result.document.pages[0]!.children).map((node) => (node.type === "rect" ? node.y : -1)),
    [0, 10],
  );
});
