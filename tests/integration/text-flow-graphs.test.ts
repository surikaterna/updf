import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { packageEdge } from "../../scripts/package-edges.js";
import { textFlowCostInputs } from "../../scripts/text-flow-cost-inputs.js";
import { profileCostInput } from "../../scripts/text-flow-profile-cost-input.js";
import { sourceIndexGraph } from "../../scripts/text-source-index-graph.js";
import { siblingCostInput } from "../../scripts/text-flow-sibling-cost-input.js";

async function noExclusionGeometry(paths: string[], code: string) {
  const behavior = /selectionBand|glyphTop|glyphBottom|lowLeading|profileDepth|Profile retry/u;
  assert.ok(!behavior.test(code), "Bundled exclusion envelope retained");
  // Check emitted bodies too: CJS export assignments can hide policy in a shared
  // ordinary module, and minification can erase its identifying local names.
  for (const path of paths.filter((path) => /\/text\/dist\//u.test(path)))
    assert.ok(!behavior.test(await readFile(path, "utf8")), "Shared-module exclusion envelope retained");
}

test("emitted browser/Node graphs isolate composition and retain both opt-in positive controls", async () => {
  for (const platform of ["browser", "node"] as const) {
    for (const [profile, contents] of Object.entries({
      ...textFlowCostInputs(),
      textFlowProfile: profileCostInput(),
      textFlowSiblings: siblingCostInput(),
    })) {
      const optional = profile.startsWith("textFlow");
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
      await sourceIndexGraph(paths, result.outputFiles[0]!.text, optional);
      assert.ok(!paths.some((path) => /packages\/[^/]+\/src\//u.test(path)), "Source alias bypass");
      checkAddon(paths, optional, `${platform}/${profile}`);
      assert.equal(
        paths.some((path) => /\/composition-band\.js$/u.test(path)),
        optional,
      );
      assert.equal(
        paths.some((path) => /\/(?:composition-profile|profile-exclusion|profile-interpolation)\.js$/u.test(path)),
        optional,
      );
      if (!optional) {
        assert.ok(!paths.some((path) => /\/composition(?:-[\w-]+)?\.js$/u.test(path)), "Feature module retained");
        const code = result.outputFiles[0]!.text;
        await noExclusionGeometry(paths, code);
        assert.ok(
          !/composeText|composedText|Composition work|Occupied text band|composed frame/u.test(code),
          `${platform}/${profile} retains composition behavior`,
        );
      }
      if (optional) assert.ok(!paths.some((path) => /packages\/(?:svg|png|jpeg|fontkit|fontkite)\//u.test(path)));
    }
  }
});
function checkAddon(paths: string[], optional: boolean, label: string) {
  assert.equal(
    paths.some((path) => /packages\/text-flow\/dist\//u.test(path)),
    optional,
    `${label} addon`,
  );
  assert.equal(
    paths.some((path) => /\/text\/dist\/(?:cjs\/)?composition\.js$/u.test(path)),
    optional,
    `${label} composer`,
  );
  assert.equal(
    paths.some((path) => /\/text-flow\/dist\/(?:cjs\/)?sibling\.js$/u.test(path)),
    optional,
  );
}
test("text-flow edges reject loader/decoder/optional machinery and core/layout reverse imports", () => {
  packageEdge("text", "@updf/layout-boxes/numeric");
  assert.throws(() => packageEdge("text", "@updf/layout-boxes/geometry"));
  for (const specifier of [
    "./local.js",
    "@updf/core",
    "@updf/core/resources",
    "@updf/layout",
    "@updf/text/composition",
    "@updf/layout/internal-participation",
    "@updf/layout-boxes/fragmentation",
  ])
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
    "@updf/text",
  ])
    assert.throws(() => packageEdge("text-flow", specifier));
  for (const owner of ["core", "layout", "text"]) assert.throws(() => packageEdge(owner, "@updf/text-flow"));
});
