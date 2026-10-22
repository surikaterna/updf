import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import {
  createExtensions,
  defineBlockAdapter,
  extension,
  type MeasureContext,
  type BlockUnitRequest,
} from "@updf/layout";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { flow } from "./fixtures.js";

function rejects(invoke: () => unknown, code: string) {
  assert.throws(invoke, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}

function probe(inspect: (context: MeasureContext) => void, query: (request: BlockUnitRequest) => void = () => {}) {
  return defineBlockAdapter({
    name: "spike.existing-owner",
    validate: (input) => input,
    measure(_props, context) {
      inspect(context);
      const input = rectangular("AB", {}, context.width);
      const measured = context.measureText(input);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: measured.consumedHeight },
        next: (request) => {
          query(request);
          return {
            end: 1,
            height: measured.consumedHeight,
            nodes: [{ type: "richText", x: 0, y: 0, ...input, height: measured.consumedHeight }],
          };
        },
      };
    },
  });
}

test("existing adapter context closes after success/failure and cannot revive in the next real operation", () => {
  let retained: MeasureContext | undefined;
  const adapter = probe((context) => {
    if (retained) rejects(() => retained?.measureText(rectangular("A")), "MEASUREMENT_CONTEXT");
    retained = context;
    const input = rectangular("AB");
    assert.deepEqual(context.measureText(input), context.measureText(input));
  });
  const input = flow([extension(adapter, {})]);
  layoutFlow(input, {}, createExtensions([adapter]));
  rejects(() => retained?.measureText(rectangular("A")), "MEASUREMENT_CONTEXT");
  layoutFlow(input, {}, createExtensions([adapter]));
  const bad = probe((context) => {
    retained = context;
    throw new Error("intentional spike failure");
  });
  assert.throws(() => layoutFlow(flow([extension(bad, {})]), {}, createExtensions([bad])));
  rejects(() => retained?.measureText(rectangular("A")), "MEASUREMENT_CONTEXT");
});

test("existing source-work ledger remains cumulative across repeat queries and adapter occurrences", () => {
  let calls = 0;
  const adapter = probe((context) => {
    for (let i = 0; i < 3; i++) {
      context.chargeSourceWork(2000, context.sourcePath);
      calls++;
      const input = rectangular("AB");
      assert.deepEqual(context.measureText(input), context.measureText(input));
    }
  });
  rejects(
    () =>
      layoutFlow(
        flow([extension(adapter, {}), extension(adapter, {})]),
        { limits: { nodes: 9000 } },
        createExtensions([adapter]),
      ),
    "LIMIT",
  );
  assert.ok(calls >= 3 && calls < 6, `actual charged queries: ${calls}`);
});

test("existing native admission retries deterministic atomic content and rejects oversize", () => {
  const requests: BlockUnitRequest[] = [];
  const adapter = probe(
    () => {},
    (request) => requests.push(request),
  );
  const options = createExtensions([adapter]);
  const input = flow([{ type: "spacer", height: 30 }, extension(adapter, {})]);
  const first = layoutFlow(input, {}, options);
  assert.equal(first.pageCount, 2);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.deepEqual(layoutFlow(input, {}, options).document, first.document);
  rejects(() => layoutFlow(flow([extension(adapter, {})], { height: 15 }), {}, options), "LAYOUT_OVERSIZED");
});

test("existing adapter measurement diagnostics retain the adapter source origin", () => {
  const adapter = probe((context) => context.measureText(rectangular("\t")));
  assert.throws(
    () => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "CHARACTER" &&
      /\/body\/0.*\/paragraphs\/0\/runs\/0\/text$/u.test(error.diagnostics[0]?.path ?? ""),
  );
});
