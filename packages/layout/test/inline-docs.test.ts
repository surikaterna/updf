import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type ContentOptions, document, type Extensions, flow, type paragraph } from "@updf/layout";
import ts from "typescript";
import { layout, measure, textOptions } from "../../../tests/fixtures/text-options.js";

function documentedExample() {
  const markdown = readFileSync(new URL("../../../docs/inline.md", import.meta.url), "utf8");
  const snippet = /## Local inline adapters\s+```ts\n([\s\S]*?)\n```/u.exec(markdown)?.[1];
  assert.ok(snippet, "Local inline adapters must retain an executable TypeScript example");
  const { outputText } = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const execute = new Function(
    "require",
    "exports",
    "options",
    `${outputText}\nreturn { metrics, content, extensions };`,
  );
  return execute(createRequire(import.meta.url), {}, textOptions({})) as {
    metrics: ReturnType<typeof measure>;
    content: ReturnType<typeof paragraph>;
    extensions: Extensions;
  };
}

test("inline documentation example measures with adapters and an ordinary operation-extension list", () => {
  const { metrics, content, extensions } = documentedExample();
  assert.equal(metrics.lines.length, 1);
  assert.equal(metrics.lines[0]?.height, 26.25);
  assert.equal(metrics.size.height, 26.25);
  const options: ContentOptions = { adapters: extensions, extensions: [] };
  assert.deepEqual(measure(content, { width: 180 }, options), metrics);
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 180, height: 100 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions,
        children: content,
      }),
    }),
  );
  assert.equal(result.document.pages.length, 1);
});

test("the old documented measurement adapter option rejects with a structured diagnostic", () => {
  const { content, extensions } = documentedExample();
  // @ts-expect-error An owned adapter set is not an operation-extension descriptor array.
  const invalid: ContentOptions = { extensions };
  assert.throws(
    () => measure(content, { width: 180 }, invalid),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "TYPE" &&
      error.diagnostics[0]?.path === "/options/extensions" &&
      /ordinary array/u.test(error.diagnostics[0]?.message ?? ""),
  );
});
