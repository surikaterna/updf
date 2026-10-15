import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { Paginator } from "../dist/cjs/paginator.js";
import type { PreparedBlock } from "../dist/cjs/protocol.js";
import { template } from "../dist/cjs/template.js";
import { flow } from "./fixtures.js";

function setup(top = 0, height = 5, nodes = 10) {
  const operation = createLayoutOperation({ limits: { nodes } });
  const geometry = template(
    flow([], { height: top + height, margins: { top, right: 0, bottom: 0, left: 0 } }).pageTemplate,
    operation,
  );
  const budget = new OutputBudget(operation.policy);
  const paginator = new Paginator(geometry, operation.policy, { budget, reservePage: () => {} });
  return { paginator, budget };
}

test("paginator paint and recorded origins agree across translation, alignment, zero height and controls", () => {
  for (const top of [0, 700]) {
    const { paginator } = setup(top, 40);
    const painted: number[] = [];
    const block = (height: number, autoMargin = false): PreparedBlock => ({
      fragmentation: "atomic",
      naturalSize: { width: 37, height },
      extent: 1,
      x: 3,
      autoMargin,
      sourceKeys: ["key"],
      sourcePaths: ["/child"],
      fragment: () => ({
        nextOffset: 1,
        height,
        paint: ({ y }) => {
          painted.push(y);
          return [];
        },
      }),
    });
    const control: PreparedBlock = { ...block(0), control: "advance" };
    paginator.consume(control, 0, "/custom/before");
    paginator.consume(block(1.2), 1, "/custom/one");
    paginator.consume(block(1.1), 2, "/custom/two");
    paginator.consume(block(0, true), 3, "/custom/zero");
    paginator.consume(control, 4, "/custom/after");
    paginator.consume(block(0.1), 5, "/custom/last");
    const result = paginator.result(6);
    assert.deepEqual(painted, [top, top + 1.2, top + 40, top]);
    assert.deepEqual(
      result.placements.filter((p) => p.sourceKeys).map((p) => p.box.y),
      painted,
    );
    assert.deepEqual(
      result.placements.map((p) => p.pageIndex),
      [0, 1, 1, 1, 1, 2],
    );
    assert.deepEqual(
      result.placements.map((p) => p.sourcePath),
      ["/body/0", "/custom/one", "/custom/two", "/custom/zero", "/body/4", "/custom/last"],
    );
    const placement = result.placements[2];
    assert.deepEqual(placement?.box, { x: 3, y: top + 1.2, width: 37, height: 1.1 });
    assert.deepEqual(placement?.sourceRange, { start: 0, end: 1 });
    assert.deepEqual(placement?.sourceKeys, ["key"]);
  }
});

test("paginator publishes placement and continuation only after paint and charges the live budget once", () => {
  const { paginator, budget } = setup();
  const owner = {};
  const trace: unknown[] = [];
  const block: PreparedBlock = {
    fragmentation: "splittable",
    naturalSize: { width: 37, height: 2.3 },
    extent: 2,
    fragment: (request) => {
      trace.push(["select", request.offset, request.usedHeight, request.state?.get(owner, 0), budget.totals().nodes]);
      request.state?.set(owner, 0, BigInt(request.offset + 1));
      request.budget?.generated(1, 0, 0, 0, "/select");
      return {
        nextOffset: request.offset + 1,
        height: 1.1,
        lines: { start: request.offset, end: request.offset + 1 },
        paint: (context) => {
          trace.push(["paint", context.y, paginator.placements.length, budget.totals().nodes]);
          assert.equal(context.start(0, 1.1), context.y);
          context.budget.generated(1, 0, 0, 0, "/paint");
          return [];
        },
      };
    },
  };
  paginator.consume(block, 0, "/source");
  assert.deepEqual(trace, [
    ["select", 0, 0, undefined, 0],
    ["paint", 0, 0, 0],
    ["select", 1, 1.1, 1n, 1],
    ["paint", 1.1, 1, 1],
  ]);
  assert.equal(budget.totals().nodes, 2);
  assert.deepEqual(
    paginator.placements.map((p) => [p.sourceRange, p.lines]),
    [
      [
        { start: 0, end: 1 },
        { start: 0, end: 1 },
      ],
      [
        { start: 1, end: 2 },
        { start: 1, end: 2 },
      ],
    ],
  );
});

test("paginator paint failures do not retry, record placement or publish returned nodes", () => {
  for (const quotaFailure of [false, true]) {
    const { paginator, budget } = setup(0, 5, 1);
    const trace: string[] = [];
    const sentinel = new Error("paint failed");
    const block: PreparedBlock = {
      fragmentation: "atomic",
      naturalSize: { width: 37, height: 1 },
      extent: 1,
      fragment: () => {
        trace.push("select");
        return {
          nextOffset: 1,
          height: 1,
          paint: (context) => {
            trace.push("paint");
            if (quotaFailure) context.budget.generated(2, 0, 0, 0, "/paint/quota");
            throw sentinel;
          },
        };
      },
    };
    assert.throws(
      () => paginator.consume(block, 0),
      (error: unknown) =>
        quotaFailure
          ? error instanceof DocumentError &&
            error.diagnostics[0]?.code === "LIMIT" &&
            error.diagnostics[0]?.path === "/paint/quota"
          : error === sentinel,
    );
    assert.deepEqual(trace, ["select", "paint"]);
    assert.equal(paginator.placements.length, 0);
    assert.equal(paginator.pages.length, 1);
    assert.deepEqual(paginator.pages[0]?.children, []);
    assert.equal(budget.totals().nodes, quotaFailure ? 2 : 0);
  }
});

test("paginator fresh deferrals retain source suffix diagnostics before paint", () => {
  const { paginator } = setup();
  let calls = 0;
  const block: PreparedBlock = {
    fragmentation: "atomic",
    naturalSize: { width: 37, height: 6 },
    extent: 1,
    sourcePaths: ["/child"],
    fragment: () => {
      calls++;
      return undefined;
    },
  };
  assert.throws(
    () => paginator.consume(block, 7, "/custom/source"),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "LAYOUT_OVERSIZED" &&
      error.diagnostics[0]?.path === "/custom/source/child",
  );
  assert.equal(calls, 1);
  assert.equal(paginator.placements.length, 0);
});
