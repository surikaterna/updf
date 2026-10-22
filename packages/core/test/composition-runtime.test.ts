import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render, type NodeDefinition } from "@updf/core";
import { createLayoutOperation, snapshotData } from "@updf/core/internal";
import { nativeNodeToVdom } from "@updf/core/internal-drawing";
import { h, lower } from "@updf/core/vdom";
import type { CompositionPlan, ComposedTextFrame, TextService } from "@updf/core/resources";
import { createHelvetica } from "@updf/fonts";
import { compositionOptions } from "../../../tests/fixtures/text-flow/options.js";
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
  const plain = createLayoutOperation(fontOptions());
  try {
    rejects(() => plain.composeText(input(), "/adapter"), "FONT_RESOURCE", "/adapter");
  } finally {
    plain.close();
  }
  for (const compose of [undefined, null, 3, Promise.resolve({})]) {
    const options = fontOptions();
    rejects(
      () => createLayoutOperation({ ...options, text: { ...options.text, compose } as unknown as TextService }),
      "FONT_RESOURCE",
      "/options/text/compose",
    );
  }
  let reads = 0;
  const options = fontOptions();
  const text = {
    ...options.text,
    get compose() {
      reads++;
      return () => ({});
    },
  };
  rejects(() => createLayoutOperation({ ...options, text: text as unknown as TextService }), "TYPE");
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
  if (node.type !== "preparedText") assert.fail("Expected preparedText");
  rejects(() => render(document({ ...node, payload: { ...node.payload } }), options), "MEASUREMENT_CONTEXT");
  rejects(() => render(document({ ...node, width: node.width + Number.EPSILON * node.width }), options), "GEOMETRY");
  rejects(() => render(document(node), { ...options, resources: { Helvetica: createHelvetica() } }), "FONT_RESOURCE");
});

test("service callback and receiver, input data, reports and selected output are captured", () => {
  const options = compositionOptions();
  const original = options.text!;
  let output: CompositionPlan | undefined;
  const text = {
    ...original,
    compose(...args: Parameters<NonNullable<TextService["compose"]>>) {
      assert.equal(this, text);
      assert.ok(Object.isFrozen(args[0].paragraphs[0]?.runs));
      output = structuredReport(original.compose!(...args));
      return output;
    },
  };
  const operation = createLayoutOperation({ ...options, text });
  text.compose = () => {
    throw new Error("live callback used");
  };
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
