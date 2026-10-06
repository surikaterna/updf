import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import {
  isNativeNodeData,
  isNativeNodeDataArray,
  nativeNodeKinds,
  nativeNodeToVdom,
} from "@updf/core/internal-drawing";
import { h, lower, type VNode } from "@updf/core/vdom";

const rectangle = { type: "rect", x: 20, y: 20, width: 10, height: 10 } as const;
function tree(node: VNode): VNode {
  return h("document", { version: 1, children: h("page", { width: 100, height: 100, children: node }) });
}
function diagnostic(run: () => unknown, code: string, path?: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    if (path !== undefined) assert.equal(error.diagnostics[0]?.path, path);
    return true;
  });
}

test("native classification is shallow, exact, own-data only and does not execute getters", () => {
  for (const type of nativeNodeKinds) assert.equal(isNativeNodeData({ type }), true);
  for (const value of [
    null,
    [],
    {},
    { type: "text" },
    { type: "RichText" },
    { type: "constructor" },
    Object.create(rectangle),
  ])
    assert.equal(isNativeNodeData(value), false);
  let reads = 0;
  const getter = {
    get type() {
      reads++;
      return "rect";
    },
  };
  assert.equal(isNativeNodeData(getter), false);
  assert.equal(isNativeNodeDataArray([getter]), false);
  const items = Object.defineProperty([], "0", {
    enumerable: true,
    get() {
      reads++;
      return rectangle;
    },
  });
  assert.equal(isNativeNodeDataArray(items), false);
  assert.equal(reads, 0);
  assert.equal(isNativeNodeDataArray([rectangle]), true);
  assert.equal(isNativeNodeDataArray(new Array(1)), false);
});

test("bridge owns snapshots, removes only type and retains strict malformed-node validation", () => {
  const input = { ...rectangle, x: Number(rectangle.x) };
  const node = nativeNodeToVdom(input);
  input.x = 9;
  assert.deepEqual(lower(tree(node)).pages[0]?.children, [rectangle]);
  assert.ok(Object.isFrozen(node));
  const extra = { ...rectangle, unsupported: true };
  assert.equal(isNativeNodeData(extra), true);
  diagnostic(() => lower(tree(nativeNodeToVdom(extra))), "KEY");
  diagnostic(() => lower(tree(nativeNodeToVdom({ type: "rect" } as NodeDefinition))), "GEOMETRY");
  diagnostic(() => nativeNodeToVdom({ type: "notNative" } as unknown as NodeDefinition), "TYPE", "/type");
});

test("bridge rejects tag, props, children and symbol accessors without reading them", () => {
  let reads = 0;
  for (const key of ["type", "x", "children", Symbol("props")]) {
    const input = Object.defineProperty({ ...rectangle }, key, {
      enumerable: true,
      get() {
        reads++;
        return [];
      },
    });
    diagnostic(() => nativeNodeToVdom(input), "TYPE");
  }
  const group = {
    type: "paintGroup",
    children: Object.defineProperty([], "0", {
      enumerable: true,
      get() {
        reads++;
        return rectangle;
      },
    }),
  };
  diagnostic(() => nativeNodeToVdom(group as NodeDefinition), "TYPE", "/children/0");
  assert.equal(reads, 0);
});

test("bridge iterates 2048 groups, reuses DAG nodes and detects active cycles before overflow", () => {
  let node: NodeDefinition = rectangle;
  for (let index = 0; index < 2048; index++) node = { type: "paintGroup", children: [node] };
  const owned = nativeNodeToVdom(node);
  const result = lower(tree(owned), { limits: { depth: 50000 } });
  assert.equal(result.pages.length, 1);
  diagnostic(() => lower(tree(owned), { limits: { depth: 10 } }), "LIMIT");
  const shared = { type: "paintGroup", children: [rectangle, rectangle] } as const;
  assert.equal(lower(tree(nativeNodeToVdom(shared))).pages[0]?.children.length, 1);
  const cycle: { type: "paintGroup"; children: NodeDefinition[] } = { type: "paintGroup", children: [] };
  cycle.children.push(cycle);
  diagnostic(() => nativeNodeToVdom(cycle), "VDOM_CYCLE", "/children/0");
});
