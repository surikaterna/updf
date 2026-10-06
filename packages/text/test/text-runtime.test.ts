import assert from "node:assert/strict";
import test from "node:test";
import { type DocumentDefinition, DocumentError, render } from "@updf/core";
import { createOwnedResource } from "@updf/core/resources";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";
import { measure } from "../../core/dist/cjs/core/measure.js";
import { operation } from "../../core/dist/cjs/core/operation.js";

const text = {
  type: "richText",
  x: 0,
  y: 0,
  width: 100,
  height: 20,
  paragraphs: [
    {
      runs: [{ text: "AB" }],
      defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
      lineHeight: 12,
      align: "left",
      whiteSpace: "preserve",
      breakLongWords: "error",
    },
  ],
} as const;
const document: DocumentDefinition = { version: 1, pages: [{ width: 100, height: 100, children: [text] }] };
const missing = (run: () => unknown, path: string) =>
  assert.throws(
    run,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "FONT_RESOURCE" &&
      error.diagnostics[0]?.path === path,
  );

test("text requires explicitly bound resource, runtime and provider; geometry needs none", () => {
  missing(() => render(document), "/pages/0/children/0");
  const resource = createHelvetica(),
    runtime = fontRuntime();
  missing(() => render(document, { resources: { Helvetica: resource } }), "/pages/0/children/0");
  missing(
    () =>
      render(document, {
        resources: { Helvetica: resource },
        text: createTextService({ runtime, defaultFont: "Helvetica" }),
      }),
    "/pages/0/children/0/paragraphs/0",
  );
  missing(
    () =>
      render(document, {
        resources: { Helvetica: createOwnedResource({ other: true }) },
        text: createTextService({ runtime, defaultFont: "Helvetica" }),
      }),
    "/pages/0/children/0/paragraphs/0/defaultStyle/font",
  );
  const options = {
    resources: { Helvetica: resource, Other: createOwnedResource({ image: true }) },
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
    providers: [fontProvider(runtime)],
  };
  assert.ok(render(document, options).length);
  assert.ok(render({ version: 1, pages: [{ width: 10, height: 10, children: [] }] }).length);
});

test("operation copies bindings, providers and executable callbacks independently from metadata snapshots", () => {
  const runtime = fontRuntime(),
    resource = createHelvetica();
  const resources = { Helvetica: resource },
    providers = [fontProvider(runtime)];
  const owned = operation({ resources, text: createTextService({ runtime, defaultFont: "Helvetica" }), providers });
  resources.Helvetica = createHelvetica();
  providers.length = 0;
  assert.equal(owned.fonts.bindings.get("Helvetica"), resource);
  assert.equal(owned.providers.length, 1);
  const pages = measure(document, owned.fonts);
  const node = pages[0]?.children[0];
  assert.ok(node?.type === "richText" && node.fragments[0]?.run);
  assert.ok(!("preparedFont" in node) && !("glyphs" in node.fragments[0]));
});

test("inline visual metrics remain numeric and do not require fabricated text runs", () => {
  const runtime = fontRuntime(),
    resource = createHelvetica();
  const owned = operation({ resources: { Helvetica: resource }, text: createTextService({ runtime }) });
  const paragraph = {
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
    runs: [{ text: "" }],
    lineHeight: 12,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  } as const;
  const metrics = { advance: 10, left: 0, right: 10, ascent: 8, descent: 2, top: -8, bottom: 2, empty: false };
  const visuals = () => [{ runIndex: 0, path: "/visual", metrics }];
  const lines = owned.fonts.service!.inline(
    paragraph,
    visuals,
    100,
    false,
    { bindings: owned.fonts.bindings, budget: owned.budget },
    "",
  );
  assert.equal(lines[0]?.line.advance, 10);
});

test("resource binding diagnostics escape ids and unique byte budgets retain the binding path", () => {
  const resource = createOwnedResource({ bytes: 999 }, { byteLength: 5 });
  assert.throws(
    () => operation({ resources: { "bad/~": resource } }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "RESOURCE" &&
      error.diagnostics[0]?.path === "/resources/bad~1~0",
  );
  assert.doesNotThrow(() => operation({ resources: { A: resource, Alias: resource }, limits: { resourceBytes: 5 } }));
  assert.throws(
    () =>
      operation({
        resources: { A: resource, B: createOwnedResource({}, { byteLength: 1 }) },
        limits: { resourceBytes: 5 },
      }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "LIMIT" &&
      error.diagnostics[0]?.path === "/resources/B",
  );
});

test("accessor capabilities are rejected without invocation and callbacks are captured per operation", () => {
  let calls = 0;
  const runtime = { ...fontRuntime() };
  Object.defineProperty(runtime, "measure", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("getter");
    },
  });
  assert.throws(() => createTextService({ runtime }), DocumentError);
  const provider = Object.defineProperty({ slot: {} }, "collectText", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("getter");
    },
  });
  assert.throws(() => operation({ providers: [provider] }), DocumentError);
  assert.equal(calls, 0);
  const mutable = { ...fontRuntime() },
    resource = createHelvetica();
  const owned = operation({
    resources: { Helvetica: resource },
    text: createTextService({ runtime: mutable, defaultFont: "Helvetica" }),
  });
  mutable.measure = () => {
    throw new Error("changed after capture");
  };
  assert.doesNotThrow(() => measure(document, owned.fonts));
});
