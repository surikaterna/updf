import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { packageEdge } from "../../scripts/package-edges.js";
import { textFlowCostInputs } from "../../scripts/text-flow-cost-inputs.js";

test("emitted browser/Node graphs isolate composition and retain both opt-in positive controls", async () => {
  for (const platform of ["browser", "node"] as const) {
    for (const [profile, contents] of Object.entries(textFlowCostInputs())) {
      const result = await build({
        stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
        bundle: true,
        minify: false,
        target: "es2022",
        platform,
        format: "esm",
        metafile: true,
        conditions: platform === "browser" ? ["browser"] : ["node", "import"],
        write: false,
      });
      const paths = Object.keys(result.metafile.inputs);
      assert.ok(!paths.some((path) => /packages\/[^/]+\/src\//u.test(path)), "Source alias bypass");
      const addon = paths.some((path) => /packages\/text-flow\/dist\//u.test(path));
      const composer = paths.some((path) => /\/text\/dist\/(?:cjs\/)?composition\.js$/u.test(path));
      assert.equal(addon, profile === "textFlow", `${platform}/${profile} addon`);
      assert.equal(composer, profile === "textFlow", `${platform}/${profile} composer`);
      if (profile === "textFlow")
        assert.ok(!paths.some((path) => /packages\/(?:svg|png|jpeg|fontkit|fontkite)\//u.test(path)));
    }
  }
});
test("text-flow edges reject loader/decoder/optional machinery and core/layout reverse imports", () => {
  for (const specifier of ["./local.js", "@updf/core", "@updf/core/resources", "@updf/layout"])
    packageEdge("text-flow", specifier);
  for (const specifier of [
    "node:fs",
    "react",
    "@updf/fonts",
    "@updf/fontkit",
    "@updf/fontkite",
    "@updf/svg",
    "@updf/png",
    "@updf/jpeg",
    "@updf/text/composition",
  ])
    assert.throws(() => packageEdge("text-flow", specifier));
  for (const owner of ["core", "layout", "text"]) assert.throws(() => packageEdge(owner, "@updf/text-flow"));
});
