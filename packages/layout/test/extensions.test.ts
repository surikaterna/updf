import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { DocumentError } from "@updf/core";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { render } from "../../../tests/fixtures/text-options.js";
import {
  type BlockUnit,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  layoutFlowUnknown,
  type MeasureContext,
  type MeasuredBlock,
} from "../../../tests/fixtures/transitional-layout.js";
import { flow } from "./fixtures.js";

function measured(next: MeasuredBlock["next"], extent = 1): MeasuredBlock {
  return {
    fragmentation: extent === 1 ? "atomic" : "splittable",
    naturalSize: { width: 100, height: 0 },
    extent,
    next,
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
const empty = (end = 1, height = 0): BlockUnit => ({ end, height, nodes: [] });

test("unmarked public atomic and splittable roots use actual fragment native admission", () => {
  for (const extent of [1, 2]) {
    const calls: number[] = [];
    const adapter = defineBlockAdapter({
      name: "test.uniform-admission",
      validate: (input) => input,
      measure: () =>
        measured((request) => {
          calls.push(request.offset);
          assert.deepEqual(Object.keys(request).sort(), ["extent", "offset", "width"]);
          assert.ok(Object.isFrozen(request));
          return empty(extent, 0.2);
        }, extent),
    });
    const result = layoutFlow(
      flow([{ type: "spacer", height: 0.1 }, extension(adapter, {})], { height: 0.3 }),
      {},
      createExtensions([adapter]),
    );
    assert.deepEqual(calls, [0, 0]);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(
      result.placements.map((p) => [p.pageIndex, p.box.y, p.box.height]),
      [
        [0, 0, 0.1],
        [1, 0, 0.2],
      ],
    );
  }
});

test("generic fragments permit zero height only with strict finite extent progress", () => {
  const offsets: number[] = [];
  const result = run(() =>
    measured((request) => {
      offsets.push(request.offset);
      return empty(request.offset + 1);
    }, 3),
  );
  assert.deepEqual(offsets, [0, 1, 2]);
  assert.equal(result.placements.length, 1);
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
test("engine retries the identical unit query on a fresh region and reports oversize", () => {
  const offsets: number[] = [];
  const result = run(
    () =>
      measured((request) => {
        offsets.push(request.offset);
        return empty(1, 20);
      }),
    30,
  );
  assert.deepEqual(offsets, [0, 0]);
  assert.equal(result.pageCount, 2);
  let calls = 0;
  rejects(
    () =>
      run(
        () =>
          measured(() => {
            calls++;
            return empty(1, 41);
          }),
        30,
      ),
    "LAYOUT_OVERSIZED",
  );
  assert.equal(calls, 2);
  // Obsolete runtime ABI is a negative control, never a fallback.
  rejects(() => run(() => measured(() => ({ status: "defer" }) as unknown as BlockUnit)), "KEY");
});
test("nonfinite/negative unit height rejects; oversized valid units are engine decisions", () => {
  for (const height of [-1, Number.POSITIVE_INFINITY, Number.NaN])
    rejects(() => run(() => measured(() => empty(1, height))), "GEOMETRY");
  rejects(() => run(() => measured(() => empty(1, 41))), "LAYOUT_OVERSIZED");
});
test("measured dimensions, modes and callbacks are checked as unknown output", () => {
  for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
    rejects(() => run(() => ({ ...measured(() => empty()), naturalSize: { width, height: 0 } })), "GEOMETRY");
  rejects(
    () => run(() => ({ ...measured(() => empty()), fragmentation: "foreign" }) as unknown as MeasuredBlock),
    "TYPE",
  );
  rejects(() => run(() => ({ ...measured(() => empty()), next: undefined }) as unknown as MeasuredBlock), "TYPE");
  // The old measured callback property is forbidden even when next is present.
  rejects(() => run(() => ({ ...measured(() => empty()), fragment: () => empty() })), "KEY");
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
  rejects(() => run(() => measured(() => getter as BlockUnit)), "TYPE");
  assert.equal(reads, 0);
  rejects(() => run(() => Promise.resolve(measured(() => empty())) as unknown as MeasuredBlock), "TYPE");
  rejects(() => run(() => measured(() => Promise.resolve(empty()) as unknown as BlockUnit)), "TYPE");
  rejects(
    () => run(() => measured(() => ({ end: 1, height: 10, nodes: [{ type: "chart" }] }) as unknown as BlockUnit)),
    "TYPE",
  );
});
test("obsolete result keys reject rather than supplying compatibility defaults", () => {
  for (const key of ["status", "nextOffset", "decorations", "fragment", "defer"])
    rejects(() => run(() => measured(() => ({ ...empty(), [key]: null }))), "KEY");
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
    rejects(() => run(() => measured(() => ({ end: 1, height: 10, nodes }))), "TYPE");
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
  rejects(() => retained?.measureText(richInput("A", 100, 10, 10, "forged")), "MEASUREMENT_CONTEXT");
  const bad = defineBlockAdapter({
    name: "bad-resource",
    validate: (input) => input,
    measure(_props, context) {
      retained = context;
      context.measureText(richInput("A", 100, 10, 10, "forged"));
      return measured(() => empty());
    },
  });
  rejects(() => layoutFlow(flow([extension(bad, {})]), {}, createExtensions([bad])), "FONT_RESOURCE");
  rejects(() => retained?.measureText(richInput("A", 100, 10, 10)), "MEASUREMENT_CONTEXT");
});
test("generated policy reserves aggregate wrapper output before snapshotting another fragment", () => {
  const adapter = defineBlockAdapter({
    name: "budget",
    validate: (input) => input,
    measure: () =>
      measured(() => ({
        end: 1,
        height: 10,
        nodes: [{ type: "richText", x: 0, y: 0, height: 10, ...richInput("A", 100, 10, 10) }],
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
    "RESOURCE",
  );
});
test("mutating callback results afterward cannot change delivered native nodes", () => {
  const nodes: import("@updf/core").NodeDefinition[] = [
    { type: "rect", x: 0, y: 0, width: 10, height: 10, paint: { stroke: null } },
  ];
  const result = run(() => measured(() => ({ end: 1, height: 10, nodes })));
  const bytes = render(result.document);
  nodes.length = 0;
  assert.deepEqual(render(result.document), bytes);
  assert.ok(Object.isFrozen(result.document.pages[0]?.children));
});
