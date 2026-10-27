import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

test("only explicitly selected browser PNG graphs parse the browser normalizer and optional color checker", async () => {
  for (const entry of [
    "@updf/core",
    "@updf/layout",
    "@updf/images",
    "@updf/images/load",
    "@updf/images/png",
    "@updf/images/jpeg",
    "@updf/images/browser-png",
  ]) {
    const output = await build({
      stdin: { contents: `export * from '${entry}';`, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "esm",
      write: false,
      metafile: true,
    });
    const modules = Object.keys(output.metafile.inputs);
    const browser = entry.endsWith("browser-png");
    assert.equal(
      modules.some((path) => path.includes("browser-png-conversion")),
      browser,
      entry,
    );
    assert.equal(
      modules.some((path) => path.includes("normalization-color")),
      browser,
      entry,
    );
    assert.equal(
      modules.some((path) => /png\/dist\/normalization\.js$/u.test(path)),
      browser,
      entry,
    );
    if (browser) assert.ok(!modules.some((path) => /\/(jpeg|fonts|svg)\//u.test(path)));
  }
});
