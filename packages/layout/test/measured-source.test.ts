import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import type { BlockUnitRequest, MeasuredBlock } from "@updf/layout";
import { fragmentDefaults } from "@updf/layout-boxes/fragmentation";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import type { ExtensionLifetime } from "../dist/cjs/extension-producer.js";
import { FragmentState } from "../dist/cjs/fragment-state.js";
import { closeMeasuredSources, measuredSource } from "../dist/cjs/measured-source.js";

const request = { offset: 0, width: 80, usedHeight: 0, availableHeight: 2, freshHeight: 2, atFreshRegion: true };
const rect: NodeDefinition = { type: "rect", x: 0, y: 0, width: 1, height: 1, paint: { stroke: null } };
function fixture(next: MeasuredBlock["next"], extent = 3, nodes = 1000) {
  const operation = createLayoutOperation({ limits: { nodes } });
  const lifetime: ExtensionLifetime = { active: true };
  const measured: MeasuredBlock = {
    next,
    extent,
    naturalSize: { width: 80, height: 999 },
    fragmentation: extent === 1 ? "atomic" : "splittable",
  };
  const source = measuredSource(measured, 80, "/one", operation, { path: "/origin" }, lifetime);
  return {
    operation,
    lifetime,
    measured,
    source,
    close() {
      lifetime.active = false;
      closeMeasuredSources(lifetime);
      operation.close();
    },
  };
}
function code(expected: string) {
  return (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === expected;
}
test("bridge invokes an unbound strict next without an engine receiver, including after close", () => {
  const receivers: unknown[] = [];
  const f = fixture(function (this: unknown, query) {
    receivers.push(this);
    assert.equal(this, undefined);
    assert.ok(Object.isFrozen(query));
    assert.deepEqual(Object.keys(query).sort(), ["extent", "offset", "width"]);
    return { end: query.offset + 1, height: 1, nodes: [] };
  });
  try {
    assert.equal(f.source(request)?.nextOffset, 2);
    assert.equal(receivers.length, 3);
  } finally {
    f.close();
  }
  assert.deepEqual(receivers, [undefined, undefined, undefined]);
});
test("identical frozen three-field queries select different prefixes with no capacity disclosure", () => {
  const queries: BlockUnitRequest[] = [];
  const f = fixture((query) => {
    assert.ok(Object.isFrozen(query));
    assert.deepEqual(Object.keys(query).sort(), ["extent", "offset", "width"]);
    queries.push(query);
    return { end: query.offset + 1, height: 1, nodes: [] };
  });
  try {
    assert.equal(f.source(request)?.nextOffset, 2);
    assert.equal(f.source({ ...request, freshHeight: 1 })?.nextOffset, 1);
    assert.deepEqual(queries.slice(0, 2), queries.slice(3));
    assert.equal(queries[0]?.extent, 3);
  } finally {
    f.close();
  }
});
test("exact fixed width mismatch precedes callbacks and poisons the shared operation", () => {
  let calls = 0;
  const f = fixture(() => {
    calls++;
    return { end: 1, height: 1, nodes: [] };
  }, 1);
  try {
    assert.throws(() => f.source({ ...request, width: 80 + Number.EPSILON * 80 }), code("VALUE"));
    assert.equal(calls, 0);
    assert.throws(() => f.source(request));
    assert.equal(f.lifetime.measuredSources!.operation.counts().attempts, 1);
  } finally {
    f.close();
  }
});
test("only selected prefix budget and reservation state are adopted, lookahead work never rolls back", () => {
  const owner = {};
  const f = fixture((query) => ({ end: query.offset + 1, height: 1, nodes: [rect] }));
  const budget = new OutputBudget(f.operation.policy),
    state = new FragmentState();
  const reserve = {
    apply: (_budget: unknown, fork: FragmentState | undefined, height: number) => {
      fork?.set(owner, 0, BigInt(height));
      return height;
    },
  };
  try {
    const selected = f.source({ ...request, budget, state, reserve })!;
    assert.equal(selected.nextOffset, 2);
    assert.equal(budget.totals().nodes, 4);
    assert.equal(state.get(owner, 0), 2n);
    assert.equal(f.lifetime.measuredSources!.operation.counts().providerUnits, 3);
    const actual = new OutputBudget(f.operation.policy);
    actual.charge(paintPrepared(selected, new OutputBudget(f.operation.policy)), "/paint");
    assert.equal(actual.totals().nodes, 4);
    const before = budget.totals();
    assert.equal(f.source({ ...request, freshHeight: 0, budget, state, reserve }), undefined);
    assert.deepEqual(budget.totals(), before);
    assert.equal(state.get(owner, 0), 2n);
    assert.equal(f.lifetime.measuredSources!.operation.counts().providerUnits, 4);
  } finally {
    f.close();
  }
});
test("later callbacks cannot mutate a prior selected snapshot", () => {
  const node = { ...rect };
  const f = fixture((query) => {
    if (query.offset) node.width = 2;
    return { end: query.offset + 1, height: 1, nodes: [node] };
  });
  try {
    const selected = f.source({ ...request, freshHeight: 1 })!;
    const output = paintPrepared(selected, new OutputBudget(f.operation.policy));
    assert.equal(output[0]?.type, "paintGroup");
    if (output[0]?.type === "paintGroup") assert.equal(Reflect.get(output[0].children[0]!, "width"), 1);
  } finally {
    f.close();
  }
});
test("eager rejected lookahead may exhaust quota and must not adopt even its fitting prefix", () => {
  const f = fixture((query) => ({ end: query.offset + 1, height: 1, nodes: [rect] }), 3, 3);
  const budget = new OutputBudget(f.operation.policy);
  try {
    assert.throws(() => f.source({ ...request, freshHeight: 1, budget }), code("LIMIT"));
    assert.equal(budget.totals().nodes, 0);
    assert.equal(f.lifetime.measuredSources!.operation.counts().measurements, 2);
  } finally {
    f.close();
  }
});
test("empty zero-height units make frozen-query progress without consuming height", () => {
  const offsets: number[] = [];
  const f = fixture((query) => {
    assert.ok(Object.isFrozen(query));
    offsets.push(query.offset);
    return { end: query.offset + 1, height: 0, nodes: [] };
  });
  try {
    const selected = f.source({ ...request, freshHeight: 0 })!;
    assert.equal(selected.nextOffset, 3);
    assert.equal(selected.height, 0);
    assert.deepEqual(offsets, [0, 1, 2]);
    assert.deepEqual(paintPrepared(selected, new OutputBudget(f.operation.policy)), []);
    assert.equal(f.lifetime.measuredSources!.operation.counts().providerUnits, 3);
  } finally {
    f.close();
  }
});
test("nonempty zero-height native payload fails geometry before emission, even empty groups", () => {
  let calls = 0;
  const f = fixture(() => {
    calls++;
    return { end: 1, height: 0, nodes: [{ type: "paintGroup", children: [] }] };
  }, 1);
  const budget = new OutputBudget(f.operation.policy);
  try {
    assert.throws(() => f.source({ ...request, budget }), code("GEOMETRY"));
    assert.equal(calls, 1);
    assert.equal(budget.totals().nodes, 0);
  } finally {
    f.close();
  }
});
test("positive-height node-heavy units exhaust generated budget before further snapshotting", () => {
  let calls = 0,
    descriptors = 0,
    beforeThird = 0;
  const nodes = new Proxy(Array<NodeDefinition>(8).fill({ type: "paintGroup", children: [] }), {
    getOwnPropertyDescriptor(target, key) {
      descriptors++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const f = fixture(
    (query) => {
      calls++;
      if (calls === 3) beforeThird = descriptors;
      return { end: query.offset + 1, height: 1, nodes };
    },
    3,
    20,
  );
  const budget = new OutputBudget(f.operation.policy);
  try {
    assert.throws(
      () => f.source({ ...request, freshHeight: 100, budget }),
      (error) => code("LIMIT")(error) && /Generated nodes/.test((error as Error).message),
    );
    assert.equal(calls, 3);
    assert.equal(descriptors - beforeThird, 3);
    assert.equal(budget.totals().nodes, 0);
  } finally {
    f.close();
  }
  for (const [extent, limit] of [
    [2, 20],
    [3, 1000],
  ] as const) {
    const control = fixture((query) => ({ end: query.offset + 1, height: 1, nodes }), extent, limit);
    const admitted = new OutputBudget(control.operation.policy);
    try {
      assert.equal(control.source({ ...request, freshHeight: 100, budget: admitted })?.nextOffset, extent);
      assert.equal(admitted.totals().nodes, extent * 9);
    } finally {
      control.close();
    }
  }
});
test("finite defaults are shared across occurrences, not reset for each producer", () => {
  let calls = 0;
  const f = fixture(
    () => {
      calls++;
      return { end: 1, height: 0, nodes: [] };
    },
    1,
    fragmentDefaults.attempts + 1,
  );
  const other = measuredSource(f.measured, 80, "/two", f.operation, { path: "/two" }, f.lifetime);
  try {
    for (let i = 0; i < fragmentDefaults.attempts; i++) (i % 2 ? other : f.source)(request);
    assert.throws(() => other(request), code("LIMIT"));
    assert.equal(calls, fragmentDefaults.attempts);
    assert.equal(f.lifetime.measuredSources!.operation.counts().sourceReads, 2);
    closeMeasuredSources(f.lifetime);
    assert.equal(f.lifetime.measuredSources, undefined);
    f.lifetime.active = false;
    assert.throws(() => measuredSource(f.measured, 80, "/closed", f.operation, { path: "/closed" }, f.lifetime));
    assert.throws(() => f.source(request));
    assert.equal(calls, fragmentDefaults.attempts);
  } finally {
    f.close();
  }
});
test("caught reentrancy still poisons, clears attempt binding, and preserves structured callback identity", () => {
  let calls = 0;
  const f = fixture(() => {
    calls++;
    assert.throws(() => f.source(request));
    return { end: 1, height: 0, nodes: [] };
  }, 1);
  try {
    assert.throws(() => f.source(request));
    assert.throws(() => f.source(request));
    assert.equal(calls, 1);
  } finally {
    f.close();
  }
  const original = new DocumentError("VALUE", "/original", "intentional");
  const failed = fixture(() => {
    throw original;
  }, 1);
  try {
    assert.throws(
      () => failed.source(request),
      (error) => error === original,
    );
  } finally {
    failed.close();
  }
});
import { paintPrepared } from "./prepared-paint.js";

test("nested callbacks reuse depth guards and exhaust one finite cumulative attempt ledger", () => {
  let calls = 0;
  const inner: MeasuredBlock = {
    fragmentation: "atomic",
    extent: 1,
    naturalSize: { width: 80, height: 0 },
    next() {
      calls++;
      return { end: 1, height: 0, nodes: [] };
    },
  };
  const f = fixture(
    () => {
      calls++;
      const nested = measuredSource(inner, 80, "/inner", f.operation, { path: "/inner" }, f.lifetime);
      assert.equal(nested(request)?.nextOffset, 1);
      return { end: 1, height: 0, nodes: [] };
    },
    1,
    fragmentDefaults.attempts + 1,
  );
  try {
    for (let i = 0; i < fragmentDefaults.attempts / 2; i++) f.source(request);
    assert.equal(f.lifetime.measuredSources!.operations.length, 2);
    assert.equal(f.lifetime.measuredSources!.operation.counts().attempts, fragmentDefaults.attempts);
    assert.throws(() => f.source(request), code("LIMIT"));
    assert.equal(calls, fragmentDefaults.attempts);
    assert.throws(() => f.source(request));
  } finally {
    f.close();
  }
});
