import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { multiply, rectangle } from "@updf/core/internal";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { createExtensions, defineBlockAdapter, extension } from "@updf/layout";
import { prepare } from "../dist/cjs/blocks.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { decorate } from "../dist/cjs/decorated-producer.js";
import { createDecorationPlan } from "../dist/cjs/decorations.js";
import { fragmentGeometry, prepareFragmentPaint, wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { closeMeasuredSources } from "../dist/cjs/measured-source.js";
import { Paginator } from "../dist/cjs/paginator.js";
import type { FragmentChild, PlacedFragment } from "../dist/cjs/protocol.js";
import { resolvePaint } from "../dist/cjs/protocol-runtime.js";
import { template } from "../dist/cjs/template.js";
import { flow } from "./fixtures.js";

const path = "/wrapper";
const request = { offset: 0, width: 10, usedHeight: 0, availableHeight: 100, freshHeight: 100, atFreshRegion: true };
function geometryError(error: unknown): boolean {
  return error instanceof DocumentError && error.diagnostics[0]?.code === "GEOMETRY";
}
function headerAdapter() {
  return defineBlockAdapter({
    name: "wrapper.header",
    validate: () => ({}),
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 10, height: 0.1 },
      next: () => ({ end: 1, height: 0.1, nodes: [] }),
    }),
  });
}
function bodyAdapter(
  sharedEdges: boolean,
  heights: number[],
  deferred: boolean,
  header: ReturnType<typeof headerAdapter>,
  called: () => void,
  beforeHeight: number,
) {
  return defineBlockAdapter({
    name: "wrapper.body",
    validate: () => ({}),
    measure: (_props, context) => ({
      fragmentation: heights.length === 1 ? "atomic" : "splittable",
      extent: heights.length,
      sharedEdges,
      naturalSize: { width: 10, height: heights.reduce((a, b) => a + b, 0) },
      ...(deferred
        ? {
            decorations: context.reserveDecorations([
              { edge: "before", repeat: "all", height: beforeHeight, content: extension(header, {}) },
            ]),
          }
        : {}),
      next: function (query) {
        assert.equal(this, undefined);
        assert.deepEqual(Object.keys(query).sort(), ["extent", "offset", "width"]);
        assert.equal(query.width, 10);
        called();
        const height = heights[query.offset]!;
        return {
          end: query.offset + 1,
          height,
          nodes: heights.length === 1 ? [{ type: "rect", x: 0, y: 0, width: 1, height, paint: { stroke: null } }] : [],
        };
      },
    }),
  });
}
function fixture(sharedEdges: boolean, heights = [1.1], deferred = false, beforeHeight = 0.1) {
  const operation = createDrawingLayoutOperation({});
  const lifetime = { active: true };
  const budget = new OutputBudget(operation.policy);
  let calls = 0;
  const header = headerAdapter();
  const adapter = bodyAdapter(
    sharedEdges,
    heights,
    deferred,
    header,
    () => {
      calls++;
    },
    beforeHeight,
  );
  const following = defineBlockAdapter({
    name: "wrapper.following",
    validate: () => ({}),
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 10, height: 0.05 },
      next: function () {
        assert.equal(this, undefined);
        return {
          end: 1,
          height: 0.05,
          nodes: [{ type: "rect", x: 0, y: 0, width: 1, height: 0.05, paint: { stroke: null } }],
        };
      },
    }),
  });
  const extensions = createExtensions([header, adapter, following]);
  return {
    operation,
    budget,
    body: extension(adapter, {}),
    following: extension(following, {}),
    lifetime,
    calls: () => calls,
    prepare: (input: Parameters<typeof prepare>[0]) => prepare(input, 10, path, operation, extensions, lifetime, 100),
    close: () => {
      lifetime.active = false;
      closeMeasuredSources(lifetime);
      operation.close();
    },
  };
}
function state(paginator: Paginator, budget: OutputBudget) {
  return {
    position: Reflect.get(paginator, "position").value,
    bottom: Reflect.get(paginator, "bottom"),
    placements: [...paginator.placements],
    nodes: paginator.pages.map((page) => [...page.children]),
    budget: budget.totals(),
  };
}
function probes() {
  const require = createRequire(import.meta.url);
  const deferred = require("../dist/cjs/deferred-decoration.js");
  const emissions = require("../dist/cjs/emission-nodes.js");
  const originalIndex = deferred.fragmentIndex,
    originalEmission = emissions.instantiateEmissionNodes;
  const counts = { indices: 0, emissions: 0 };
  deferred.fragmentIndex = (...args: unknown[]) => {
    counts.indices++;
    return originalIndex(...args);
  };
  emissions.instantiateEmissionNodes = (...args: unknown[]) => {
    counts.emissions++;
    return originalEmission(...args);
  };
  return {
    counts,
    close: () => {
      deferred.fragmentIndex = originalIndex;
      emissions.instantiateEmissionNodes = originalEmission;
    },
  };
}
function withProbes(run: (probe: ReturnType<typeof probes>) => void): void {
  const probe = probes();
  try {
    run(probe);
  } finally {
    probe.close();
  }
}

for (const shared of [false, true]) {
  test(`real decorated measured root preserves page bound before deferred index/emission (shared=${shared})`, () => {
    for (const height of [0.6, 0.6000000000000001, 0.7, 1]) {
      const f = fixture(shared, [0.4], true);
      const paginator = new Paginator(
        template(flow([], { width: 10, height }).pageTemplate, f.operation),
        f.operation.policy,
        {
          budget: f.budget,
          reservePage: () => {},
        },
      );
      try {
        paginator.consume(f.prepare({ type: "spacer", height: 0.1 }), 0);
        const source = f.prepare(f.body),
          before = state(paginator, f.budget);
        withProbes((probe) => {
          assert.throws(() => paginator.consume(source, 1, path), geometryError);
          assert.deepEqual(state(paginator, f.budget), before);
          assert.deepEqual(probe.counts, { indices: 0, emissions: 0 });
          assert.equal(f.calls(), 1);
        });
      } finally {
        f.close();
      }
    }
  });

  test(`representable declared reservation keeps unchanged body and following unit disjoint (shared=${shared})`, () => {
    const f = fixture(shared, [0.4], true, 0.10000000000000006);
    const paginator = new Paginator(
      template(flow([], { width: 10, height: 1 }).pageTemplate, f.operation),
      f.operation.policy,
      { budget: f.budget, reservePage: () => {} },
    );
    try {
      paginator.consume(f.prepare({ type: "spacer", height: 0.1 }), 0);
      const source = f.prepare(f.body);
      assert.equal(source.naturalSize.height, 0.5000000000000001);
      withProbes((probe) => {
        paginator.consume(source, 1, path);
        assert.deepEqual(probe.counts, { indices: 1, emissions: 1 });
      });
      const end = rectEnd(paginator.pages[0]!.children);
      assert.equal(end, rectangle(0, 0, 0, 0.4, multiply([1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 0.20000000000000007]))[3]);
      assert.equal(end, 0.6000000000000001);
      assert.equal(Reflect.get(paginator, "position").value, end);
      paginator.consume(f.prepare(f.following), 2, path);
      assert.equal(paginator.placements[2]!.box.y, end);
      assert.equal(rectEnd(paginator.pages[0]!.children), end + 0.05);
      assert.equal(f.calls(), 1);
    } finally {
      f.close();
    }
  });

  test(`real container validates semantic child frame even with empty wrapper parts (shared=${shared})`, () => {
    const f = fixture(shared);
    try {
      for (const height of [2.4, 2.4000000000000004]) {
        const source = f.prepare({
          type: "block",
          style: { height, paddingTop: 0.1 },
          children: [{ type: "spacer", height: 1.2 }, f.body],
        });
        const fragment = source.fragment({ ...request, budget: f.budget.fork() })!;
        const before = f.budget.totals();
        withProbes((probe) => {
          if (height === 2.4) {
            assert.throws(() => prepareFragmentPaint(fragment, { x: 0, y: 0 }, f.budget, path), geometryError);
            assert.deepEqual(probe.counts, { indices: 0, emissions: 0 });
            assert.deepEqual(f.budget.totals(), before);
          } else {
            const prepared = prepareFragmentPaint(fragment, { x: 0, y: 0 }, f.budget, path);
            assert.equal(rectEnd(resolvePaint(prepared.root)), 2.4000000000000004);
            assert.equal(probe.counts.emissions, 1);
          }
        });
      }
    } finally {
      f.close();
    }
  });

  test(`authentic ill-conditioned measured units retain explicit hidden clip (shared=${shared})`, () => {
    const f = fixture(shared, [1e20, 30000, 30000, 30000]);
    try {
      const source = f.prepare({ type: "block", style: { height: 10, overflow: "hidden" }, children: [f.body] });
      const fragment = source.fragment({ ...request, budget: f.budget.fork() })!;
      const prepared = prepareFragmentPaint(fragment, { x: 0, y: 0 }, f.budget, path);
      assert.deepEqual(clips(resolvePaint(prepared.root)), [{ x: 0, y: 0, width: 10, height: 10 }]);
      assert.equal(f.calls(), 4);
    } finally {
      f.close();
    }
  });

  test(`local container rebasing preserves external page reservation (shared=${shared})`, () => {
    for (const height of [0.6, 1]) {
      const f = fixture(shared, [0.3]);
      const paginator = new Paginator(
        template(flow([], { width: 10, height }).pageTemplate, f.operation),
        f.operation.policy,
        { budget: f.budget, reservePage: () => {} },
      );
      try {
        paginator.consume(f.prepare({ type: "spacer", height: 0.1 }), 0);
        const source = f.prepare({
          type: "block",
          style: { height: height === 1 ? 0.5000000000000001 : 0.5, paddingTop: 0.2 },
          children: [f.body],
        });
        const before = state(paginator, f.budget);
        withProbes((probe) => {
          if (height === 0.6) {
            assert.throws(() => paginator.consume(source, 1, path), geometryError);
            assert.deepEqual(state(paginator, f.budget), before);
            assert.deepEqual(probe.counts, { indices: 0, emissions: 0 });
          } else {
            paginator.consume(source, 1, path);
            assert.equal(rectEnd(paginator.pages[0]!.children), 0.6000000000000001);
            assert.equal(probe.counts.emissions, 1);
          }
        });
      } finally {
        f.close();
      }
    }
  });

  test(`outer hidden does not override an inner local explicit overflow:error (shared=${shared})`, () => {
    const f = fixture(shared);
    try {
      const inner = {
        type: "block" as const,
        style: { height: 2.4, paddingTop: 0.1, overflow: "error" as const },
        children: [{ type: "spacer" as const, height: 1.2 }, f.body],
      };
      const source = f.prepare({ type: "block", style: { height: 10, overflow: "hidden" }, children: [inner] });
      const fragment = source.fragment({ ...request, budget: f.budget.fork() })!;
      assert.throws(() => prepareFragmentPaint(fragment, { x: 0, y: 0 }, f.budget, path), geometryError);
    } finally {
      f.close();
    }
  });
}

function clips(nodes: readonly NodeDefinition[]): unknown[] {
  return nodes.flatMap((node) =>
    node.type === "paintGroup" ? [...(node.clip ? [node.clip] : []), ...clips(node.children)] : [],
  );
}
function rectEnd(nodes: readonly NodeDefinition[]): number {
  const identity = [1, 0, 0, 1, 0, 0] as const;
  const stack = nodes.map((node) => ({ node, matrix: identity as Parameters<typeof multiply>[0] }));
  let end = 0;
  while (stack.length) {
    const { node, matrix } = stack.pop()!;
    if (node.type === "rect") end = Math.max(end, rectangle(node.x, node.y, node.width, node.height, matrix)[3]);
    if (node.type !== "paintGroup") continue;
    const incoming = multiply(matrix, node.transform ?? identity);
    for (const child of node.children) stack.push({ node: child, matrix: incoming });
  }
  return end;
}

test("decoration around shared-edge inside container retains each immediate reservation", () => {
  const f = fixture(true);
  try {
    const source = f.prepare({
      type: "block",
      style: { height: 2.4, paddingTop: 0.1 },
      decorations: createDecorationPlan([{ edge: "before", repeat: "all", height: 0.1, nodes: [] }]),
      children: [{ type: "spacer", height: 1.2 }, f.body],
    });
    const fragment = source.fragment({ ...request, budget: f.budget.fork() })!;
    assert.throws(() => prepareFragmentPaint(fragment, { x: 0, y: 0 }, f.budget, path), geometryError);
    const wrapped = decorate(
      f.prepare(f.body),
      createDecorationPlan([{ edge: "before", repeat: "all", height: 0.1, nodes: [] }]),
      f.operation,
      path,
    );
    const good = wrapped.fragment({ ...request, budget: f.budget.fork() })!;
    assert.equal(
      rectEnd(resolvePaint(prepareFragmentPaint(good, { x: 0, y: 0 }, f.budget, path).root)),
      1.2000000000000002,
    );
  } finally {
    f.close();
  }
});

test("generic empty wrappers cannot omit semantic frame containment or use unknown frames", () => {
  const f = fixture(false);
  let paints = 0;
  const leaf: PlacedFragment = {
    nextOffset: 1,
    height: 1.1,
    geometry: wholeBoxGeometry(1.1),
    paint: () => {
      paints++;
      return [];
    },
  };
  const wrapper: PlacedFragment = {
    ...leaf,
    geometry: fragmentGeometry([], [{ fragment: leaf, x: 0, y: 0, frame: "zero" }]),
  };
  try {
    assert.equal(fragmentGeometry().association, "translated-box");
    for (const association of ["unknown", null]) {
      assert.throws(() => fragmentGeometry([], [], [], association as never), geometryError);
      const invalid = { ...leaf, geometry: { ...leaf.geometry, association: association as never } };
      assert.throws(() => prepareFragmentPaint(invalid, { x: 0, y: 0 }, f.budget, path), geometryError);
    }
    for (const frame of ["local", "relative", "unknown"] as const) {
      const relation = { fragment: wrapper, x: 0, y: 1.3, frame } as FragmentChild;
      const root = { ...leaf, height: 2.4, geometry: fragmentGeometry([], [relation]) };
      assert.throws(() => prepareFragmentPaint(root, { x: 0, y: 0 }, f.budget, path), geometryError);
    }
    assert.equal(paints, 0);
  } finally {
    f.close();
  }
});
