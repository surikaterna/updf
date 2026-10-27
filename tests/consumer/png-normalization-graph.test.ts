import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { png16 } from "../../packages/png/test/normalization-fixture.js";
import { fixture } from "../../packages/png/test/helpers.js";

function checkColorGraph(modules: string[], name: string): void {
  for (const module of ["normalization", "normalization-color"])
    assert.equal(
      modules.some((path) => path.endsWith(`/png/dist/${module}.js`)),
      name === "normalization",
    );
}

test("normalization browser graph is isolated; ordinary PNG and image leaves retain only native validation", async () => {
  const profiles = {
    normalization: `export {preparePngNormalization} from '@updf/png/normalization';`,
    png: `export {preparePng,png,pngProvider} from '@updf/png';`,
    images: `export {pngImages} from '@updf/images/png';`,
  };
  for (const [name, contents] of Object.entries(profiles)) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      conditions: ["browser"],
      target: "es2022",
      format: "iife",
      globalName: "proof",
      write: false,
      metafile: true,
    });
    const modules = Object.keys(result.metafile.inputs);
    assert.ok(!modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:node|cjs))\//u.test(path)));
    checkColorGraph(modules, name);
    assert.equal(
      modules.some((path) => /png\/dist\/decode\.js$/u.test(path)),
      name !== "normalization",
    );
    assert.ok(!modules.some((path) => /fflate|pako|node:|packages\/(?:jpeg|assets|fontkit)\//u.test(path)));
    assert.doesNotMatch(
      result.outputFiles[0]!.text,
      /\b(?:createImageBitmap|ImageDecoder|OffscreenCanvas|document|fetch)\s*\(/u,
    );
    if (name !== "normalization") continue;
    const context = { proof: undefined as unknown, CompressionStream, DecompressionStream };
    runInNewContext(result.outputFiles[0]!.text, context);
    const api = context.proof as {
      preparePngNormalization(source: Uint8Array): Promise<{ bytes: Uint8Array; metadata: { bitDepth: number } }>;
    };
    const source = png16();
    const validated = await api.preparePngNormalization(source);
    assert.deepEqual(Buffer.from(validated.bytes), source);
    assert.equal(validated.metadata.bitDepth, 16);
    await assert.rejects(
      () => api.preparePngNormalization(fixture()),
      (error) => (error as { diagnostics: { code: string }[] }).diagnostics[0]?.code === "PNG_PROFILE",
    );
  }
});
