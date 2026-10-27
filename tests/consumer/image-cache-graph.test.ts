import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { build } from "esbuild";

test("cache backend and removable subscribers are retained only by explicit cache imports", async () => {
  for (const entry of ["@updf/images", "@updf/images/load", "@updf/images/cache"]) {
    const output = await build({
      stdin: { contents: `export * from '${entry}';`, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "esm",
      write: false,
      metafile: true,
    });
    const modules = Object.keys(output.metafile.inputs);
    for (const name of ["cache-backend", "cache-subscriber"])
      assert.equal(
        modules.some((path) => path.includes(name)),
        entry.endsWith("/cache"),
        `${entry}: ${name}`,
      );
    assert.ok(!modules.some((path) => /\/(png|jpeg|fonts|svg)\//u.test(path)));
    const cjs: string[] = JSON.parse(
      execFileSync(
        process.execPath,
        ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
        { encoding: "utf8" },
      ),
    );
    assert.equal(
      cjs.some((path) => path.includes("cache-backend")),
      entry.endsWith("/cache"),
    );
    assert.equal(
      cjs.some((path) => path.includes("cache-subscriber")),
      entry.endsWith("/cache"),
    );
  }
});
