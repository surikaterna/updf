import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type OperationOptions } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { createOwnedResource, type TextServiceContext } from "@updf/core/resources";
import { measureTextUnknown, type MeasureOptions, type TextMeasurementInput } from "@updf/text";
import { fontMeasurementOptions, fontOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { richInput } from "../../../tests/fixtures/rich-input.js";

const input = richInput("AB");
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
type SharedOptions = Pick<OperationOptions, "resources" | "profile" | "limits">;
function equivalent(value: unknown, setup: SharedOptions = {}) {
  assert.deepEqual(
    outcome(() => measureTextUnknown(value, fontMeasurementOptions(setup))),
    outcome(() => reference(value, fontOptions(setup))),
  );
}
function diagnostic(options: unknown, code: string, path: string) {
  assert.throws(
    () => measureTextUnknown(input, options as MeasureOptions),
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path,
  );
}

test("standalone measurement preserves operation DTOs, input diagnostics, and fresh budgets", () => {
  const undefinedFont = {
    ...input,
    paragraphs: [{ ...input.paragraphs[0], defaultStyle: { font: undefined, fontSize: 10, color: [0, 0, 0] } }],
  };
  for (const value of [null, {}, undefinedFont, { ...input, width: Infinity }, input]) equivalent(value);
  const getter = Object.defineProperty({ ...input }, "paragraphs", {
    enumerable: true,
    get: () => assert.fail("getter invoked"),
  });
  equivalent(getter);
  equivalent(Object.create(input));
  equivalent(input, { limits: { textCodePoints: 0 } });
  const options = fontMeasurementOptions({ limits: { textCodePoints: 2 } });
  const measured = measureTextUnknown(input, options);
  assert.ok(Object.isFrozen(measured));
  assert.ok(Object.isFrozen(measured.lines));
  assert.ok(Object.isFrozen(measured.lines[0]));
  assert.equal(measureTextUnknown(input, options).lineCount, measured.lineCount);
});

test("standalone options reject rendering keys even when empty and never invoke getters", () => {
  const options = fontMeasurementOptions();
  for (const key of ["text", "providers", "extra"]) diagnostic({ ...options, [key]: {} }, "KEY", `/options/${key}`);
  diagnostic({ resources: options.resources }, "TYPE", "/options/measurer");
  diagnostic({ ...options, measurer: {} }, "FONT_RESOURCE", "/options/measurer/measure");
  diagnostic({ ...options, measurer: { ...options.measurer, fixed() {} } }, "KEY", "/options/measurer/fixed");
  diagnostic(Object.create(options), "TYPE", "/options");
  diagnostic({ ...options, measurer: Object.create(options.measurer) }, "TYPE", "/options/measurer");
  const accessor = {
    get measure() {
      return assert.fail("capability getter");
    },
  };
  diagnostic({ ...options, measurer: accessor }, "TYPE", "/options/measurer/measure");
  const getter = Object.defineProperty({ ...options }, "measurer", { get: () => assert.fail("options getter") });
  diagnostic(getter, "TYPE", "/options/measurer");
  for (const key of ["pages", "outputBytes", "pathCommands"])
    diagnostic({ ...options, limits: { [key]: 0.5 } }, "VALUE", `/options/limits/${key}`);
  assert.equal(
    measureTextUnknown(input, { ...options, limits: { pages: 0, outputBytes: 0, pathCommands: 0 } }).lineCount,
    1,
  );
});

test("unused resources count once per identity and enforce the exact cap on each fresh call", () => {
  const resource = createOwnedResource({ unused: true }, { byteLength: 10 });
  const resources = { Extra: resource, Alias: resource };
  equivalent(input, { resources, limits: { resourceBytes: 10 } });
  equivalent(input, { resources, limits: { resourceBytes: 9 } });
  const options = fontMeasurementOptions({ resources, limits: { resourceBytes: 10 } });
  for (let i = 0; i < 2; i++) assert.equal(measureTextUnknown(input, options).lineCount, 1);
  diagnostic({ ...options, resources: { Fake: { ...resource } } }, "RESOURCE", "/resources/Fake");
  const other = createOwnedResource({}, { byteLength: 1 });
  diagnostic({ ...options, resources: { ...options.resources, Other: other } }, "LIMIT", "/resources/Other");
});

test("callbacks retain receiver, error identity, owned snapshots and post-call context behavior", () => {
  const options = fontMeasurementOptions();
  const original = options.measurer;
  const contexts: TextServiceContext[] = [];
  const failure = new Error("callback failure");
  const measurer = {
    measure(value: TextMeasurementInput, context: TextServiceContext, path: string) {
      assert.equal(this, measurer);
      contexts.push(context);
      assert.equal(path, "");
      if (value.paragraphs[0]?.runs[0]?.text === "fail") throw failure;
      return original.measure(value, context, path);
    },
  };
  assert.throws(
    () => measureTextUnknown(richInput("fail"), { ...options, measurer }),
    (e) => e === failure,
  );
  const result = measureTextUnknown(input, { ...options, measurer });
  assert.ok(Object.isFrozen(result));
  assert.notEqual(contexts[0]?.budget, contexts[1]?.budget);
  assert.equal(original.measure(input, contexts[1]!, "").lineCount, result.lineCount);
});

test("mutation during measurement cannot change captured resource bindings or callback", () => {
  const options = fontMeasurementOptions();
  const original = options.measurer;
  const measurer = { ...original };
  const resources = { ...options.resources };
  let saved: TextServiceContext | undefined;
  measurer.measure = (value, context, path) => {
    saved = context;
    measurer.measure = () => assert.fail("mutated callback invoked");
    delete resources.Helvetica;
    return original.measure(value, context, path);
  };
  assert.equal(measureTextUnknown(input, { ...options, resources, measurer }).lineCount, 1);
  assert.equal(saved?.bindings.get("Helvetica"), options.resources?.Helvetica);
});
