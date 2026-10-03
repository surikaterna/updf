import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import {
  block,
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  type MeasureContext,
} from "../../../tests/fixtures/transitional-layout.js";
import { flow } from "./fixtures.js";

function rejects(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
test("aggregate generated budget rejects an unvisited output accessor before array enumeration/copy", () => {
  const rect: NodeDefinition = { type: "rect", x: 0, y: 0, width: 1, height: 1, paint: { stroke: null } };
  const nodes = Array<NodeDefinition>(8).fill(rect);
  let getterCalls = 0,
    callbackCalls = 0;
  Object.defineProperty(nodes, "2", {
    enumerable: true,
    get() {
      getterCalls++;
      return rect;
    },
  });
  const adapter = defineBlockAdapter({
    name: "early-budget",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 100, height: 1 },
      fragment() {
        callbackCalls++;
        return { status: "placed", nextOffset: 1, height: 1, nodes };
      },
    }),
  });
  const input = flow([
    { type: "fixed", height: 1, children: Array<NodeDefinition>(16).fill(rect) },
    extension(adapter, {}),
  ]);
  rejects(() => layoutFlow(input, { profile: "service", limits: { nodes: 20 } }, createExtensions([adapter])), "LIMIT");
  assert.equal(callbackCalls, 1);
  assert.equal(getterCalls, 0);
});
test("enormous adapter outputs fail configured nodes before inspecting any descriptor tail", () => {
  let descriptors = 0,
    calls = 0;
  const values = new Proxy(Array<NodeDefinition>(1_000_000), {
    getOwnPropertyDescriptor(target, key) {
      if (/^\d+$/u.test(String(key))) descriptors++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const adapter = defineBlockAdapter({
    name: "huge-output",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 100, height: 1 },
      fragment() {
        calls++;
        return { status: "placed", nextOffset: 1, height: 1, nodes: values };
      },
    }),
  });
  rejects(
    () =>
      layoutFlow(
        flow([extension(adapter, {})]),
        { profile: "service", limits: { nodes: 10 } },
        createExtensions([adapter]),
      ),
    "LIMIT",
  );
  assert.equal(calls, 1);
  assert.equal(descriptors, 0);
});
test("operation resource snapshot survives caller mutation and retained callback contexts close on failure", async () => {
  const font = await fixtureFont();
  const resources = { Demo: font };
  let retained: MeasureContext | undefined;
  const adapter = defineBlockAdapter({
    name: "resource-scope",
    validate(input) {
      Reflect.deleteProperty(resources, "Demo");
      return input;
    },
    measure(_props, context) {
      retained = context;
      const result = context.measureText({
        kind: "plain",
        text: "Привет",
        font: "Demo",
        fontSize: 10,
        lineHeight: 10,
        align: "left",
        width: 100,
      });
      assert.equal(result.lineCount, 1);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 100, height: 1 },
        fragment: () => ({ status: "defer" }),
      };
    },
  });
  rejects(
    () => layoutFlow(flow([block({ children: [extension(adapter, {})] })]), { resources }, createExtensions([adapter])),
    "LAYOUT_OVERSIZED",
  );
  assert.ok(retained);
  rejects(
    () => retained?.measureText({ kind: "plain", text: "A", fontSize: 10, lineHeight: 10, align: "left", width: 100 }),
    "MEASUREMENT_CONTEXT",
  );
});
test("foreign or undeclared decoration capability cannot bypass reservation checks", () => {
  const plan = createDecorationPlan([{ edge: "after", repeat: "all", height: 10, nodes: [] }]);
  const adapter = defineBlockAdapter({
    name: "foreign-plan",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 100, height: 1 },
      fragment: () => ({ status: "placed", nextOffset: 1, height: 1, nodes: [], decorations: plan }),
    }),
  });
  rejects(() => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])), "TYPE");
});
test("hidden container cannot mask malformed text/resource output or insufficient service page policy", () => {
  const item = block({
    children: [
      {
        type: "fixed",
        height: 20,
        children: [
          { type: "text", text: "A", fontSize: 10, lineHeight: 10, align: "left", width: 1, height: 10, x: 0, y: 0 },
        ],
      },
    ],
    style: { height: 10, overflow: "hidden" },
  });
  rejects(() => layoutFlow(flow([item])), "TOKEN_OVERFLOW");
  rejects(
    () =>
      layoutFlow(flow([block({ children: [], style: { minHeight: 100 } })]), {
        profile: "service",
        limits: { pages: 2 },
      }),
    "LIMIT",
  );
});
test("owned native VNodes are not extension/container data props, without a VDOM root dependency", () => {
  const node = h("rect", { x: 0, y: 0, width: 1, height: 1 });
  const adapter = defineBlockAdapter({
    name: "vnode-data",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 100, height: 0 },
      fragment: () => ({ status: "placed", nextOffset: 1, height: 0, nodes: [] }),
    }),
  });
  rejects(() => extension(adapter, { node }), "TYPE");
  rejects(() => block({ children: [node as never] }), "TYPE");
});
test("repeated semantic measurement during reservation trials uses the same operation ledger", () => {
  const input = { kind: "plain" as const, text: "A", width: 100, fontSize: 10, lineHeight: 10, align: "left" as const };
  const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [] }]);
  let calls = 0;
  const adapter = defineBlockAdapter({
    name: "ledger-trial",
    validate: (value) => value,
    measure(_props, context) {
      context.measureText(input);
      context.measureText(input);
      return {
        fragmentation: "splittable",
        extent: 2,
        naturalSize: { width: 100, height: 40 },
        decorations: plan,
        fragment(request) {
          calls++;
          context.measureText(input);
          const count = Math.min(2 - request.offset, Math.floor(request.availableHeight / 20));
          return count
            ? { status: "placed", nextOffset: request.offset + count, height: count * 20, nodes: [] }
            : { status: "defer" };
        },
      };
    },
  });
  const result = layoutFlow(
    flow([extension(adapter, {})]),
    { profile: "service", limits: { textCodePoints: 1 } },
    createExtensions([adapter]),
  );
  assert.equal(result.pageCount, 2);
  assert.ok(calls > 2);
});
