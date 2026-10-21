import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { OutputBudget } from "../dist/cjs/budget.js";
import { decorate } from "../dist/cjs/decorated-producer.js";
import { createDecorationPlan } from "../dist/cjs/decorations.js";
import { fragmentGeometry, wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { Paginator } from "../dist/cjs/paginator.js";
import type { PlacedFragment, PreparedBlock } from "../dist/cjs/protocol.js";
import { template } from "../dist/cjs/template.js";
import { flow } from "./fixtures.js";

function state(paginator: Paginator, budget: OutputBudget) {
  return {
    position: Reflect.get(paginator, "position").value,
    cursor: Reflect.get(paginator, "cursor"),
    bottom: Reflect.get(paginator, "bottom"),
    placements: [...paginator.placements],
    nodes: paginator.pages.map((page) => [...page.children]),
    budget: budget.totals(),
  };
}
function branch(children: readonly PlacedFragment[]): PlacedFragment {
  return {
    nextOffset: 1,
    height: 2,
    geometry: fragmentGeometry(
      [],
      children.map((fragment) => ({ fragment, x: 0, y: 0, frame: "local" as const })),
    ),
    paint: () => [],
    *paintSteps(context) {
      for (const child of context.children) yield child;
      return [];
    },
  };
}

function fixture() {
  const counts = { paints: 0, selections: 0 };
  const good: PlacedFragment = {
    nextOffset: 1,
    height: 1,
    geometry: wholeBoxGeometry(1),
    paint: () => {
      counts.paints++;
      return [];
    },
  };
  const bad = { ...good, geometry: fragmentGeometry([{ offset: 2, height: 1, reservation: "whole-box" }]) };
  const selected = { fragment: branch([good, branch([bad])]) };
  const source: PreparedBlock = {
    fragmentation: "atomic",
    extent: 1,
    naturalSize: { width: 10, height: 2 },
    fragment(request) {
      counts.selections++;
      request.budget?.generated(1, 0, 0, 3, "/trial");
      return selected.fragment;
    },
  };
  return { counts, selected, source, good };
}
test("failed last descendant leaves paginator, live budget, earlier paint and real fragmentIndex untouched", () => {
  const operation = createDrawingLayoutOperation({});
  const budget = new OutputBudget(operation.policy);
  const paginator = new Paginator(template(flow([], { height: 10 }).pageTemplate, operation), operation.policy, {
    budget,
    reservePage: () => {},
  });
  const deferred = createRequire(import.meta.url)("../dist/cjs/deferred-decoration.js");
  const original = deferred.fragmentIndex;
  let indices = 0;
  deferred.fragmentIndex = (...args: unknown[]) => {
    indices++;
    return original(...args);
  };
  const { source, selected, counts, good } = fixture();
  try {
    const decorated = decorate(
      source,
      createDecorationPlan([{ edge: "before", repeat: "all", height: 0.1, nodes: [] }]),
      operation,
      "/failure",
    );
    const before = state(paginator, budget);
    assert.throws(
      () => paginator.consume(decorated, 0, "/failure"),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === "GEOMETRY" &&
        error.diagnostics[0]?.path === "/failure",
    );
    assert.deepEqual(state(paginator, budget), before);
    assert.equal(counts.selections, 1);
    assert.equal(counts.paints, 0);
    assert.equal(indices, 0);
    selected.fragment = branch([good, branch([good])]);
    paginator.consume(decorated, 0, "/success");
    assert.equal(counts.selections, 2);
    assert.equal(counts.paints, 2);
    assert.equal(indices, 1);
    assert.equal(paginator.placements.length, 1);
  } finally {
    deferred.fragmentIndex = original;
    operation.close();
  }
});
