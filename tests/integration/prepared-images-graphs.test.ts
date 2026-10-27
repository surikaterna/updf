import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { preparedImageCostInputs } from "../../scripts/prepared-image-cost-inputs.js";

test("prepared image consumers retain their selected provider and isolate codecs, assets and optional text flow", async () => {
  for (const [profile, contents] of Object.entries(preparedImageCostInputs())) {
    for (const platform of ["browser", "node"] as const) {
      const result = await build({
        stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
        bundle: true,
        platform,
        format: "esm",
        target: "es2022",
        minify: true,
        write: false,
        metafile: true,
      });
      const modules = Object.keys(result.metafile.inputs);
      const codec = profile.endsWith("PNG") ? "png" : "jpeg";
      assert.ok(modules.some((p) => p.includes(`/images/dist/`)));
      assert.ok(modules.some((p) => p.includes(`/${codec}/dist/`)));
      assert.ok(!modules.some((p) => /\/(?:assets|svg|fontkit|fontkite)\//u.test(p)));
      assert.ok(!modules.some((p) => p.includes(`/${codec === "png" ? "jpeg" : "png"}/dist/`)));
      assert.equal(
        modules.some((p) => p.includes("/text-flow/dist/")),
        profile.startsWith("float"),
      );
      if (platform === "browser") assert.ok(!modules.some((p) => /\/dist\/(?:cjs|node)\//u.test(p)));
    }
  }
});

test("Image has only Image/images runtime root exports and no direct codec or transport source imports", async () => {
  const entry = await import("@updf/images");
  assert.deepEqual(Object.keys(entry).sort(), ["Image", "images"]);
  const contents = await readFile("packages/images/src/index.ts", "utf8");
  assert.ok(!/@updf\/(?:png|jpeg|assets|text-flow)|\bfetch\s*\(/u.test(contents));
});
