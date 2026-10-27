import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { build } from "esbuild";

test("selected PNG alpha integration has no loading/codec/parser graph; defaults and extraction stay independent", async () => {
  for (const entry of [
    "@updf/text-flow",
    "@updf/text-flow/sources",
    "@updf/text-flow/png-shape",
    "@updf/text-flow/png-alpha",
  ]) {
    const output = await build({
      stdin: { contents: `export * from '${entry}'`, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "esm",
      write: false,
      metafile: true,
    });
    const cjs: string[] = JSON.parse(
      execFileSync(
        process.execPath,
        ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
        { encoding: "utf8" },
      ),
    );
    for (const inputs of [Object.keys(output.metafile.inputs), cjs]) {
      assert.ok(
        !inputs.some((p) =>
          /\/assets\/|\/images\/.*(?:load|cache|prepared-job)|\/png\/.*(?:decode|normalization)|\/geometry\//u.test(p),
        ),
        entry,
      );
      assert.equal(
        inputs.some((p) => /\/images\//u.test(p)),
        entry.endsWith("/png-alpha"),
      );
      assert.equal(
        inputs.some((p) => /png-alpha-session/u.test(p)),
        entry.endsWith("/png-alpha"),
      );
    }
  }
});
