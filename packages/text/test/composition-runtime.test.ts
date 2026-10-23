import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render, type NodeDefinition } from "@updf/core";
import { createLayoutOperation as coreOperation, snapshotData } from "@updf/core/internal";
import { nativeNodeToVdom } from "@updf/core/internal-drawing";
import { h, lower } from "@updf/core/vdom";
import { useOperationCapability } from "@updf/core/resources";
import type { CompositionPlan, ComposedTextFrame } from "@updf/text/composition";
import { createHelvetica } from "@updf/fonts";
import { compositionOptions, createLayoutOperation, installation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";

const input = () => ({ ...rectangular("AB"), maxHeight: 100 });
const document = (node: NodeDefinition) =>
  ({ version: 1, pages: [{ width: 120, height: 120, children: [node] }] }) as const;
function rejects(invoke: () => unknown, code: string, path?: string) {
  assert.throws(
    invoke,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}
test("prepared native data traverses the ordinary VDOM lowering and exact native admission path", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  const frame = operation.composeText(input(), "/native");
  const node = operation.composedText(frame, "/native");
  operation.close();
  const lowered = lower(
    h("document", {
      version: 1,
      children: h("page", {
        width: 120,
        height: 120,
        children: nativeNodeToVdom(node),
      }),
    }),
    options,
  );
  assert.deepEqual(lowered, document(node));
  assert.deepEqual(render(lowered, options), render(document(node), options));
});

test("optional capability is explicit, missing errors use origin, malformed presence rejects synchronously", () => {
  const plain = coreOperation(fontOptions());
  try {
    rejects(() => useOperationCapability(plain, installation.capability), "MEASUREMENT_CONTEXT");
  } finally {
    plain.close();
  }
  for (const capability of [null, 3, Promise.resolve({}), {}]) {
    const options = fontOptions();
    rejects(() => coreOperation({ ...options, capability } as never), "MEASUREMENT_CONTEXT", "/options/capability");
  }
  let reads = 0;
  const options = fontOptions();
  const malformed = {
    ...options,
    get capability() {
      reads++;
      return () => ({});
    },
  };
  rejects(() => coreOperation(malformed as never), "TYPE");
  assert.equal(reads, 0);
});

test("frames require active exact owner, copies/JSON/forged payloads reject; output remains durable", () => {
  const options = compositionOptions();
  const first = createLayoutOperation(options),
    second = createLayoutOperation(options);
  const frame = first.composeText(input(), "/first");
  const node = first.composedText(frame, "/first");
  rejects(() => second.composedText(frame, "/second"), "MEASUREMENT_CONTEXT");
  rejects(() => first.composedText({ ...frame } as ComposedTextFrame, "/copy"), "MEASUREMENT_CONTEXT");
  first.close();
  second.close();
  rejects(() => first.composedText(frame, "/closed"), "MEASUREMENT_CONTEXT");
  const bytes = render(document(node), options);
  assert.deepEqual(render(snapshotData(document(node), "/copy"), options), bytes);
  rejects(() => render(JSON.parse(JSON.stringify(document(node))), options), "MEASUREMENT_CONTEXT");
  if (node.type !== "nativeLeaf") assert.fail("Expected nativeLeaf");
  rejects(() => render(document({ ...node, payload: { ...node.payload } }), options), "MEASUREMENT_CONTEXT");
  rejects(() => render(document({ ...node, width: node.width + Number.EPSILON * node.width }), options), "GEOMETRY");
  rejects(() => render(document(node), { ...options, resources: { Helvetica: createHelvetica() } }), "FONT_RESOURCE");
});

test("input data, reports and selected output are captured", () => {
  let output: CompositionPlan | undefined;
  const options = compositionOptions({}, (plan, captured) => {
    assert.ok(Object.isFrozen(captured.paragraphs[0]?.runs));
    output = structuredReport(plan);
    return output;
  });
  const operation = createLayoutOperation(options);
  const request = input();
  const frame = operation.composeText(request, "/origin");
  const node = operation.composedText(frame, "/origin");
  const bytes = render(document(node), options);
  (request.paragraphs[0]!.runs[0]! as { text: string }).text = "changed";
  (output!.measurement as { consumedHeight: number }).consumedHeight = 999;
  (output!.fragments[0]! as { baseline: number }).baseline = 999;
  assert.equal(frame.height, 16);
  assert.ok(Object.isFrozen(frame.measurement.lines));
  assert.deepEqual(render(document(node), options), bytes);
  operation.close();
});
function structuredReport(plan: CompositionPlan): CompositionPlan {
  return {
    measurement: structuredClone(plan.measurement),
    bands: structuredClone(plan.bands),
    fragments: plan.fragments.map((fragment) => ({ ...fragment })),
  };
}

test("composition attempts retain cumulative charges, including failed composition, with shared text policy", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation({ ...options, limits: { nodes: 200 } });
  let successful = 0;
  try {
    for (let i = 0; i < 20; i++) {
      try {
        operation.composeText(input(), "/repeat");
        successful++;
      } catch (error) {
        assert.ok(error instanceof DocumentError);
        assert.equal(error.diagnostics[0]?.code, "LIMIT");
        break;
      }
    }
    assert.ok(successful > 0 && successful < 20);
    rejects(() => operation.composeText(input(), "/repeat"), "LIMIT");
  } finally {
    operation.close();
  }
  const failed = createLayoutOperation({ ...options, limits: { nodes: 80 } });
  rejects(() => failed.composeText({ ...input(), maxHeight: 1 }, "/failure"), "VERTICAL_OVERFLOW");
  rejects(() => failed.composeText(input(), "/failure"), "LIMIT");
  failed.close();
  const textLimited = createLayoutOperation({ ...options, limits: { textCodePoints: 1 } });
  rejects(() => textLimited.composeText(input(), "/text"), "LIMIT");
  textLimited.close();
});

test("a malformed later sealed leaf rejects the whole native graph before any collection or painting", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  const node = operation.composedText(operation.composeText(input()), "/leaf");
  if (node.type !== "nativeLeaf") assert.fail("Expected nativeLeaf");
  operation.close();
  let collections = 0;
  const provider = {
    ...options.providers[0]!,
    collectText() {
      collections++;
    },
  };
  const children = [node, { ...node, height: node.height + 1 }];
  rejects(
    () => render({ version: 1, pages: [{ width: 120, height: 120, children }] }, { ...options, providers: [provider] }),
    "GEOMETRY",
  );
  assert.equal(collections, 0);
});
