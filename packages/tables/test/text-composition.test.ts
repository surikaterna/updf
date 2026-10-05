import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createHelvetica, fontRuntime } from "@updf/fonts";
import { createExtensions, measure } from "@updf/layout";
import { table, tableExtension } from "@updf/tables";
import { createTextService } from "@updf/text";

test("empty tables validate selected and overridden style fonts through the explicit service", () => {
  const options = {
    extensions: createExtensions([tableExtension]),
    resources: { Custom: createHelvetica() },
    text: createTextService({ runtime: fontRuntime(), defaultFont: "Custom" }),
  };
  assert.equal(measure(table({ columns: [{ width: 50 }], body: [] }), { width: 100 }, options).size.height, 0);
  for (const input of [
    table({ columns: [{ width: 50 }], style: { font: "Missing" }, body: [] }),
    table({
      columns: [{ width: 50, style: { font: "Missing" } }],
      body: [{ cells: [{ style: { font: "Custom" }, children: "" }] }],
    }),
  ])
    assert.throws(
      () => measure(input, { width: 100 }, options),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === "FONT_RESOURCE" &&
        error.diagnostics[0]?.path.endsWith("/font"),
    );
});
