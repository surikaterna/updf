import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import {
  type BlockContent,
  block,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  type MeasureContext,
  type MeasuredContent,
  measure,
  paragraph,
} from "@updf/layout";
import { chart, chartAdapter } from "../../../tests/fixtures/chart.js";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { flow } from "./fixtures.js";

function rejects(callback: () => unknown, code: string): void {
  assert.throws(callback, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
function producer(
  content: BlockContent,
  inspect: (context: MeasureContext, result: MeasuredContent) => void = () => {},
) {
  return defineBlockAdapter({
    name: "test.content-owner",
    validate: (input) => input,
    measure(_props, context) {
      const result = context.measureContent(content, { width: context.width });
      inspect(context, result);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: result.size,
        fragment(request) {
          if (result.size.height > request.availableHeight) return { status: "defer" };
          return { status: "placed", nextOffset: 1, height: result.size.height, nodes: result.nodes };
        },
      };
    },
  });
}
test("public adapter content measurement uses the same paragraph and stacked block engine", () => {
  const content = block({
    children: [paragraph({ children: "First paragraph" }), paragraph({ children: "Second paragraph" })],
    style: { padding: { top: 2, right: 3, bottom: 2, left: 3 }, gap: 4 },
  });
  const natural = measure(content, { width: 100 });
  const adapter = producer(content, (_context, result) => {
    assert.deepEqual(result.size, natural.size);
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.nodes) && Object.isFrozen(result.size));
  });
  const viaAdapter = layoutFlow(flow([extension(adapter, {})], { height: 100 }), {}, createExtensions([adapter]));
  const direct = layoutFlow(flow([content], { height: 100 }));
  assert.equal(viaAdapter.placements[0]?.box.height, natural.size.height);
  assert.equal(viaAdapter.placements[0]?.box.height, direct.placements[0]?.box.height);
  assert.ok(render(viaAdapter.document).length > 0);
});
test("nested public adapters share the installed operation-local extension scope", () => {
  const adapter = producer(block({ children: [chart({ height: 40, values: [0.2, 0.8] })] }));
  const input = flow([extension(adapter, {})], { height: 100 });
  rejects(() => layoutFlow(input, {}, createExtensions([adapter])), "KEY");
  const result = layoutFlow(input, {}, createExtensions([adapter, chartAdapter]));
  assert.equal(result.placements[0]?.box.height, 40);
  assert.ok(render(result.document).length > 0);
});
test("content measurement captures prepared fonts from the owning operation, not a new default operation", async () => {
  const font = await fixtureFont();
  const adapter = producer(paragraph({ children: "ABC", defaultStyle: { font: "Demo" } }));
  const input = flow([extension(adapter, {})]);
  rejects(() => layoutFlow(input, {}, createExtensions([adapter])), "FONT_RESOURCE");
  const options = { resources: { Demo: font } };
  const result = layoutFlow(input, options, createExtensions([adapter]));
  assert.ok(render(result.document, options).length > 0);
});
test("retained content measurement closes on success and failure", () => {
  let retained: MeasureContext | undefined;
  const content = paragraph({ children: "A" });
  const adapter = producer(content, (context) => {
    retained = context;
  });
  layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  assert.ok(retained);
  rejects(() => retained?.measureContent(content, { width: 100 }), "MEASUREMENT_CONTEXT");
  const failed = producer(content, (context) => {
    retained = context;
    context.measureContent(content, { width: 100, height: 0 });
  });
  rejects(() => layoutFlow(flow([extension(failed, {})]), {}, createExtensions([failed])), "VERTICAL_OVERFLOW");
  rejects(() => retained?.measureContent(content, { width: 100 }), "MEASUREMENT_CONTEXT");
});
test("content constraints reject accessors, unknown fields, undefined and width outside the owner", () => {
  let reads = 0;
  const content = paragraph({ children: "A" });
  const constraints = Object.defineProperty({}, "width", {
    enumerable: true,
    get() {
      reads++;
      return 100;
    },
  });
  const adapter = producer(content, (context) => {
    rejects(() => context.measureContent(content, constraints as { width: number }), "TYPE");
    rejects(() => context.measureContent(content, { width: 101 }), "GEOMETRY");
    rejects(() => context.measureContent(content, { width: 0 }), "GEOMETRY");
    rejects(
      () => context.measureContent(content, { width: 100, height: undefined } as unknown as { width: number }),
      "GEOMETRY",
    );
    rejects(() => context.measureContent(content, { width: 100, extra: 1 } as { width: number }), "KEY");
  });
  layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  assert.equal(reads, 0);
});
test("content measurement keeps generated quotas cumulative across selected owner occurrences", () => {
  const adapter = producer(paragraph({ children: "AB" }));
  const input = flow([extension(adapter, {}), extension(adapter, {})]);
  rejects(
    () => layoutFlow(input, { profile: "service", limits: { textCodePoints: 3 } }, createExtensions([adapter])),
    "LIMIT",
  );
  assert.equal(
    layoutFlow(input, { profile: "service", limits: { textCodePoints: 4 } }, createExtensions([adapter])).pageCount,
    1,
  );
});
test("content measurement rejects page controls instead of creating pages inside an owner", () => {
  const adapter = producer({ type: "pageBreak" });
  rejects(() => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])), "VDOM_HIERARCHY");
});
