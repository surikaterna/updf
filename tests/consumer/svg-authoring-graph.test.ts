import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const inputs = {
  authoring: 'export { document } from "./tests/fixtures/svg-authoring/document.tsx";',
  xml: 'export { compileSVG } from "@updf/svg";',
  core: 'export { render } from "@updf/core";',
};
test("emitted SVG authoring TSX graph excludes XML and keeps one native compiler", async () => {
  for (const [profile, contents] of Object.entries(inputs)) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
      bundle: true,
      minify: true,
      platform: "browser",
      format: "esm",
      conditions: ["browser"],
      target: "es2022",
      metafile: true,
      write: false,
      jsx: "automatic",
    });
    const parsed = Object.keys(result.metafile.inputs);
    const retained = Object.values(result.metafile.outputs).flatMap((output) =>
      Object.entries(output.inputs)
        .filter(([, value]) => value.bytesInOutput > 0)
        .map(([path]) => path),
    );
    assert.ok(!parsed.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:cjs|node))\//u.test(path)));
    const xml = /svg\/dist\/(?:xml|xml-lex)\.js$/u;
    if (profile === "authoring") {
      assert.ok(!parsed.some((path) => xml.test(path)), "Authoring must not even reach XML modules");
      for (const module of ["compile", "prepared", "structured", "jsx-runtime", "bridge"])
        assert.equal(retained.filter((path) => path.endsWith(`/svg/dist/${module}.js`)).length, 1, module);
      assert.ok(!parsed.some((path) => /packages\/(?:layout|fonts|text)\//u.test(path)));
    } else if (profile === "xml") {
      assert.ok(
        retained.some((path) => xml.test(path)),
        "XML positive control missing",
      );
      assert.ok(!parsed.some((path) => /svg\/dist\/(?:jsx-runtime|structured|authoring)\.js$/u.test(path)));
    } else assert.ok(!parsed.some((path) => /packages\/svg\//u.test(path)));
    console.log(
      JSON.stringify({
        profile,
        parsedModules: parsed.length,
        retainedModules: retained.length,
        bytes: result.outputFiles[0]?.contents.byteLength,
        retained,
      }),
    );
  }
});
