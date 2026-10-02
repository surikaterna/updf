import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedInternal, internalExports, portableGraph } from "../../scripts/boundaries.js";

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
  assert.throws(() => internalExports("export { fail, serialize } from './error.js';", ["fail"]));
  assert.throws(() => internalExports("export * from './error.js';", []));
});
