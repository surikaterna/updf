import assert from "node:assert/strict";
import test from "node:test";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { DocumentError, type NodeDefinition } from "@updf/core";
import {
  block,
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  type MeasureContext,
  type MeasuredBlock,
} from "../../../tests/fixtures/transitional-layout.js";
import { flow } from "./fixtures.js";

const rect: NodeDefinition = { type: "rect", x: 0, y: 0, width: 1, height: 1, paint: { stroke: null } };
function output(nodes: readonly NodeDefinition[]): MeasuredBlock {
  return {
    fragmentation: "atomic",
    extent: 1,
    naturalSize: { width: 100, height: 1 },
    fragment: () => ({ status: "placed", nextOffset: 1, height: 1, nodes }),
  };
}
function diagnostic(run: () => unknown, code: string, path?: string): void {
  assert.throws(
    run,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}
test("C-F2: sibling provisional output exhausts nodes before an unvisited accessor descriptor", () => {
  let descriptors = 0,
    getterCalls = 0,
    callbacks = 0;
  const values = Array<NodeDefinition>(8).fill(rect);
  Object.defineProperty(values, "2", {
    enumerable: true,
    get() {
      getterCalls++;
      return rect;
    },
  });
  const tail = new Proxy(values, {
    getOwnPropertyDescriptor(target, key) {
      if (key === "2") descriptors++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const first = defineBlockAdapter({
    name: "first",
    validate: (input) => input,
    measure: () => output(Array<NodeDefinition>(16).fill(rect)),
  });
  const second = defineBlockAdapter({
    name: "second",
    validate: (input) => input,
    measure: () => ({
      ...output(tail),
      fragment() {
        callbacks++;
        return { status: "placed", nextOffset: 1, height: 1, nodes: tail };
      },
    }),
  });
  const input = flow([block({ children: [extension(first, {}), extension(second, {})] })]);
  diagnostic(
    () => layoutFlow(input, { profile: "service", limits: { nodes: 20 } }, createExtensions([first, second])),
    "LIMIT",
  );
  assert.equal(callbacks, 1);
  assert.equal(descriptors, 0);
  assert.equal(getterCalls, 0);
});
test("C-F2: repeated descriptor fragment callbacks stop at cumulative candidate exhaustion", () => {
  let measured = 0,
    callbacks = 0;
  const adapter = defineBlockAdapter({
    name: "repeated",
    validate: (input) => input,
    measure() {
      measured++;
      return {
        ...output([rect]),
        fragment() {
          callbacks++;
          return { status: "placed", nextOffset: 1, height: 0, nodes: [] };
        },
      };
    },
  });
  const drawing = defineBlockAdapter({
    name: "drawing",
    validate: (input) => input,
    measure() {
      measured++;
      return {
        ...output([rect]),
        fragment() {
          callbacks++;
          return { status: "placed", nextOffset: 1, height: 1, nodes: [rect] };
        },
      };
    },
  });
  const descriptor = extension(drawing, {});
  diagnostic(
    () =>
      layoutFlow(
        flow([block({ children: Array.from({ length: 100 }, () => descriptor) })], { height: 200 }),
        { profile: "service", limits: { nodes: 100 } },
        createExtensions([drawing, adapter]),
      ),
    "LIMIT",
  );
  assert.equal(measured, 1);
  assert.ok(callbacks <= 50, `${callbacks} callbacks ran`);
});
test("C-F2: exact wrapper budget and footer retries commit only selected output", () => {
  const adapter = defineBlockAdapter({
    name: "exact",
    validate: (input) => input,
    measure: () => output(Array<NodeDefinition>(16).fill(rect)),
  });
  const input = flow([block({ children: [extension(adapter, {})] })]);
  assert.equal(
    layoutFlow(input, { profile: "service", limits: { nodes: 18 } }, createExtensions([adapter])).pageCount,
    1,
  );
  diagnostic(
    () => layoutFlow(input, { profile: "service", limits: { nodes: 17 } }, createExtensions([adapter])),
    "LIMIT",
  );
  const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [] }]);
  const trial = defineBlockAdapter({
    name: "trial",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "splittable",
      extent: 2,
      naturalSize: { width: 100, height: 40 },
      decorations: plan,
      fragment(request) {
        const count = Math.min(2 - request.offset, Math.floor(request.availableHeight / 20));
        return count
          ? { status: "placed", nextOffset: request.offset + count, height: count * 20, nodes: [rect] }
          : { status: "defer" };
      },
    }),
  });
  assert.equal(
    layoutFlow(flow([extension(trial, {})]), { profile: "service", limits: { nodes: 10 } }, createExtensions([trial]))
      .pageCount,
    2,
  );
});
test("C-F2: zero-height nested siblings do not release prior reservations or create phantom wrappers", () => {
  const drawing = defineBlockAdapter({
    name: "visible",
    validate: (input) => input,
    measure: () => output(Array<NodeDefinition>(16).fill(rect)),
  });
  const empty = defineBlockAdapter({
    name: "empty",
    validate: (input) => input,
    measure: () => ({ ...output([]), fragment: () => ({ status: "placed", nextOffset: 1, height: 0, nodes: [] }) }),
  });
  const input = flow([block({ children: [extension(drawing, {}), block({ children: [extension(empty, {})] })] })]);
  assert.equal(
    layoutFlow(input, { profile: "service", limits: { nodes: 18 } }, createExtensions([drawing, empty])).pageCount,
    1,
  );
  diagnostic(
    () => layoutFlow(input, { profile: "service", limits: { nodes: 17 } }, createExtensions([drawing, empty])),
    "LIMIT",
  );
});
test("C-F3: a fifty-point between-child gap splits across forty-point pages", () => {
  const result = layoutFlow(
    flow([
      block({
        children: [
          { type: "spacer", height: 10 },
          { type: "spacer", height: 10 },
        ],
        style: { gap: 50 },
      }),
    ]),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [40, 30],
  );
});
test("C-F3: minHeight uses the current thirty points then a fresh forty with pages limit two", () => {
  const result = layoutFlow(flow([{ type: "spacer", height: 10 }, block({ children: [], style: { minHeight: 70 } })]), {
    profile: "service",
    limits: { pages: 2 },
  });
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [10, 30, 40],
  );
});
test("C-F4: repeated nested extension measurements are reused but diagnostics bind to the current occurrence", () => {
  let measures = 0,
    calls = 0;
  const adapter = defineBlockAdapter({
    name: "origin",
    validate: (input) => input,
    measure() {
      measures++;
      return {
        ...output([]),
        fragment() {
          calls++;
          return { status: "placed", nextOffset: calls === 1 ? 1 : 0, height: 1, nodes: [] };
        },
      };
    },
  });
  const descriptor = extension(adapter, {});
  diagnostic(() => layoutFlow(flow([descriptor, descriptor]), {}, createExtensions([adapter])), "TYPE", "/body/1");
  assert.equal(measures, 1);
  calls = 0;
  measures = 0;
  const nested = block({ children: [descriptor] });
  diagnostic(() => layoutFlow(flow([nested, nested]), {}, createExtensions([adapter])), "TYPE", "/body/1/children/0");
  assert.equal(measures, 1);
});
test("C-F5: ordinary/primitive stage throws become stable structured diagnostics without reading message getters", () => {
  for (const stage of ["validate", "measure", "fragment"] as const) {
    for (const thrown of [new Error("failure"), new TypeError("failure"), "primitive", 42]) {
      const adapter = defineBlockAdapter({
        name: "throwing",
        validate(input) {
          if (stage === "validate") throw thrown;
          return input;
        },
        measure() {
          if (stage === "measure") throw thrown;
          return {
            ...output([]),
            fragment() {
              throw thrown;
            },
          };
        },
      });
      assert.throws(
        () => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])),
        (error: unknown) =>
          error instanceof DocumentError &&
          error.diagnostics[0]?.path === "/body/0" &&
          error.diagnostics[0]?.message.includes(stage),
      );
    }
  }
  let reads = 0;
  const thrown = Object.defineProperty({}, "message", {
    get() {
      reads++;
      throw new Error("unsafe getter");
    },
  });
  const adapter = defineBlockAdapter<unknown>({
    name: "getter-error",
    validate() {
      throw thrown;
    },
    measure: () => output([]),
  });
  diagnostic(() => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])), "TYPE", "/body/0");
  assert.equal(reads, 0);
});
test("C-F5: existing structured errors retain identity/span and failure closes captured contexts", () => {
  const original = new DocumentError("VALUE", "/already/origin", "intentional", { span: { start: 2, end: 5 } });
  let retained: MeasureContext | undefined;
  const adapter = defineBlockAdapter({
    name: "structured",
    validate: (input) => input,
    measure(_props, context) {
      retained = context;
      return {
        ...output([]),
        fragment() {
          throw original;
        },
      };
    },
  });
  assert.throws(
    () => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])),
    (error: unknown) => error === original,
  );
  assert.deepEqual(original.diagnostics[0]?.span, { start: 2, end: 5 });
  diagnostic(() => retained?.measureText(richInput("A", 100, 10, 10)), "MEASUREMENT_CONTEXT");
});
test("C-F2/F3: discarded footer space candidates roll back consumption and selected wrappers", () => {
  const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [rect] }]);
  const result = layoutFlow(flow([block({ children: [], style: { minHeight: 70 }, decorations: plan })]), {
    profile: "service",
    limits: { pages: 2, nodes: 20 },
  });
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [40, 40],
  );
  assert.equal(result.pageCount, 2);
});
test("C-F3: subpoint and small partial regions consume exact space without point-sized quanta", () => {
  const result = layoutFlow(
    flow([{ type: "spacer", height: 0.03 }, block({ children: [], style: { minHeight: 0.2 } })], { height: 0.1 }),
    { profile: "service", limits: { pages: 3 } },
  );
  assert.equal(result.pageCount, 3);
  assert.ok(result.placements[1]!.box.height > 0 && result.placements[1]!.box.height < 0.1);
  const consumed = result.placements.slice(1).reduce((height, p) => height + p.box.height, 0);
  assert.equal(consumed, 0.2);
});
test("C-F4: a cached callback's measurement context uses its current occurrence origin", () => {
  let calls = 0,
    measured = 0;
  const adapter = defineBlockAdapter({
    name: "context-origin",
    validate: (input) => input,
    measure(_props, context) {
      measured++;
      return {
        ...output([]),
        fragment() {
          if (++calls === 2) context.measureText(richInput("A", 100, 10, 10, "unknown"));
          return { status: "placed", nextOffset: 1, height: 1, nodes: [] };
        },
      };
    },
  });
  const descriptor = extension(adapter, {});
  assert.throws(
    () => layoutFlow(flow([descriptor, descriptor]), {}, createExtensions([adapter])),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "FONT_RESOURCE" &&
      error.diagnostics[0]?.path.startsWith("/body/1/"),
  );
  assert.equal(measured, 1);
});
test("C-F5: measure-stage failures also close retained contexts without replacing structured errors", () => {
  let context: MeasureContext | undefined;
  const adapter = defineBlockAdapter({
    name: "measure-failure",
    validate: (input) => input,
    measure(_props, current) {
      context = current;
      throw new TypeError("failure");
    },
  });
  diagnostic(() => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])), "TYPE", "/body/0");
  diagnostic(() => context?.measureText(richInput("A", 100, 10, 10)), "MEASUREMENT_CONTEXT");
});
