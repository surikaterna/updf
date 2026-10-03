import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import {
  blockComponent,
  createExtensions,
  Document,
  defineBlockAdapter,
  defineBlockPart,
  extension,
  Flow,
  layout,
  layoutFlow,
  type MeasureContext,
  type MeasuredBlock,
} from "../../../tests/fixtures/transitional-layout.js";
import { flow } from "./fixtures.js";

const empty = (): MeasuredBlock => ({
  fragmentation: "atomic",
  extent: 1,
  naturalSize: { width: 100, height: 0 },
  fragment: () => ({ status: "placed", nextOffset: 1, height: 0, nodes: [] }),
});
test("F generic public author parts capture cells without a table-specific normalizer/paginator", () => {
  const Part = defineBlockPart<{ readonly children?: string }>("test.part");
  let retained: MeasureContext | undefined;
  const adapter = defineBlockAdapter<{ children?: import("@updf/layout").BlockContent }>({
    name: "test.author",
    validate: (input) => input as { children?: import("@updf/layout").BlockContent },
    measure(props, context) {
      retained = context;
      const parts = context.readParts(props.children ?? [], [Part]);
      assert.equal(parts[0]?.key, "source-key");
      assert.ok(parts[0]);
      const measured = context.measureContent(parts[0].content, { width: context.width, implicitParagraph: true });
      return {
        ...empty(),
        naturalSize: measured.size,
        fragment: () => ({ status: "placed", nextOffset: 1, height: measured.size.height, nodes: measured.nodes }),
      };
    },
  });
  const Author = blockComponent(adapter);
  const content = h(Document, {
    children: h(Flow, {
      pageSize: { width: 100, height: 40 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions: createExtensions([adapter]),
      children: h(Author, { children: h(Part, { children: "generic" }, "source-key") }),
    }),
  });
  assert.equal(layout(content).pageCount, 1);
  assert.ok(retained);
  const context = retained;
  for (const invoke of [() => context.readParts([], [Part]), () => context.reserveDecorations([])])
    assert.throws(
      invoke,
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
    );
});
test("F generic source metadata cannot forge unsafe extents, mismatched keys or accessor arrays", () => {
  let reads = 0;
  const keys = Object.defineProperty([], "0", {
    enumerable: true,
    get() {
      reads++;
      return "key";
    },
  });
  for (const metadata of [
    { sourceExtent: -1 },
    { sourceExtent: Number.NaN },
    { sourceKeys: ["a", "b"] },
    { sourceKeys: keys },
    { sourcePaths: ["not-relative"] },
  ]) {
    const adapter = defineBlockAdapter({
      name: "test.metadata",
      validate: (input) => input,
      measure: () => ({ ...empty(), ...metadata }),
    });
    assert.throws(
      () => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE",
    );
  }
  assert.equal(reads, 0);
});
test("F zero source extent is generic metadata, never a substitute for strict fragment progress", () => {
  const adapter = defineBlockAdapter({
    name: "test.zero-source",
    validate: (input) => input,
    measure: () => ({ ...empty(), sourceExtent: 0, sourceKeys: [] }),
  });
  const result = layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  assert.deepEqual(result.placements[0]?.sourceRange, { start: 0, end: 0 });
  const invalid = defineBlockAdapter({
    name: "test.nonprogress",
    validate: (input) => input,
    measure: () => ({
      ...empty(),
      sourceExtent: 0,
      fragment: () => ({ status: "placed", nextOffset: 0, height: 0, nodes: [] }),
    }),
  });
  assert.throws(
    () => layoutFlow(flow([extension(invalid, {})]), {}, createExtensions([invalid])),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE",
  );
});
