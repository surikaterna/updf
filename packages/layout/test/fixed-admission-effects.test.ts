import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { OutputBudget } from "../dist/budget.js";
import { prepare } from "../dist/blocks.js";
import { Paginator } from "../dist/paginator.js";
import { template } from "../dist/template.js";
import type { PreparedBlock } from "../dist/protocol.js";
import { flow } from "./fixtures.js";
import { wholeBoxGeometry } from "../dist/fragment-paint-preparation.js";

function setup(limits = {}) {
  const operation = createDrawingLayoutOperation({ profile: "service", limits });
  const geometry = template(flow([], { height: 0.3 }).pageTemplate, operation);
  const budget = new OutputBudget(operation.policy);
  const paginator = new Paginator(geometry, operation.policy, { budget, reservePage: () => {} });
  paginator.consume(prepare({ type: "fixed", height: 0.1, children: [] }, 100, "/first", operation), 0);
  return { operation, paginator, budget };
}

test("refused candidates discard budget/state, retry same offset and paint only accepted coordinates", () => {
  const { operation, paginator, budget } = setup();
  const owner = {};
  const selections: number[] = [],
    paints: number[] = [];
  const candidate: PreparedBlock = {
    fragmentation: "atomic",
    naturalSize: { width: 100, height: 0.2 },
    extent: 1,
    fragment(request) {
      selections.push(request.offset);
      assert.equal(request.state?.get(owner, 0), undefined);
      request.state?.set(owner, 0, 1n);
      request.budget?.generated(1, 2, 3, 4, "/candidate");
      return {
        nextOffset: 1,
        height: 0.2,
        geometry: wholeBoxGeometry(0.2),
        paint(context) {
          paints.push(context.y);
          context.budget.generated(1, 2, 3, 4, "/candidate");
          return [];
        },
      };
    },
  };
  try {
    paginator.consume(candidate, 1, "/candidate");
    assert.deepEqual(selections, [0, 0]);
    assert.deepEqual(paints, [0]);
    // Two accepted whole-box declarations each add one node and one part preparation unit.
    assert.deepEqual(budget.totals(), { nodes: 1, text: 2, commands: 3, work: 8 });
    assert.equal(paginator.placements[1]?.box.y, paints[0]);
    assert.equal(paginator.result(2).pageCount, 2);
  } finally {
    operation.close();
  }
});

test("candidate quotas and validation errors precede native admission, never paint or advance", () => {
  for (const [limits, counts] of [
    [{ nodes: 10 }, [11, 0, 0, 0]],
    [{ textCodePoints: 10 }, [0, 11, 0, 0]],
    [{ pathCommands: 10 }, [0, 0, 11, 0]],
    [{}, [0, 0, 0, Number.MAX_SAFE_INTEGER + 1]],
  ] as const) {
    const { operation, paginator } = setup(limits);
    let paints = 0;
    const candidate: PreparedBlock = {
      fragmentation: "atomic" as const,
      naturalSize: { width: 100, height: 0.2 },
      extent: 1,
      fragment(request) {
        request.budget?.generated(counts[0], counts[1], counts[2], counts[3], "/candidate");
        return {
          nextOffset: 1,
          height: 0.2,
          geometry: wholeBoxGeometry(0.2),
          paint: () => {
            paints++;
            return [];
          },
        };
      },
    };
    try {
      assert.throws(
        () => paginator.consume(candidate, 1),
        (error: unknown) =>
          error instanceof DocumentError &&
          error.diagnostics[0]?.code === "LIMIT" &&
          error.diagnostics[0]?.path === "/candidate",
      );
      assert.equal(paints, 0);
      assert.equal(paginator.pages.length, 1);
    } finally {
      operation.close();
    }
  }
});

test("split roots may choose a different fresh prefix without adopting refused source progress", () => {
  const { operation, paginator } = setup();
  const offsets: number[] = [];
  const paints: number[] = [];
  const candidate: PreparedBlock = {
    fragmentation: "splittable",
    naturalSize: { width: 100, height: 10 },
    extent: 3,
    fragment(request) {
      assert.ok(request.mode !== "complete", "paginator requests a bounded region");
      offsets.push(request.offset);
      return {
        nextOffset: request.atFreshRegion ? 2 : request.offset + 1,
        height: request.offset === 2 ? 0 : 0.2,
        geometry: wholeBoxGeometry(request.offset === 2 ? 0 : 0.2),
        paint: (context) => {
          paints.push(context.y);
          return [];
        },
      };
    },
  };
  try {
    paginator.consume(candidate, 1);
    assert.deepEqual(offsets, [0, 0, 2]);
    assert.deepEqual(paints, [0, 0.2]);
    assert.deepEqual(
      paginator.placements.slice(1).map((p) => p.sourceRange),
      [
        { start: 0, end: 2 },
        { start: 2, end: 3 },
      ],
    );
  } finally {
    operation.close();
  }
});

test("invalid fragment progress and height preserve errors before retry", () => {
  for (const [nextOffset, height, code] of [
    [0, 0.2, "TYPE"],
    [1, NaN, "GEOMETRY"],
    [1, -1, "GEOMETRY"],
    [1, 2, "GEOMETRY"],
  ] as const) {
    const { operation, paginator } = setup();
    try {
      const candidate: PreparedBlock = {
        fragmentation: "atomic" as const,
        naturalSize: { width: 100, height: 0.2 },
        extent: 1,
        fragment: () => ({
          nextOffset,
          height,
          geometry: wholeBoxGeometry(height),
          paint: () => assert.fail("Must not paint"),
        }),
      };
      assert.throws(
        () => paginator.consume(candidate, 1),
        (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code,
      );
      assert.equal(paginator.pages.length, 1);
    } finally {
      operation.close();
    }
  }
});

test("page quota applies to recovery and paint exceptions propagate by identity without retry", () => {
  const { operation, paginator } = setup({ pages: 1 });
  try {
    const fixed = prepare({ type: "fixed", height: 0.2, children: [] }, 100, "/fixed", operation);
    assert.throws(
      () => paginator.consume(fixed, 1, "/fixed"),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === "LIMIT" &&
        error.diagnostics[0]?.path === "/fixed",
    );
  } finally {
    operation.close();
  }
  const next = setup();
  const sentinel = new Error("paint failed");
  let paints = 0;
  try {
    const candidate: PreparedBlock = {
      fragmentation: "atomic" as const,
      naturalSize: { width: 100, height: 0.2 },
      extent: 1,
      fragment: () => ({
        nextOffset: 1,
        height: 0.2,
        geometry: wholeBoxGeometry(0.2),
        paint: () => {
          paints++;
          throw sentinel;
        },
      }),
    };
    assert.throws(
      () => next.paginator.consume(candidate, 1),
      (error) => error === sentinel,
    );
    assert.equal(paints, 1);
    assert.equal(next.paginator.pages.length, 2);
    assert.equal(next.paginator.placements.length, 1);
  } finally {
    next.operation.close();
  }
});
