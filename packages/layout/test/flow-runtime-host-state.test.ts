import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { policy } from "@updf/core/internal";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { createDecorationPlan, createExtensions, defineBlockAdapter, extension } from "@updf/layout";
import { layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { derivedAxis } from "../dist/cjs/axis.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { decorate } from "../dist/cjs/decorated-producer.js";
import { FragmentState } from "../dist/cjs/fragment-state.js";
import { Paginator } from "../dist/cjs/paginator.js";
import { resolveFragment } from "../dist/cjs/protocol-runtime.js";
import { rowProducer } from "../dist/cjs/row-producer.js";
import { sizing } from "../dist/cjs/sizing.js";
import { selectStackSteps, stack } from "../dist/cjs/stack.js";
import { fragment, marker, producer, request } from "./flow-runtime-fixtures.js";
import { fixed, flow } from "./fixtures.js";

function paginator(budget: OutputBudget, reservePage = () => {}) {
  return new Paginator(
    {
      template: { width: 100, height: 40, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
      body: { x: 0, y: 0, width: 100, height: 40 },
      horizontal: derivedAxis(0, 100, ""),
      vertical: derivedAxis(0, 40, ""),
      footerY: 40,
      regionWork: [0, 0],
    },
    policy(),
    { budget, reservePage },
  );
}

test("atomic extension returned height is preserved even when it differs from the measured natural height", () => {
  const adapter = defineBlockAdapter({
    name: "flow-runtime.atomic-height",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 100, height: 35 },
      fragment: () => ({ status: "placed", nextOffset: 1, height: 10, nodes: [fixed("ATOMIC")] }),
    }),
  });
  const result = layoutFlow(
    flow([extension(adapter, {}), { type: "spacer", height: 30 }]),
    {},
    createExtensions([adapter]),
  );
  assert.equal(result.pageCount, 1);
  assert.deepEqual(
    result.placements.map((p) => [p.box.y, p.box.height]),
    [
      [0, 10],
      [10, 30],
    ],
  );
});

test("accepted advance happens after nodes, placement, offset and state publication", (t) => {
  const trace: string[] = [],
    owner = {},
    original = FragmentState.prototype.adopt;
  t.mock.method(FragmentState.prototype, "adopt", function (this: FragmentState, candidate: FragmentState) {
    trace.push(`adopt:${host.placements.length}:${host.pages[host.pageIndex]?.children.length}`);
    original.call(this, candidate);
  });
  const host = paginator(new OutputBudget(policy()), () => {
    trace.push("advance");
  });
  trace.length = 0;
  const item = producer({
    fragmentation: "splittable",
    extent: 2,
    fragment(req) {
      trace.push(`select:${req.offset}`);
      assert.equal(req.usedHeight, 0);
      assert.equal(req.state?.get(owner, 0), req.offset === 0 ? undefined : 1n);
      if (req.offset === 1) {
        assert.equal(host.pageIndex, 1);
        assert.equal(host.pages[0]?.children.length, 1);
        assert.equal(host.placements.length, 1);
      }
      req.state?.set(owner, 0, BigInt(req.offset + 1));
      return fragment({
        nextOffset: req.offset + 1,
        advance: req.offset === 0,
        paint: () => {
          trace.push("paint");
          return [marker(0)];
        },
      });
    },
  });
  host.consume(item, 0);
  assert.deepEqual(trace, ["select:0", "paint", "adopt:1:1", "advance", "select:1", "paint", "adopt:2:1"]);
  assert.deepEqual(
    host.placements.map((p) => [p.pageIndex, p.sourceRange]),
    [
      [0, { start: 0, end: 1 }],
      [1, { start: 1, end: 2 }],
    ],
  );
});

test("Paginator paints on the real budget before state adoption/placement and never adopts the candidate budget", () => {
  const budget = new OutputBudget(policy()),
    host = paginator(budget),
    owner = {},
    trace: unknown[] = [];
  const item = producer({
    fragmentation: "splittable",
    extent: 2,
    naturalSize: { width: 100, height: 35 },
    fragment(req) {
      trace.push(["select", req.offset, req.usedHeight, req.state?.get(owner, 0), budget.totals()]);
      assert.notEqual(req.budget, budget);
      req.budget?.generated(100, 100, 100, 100, "");
      req.state?.set(owner, 0, BigInt(req.offset + 1));
      return fragment({
        height: 10,
        nextOffset: req.offset + 1,
        paint(ctx) {
          assert.equal(ctx.budget, budget);
          assert.equal(host.placements.length, req.offset);
          trace.push(["paint", ctx.y, host.pages[0]?.children.length]);
          ctx.start(0, 10);
          ctx.budget.generated(1, 0, 0, 2, "");
          return [marker(req.offset)];
        },
      });
    },
  });
  host.consume(item, 0);
  assert.deepEqual(trace, [
    ["select", 0, 0, undefined, { nodes: 0, text: 0, commands: 0, work: 0 }],
    ["paint", 0, 0],
    ["select", 1, 10, 1n, { nodes: 1, text: 0, commands: 0, work: 2 }],
    ["paint", 10, 1],
  ]);
  assert.deepEqual(budget.totals(), { nodes: 2, text: 0, commands: 0, work: 4 });
  assert.deepEqual(
    host.placements.map((p) => [p.box.y, p.box.height, p.sourceRange]),
    [
      [0, 10, { start: 0, end: 1 }],
      [10, 10, { start: 1, end: 2 }],
    ],
  );
});

test("paint failure is not retried and does not publish candidate state, nodes or placement", (t) => {
  const budget = new OutputBudget(policy()),
    host = paginator(budget),
    error = {},
    trace: string[] = [];
  const adopt = t.mock.method(FragmentState.prototype, "adopt");
  host.consume(producer({ fragment: () => fragment({ height: 0, paint: () => [] }) }), 0);
  adopt.mock.resetCalls();
  const item = producer({
    fragment(req) {
      trace.push("select");
      req.state?.set(item, 0, 1n);
      return fragment({
        paint() {
          trace.push("paint");
          throw error;
        },
      });
    },
  });
  assert.throws(
    () => host.consume(item, 1),
    (actual) => actual === error,
  );
  assert.deepEqual(trace, ["select", "paint"]);
  assert.equal(adopt.mock.callCount(), 0);
  assert.equal(host.pages[0]?.children.length, 0);
  assert.equal(host.placements.length, 1);
});

test("nested stack adopts accepted budget and state before rejecting nonprogress; deferred candidates stay unpublished", () => {
  const state = new FragmentState(),
    budget = new OutputBudget(policy()),
    owner = {};
  const req = request({ state, budget });
  const child = producer({
    fragment(local) {
      local.state?.set(owner, 0, 7n);
      local.budget?.generated(1, 2, 3, 4, "");
      return fragment({ nextOffset: 0 });
    },
  });
  const iterator = selectStackSteps(stack([child], 0, 0, 40, ""), req);
  const call = iterator.next();
  assert.equal(call.done, false);
  if (call.done) throw new Error("missing child");
  const selected = call.value.block.fragment(call.value.request);
  assert.throws(() => iterator.next(selected), DocumentError);
  assert.equal(state.get(owner, 0), 7n);
  assert.deepEqual(budget.totals(), { nodes: 1, text: 2, commands: 3, work: 4 });
  const deferred = selectStackSteps(stack([child], 0, 0, 40, ""), req);
  const trial = deferred.next();
  if (trial.done) throw new Error("missing trial");
  trial.value.request.state?.set(owner, 0, 99n);
  trial.value.request.budget?.reserveWork(100, "");
  assert.deepEqual(deferred.next(undefined), { done: true, value: undefined });
  assert.equal(state.get(owner, 0), 7n);
  assert.equal(budget.totals().work, 4);
});

test("decorations adopt the full candidate snapshot, release discarded last reservations and then reserve ancestors", () => {
  const operation = createDrawingLayoutOperation(textOptions({}));
  const budget = new OutputBudget(policy()),
    state = new FragmentState(),
    owner = {},
    trace: unknown[] = [];
  const base = producer({
    fragmentation: "splittable",
    extent: 2,
    fragment(req) {
      trace.push(["callback", req.availableHeight, req.budget?.totals()]);
      req.state?.set(owner, 0, BigInt(req.availableHeight));
      req.budget?.generated(1, 0, 0, req.availableHeight, "");
      return fragment({ nextOffset: req.availableHeight === 30 ? 1 : 2, height: 20 });
    },
  });
  try {
    const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [fixed("LAST")] }]);
    const decorated = decorate(base, plan, operation, "");
    const result = resolveFragment(
      decorated,
      request({
        budget,
        state,
        reserve: {
          apply(b, s, height) {
            trace.push(["reserve", height, s?.get(owner, 0), b?.totals()]);
            return height;
          },
        },
      }),
    );
    assert.equal(result?.height, 20);
    assert.equal(result?.nextOffset, 1);
    assert.equal(state.get(owner, 0), 30n);
    assert.deepEqual(budget.totals(), { nodes: 1, text: 0, commands: 0, work: 30 });
    assert.deepEqual(trace, [
      ["reserve", 10, undefined, { nodes: 0, text: 0, commands: 0, work: 0 }],
      ["callback", 30, { nodes: 2, text: 4, commands: 0, work: 0 }],
      ["reserve", 0, undefined, { nodes: 0, text: 0, commands: 0, work: 0 }],
      ["callback", 40, { nodes: 0, text: 0, commands: 0, work: 0 }],
      ["reserve", 20, 30n, { nodes: 1, text: 0, commands: 0, work: 30 }],
    ]);
  } finally {
    operation.close();
  }
});

for (const invalid of ["defer", "incomplete", "advance", "height"] as const) {
  test(`Row rejects ${invalid} column before later source siblings`, () => {
    const trace: string[] = [];
    const first = producer({
      extent: 2,
      fragment() {
        trace.push("first");
        return invalid === "defer"
          ? undefined
          : fragment({
              nextOffset: invalid === "incomplete" ? 1 : 2,
              advance: invalid === "advance",
              height: invalid === "height" ? 9 : 10,
            });
      },
    });
    const second = producer({
      fragment() {
        trace.push("second");
        return fragment();
      },
    });
    const row = rowProducer(
      sizing(undefined, 100, ""),
      [first, second],
      {
        height: 10,
        children: [
          { left: 0, top: 0, width: 50, height: 10 },
          { left: 50, top: 0, width: 50, height: 10 },
        ],
      },
      "",
    );
    assert.equal(resolveFragment(row, request({ usedHeight: 35, availableHeight: 5 })), undefined);
    assert.deepEqual(trace, []);
    assert.throws(() => resolveFragment(row, request()), DocumentError);
    assert.deepEqual(trace, ["first"]);
  });
}
