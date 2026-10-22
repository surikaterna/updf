import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createLayoutOperation, snapshotData } from "@updf/core/internal";
import type { TextService } from "@updf/core/resources";
import { compositionOptions } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

const input = () => ({ ...rectangular("AB"), maxHeight: 100 });
function terminals() {
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  try {
    const node = operation.composedText(operation.composeText(input(), "/seed"), "/seed");
    if (node.type !== "preparedText") assert.fail("Expected preparedText");
    return [options.resources!.Helvetica, node.payload];
  } finally {
    operation.close();
  }
}
function limit(invoke: () => unknown) {
  assert.throws(invoke, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT");
}
function observed<T extends object>(value: T) {
  let reads = 0;
  return {
    value: new Proxy(value, {
      get(target, key, receiver) {
        reads++;
        return Reflect.get(target, key, receiver);
      },
      getOwnPropertyDescriptor(target, key) {
        reads++;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    }),
    reads: () => reads,
  };
}

test("tiny input capture budget bounds wide sibling reads and retains failed charges", () => {
  const wide = observed({ ...input(), ...Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`x${i}`, i])) });
  const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 2 } });
  try {
    limit(() => operation.composeText(wide.value, "/wide"));
    assert.ok(wide.reads() <= 1, `read ${wide.reads()} siblings before LIMIT`);
    const reads = wide.reads();
    limit(() => operation.composeText(wide.value, "/again"));
    assert.equal(wide.reads(), reads);
  } finally {
    operation.close();
  }
});

test("input charges every owned-resource and prepared-payload occurrence before terminal assignment", () => {
  for (const terminal of terminals()) {
    const wide = observed({
      ...Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`x${i}`, terminal])),
      ...input(),
    });
    const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 2 } });
    try {
      limit(() => operation.composeText(wide.value, "/terminal"));
      assert.equal(wide.reads(), 1);
      limit(() => operation.composeText(wide.value, "/again"));
      assert.equal(wide.reads(), 1);
    } finally {
      operation.close();
    }
  }
});

test("output capture charges nested extras before copying wide records, arrays and strings", () => {
  for (const extra of [
    Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`x${i}`, i])),
    Array(10_000).fill(0),
    "x".repeat(10_000),
    ...terminals().map((terminal) => Array(10_000).fill(terminal)),
  ]) {
    const options = compositionOptions();
    const nested = typeof extra === "string" ? undefined : observed(extra);
    let calls = 0;
    const text = {
      ...options.text!,
      compose(...args: Parameters<NonNullable<TextService["compose"]>>) {
        calls++;
        const plan = options.text!.compose!(...args);
        return { ...plan, measurement: { ...plan.measurement, extra: nested?.value ?? extra } };
      },
    };
    const operation = createLayoutOperation({ ...options, text, limits: { nodes: 200 } });
    try {
      limit(() => operation.composeText(input(), "/output"));
      assert.ok((nested?.reads() ?? 0) < 200);
      const reads = nested?.reads();
      limit(() => operation.composeText(input(), "/again"));
      assert.equal(nested?.reads(), reads);
      assert.equal(calls, 1);
    } finally {
      operation.close();
    }
  }
});

test("snapshot visits all occurrences before copying while identity terminals bypass opaque validation", () => {
  for (const terminal of terminals()) {
    const shared = { terminal };
    const source = [terminal, shared, shared, 1, "ab", null];
    const visits: unknown[] = [];
    const copy = snapshotData(
      source,
      "/snapshot",
      (item) => {
        assert.notEqual(item, terminal, "identity terminals must not reach opaque validators");
        return false;
      },
      (item) => {
        visits.push(item);
      },
    );
    assert.deepEqual(visits, [source, terminal, shared, terminal, shared, terminal, 1, "ab", null]);
    assert.equal(copy[0], terminal);
    assert.equal((copy[1] as typeof shared).terminal, terminal);
    assert.notEqual(copy[1], copy[2]);
    assert.ok(Object.isFrozen(copy) && Object.isFrozen(copy[1]));
    let copied = 0;
    const unvisited = observed({ child: 1 });
    assert.throws(
      () =>
        snapshotData(unvisited.value, "/stop", undefined, () => {
          copied++;
          throw new Error("stop");
        }),
      /stop/,
    );
    assert.equal(copied, 1);
    assert.equal(unvisited.reads(), 0);
  }
});

test("bounded composition output retains exact owned-resource and prepared-payload identities", () => {
  for (const terminal of terminals()) {
    const options = compositionOptions();
    const text = {
      ...options.text!,
      compose(...args: Parameters<NonNullable<TextService["compose"]>>) {
        const plan = options.text!.compose!(...args);
        return { ...plan, measurement: { ...plan.measurement, extra: [terminal] } };
      },
    };
    const operation = createLayoutOperation({ ...options, text, limits: { nodes: 200 } });
    try {
      const frame = operation.composeText(input(), "/identity");
      const extra = (frame.measurement as unknown as { extra: unknown[] }).extra;
      assert.equal(extra[0], terminal);
      assert.ok(Object.isFrozen(extra));
    } finally {
      operation.close();
    }
  }
});

test("incremental snapshot preserves key order, null prototypes, freezing, descriptors and cycle rejection", () => {
  const source = Object.assign(Object.create(null), { a: { b: 1 }, c: [2, 3] });
  const copy = snapshotData(source, "/snapshot");
  assert.deepEqual(copy, source);
  assert.equal(Object.getPrototypeOf(copy), null);
  assert.deepEqual(Object.keys(copy), ["a", "c"]);
  assert.ok(Object.isFrozen(copy.a) && Object.isFrozen(copy.c));
  for (const malformed of [Object.defineProperty({}, "hidden", { value: 1 }), { [Symbol()]: 1 }])
    assert.throws(() => snapshotData(malformed, "/snapshot"), DocumentError);
  const cycle: { child?: unknown } = {};
  cycle.child = cycle;
  assert.throws(() => snapshotData(cycle, "/snapshot"), DocumentError);
});
