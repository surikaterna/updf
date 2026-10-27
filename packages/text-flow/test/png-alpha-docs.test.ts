import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { type AssetFetch, type AssetLoader, AssetError } from "@updf/assets";
import { createAssetLoader } from "@updf/images/load";
import ts from "typescript";

function documentedLoaderExpression() {
  const markdown = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const snippet = /## Automatic PNG URL masks[^\n]*\n(?:(?!\n## )[\s\S])*?```tsx\n([\s\S]*?)\n```/u.exec(markdown)?.[1];
  assert.ok(snippet, "Automatic PNG URL masks must retain a TSX example");
  const source = ts.createSourceFile("example.tsx", snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "createAssetLoader")
      calls.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(calls.length, 1, "Example must contain exactly one asset loader");
  return calls[0]!.getText(source);
}

function evaluateLoader(expression: string, fetch: AssetFetch): AssetLoader {
  const { outputText } = ts.transpileModule(`const loader = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  // Execute only the repository-owned loader expression, with no ambient network capability.
  const execute = new Function("createAssetLoader", "globalThis", `${outputText}\nreturn loader;`);
  return execute(createAssetLoader, { fetch }) as AssetLoader;
}

test("automatic PNG mask example explicitly enables transport and resolves its relative URL", async () => {
  const requests: string[] = [];
  const loader = evaluateLoader(documentedLoaderExpression(), async (uri) => {
    requests.push(uri);
    return new Response(new Uint8Array([1, 2, 3]));
  });
  // These are transport bytes, not a PNG decoding fixture.
  assert.deepEqual([...(await loader.load("portrait.png"))], [1, 2, 3]);
  assert.deepEqual(requests, ["https://example.invalid/portrait.png"]);
});

test("the previous baseURI-only example rejects despite an available global fetch", async () => {
  let calls = 0;
  const loader = evaluateLoader('createAssetLoader({ baseURI: "https://example.invalid/" })', async () => {
    calls++;
    return new Response(new Uint8Array([1, 2, 3]));
  });
  await assert.rejects(
    loader.load("portrait.png"),
    (error: unknown) =>
      error instanceof AssetError && error.code === "LOAD" && /explicitly configured fetch/u.test(error.message),
  );
  assert.equal(calls, 0);
});
