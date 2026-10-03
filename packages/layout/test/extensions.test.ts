import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import {
  type BlockFragment,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  layoutFlowUnknown,
  type MeasureContext,
  type MeasuredBlock,
} from "@updf/layout";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { flow } from "./fixtures.js";

function measured(fragment: MeasuredBlock["fragment"], extent = 1): MeasuredBlock {
  return {
    fragmentation: extent === 1 ? "atomic" : "splittable",
    naturalSize: { width: 100, height: 0 },
    extent,
    fragment,
  };
}
function run(measure: () => MeasuredBlock, preceding = 0) {
  const adapter = defineBlockAdapter({ name: "test.block", validate: (input) => input, measure });
  return layoutFlow(
    flow([...(preceding ? [{ type: "spacer" as const, height: preceding }] : []), extension(adapter, {})]),
    {},
    createExtensions([adapter]),
  );
}
function rejects(callback: () => unknown, code: string): void {
  assert.throws(callback, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
const empty = (nextOffset = 1, height = 0): BlockFragment => ({ status: "placed", nextOffset, height, nodes: [] });

test("generic fragments permit zero height only with strict finite extent progress", () => {
  const offsets: number[] = [];
  const result = run(() =>
    measured((request) => {
      offsets.push(request.offset);
      return empty(request.offset + 1);
    }, 3),
  );
  assert.deepEqual(offsets, [0, 1, 2]);
  assert.equal(result.placements.length, 3);
  assert.equal(result.pageCount, 1);
});
test("nonprogress, reversed, fractional, infinite, NaN and out-of-extent offsets reject", () => {
  for (const offset of [0, -1, 0.5, Number.POSITIVE_INFINITY, Number.NaN, 2, Number.MAX_SAFE_INTEGER + 1])
    rejects(() => run(() => measured(() => empty(offset))), "TYPE");
});
test("unsafe/nonpositive extent and an atomic extent other than one reject", () => {
  for (const extent of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN, Number.MAX_SAFE_INTEGER + 1])
    rejects(() => run(() => measured(() => empty(), extent)), "TYPE");
  rejects(() => run(() => ({ ...measured(() => empty(), 2), fragmentation: "atomic" })), "TYPE");
});
test("defer moves once from a partial region; fresh defer is a structured oversize", () => {
  const fresh: boolean[] = [];
  const result = run(
    () =>
      measured((request) => {
        fresh.push(request.atFreshRegion);
        return request.atFreshRegion ? empty(1, 20) : { status: "defer" };
      }),
    30,
  );
  assert.deepEqual(fresh, [false, true]);
  assert.equal(result.pageCount, 2);
  let calls = 0;
  rejects(
    () =>
      run(
        () =>
          measured(() => {
            calls++;
            return { status: "defer" };
          }),
        30,
      ),
    "LAYOUT_OVERSIZED",
  );
  assert.equal(calls, 2);
  rejects(() => run(() => measured(() => ({ status: "defer" }))), "LAYOUT_OVERSIZED");
});
test("nonfinite/negative height and a dishonest available-height claim reject", () => {
  for (const height of [-1, Number.POSITIVE_INFINITY, Number.NaN, 41])
    rejects(() => run(() => measured(() => empty(1, height))), "GEOMETRY");
});
test("measured dimensions, modes and callbacks are checked as unknown output", () => {
  for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
    rejects(() => run(() => ({ ...measured(() => empty()), naturalSize: { width, height: 0 } })), "GEOMETRY");
  rejects(
    () => run(() => ({ ...measured(() => empty()), fragmentation: "foreign" }) as unknown as MeasuredBlock),
    "TYPE",
  );
  rejects(() => run(() => ({ ...measured(() => empty()), fragment: undefined }) as unknown as MeasuredBlock), "TYPE");
});
test("callback output getters, thenables and foreign native kinds never integrate", () => {
  let reads = 0;
  const getter = Object.defineProperty({}, "height", {
    enumerable: true,
    get() {
      reads++;
      return 0;
    },
  });
  rejects(() => run(() => measured(() => getter as BlockFragment)), "TYPE");
  assert.equal(reads, 0);
  rejects(() => run(() => Promise.resolve(measured(() => empty())) as unknown as MeasuredBlock), "TYPE");
  rejects(
    () =>
      run(() =>
        measured(
          () =>
            ({ status: "placed", nextOffset: 1, height: 10, nodes: [{ type: "chart" }] }) as unknown as BlockFragment,
        ),
      ),
    "TYPE",
  );
});
test("fragment node arrays reject holes, getters and extra fields without invoking getters", () => {
  let reads = 0;
  const getter = Object.defineProperty([], "0", {
    enumerable: true,
    get() {
      reads++;
      return {};
    },
  });
  for (const nodes of [Array(1), getter, Object.assign([], { extra: true })])
    rejects(() => run(() => measured(() => ({ status: "placed", nextOffset: 1, height: 10, nodes }))), "TYPE");
  assert.equal(reads, 0);
});
test("installed extension name and identity are both required and operation-local", () => {
  const first = defineBlockAdapter({
    name: "same",
    validate: (input) => input,
    measure: () => measured(() => empty()),
  });
  const second = defineBlockAdapter({
    name: "same",
    validate: (input) => input,
    measure: () => measured(() => empty()),
  });
  rejects(() => createExtensions([first, first]), "KEY");
  rejects(() => createExtensions([first, second]), "KEY");
  rejects(() => layoutFlow(flow([extension(first, {})])), "KEY");
  rejects(() => layoutFlow(flow([extension(first, {})]), {}, createExtensions([second])), "KEY");
  assert.equal(layoutFlow(flow([extension(first, {})]), {}, createExtensions([first])).pageCount, 1);
  rejects(() => layoutFlow(flow([extension(first, {})])), "KEY");
});
test("serialized descriptors, copied adapters and forged extension scopes are not capabilities", () => {
  const adapter = defineBlockAdapter({
    name: "test",
    validate: (input) => input,
    measure: () => measured(() => empty()),
  });
  const descriptor = extension(adapter, {});
  rejects(() => createExtensions([{ ...adapter }]), "TYPE");
  rejects(() => extension({ ...adapter }, {}), "TYPE");
  rejects(() => layoutFlowUnknown(flow([descriptor]), {}, {} as ReturnType<typeof createExtensions>), "TYPE");
  rejects(
    () => layoutFlowUnknown(JSON.parse(JSON.stringify(flow([descriptor]))), {}, createExtensions([adapter])),
    "TYPE",
  );
});
test("definitions and props are owned snapshots; measurement receives deeply frozen copies", () => {
  const props = { values: [1] };
  const definition = {
    name: "snapshot",
    validate: () => props,
    measure(input: { readonly values: readonly number[] }) {
      assert.notEqual(input, props);
      assert.ok(Object.isFrozen(input) && Object.isFrozen(input.values));
      return measured(() => empty());
    },
  };
  const adapter = defineBlockAdapter(definition);
  definition.measure = () => {
    throw new Error("mutated definition");
  };
  const descriptor = extension(adapter, props);
  props.values.push(2);
  assert.deepEqual(descriptor.props, { values: [1] });
  layoutFlow(flow([descriptor]), {}, createExtensions([adapter]));
  assert.ok(!Object.isFrozen(props) && !Object.isFrozen(props.values));
});
test("measure context closes on success and failure and unknown resources cannot bypass core", () => {
  let retained: MeasureContext | undefined;
  const adapter = defineBlockAdapter({
    name: "context",
    validate: (input) => input,
    measure(_props, context) {
      retained = context;
      return measured(() => empty());
    },
  });
  layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  assert.ok(retained);
  rejects(
    () =>
      retained?.measureText({
        kind: "plain",
        text: "A",
        width: 100,
        font: "forged",
        fontSize: 10,
        lineHeight: 10,
        align: "left",
      }),
    "MEASUREMENT_CONTEXT",
  );
  const bad = defineBlockAdapter({
    name: "bad-resource",
    validate: (input) => input,
    measure(_props, context) {
      retained = context;
      context.measureText({
        kind: "plain",
        text: "A",
        width: 100,
        font: "forged",
        fontSize: 10,
        lineHeight: 10,
        align: "left",
      });
      return measured(() => empty());
    },
  });
  rejects(() => layoutFlow(flow([extension(bad, {})]), {}, createExtensions([bad])), "FONT_RESOURCE");
  rejects(
    () => retained?.measureText({ kind: "plain", text: "A", width: 100, fontSize: 10, lineHeight: 10, align: "left" }),
    "MEASUREMENT_CONTEXT",
  );
});
test("generated policy reserves aggregate wrapper output before snapshotting another fragment", () => {
  const adapter = defineBlockAdapter({
    name: "budget",
    validate: (input) => input,
    measure: () =>
      measured(() => ({
        status: "placed",
        nextOffset: 1,
        height: 10,
        nodes: [
          { type: "text", text: "A", x: 0, y: 0, width: 100, height: 10, fontSize: 10, lineHeight: 10, align: "left" },
        ],
      })),
  });
  const input = flow([extension(adapter, {}), extension(adapter, {}), extension(adapter, {})]);
  rejects(
    () => layoutFlow(input, { profile: "service", limits: { textCodePoints: 2 } }, createExtensions([adapter])),
    "LIMIT",
  );
});
test("paginator dependency graph has no paragraph/table producer or kind dispatch", async () => {
  const source = await readFile(new URL("../src/paginator.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["'][^"']*(?:paragraph|tables|blocks|fragments)[^"']*["']/u);
  assert.doesNotMatch(source, /(?:block|item)\.(?:type|kind)\s*===/u);
  assert.ok(render(run(() => measured(() => empty())).document).length > 0);
});
test("owned font props retain opaque identity while forged resource handles still reject", async () => {
  const font = await fixtureFont();
  const adapter = defineBlockAdapter({
    name: "font-props",
    validate: (input) => input,
    measure(props) {
      assert.equal((props as { readonly font: unknown }).font, font);
      return measured(() => empty());
    },
  });
  layoutFlow(flow([extension(adapter, { font })]), { resources: { Demo: font } }, createExtensions([adapter]));
  rejects(
    () =>
      layoutFlow(
        flow([extension(adapter, { font })]),
        { resources: { Demo: { ...font } } },
        createExtensions([adapter]),
      ),
    "FONT_RESOURCE",
  );
});
test("mutating callback results afterward cannot change delivered native nodes", () => {
  const nodes: import("@updf/core").NodeDefinition[] = [
    { type: "rect", x: 0, y: 0, width: 10, height: 10, paint: { stroke: null } },
  ];
  const result = run(() => measured(() => ({ status: "placed", nextOffset: 1, height: 10, nodes })));
  const bytes = render(result.document);
  nodes.length = 0;
  assert.deepEqual(render(result.document), bytes);
  assert.ok(Object.isFrozen(result.document.pages[0]?.children));
});
