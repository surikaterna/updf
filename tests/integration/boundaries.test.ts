import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedInternal, internalExports, packageEdge, portableGraph } from "../../scripts/boundaries.js";

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
  allowedInternal("svg/src/numbers.ts", "@updf/geometry/internal");
  allowedInternal("fontkit/src/index.ts", "@updf/core/internal");
  assert.throws(() => allowedInternal("core/src/index.ts", "@updf/geometry/internal"));
  assert.throws(() => allowedInternal("svg/src/new.ts", "@updf/core/internal"));
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
  packageEdge("layout", "@updf/layout-kernel");
  packageEdge("layout", "@updf/layout-kernel/numeric");
  assert.throws(() => packageEdge("core", "@updf/layout"));
  assert.throws(() => packageEdge("core", "@updf/layout-kernel"));
  for (const name of ["@updf/svg", "@updf/fontkit", "@updf/geometry", "node:fs", "react", "foreign"]) {
    assert.throws(() => packageEdge("layout", name));
  }
  assert.throws(() => allowedInternal("layout/src/foreign.ts", "@updf/core/internal"));
});

test("kernel edges reject every external runtime dependency", () => {
  packageEdge("layout-kernel", "./width-types.js");
  for (const name of ["@updf/core", "@updf/layout", "react", "node:fs", "fontkit", "foreign"])
    assert.throws(() => packageEdge("layout-kernel", name));
});

test("optional fonts/text reject reverse edges and concrete implementations", () => {
  packageEdge("fonts", "@updf/core/resources");
  packageEdge("text", "@updf/core/resources");
  packageEdge("text", "@updf/layout-kernel/arithmetic");
  for (const name of ["@updf/fonts", "@updf/fontkit", "fontkit", "react", "node:fs"]) {
    assert.throws(() => packageEdge("core", name));
    assert.throws(() => packageEdge("text", name));
  }
  assert.throws(() => packageEdge("core", "@updf/text"));
  assert.throws(() => packageEdge("fonts", "@updf/text"));
  assert.throws(() => packageEdge("fonts", "@updf/layout-kernel/arithmetic"));
  assert.throws(() => packageEdge("layout", "@updf/fonts"));
});
