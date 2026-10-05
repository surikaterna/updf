import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, render, renderUnknown } from "@updf/core";
import { createPreparedFont } from "@updf/fonts";
import { fontDocument, fontInput, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { document, prepareAndMeasure, renderTSX } from "./documentation-examples.js";

test("documented fixed-page and native TSX examples render equivalent PDF bytes", () => {
  const pdf = render(document, textOptions({ profile: "service" }));
  assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), "%PDF-");
  assert.deepEqual(renderTSX(), pdf);
});

test("documented unknown boundary exposes structured errors", () => {
  assert.throws(
    () => renderUnknown({ version: 2, pages: [] }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]?.code, "VERSION");
      assert.equal(error.diagnostics[0]?.path, "/version");
      return true;
    },
  );
});

test("documented prepared-font example uses real fixture data and frozen measurements", async () => {
  const input = await fontInput();
  const font = createPreparedFont(input);
  const { byteLength: _byteLength, ...metadata } = font.metadata;
  const bytes = input.bytes;
  assert.ok(bytes instanceof Uint8Array);
  const result = prepareAndMeasure({ ...metadata, bytes: new Uint8Array(bytes) });
  assert.equal(result.width, 180);
  assert.equal(result.lineCount, 1);
  assert.equal(result.consumedHeight, 16);
  assert.ok(Object.isFrozen(result.lines[0]?.fragments));
  const pdf = render(fontDocument([fontText("Hello")]), textOptions({ resources: { Demo: font } }));
  assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), "%PDF-");
});

test("defining JSDoc survives ESM and canonical CJS declaration emission", async () => {
  for (const prefix of ["../dist/", "../dist/cjs/"]) {
    const root = new URL(prefix, import.meta.url);
    for (const [path, contract] of [
      ["index.d.ts", "Render a version-1 fixed-page document"],
      ["measurement/types.d.ts", "Half-open UTF-16 offsets"],
      ["vdom/lower.d.ts", "measurement contexts close on success or failure"],
      ["jsx-runtime.d.ts", "Multiple-static-children alias"],
    ]) {
      assert.ok(path && contract);
      assert.ok((await readFile(new URL(path, root), "utf8")).includes(contract), path);
    }
    const fonts = new URL(`../../fonts/${prefix === "../dist/" ? "dist" : "dist/cjs"}/types.d.ts`, import.meta.url);
    assert.ok((await readFile(fonts, "utf8")).includes("Opaque library-owned handle"));
  }
});
