import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { checkCoreArtifacts, checkTextArtifacts } from "../../scripts/consumer/core-artifacts.js";
import { valueExports } from "../../scripts/packaging/value-exports.js";

test("facades omit type-only aliases of value symbols but retain real value exports", () => {
  const text =
    "class Writer {} export type { Writer as PdfWriter }; export { type Writer as TypeWriter, Writer }; export const value = 1;";
  const options = { noLib: true, target: ts.ScriptTarget.ES2022 };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name, version) => ts.createSourceFile(name, text, version);
  const program = ts.createProgram(["entry.ts"], options, host);
  const source = program.getSourceFile("entry.ts");
  assert.ok(source);
  assert.deepEqual(valueExports(program, source), ["Writer", "value"]);
});

test("text tarballs reject removed fixed text in every emitted format and map", () => {
  for (const prefix of ["dist/", "dist/cjs/", "dist/node/"])
    for (const extension of [
      ".js",
      ".mjs",
      ".d.ts",
      ".d.mts",
      ".d.cts",
      ".js.map",
      ".mjs.map",
      ".d.ts.map",
      ".d.mts.map",
      ".d.cts.map",
    ])
      assert.throws(() => checkTextArtifacts([`${prefix}fixed-text${extension}`]), /Obsolete fixed text/u);
  assert.doesNotThrow(() => checkTextArtifacts(["dist/measure.js", "dist/cjs/service.js", "dist/node/index.mjs"]));
});

test("core tarballs reject obsolete implementations in every emitted format and map", () => {
  for (const prefix of ["dist/", "dist/cjs/", "dist/node/"]) {
    for (const module of [
      "fonts/index",
      "core/fixed-text",
      "core/metrics",
      "measurement/index",
      "measurement/inline-paint",
      "measurement/measure",
      "measurement/source",
      "measurement/validate",
      "measurement/wrap",
    ]) {
      for (const extension of [".js", ".mjs", ".d.ts", ".d.mts", ".d.cts", ".js.map", ".d.ts.map"])
        assert.throws(() => checkCoreArtifacts([prefix + module + extension]), /Obsolete core/u);
    }
  }
  assert.doesNotThrow(() =>
    checkCoreArtifacts([
      "dist/core/measure.js",
      "dist/measurement/types.d.ts",
      "dist/cjs/resources.js",
      "dist/node/pdf.mjs",
    ]),
  );
});
