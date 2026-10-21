import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { allowedInternal, files, internalExports, packageEdge, portableGraph } from "../../scripts/boundaries.js";

test("graph checker negative controls reject native Node/globals/legacy/React/optional leakage", () => {
  for (const id of [
    "node:fs",
    "fs",
    "buffer",
    "Buffer",
    "process",
    "@updf/legacy/lib/index.js",
    "react/index.js",
    "fontkit/dist/module.mjs",
    "restructure/index.js",
  ]) {
    assert.throws(() => portableGraph([id]));
  }
  portableGraph(["@updf/core/dist/index.js"]);
  portableGraph(["fontkit/dist/browser-module.mjs"], true);
  portableGraph(["react/index.js"], false, true);
});

test("internal seams reject noninventoried consumers", () => {
  allowedInternal("layout/src/measured-source.ts", "@updf/layout-boxes/internal-fragmentation");
  assert.throws(() => allowedInternal("tables/src/adapter.ts", "@updf/layout-boxes/internal-fragmentation"));
  allowedInternal("svg/src/numbers.ts", "@updf/geometry/internal");
  allowedInternal("fontkit/src/index.ts", "@updf/core/internal");
  assert.throws(() => allowedInternal("core/src/index.ts", "@updf/geometry/internal"));
  assert.throws(() => allowedInternal("svg/src/new.ts", "@updf/core/internal"));
});

test("retired layout table engine has no production files/deep imports; canonical tables remain", async () => {
  const root = resolve(import.meta.dirname, "../..");
  const paths = [...(await files(`${root}/packages`)), ...(await files(`${root}/apps`))];
  const production = paths.filter((path) => /\/(?:src|dist)\/.*\.(?:ts|tsx|js|mjs|cts|mts)$/u.test(path));
  assert.ok(!production.some((path) => /\/layout\/(?:src|dist(?:\/cjs|\/node)?)\/tables\//u.test(path)));
  for (const path of production) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(
      text,
      /(?:from\s+|import\s*\()["'][^"']*(?:@updf\/layout\/tables|layout\/(?:src|dist(?:\/cjs|\/node)?)\/tables\/)/u,
      path,
    );
  }
  for (const file of ["index", "vdom", "layout", "producer", "validate", "measure", "paint", "ink"])
    assert.throws(() => allowedInternal(`layout/src/tables/${file}.ts`, "@updf/core/internal"));
  packageEdge("tables", "@updf/layout");
  assert.ok(production.some((path) => path.endsWith("/tables/src/adapter.ts")));
  const consumers = await Promise.all(
    ["apps/browser-fonts", "apps/showcase/src"].map(async (directory) => {
      const sources = await files(`${root}/${directory}`);
      return (await Promise.all(sources.map((path) => readFile(path, "utf8")))).join("\n");
    }),
  );
  for (const text of consumers) assert.match(text, /from ["']@updf\/tables["']/u);
});

test("internal export inventory rejects broad exports and unexpected helpers", () => {
  internalExports("export { fail } from './error.js';", ["fail"]);
  internalExports("export type { Resource, TextRun, } from './resources.js';", ["Resource", "TextRun"]);
  assert.throws(() => internalExports("export { fail, serialize } from './error.js';", ["fail"]));
  assert.throws(() => internalExports("export * from './error.js';", []));
});
test("layout package edges reject optional/runtime leakage and core dependency inversion", () => {
  packageEdge("layout", "@updf/text");
  packageEdge("layout", "./types.js");
  packageEdge("layout", "@updf/layout-boxes");
  packageEdge("layout", "@updf/layout-boxes/numeric");
  assert.throws(() => packageEdge("core", "@updf/layout"));
  assert.throws(() => packageEdge("core", "@updf/layout-boxes"));
  for (const name of ["@updf/svg", "@updf/fontkit", "@updf/geometry", "node:fs", "react", "foreign"]) {
    assert.throws(() => packageEdge("layout", name));
  }
  assert.throws(() => allowedInternal("layout/src/foreign.ts", "@updf/core/internal"));
});

test("kernel edges reject every external runtime dependency", () => {
  packageEdge("layout-boxes", "./width-types.js");
  for (const name of ["@updf/core", "@updf/layout", "react", "node:fs", "fontkit", "foreign"])
    assert.throws(() => packageEdge("layout-boxes", name));
});

test("table providers cannot import private host selection or capacity helpers", async () => {
  for (const name of ["@updf/layout/paginator", "@updf/layout/protocol", "@updf/layout-boxes/fragmentation"])
    assert.throws(() => packageEdge("tables", name));
  const root = resolve(import.meta.dirname, "../..");
  const paths = await files(`${root}/packages/tables/src`);
  for (const path of paths) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(text, /\b(?:availableHeight|freshHeight|usedHeight|atFreshRegion|selectRows)\b/u, path);
    assert.doesNotMatch(
      text,
      /(?:from\s+|import\s*\()["'][^"']*(?:layout\/src|layout\/dist|paginator|fragment-select)/u,
      path,
    );
  }
});

test("barcode package edges permit only its explicit core/arithmetic seams", () => {
  for (const name of [
    "./qr-encoder/encoder.js",
    "@updf/core",
    "@updf/core/vdom",
    "@updf/core/painting",
    "@updf/core/internal",
    "@updf/layout-boxes/arithmetic",
  ])
    packageEdge("barcodes", name);
  for (const name of [
    "qrcode-generator",
    "@zxing/library",
    "jsqr",
    "@updf/svg",
    "@updf/fonts",
    "@updf/layout",
    "@updf/core/resources",
    "react",
    "node:fs",
  ])
    assert.throws(() => packageEdge("barcodes", name));
  allowedInternal("barcodes/src/checks.ts", "@updf/core/internal");
  assert.throws(() => allowedInternal("barcodes/src/qr.ts", "@updf/core/internal"));
});

test("optional fonts/text reject reverse edges and concrete implementations", () => {
  packageEdge("fonts", "@updf/core/resources");
  packageEdge("text", "@updf/core/resources");
  packageEdge("text", "@updf/layout-boxes/arithmetic");
  for (const name of ["@updf/fonts", "@updf/fontkit", "fontkit", "react", "node:fs"]) {
    assert.throws(() => packageEdge("core", name));
    assert.throws(() => packageEdge("text", name));
  }
  assert.throws(() => packageEdge("core", "@updf/text"));
  assert.throws(() => packageEdge("fonts", "@updf/text"));
  assert.throws(() => packageEdge("fonts", "@updf/layout-boxes/arithmetic"));
  assert.throws(() => packageEdge("layout", "@updf/fonts"));
});
