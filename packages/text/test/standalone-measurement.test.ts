import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type OperationOptions } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { createOwnedResource, type TextService, type TextServiceContext } from "@updf/core/resources";
import { measureTextUnknown, type TextMeasurementInput } from "@updf/text";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";

const input = { kind: "plain", text: "AB", width: 100, fontSize: 10, lineHeight: 12, align: "left" } as const;
function reference(value: unknown, options: OperationOptions) {
  const operation = createLayoutOperation(options);
  try {
    return operation.measureText(value as TextMeasurementInput, "");
  } finally {
    operation.close();
  }
}
function outcome(run: () => unknown) {
  try {
    return run();
  } catch (error) {
    if (error instanceof DocumentError) return error.diagnostics;
    throw error;
  }
}
function equivalent(value: unknown, options: OperationOptions) {
  assert.deepEqual(
    outcome(() => measureTextUnknown(value, options)),
    outcome(() => reference(value, options)),
  );
}

test("standalone measurement preserves general-operation diagnostics and fresh budgets", () => {
  const options = fontOptions();
  for (const value of [null, {}, { ...input, font: undefined }, { ...input, width: Infinity }, input])
    equivalent(value, options);
  const getter = Object.defineProperty({ ...input }, "text", { get: () => assert.fail("getter invoked") });
  equivalent(getter, options);
  equivalent(Object.create(input), options);
  for (const options of [
    {},
    { ...fontOptions(), providers: [{}] },
    { ...fontOptions(), limits: { textCodePoints: 0 } },
  ])
    equivalent(input, options as OperationOptions);
  const broken = { ...options.text, fixedInk: undefined };
  equivalent(input, { ...options, text: broken as unknown as TextService });
  const getterOptions = Object.defineProperty({ ...options }, "providers", { get: () => assert.fail("getter") });
  equivalent(input, getterOptions);
  const measured = measureTextUnknown(input, options);
  assert.ok(Object.isFrozen(measured));
  assert.ok(Object.isFrozen(measured.lines));
  assert.ok(Object.isFrozen(measured.lines[0]));
  assert.equal(measureTextUnknown(input, options).lineCount, measured.lineCount);
});

test("callbacks retain receiver, snapshot, error identity and post-call context behavior", () => {
  for (const invoke of [measureTextUnknown, reference]) {
    const options = fontOptions();
    const original = options.text!;
    const contexts: TextServiceContext[] = [];
    const failure = new Error("callback failure");
    const service: TextService = {
      ...original,
      measure(value, context, path) {
        assert.equal(this, service);
        contexts.push(context);
        assert.equal(path, "");
        if (value.kind === "plain" && value.text === "fail") throw failure;
        return original.measure(value, context, path);
      },
    };
    const provider = { slot: {}, initialize: () => assert.fail("provider initialized") };
    assert.throws(
      () => invoke({ ...input, text: "fail" }, { ...options, text: service, providers: [provider] }),
      (error) => error === failure,
    );
    const result = invoke(input, { ...options, text: service, providers: [provider] });
    assert.ok(Object.isFrozen(result));
    assert.notEqual(contexts[0]?.budget, contexts[1]?.budget);
    assert.equal(original.measure(input, contexts[1]!, "").lineCount, result.lineCount);
  }
});

test("unused providers/resources and inherited or accessor capabilities still validate", () => {
  const options = fontOptions();
  const resource = createOwnedResource({ unused: true }, { byteLength: 10 });
  const resources = { ...options.resources, Extra: resource, Alias: resource };
  equivalent(input, { ...options, resources, limits: { resourceBytes: 10 } });
  equivalent(input, { ...options, resources, limits: { resourceBytes: 9 } });
  equivalent(input, Object.create(options));
  const service = Object.defineProperty({ ...options.text! }, "fixed", { get: () => assert.fail("unused getter") });
  equivalent(input, { ...options, text: service });
  equivalent(input, { ...options, text: Object.create(options.text!) });
  const provider = Object.defineProperty({ slot: {} }, "collectDrawing", { get: () => assert.fail("provider getter") });
  equivalent(input, { ...options, providers: [provider] });
  const bounded = { ...options, limits: { textCodePoints: 2 } };
  assert.equal(measureTextUnknown(input, bounded).lineCount, 1);
  assert.equal(measureTextUnknown(input, bounded).lineCount, 1);
});

test("service mutation during measurement cannot change the captured callback", () => {
  for (const invoke of [measureTextUnknown, reference]) {
    const options = fontOptions();
    const original = options.text!;
    const service = { ...original };
    const resources = { ...options.resources };
    let saved: TextServiceContext | undefined;
    service.measure = (value, context, path) => {
      saved = context;
      service.measure = () => assert.fail("mutated callback invoked");
      delete resources.Helvetica;
      return original.measure(value, context, path);
    };
    const result = invoke(input, { ...options, resources, text: service });
    assert.equal(result.lineCount, 1);
    assert.equal(saved?.bindings.get("Helvetica"), options.resources?.Helvetica);
  }
});
