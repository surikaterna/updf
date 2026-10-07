import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { build } from "esbuild";
import { baselinePlugin, baselineURL, loadBaseline } from "./svg-baseline.js";

test("frozen SVG source map rejects changed source, missing modules, and changed provenance", () => {
  const original = readFileSync(baselineURL, "utf8");
  const changed = JSON.parse(original);
  changed.modules["packages/svg/src/compile.ts"] += "\n// changed\n";
  assert.throws(() => loadBaseline(JSON.stringify(changed)), /baseline integrity mismatch/);
  const missing = JSON.parse(original);
  delete missing.modules["packages/svg/src/compile.ts"];
  assert.throws(() => loadBaseline(JSON.stringify(missing)), /baseline integrity mismatch/);
  const provenance = JSON.parse(original);
  provenance.commit = "worktree";
  assert.throws(() => loadBaseline(JSON.stringify(provenance)), /baseline integrity mismatch/);
});

test("baseline compilation fails rather than falling back to a missing or new current SVG module", async () => {
  const modules = { ...loadBaseline() };
  delete modules["packages/svg/src/compile.ts"];
  for (const [contents, plugin, name] of [
    ['import {compileSVG} from "@updf/svg"; export {compileSVG};', baselinePlugin(modules), "compile.ts"],
    ['export * from "@updf/svg/authoring";', baselinePlugin(), "authoring.ts"],
  ] as const) {
    await assert.rejects(
      build({
        stdin: { contents, resolveDir: process.cwd(), loader: "js" },
        bundle: true,
        platform: "browser",
        format: "esm",
        target: "es2022",
        conditions: ["browser"],
        write: false,
        logLevel: "silent",
        plugins: [plugin],
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes(`Missing frozen SVG baseline module: packages/svg/src/${name}`),
    );
  }
});
