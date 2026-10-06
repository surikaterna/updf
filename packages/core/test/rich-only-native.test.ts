import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render, renderUnknown } from "@updf/core";
import type { RichTextNode } from "@updf/core";
// @ts-expect-error Native plain node is not exported.
import type { TextNode } from "@updf/core";
// @ts-expect-error Native plain measured plan is not exported.
import type { MeasuredText } from "@updf/core/resources";
// @ts-expect-error Native text props/children are not exported.
import type { TextProps, TextChildren } from "@updf/core/vdom";
import { h } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { measure } from "../dist/cjs/core/measure.js";
import { operation } from "../dist/cjs/core/operation.js";

export type RemovedExportProbes = [TextNode, MeasuredText, TextProps, TextChildren];

const runtime = fontRuntime();
const service = createTextService({ runtime, defaultFont: "Helvetica" });
const options = {
  resources: { Helvetica: createHelvetica() },
  text: service,
  providers: [fontProvider(runtime)],
};
const node: RichTextNode = { type: "richText", x: 0, y: 0, height: 24, ...richInput("AB\nAB") };
const document = (child: unknown) => ({ version: 1, pages: [{ width: 100, height: 100, children: [child] }] });
const diagnostic = (code: string, path: string) => (error: unknown) =>
  error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path;

test("obsolete native node and constructor reject TYPE at their exact type paths", () => {
  const obsolete = {
    type: "text",
    x: 0,
    y: 0,
    width: 100,
    height: 24,
    text: "AB",
    fontSize: 10,
    lineHeight: 12,
    align: "left",
  };
  assert.throws(() => renderUnknown(document(obsolete), options), diagnostic("TYPE", "/pages/0/children/0/type"));
  // @ts-expect-error Removed native VDOM tag.
  assert.throws(() => h("text", obsolete), diagnostic("TYPE", "/type"));
});

test("positioned rich nodes reject former text props instead of normalizing them", () => {
  assert.throws(
    () => renderUnknown(document({ ...node, text: "AB" }), options),
    diagnostic("KEY", "/pages/0/children/0/text"),
  );
  assert.throws(
    () => renderUnknown(document({ ...node, font: "Helvetica" }), options),
    diagnostic("KEY", "/pages/0/children/0/font"),
  );
});

test("native one-run labels retain canonical rich baselines and empty semantics", () => {
  const owned = operation(options);
  const pages = measure({ version: 1, pages: [{ width: 100, height: 100, children: [node] }] }, owned.fonts);
  const plan = pages[0]?.children[0];
  assert.ok(plan?.type === "richText");
  assert.deepEqual(
    plan.fragments.map((fragment) => fragment.baseline),
    [8.75, 20.75],
  );
  assert.deepEqual(
    plan.fragments.map((fragment) => fragment.text),
    ["AB", "AB"],
  );
  assert.ok(renderUnknown(document({ ...node, height: 0, paragraphs: [] }), options).length);
  assert.ok(renderUnknown(document({ ...node, ...richInput("") }), options).length);
  assert.throws(
    () => renderUnknown(document({ ...node, height: 0, ...richInput("") }), options),
    diagnostic("VERTICAL_OVERFLOW", "/pages/0/children/0/height"),
  );
});

test("text service captures exactly seven own callbacks and rejects removed extras", () => {
  const keys = ["measure", "validate", "rich", "inline", "validateStyle", "resolveStyle", "lineBox"];
  assert.deepEqual(Object.keys(service), keys);
  for (const key of ["fixed", "fixedInk"]) {
    assert.throws(
      () => operation({ ...options, text: { ...service, [key]: () => {} } }),
      diagnostic("KEY", `/options/text/${key}`),
    );
  }
  const inherited = Object.assign(Object.create({ rich: service.rich }), service);
  delete inherited.rich;
  assert.throws(() => operation({ ...options, text: inherited }), diagnostic("TYPE", "/options/text"));
  const mutable = { ...service };
  const owned = operation({ ...options, text: mutable });
  mutable.rich = () => {
    throw new Error("changed after capture");
  };
  assert.doesNotThrow(() =>
    measure({ version: 1, pages: [{ width: 100, height: 100, children: [node] }] }, owned.fonts),
  );
});

test("full service validation accepts canonical measurement data, not placed or plain forms", () => {
  const owned = operation(options);
  const context = { bindings: owned.fonts.bindings, budget: owned.budget };
  assert.doesNotThrow(() => service.validate(richInput("AB"), context, "/input"));
  assert.throws(() => service.validate(node, context, "/input"), diagnostic("KEY", "/input/type"));
  assert.throws(
    () => service.validate({ width: 100, text: "AB" }, context, "/input"),
    diagnostic("KEY", "/input/text"),
  );
  assert.ok(render({ version: 1, pages: [{ width: 100, height: 100, children: [node] }] }, options).length);
});
