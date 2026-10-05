import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const file = join(root, "tests/consumer/documentation-hover-fixture.mts");
const source = `import { bits } from "@updf/layout-kernel/numeric";
import { Page, resolveWidths } from "@updf/layout";
bits(0); Page; resolveWidths({ availableWidth: 10, tracks: [10] });`;

function languageService(): ts.LanguageService {
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
  };
  return ts.createLanguageService({
    ...ts.sys,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getCompilationSettings: () => options,
    getScriptFileNames: () => [file],
    getScriptVersion: () => "0",
    getScriptSnapshot: (name) => {
      const text = name === file ? source : ts.sys.readFile(name);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => root,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
  });
}

test("public import hovers retain scoped package prose without custom JSDoc tags", () => {
  const service = languageService();
  try {
    assert.deepEqual(service.getSemanticDiagnostics(file), []);
    for (const [name, expected] of [
      ["bits", "From `@updf/layout-kernel/numeric`: encode finite nonnegative binary64"],
      ["Page", "Fixed native drawing section, exported as Page from `@updf/layout`; children do not flow."],
      ["resolveWidths", "Defaults and exact rounding follow `@updf/layout-kernel`; returns frozen widths/result."],
    ]) {
      assert.ok(name && expected);
      const hover = service.getQuickInfoAtPosition(file, source.lastIndexOf(name));
      assert.ok(hover, name);
      assert.ok(ts.displayPartsToString(hover.documentation).includes(expected), name);
      assert.ok(!hover.tags?.some((tag) => tag.name === "updf"), name);
    }
  } finally {
    service.dispose();
  }
});

test("native source JSDoc never parses scoped package names as custom tags", () => {
  const files = ts.sys.readDirectory(join(root, "packages"), [".ts", ".tsx"], ["**/node_modules/**", "**/dist/**"]);
  for (const name of files.filter((name) => name.includes("/src/") && !name.includes("/legacy/"))) {
    const text = ts.sys.readFile(name);
    assert.notEqual(text, undefined);
    const parsed = ts.createSourceFile(name, text ?? "", ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node): void {
      assert.ok(!ts.getJSDocTags(node).some((tag) => tag.tagName.text === "updf"), name);
      ts.forEachChild(node, visit);
    }
    visit(parsed);
  }
});
