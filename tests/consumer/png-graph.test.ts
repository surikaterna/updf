import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { render } from "@updf/core";
import { pngProvider, preparePng } from "@updf/png";
import { document, fixture } from "../../packages/png/test/helpers.js";
import { costInputs, hostCostInput, jpegCostInputs } from "../../scripts/consumer/cost-inputs.js";

test("browser PNG graph/runtime is portable and optional for all existing consumers", async () => {
  const png = `import { render } from '@updf/core'; import { preparePng,png,pngProvider } from '@updf/png';
    export function imagePdf(source) { const image = preparePng(source); return render({version:1,pages:[{width:100,height:100,children:[png('image',{x:10,y:20,width:60,height:40})]}]},{resources:{image},providers:[pngProvider()]}); }`;
  const inputs = { ...costInputs(false), measurementHost: hostCostInput(false, true), ...jpegCostInputs(), png };
  for (const [profile, contents] of Object.entries(inputs)) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
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
    assert.ok(!modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:node|cjs))\//u.test(path)));
    if (profile !== "png") {
      assert.ok(!modules.some((path) => /packages\/png\/|node_modules\/fflate\//u.test(path)), profile);
      continue;
    }
    assert.ok(modules.some((path) => /png\/dist\/decode\.js$/u.test(path)));
    assert.ok(modules.some((path) => /fflate\/esm\/browser\.js$/u.test(path)));
    assert.ok(!modules.some((path) => /node:|packages\/(?:jpeg|fonts|text|fontkit|legacy)\//u.test(path)));
    const context = { proof: undefined as unknown };
    runInNewContext(result.outputFiles[0]!.text, context);
    const api = context.proof as { imagePdf(source: Uint8Array): Uint8Array };
    assert.deepEqual(
      Buffer.from(api.imagePdf(fixture())),
      Buffer.from(render(document(), { resources: { image: preparePng(fixture()) }, providers: [pngProvider()] })),
    );
  }
});
