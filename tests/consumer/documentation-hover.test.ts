import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const file = join(root, "tests/consumer/documentation-hover-fixture.mts");
const source = `import { bits } from "@updf/layout-boxes/numeric";
import { Page, resolveWidths } from "@updf/layout";
import { prepareJpeg, jpeg, jpegProvider } from "@updf/jpeg";
bits(0); Page; resolveWidths({ availableWidth: 10, tracks: [10] });
prepareJpeg(new Uint8Array()); jpeg('photo',{x:0,y:0,width:10,height:10}); jpegProvider();`;

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
      ["bits", "From `@updf/layout-boxes/numeric`: encode finite nonnegative binary64"],
      ["Page", "Fixed native drawing section, exported as Page from `@updf/layout`; children do not flow."],
      ["resolveWidths", "Defaults and exact rounding follow `@updf/layout-boxes`; returns frozen widths/result."],
      ["prepareJpeg", "does not decode entropy or pixels"],
      ["jpeg", "without DPI/orientation/aspect fitting or implicit clipping"],
      ["jpegProvider", "PDF references belong to the current operation"],
    ]) {
      assert.ok(name && expected);
      const call = source.lastIndexOf(`${name}(`);
      const hover = service.getQuickInfoAtPosition(file, call < 0 ? source.lastIndexOf(name) : call);
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
