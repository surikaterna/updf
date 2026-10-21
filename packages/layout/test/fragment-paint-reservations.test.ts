import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { DocumentError, type Matrix, type NodeDefinition } from "@updf/core";
import { multiply, rectangle } from "@updf/core/internal";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { createExtensions, defineBlockAdapter, extension } from "@updf/layout";
import { prepare } from "../dist/cjs/blocks.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { fragmentGeometry, prepareFragmentPaint, wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { closeMeasuredSources } from "../dist/cjs/measured-source.js";
import { Paginator } from "../dist/cjs/paginator.js";
import type { FragmentChild, PlacedFragment } from "../dist/cjs/protocol.js";
import { template } from "../dist/cjs/template.js";
import { flow } from "./fixtures.js";

const path = "/reservations";
const identity: Matrix = [1, 0, 0, 1, 0, 0];
function geometryError(error: unknown): boolean {
  return error instanceof DocumentError && error.diagnostics[0]?.code === "GEOMETRY";
}
function adapter(name: string, height: number, sharedEdges: boolean) {
  return defineBlockAdapter({
    name,
    validate: () => ({}),
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      sharedEdges,
      naturalSize: { width: 10, height },
      next: () => ({
        end: 1,
        height,
        nodes: [{ type: "rect", x: 0, y: 0, width: 1, height, paint: { stroke: null } }],
      }),
    }),
  });
}
function fixture(shared: boolean) {
  const operation = createDrawingLayoutOperation({});
  const lifetime = { active: true };
  const budget = new OutputBudget(operation.policy);
  const body = adapter("reservations.body", 1.1, shared);
  const following = adapter("reservations.following", 0.1, false);
  const extensions = createExtensions([body, following]);
  const paginator = new Paginator(
    template(flow([], { width: 10, height: 10 }).pageTemplate, operation),
    operation.policy,
    { budget, reservePage: () => {} },
  );
  return {
    budget,
    paginator,
    body: extension(body, {}),
    following: extension(following, {}),
    prepare: (input: Parameters<typeof prepare>[0]) => prepare(input, 10, path, operation, extensions, lifetime, 10),
    close: () => {
      lifetime.active = false;
      closeMeasuredSources(lifetime);
      operation.close();
    },
  };
}
function source(f: ReturnType<typeof fixture>, height: number, wrappers: number) {
  let inner: Parameters<typeof prepare>[0] = {
    type: "block",
    style: { height, backgroundColor: [1, 0, 0] },
    children: [{ type: "spacer", height: 1.2 }, f.body],
  };
  for (let i = 0; i < wrappers; i++) inner = { type: "block", children: [inner] };
  return f.prepare({ type: "block", style: { height: 10, paddingTop: 0.1 }, children: [inner, f.following] });
}
function state(f: ReturnType<typeof fixture>) {
  return {
    position: Reflect.get(f.paginator, "position").value,
    bottom: Reflect.get(f.paginator, "bottom"),
    placements: [...f.paginator.placements],
    nodes: f.paginator.pages.map((page) => [...page.children]),
    budget: f.budget.totals(),
  };
}
function probes() {
  const require = createRequire(import.meta.url);
  const deferred = require("../dist/cjs/deferred-decoration.js");
  const emissions = require("../dist/cjs/emission-nodes.js");
  const index = deferred.fragmentIndex;
  const emission = emissions.instantiateEmissionNodes;
  const counts = { indices: 0, emissions: 0 };
  deferred.fragmentIndex = (...args: unknown[]) => {
    counts.indices++;
    return index(...args);
  };
  emissions.instantiateEmissionNodes = (...args: unknown[]) => {
    counts.emissions++;
    return emission(...args);
  };
  return {
    counts,
    close: () => {
      deferred.fragmentIndex = index;
      emissions.instantiateEmissionNodes = emission;
    },
  };
}
function nativeRects(nodes: readonly NodeDefinition[]) {
  const stack = nodes.map((node) => ({ node, matrix: identity }));
  const result: { height: number; start: number; end: number }[] = [];
  while (stack.length) {
    const { node, matrix } = stack.pop()!;
    if (node.type === "rect") {
      const bounds = rectangle(node.x, node.y, node.width, node.height, matrix);
      result.push({ height: node.height, start: bounds[1], end: bounds[3] });
    }
    if (node.type !== "paintGroup") continue;
    const incoming = multiply(matrix, node.transform ?? identity);
    for (const child of node.children) stack.push({ node: child, matrix: incoming });
  }
  return result;
}

for (const shared of [false, true]) {
  test(`H1-B retains inner native reservation through 0/1/2 roomy wrappers (shared=${shared})`, () => {
    for (const wrappers of [0, 1, 2]) {
      const f = fixture(shared);
      const probe = probes();
      try {
        const selected = source(f, 2.3, wrappers);
        const before = state(f);
        assert.throws(() => f.paginator.consume(selected, 0, path), geometryError);
        assert.deepEqual(state(f), before);
        assert.deepEqual(probe.counts, { indices: 0, emissions: 0 });
      } finally {
        probe.close();
        f.close();
      }
    }
  });

  test(`H1-B representable neighbor preserves native body height and following start (shared=${shared})`, () => {
    for (const wrappers of [0, 1, 2]) {
      const f = fixture(shared);
      try {
        f.paginator.consume(source(f, 2.3000000000000003, wrappers), 0, path);
        const rectangles = nativeRects(f.paginator.pages[0]!.children);
        const inner = rectangles.find((rect) => rect.height === 2.3000000000000003)!;
        const body = rectangles.find((rect) => rect.height === 1.1)!;
        const following = rectangles.find((rect) => rect.height === 0.1)!;
        assert.equal(inner.start, 0.1);
        assert.equal(inner.end, 2.4000000000000004);
        assert.equal(body.start, 1.3);
        assert.equal(body.end, inner.end);
        assert.equal(following.start, body.end);
        assert.equal(body.height, 1.1);
      } finally {
        f.close();
      }
    }
  });
}

function declared(height: number, children: readonly FragmentChild[] = []): PlacedFragment {
  return { height, nextOffset: 1, geometry: fragmentGeometry([], children), paint: () => [] };
}
function child(fragment: PlacedFragment, y: number, frame: FragmentChild["frame"] = "local"): FragmentChild {
  return { fragment, x: 0, y, frame };
}
function internal(run: (budget: OutputBudget) => void) {
  const f = fixture(false);
  try {
    run(f.budget);
  } finally {
    f.close();
  }
}

test("relation bounds project authored lower and upper endpoints without height reconstruction", () => {
  internal((budget) => {
    const incoming = multiply(identity, [1, 0, 0, 1, 0, 0.1]);
    const start = rectangle(0, 0.1 + 1.1, 0, 0, incoming)[1];
    assert.equal(start, 1.3000000000000003);
    assert.equal(rectangle(0, 1.2, 0, 0, incoming)[1], 1.3);
    for (const y of [1.1, 1.1000000000000003]) {
      const relation = { ...child(declared(0), y, "local"), bounds: { start: 1.1000000000000003, end: 2 } };
      const root = declared(10, [child(declared(5, [relation]), 0.1)]);
      if (y === 1.1) assert.throws(() => prepareFragmentPaint(root, { x: 0, y: 0.1 }, budget, path), geometryError);
      else assert.doesNotThrow(() => prepareFragmentPaint(root, { x: 0, y: 0.1 }, budget, path));
    }
    const end = 0.29;
    const leaf = { ...declared(0), geometry: wholeBoxGeometry(0) };
    const relation = { ...child(leaf, end), bounds: { start: 0.03, end } };
    const root = declared(10, [relation]);
    assert.doesNotThrow(() => prepareFragmentPaint(root, { x: 0, y: 0 }, budget, path));
    assert.notEqual(0.03 + (end - 0.03), end);
  });
});

test("explicit relation endpoints constrain descendant parts after transparent rebasing", () => {
  internal((budget) => {
    const leaf = { ...declared(1.1), geometry: wholeBoxGeometry(1.1) };
    const middle = declared(2.3, [child(leaf, 1.2)]);
    const bounded = { ...child(middle, 0.1), bounds: { start: 0.1, end: 2.4 } };
    const root = declared(10, [bounded]);
    assert.equal(rectangle(0, 0, 0, 1.1, multiply(identity, [1, 0, 0, 1, 0, 1.3]))[3], 2.4000000000000004);
    assert.throws(() => prepareFragmentPaint(root, { x: 0, y: 0 }, budget, path), geometryError);
  });
});

test("natural root is unbounded but declared descendants still constrain their own parts", () => {
  internal((budget) => {
    const root = { ...declared(0.1), geometry: wholeBoxGeometry(1) };
    assert.doesNotThrow(() => prepareFragmentPaint(root, { x: 0, y: 0 }, budget, path));
    const leaf = { ...declared(0.1), geometry: wholeBoxGeometry(1) };
    const invalid = declared(10, [child(leaf, 0)]);
    assert.throws(() => prepareFragmentPaint(invalid, { x: 0, y: 0 }, budget, path), geometryError);
  });
});

test("hidden local policy reset excludes outer clip reservation but retains inner and relation bounds", () => {
  internal((budget) => {
    const inner = declared(5, [child(declared(1), 4)]);
    const clipped = declared(1, [child(inner, 0)]);
    const root = declared(10, [{ ...child(clipped, 0), hidden: true }]);
    assert.doesNotThrow(() => prepareFragmentPaint(root, { x: 0, y: 0 }, budget, path));
    const invalid = declared(5, [child(declared(1.1), 4)]);
    const reset = declared(1, [child(invalid, 0)]);
    assert.throws(
      () => prepareFragmentPaint(declared(10, [{ ...child(reset, 0), hidden: true }]), { x: 0, y: 0 }, budget, path),
      geometryError,
    );
    const bounded = declared(1, [{ ...child(inner, 0), bounds: { start: 0, end: 4 } }]);
    assert.throws(
      () => prepareFragmentPaint(declared(10, [{ ...child(bounded, 0), hidden: true }]), { x: 0, y: 0 }, budget, path),
      geometryError,
    );
  });
});
