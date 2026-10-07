import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const xmlParser = /svg\/dist\/(?:xml|xml-lex)\.js$/u;
function parserFree(paths: readonly string[]) {
  assert.ok(!paths.some((path) => xmlParser.test(path)), "XML parser reached a parser-free entry");
}
const profiles = {
  none: 'export {render} from "@updf/core";',
  xml: 'export {pdf,painting} from "./tests/fixtures/svg-authoring/cost-xml.ts";',
  tsx: 'export {pdf,painting} from "./tests/fixtures/svg-authoring/cost-tsx.tsx";',
  both: 'export {pdf,painting} from "./tests/fixtures/svg-authoring/cost-xml.ts"; export {pdf as tsxPDF,painting as tsxPainting} from "./tests/fixtures/svg-authoring/cost-tsx.tsx";',
  layout: 'export {svgBlock,svgInline,svgAdapters} from "@updf/svg/layout";',
  noSvgAddons: 'export {layout} from "@updf/layout"; export {table} from "@updf/tables";',
};
test("equivalent dynamic XML/TSX cost profiles retain one compiler and enforce parser-free boundaries", async () => {
  const outputs: Record<string, { pdf: (fill: string) => Uint8Array; painting: (fill: string) => unknown }> = {};
  for (const [profile, contents] of Object.entries(profiles)) {
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
      Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0),
    );
    if (["tsx", "layout", "none", "noSvgAddons"].includes(profile)) parserFree(parsed);
    if (["xml", "tsx", "both"].includes(profile)) {
      assert.equal(retained.filter(([path]) => path.endsWith("/svg/dist/compile.js")).length, 1);
      outputs[profile] = await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]?.contents ?? []).toString("base64")}`
      );
    }
    if (["none", "noSvgAddons"].includes(profile)) assert.ok(!parsed.some((path) => /packages\/svg\//u.test(path)));
    if (profile === "layout")
      assert.ok(!parsed.some((path) => /svg\/dist\/(?:jsx-runtime|structured)\.js$/u.test(path)));
    if (profile === "xml")
      assert.ok(!retained.some(([path]) => /svg\/dist\/(?:jsx-runtime|structured)\.js$/u.test(path)));
    if (profile === "xml" || profile === "both") assert.ok(retained.some(([path]) => xmlParser.test(path)));
    console.log(
      JSON.stringify({
        profile,
        bytes: result.outputFiles[0]?.contents.byteLength,
        gzip: gzipSync(result.outputFiles[0]?.contents ?? new Uint8Array()).byteLength,
        parsedModules: parsed.length,
        retainedModules: retained.length,
        moduleBytes: Object.fromEntries(retained.map(([path, value]) => [path, value.bytesInOutput])),
      }),
    );
  }
  for (const fill of ["red", "blue"]) {
    assert.deepEqual(outputs.xml?.painting(fill), outputs.tsx?.painting(fill));
    assert.deepEqual(outputs.xml?.pdf(fill), outputs.tsx?.pdf(fill));
    assert.deepEqual(outputs.xml?.pdf(fill), outputs.both?.pdf(fill));
  }
});
test("live parser-negative control rejects XML deliberately added to the TSX entry", async () => {
  const result = await build({
    stdin: {
      contents: `${profiles.tsx} export {compileSVG} from "@updf/svg";`,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    write: false,
    metafile: true,
    jsx: "automatic",
  });
  assert.throws(() => parserFree(Object.keys(result.metafile.inputs)), /XML parser/u);
});
