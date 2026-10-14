import assert from "node:assert/strict";
import test from "node:test";
import type { NodeDefinition } from "@updf/core";
import type {
  FragmentCall,
  FragmentPaintContext,
  FragmentRequest,
  PaintCall,
  PlacedFragment,
  PreparedBlock,
} from "../dist/cjs/protocol.js";
import { resolveFragment, resolvePaint } from "../dist/cjs/protocol-runtime.js";
import { context, fragment, marker, observed, producer, request } from "./flow-runtime-fixtures.js";

const noFallback = () => {
  throw new Error("steps must take priority");
};

function fragmentLeaf(req: FragmentRequest, result: PlacedFragment, trace: string[]) {
  const leaf = producer({
    fragment(r) {
      assert.equal(this, leaf);
      assert.equal(r, req);
      trace.push("leaf");
      return result;
    },
  });
  return leaf;
}

function paintLeaf(ctx: FragmentPaintContext, nodes: readonly NodeDefinition[], trace: string[]) {
  const leaf = fragment({
    paint(c) {
      assert.equal(this, leaf);
      assert.equal(c, ctx);
      trace.push("leaf");
      return nodes;
    },
  });
  return leaf;
}

function fragmentRoot(
  req: FragmentRequest,
  childReq: FragmentRequest,
  blocks: PreparedBlock[],
  result: PlacedFragment,
  trace: string[],
  inputs: (PlacedFragment | undefined)[],
) {
  const [leaf, child, missing] = blocks;
  assert.ok(leaf && child && missing);
  const root = producer({
    fragment: noFallback,
    fragmentSteps(r) {
      assert.equal(this, root);
      assert.equal(r, req);
      trace.push("root:create");
      return observed(
        (function* (): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
          trace.push("root:enter");
          assert.equal(yield { block: leaf, request: childReq }, result);
          trace.push("root:child");
          assert.equal(yield { block: child, request: childReq }, result);
          trace.push("root:missing");
          assert.equal(yield { block: missing, request: req }, undefined);
          trace.push("root:return");
          return result;
        })(),
        inputs,
      );
    },
  });
  return root;
}

function paintRoot(
  ctx: FragmentPaintContext,
  childCtx: FragmentPaintContext,
  leaf: PlacedFragment,
  child: PlacedFragment,
  nodes: readonly NodeDefinition[],
  trace: string[],
  inputs: (readonly NodeDefinition[])[],
) {
  const root = fragment({
    paint: noFallback,
    paintSteps(c) {
      assert.equal(this, root);
      assert.equal(c, ctx);
      trace.push("root:create");
      return observed(
        (function* (): Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]> {
          trace.push("root:enter");
          assert.equal(yield { fragment: leaf, context: childCtx }, nodes);
          trace.push("root:child");
          assert.equal(yield { fragment: child, context: childCtx }, nodes);
          trace.push("root:last");
          assert.equal(yield { fragment: leaf, context: childCtx }, nodes);
          trace.push("root:return");
          return nodes;
        })(),
        inputs,
      );
    },
  });
  return root;
}

test("fragment interpreter: mixed siblings/grandchildren, receiver/request/result identities and reset points", () => {
  const trace: string[] = [],
    inputs: (PlacedFragment | undefined)[] = [];
  const req = request(),
    childReq = request({ offset: 7 }),
    result = fragment();
  const leaf = fragmentLeaf(childReq, result, trace);
  const missing = producer({
    fragment() {
      trace.push("missing");
      return undefined;
    },
  });
  const child = producer({
    fragment: noFallback,
    fragmentSteps(r) {
      assert.equal(this, child);
      assert.equal(r, childReq);
      trace.push("child:create");
      return observed(
        (function* (): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
          trace.push("child:enter");
          assert.equal(yield { block: leaf, request: childReq }, result);
          trace.push("child:return");
          return result;
        })(),
        inputs,
      );
    },
  });
  const root = fragmentRoot(req, childReq, [leaf, child, missing], result, trace, inputs);
  assert.equal(resolveFragment(root, req), result);
  assert.deepEqual(trace, [
    "root:create",
    "root:enter",
    "leaf",
    "root:child",
    "child:create",
    "child:enter",
    "leaf",
    "child:return",
    "root:missing",
    "missing",
    "root:return",
  ]);
  assert.deepEqual(inputs, [undefined, result, undefined, result, result, undefined]);
});

test("paint interpreter: mixed siblings/grandchildren preserve array/context/receiver identity and fresh empty resets", () => {
  const trace: string[] = [],
    inputs: (readonly NodeDefinition[])[] = [];
  const ctx = context(),
    childCtx = context(),
    nodes = [marker(1)];
  const leaf = paintLeaf(childCtx, nodes, trace);
  const child = fragment({
    paint: noFallback,
    paintSteps(c) {
      assert.equal(this, child);
      assert.equal(c, childCtx);
      trace.push("child:create");
      return observed(
        (function* (): Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]> {
          trace.push("child:enter");
          assert.equal(yield { fragment: leaf, context: childCtx }, nodes);
          trace.push("child:return");
          return nodes;
        })(),
        inputs,
      );
    },
  });
  const root = paintRoot(ctx, childCtx, leaf, child, nodes, trace, inputs);
  assert.equal(resolvePaint(root, ctx), nodes);
  assert.deepEqual(trace, [
    "root:create",
    "root:enter",
    "leaf",
    "root:child",
    "child:create",
    "child:enter",
    "leaf",
    "child:return",
    "root:last",
    "leaf",
    "root:return",
  ]);
  assert.deepEqual(inputs, [[], nodes, [], nodes, nodes, nodes]);
  assert.notEqual(inputs[0], inputs[2]);
});

for (const phase of ["sync", "create", "next"] as const) {
  test(`fragment ${phase} throw escapes unchanged without retry, cleanup or later sibling`, () => {
    const error = { phase },
      trace: string[] = [],
      req = request();
    const throws = () => {
      trace.push(phase);
      throw error;
    };
    const child = producer({
      fragment: throws,
      ...(phase === "sync"
        ? {}
        : {
            fragmentSteps:
              phase === "create"
                ? throws
                : function* () {
                    yield throws();
                    return undefined;
                  },
          }),
    });
    const root = producer({
      fragment: noFallback,
      *fragmentSteps() {
        try {
          yield { block: child, request: req };
          trace.push("later sibling");
          yield { block: producer(), request: req };
        } finally {
          trace.push("cleanup");
        }
        return undefined;
      },
    });
    assert.throws(
      () => resolveFragment(root, req),
      (actual) => actual === error,
    );
    assert.deepEqual(trace, [phase]);
  });
  test(`paint ${phase} throw escapes unchanged without retry, cleanup or later sibling`, () => {
    const error = { phase },
      trace: string[] = [],
      ctx = context();
    const throws = () => {
      trace.push(phase);
      throw error;
    };
    const child = fragment({
      paint: throws,
      ...(phase === "sync"
        ? {}
        : {
            paintSteps:
              phase === "create"
                ? throws
                : function* () {
                    yield throws();
                    return [];
                  },
          }),
    });
    const root = fragment({
      paint: noFallback,
      *paintSteps() {
        try {
          yield { fragment: child, context: ctx };
          trace.push("later sibling");
          yield { fragment: fragment(), context: ctx };
        } finally {
          trace.push("cleanup");
        }
        return [];
      },
    });
    assert.throws(
      () => resolvePaint(root, ctx),
      (actual) => actual === error,
    );
    assert.deepEqual(trace, [phase]);
  });
}

test("both interpreters execute 20,000 heap continuations without JS recursion", () => {
  const result = fragment(),
    nodes = [marker(2)],
    req = request(),
    ctx = context();
  let block = producer({ fragment: () => result }),
    painted = fragment({ paint: () => nodes });
  for (let depth = 0; depth < 20_000; depth++) {
    const child = block,
      childPaint = painted;
    block = producer({
      fragment: noFallback,
      *fragmentSteps(r) {
        return yield { block: child, request: r };
      },
    });
    painted = fragment({
      paint: noFallback,
      *paintSteps(c) {
        return yield { fragment: childPaint, context: c };
      },
    });
  }
  assert.equal(resolveFragment(block, req), result);
  assert.equal(resolvePaint(painted, ctx), nodes);
});
