import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { fixture } from "../../packages/fontkite/test/helpers.js";
import { prepareFont } from "@updf/fontkit";
import { costInputs } from "../../scripts/consumer/cost-inputs.js";
import { checkSeams, packageEdge } from "../../scripts/boundaries.js";

test("Fontkite browser graph excludes Fontkit and default entry excludes asset loading", async () => {
  for (const entry of ["@updf/fontkite", "@updf/fontkite/load"]) {
    const result = await build({
      stdin: { contents: `export * from '${entry}';`, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      conditions: ["browser"],
      target: "es2022",
      format: "iife",
      globalName: "proof",
      metafile: true,
      write: false,
    });
    const modules = Object.keys(result.metafile.inputs);
    assert.ok(modules.some((path) => /packages\/fontkite\/dist\/index.js$/u.test(path)));
    assert.ok(
      !modules.some((path) => /node_modules\/(?:fontkit|brotli|restructure|unicode-)|packages\/fontkit\//u.test(path)),
    );
    assert.ok(!modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:cjs|node))\//u.test(path)));
    assert.equal(
      modules.some((path) => /packages\/assets\//u.test(path)),
      entry.endsWith("/load"),
    );
    const bytes = await fixture();
    const context = { proof: undefined as unknown, input: undefined as unknown, values: Array.from(bytes) };
    runInNewContext(`${result.outputFiles[0]!.text}; globalThis.input = new Uint8Array(values);`, context);
    const api = context.proof as {
      prepareFont: typeof prepareFont;
      loadFont: (bytes: Uint8Array) => Promise<ReturnType<typeof prepareFont>>;
    };
    const input = context.input as Uint8Array<ArrayBuffer>;
    const actual = entry.endsWith("/load") ? await api.loadFont(input) : api.prepareFont(input);
    assert.equal(JSON.stringify(actual.metadata), JSON.stringify(prepareFont(bytes).metadata));
  }
});

test("drawing does not acquire either parser and source seams reject Fontkit edges", async () => {
  const result = await build({
    stdin: { contents: costInputs(false).drawing!, resolveDir: process.cwd() },
    bundle: true,
    platform: "browser",
    conditions: ["browser"],
    metafile: true,
    write: false,
  });
  assert.ok(!Object.keys(result.metafile.inputs).some((path) => /fontkite|fontkit/u.test(path)));
  for (const edge of [
    "fontkit",
    "@updf/fontkit",
    "brotli",
    "@updf/text",
    "@updf/layout-boxes",
    "@updf/layout-boxes/arithmetic",
  ])
    assert.throws(() => packageEdge("fontkite", edge));
  await checkSeams(process.cwd());
});
