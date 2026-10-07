import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Plugin } from "esbuild";
import ts from "typescript";

export const baselineCommit = "21dcd483dcd84961a24f5823e95a586ea25dd534";
const expectedDigest = "d158acf0456357ebddb799d51d040d7128ae8b1d0d13eb531e7f6d505c0495d5";
export const baselineURL = new URL("../fixtures/svg-baseline/modules.json", import.meta.url);
export type BaselineModules = Readonly<Record<string, string>>;

export function loadBaseline(text = readFileSync(baselineURL, "utf8")): BaselineModules {
  const snapshot = JSON.parse(text) as { commit: string; modules: Record<string, string> };
  // Pin the entire source map outside its mutable provenance records; JSON formatting is immaterial.
  const digest = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  assert.equal(digest, expectedDigest, "Frozen SVG baseline integrity mismatch");
  assert.equal(snapshot.commit, baselineCommit);
  return Object.freeze(snapshot.modules);
}

// Historical SVG sources use the same transpilation and current built dependencies as the current consumer.
export function baselinePlugin(modules: BaselineModules = loadBaseline()): Plugin {
  return {
    name: "baseline-emitted-svg",
    setup(builder) {
      builder.onLoad({ filter: /packages\/svg\/dist\/[^/]+\.js$/ }, ({ path }) => {
        const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.js$/u, ".ts");
        const key = `packages/svg/src/${name}`;
        assert.ok(Object.hasOwn(modules, key), `Missing frozen SVG baseline module: ${key}`);
        const source = modules[key];
        assert.ok(typeof source === "string");
        const compiled = ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
        });
        return { contents: compiled.outputText, loader: "js" };
      });
    },
  };
}
