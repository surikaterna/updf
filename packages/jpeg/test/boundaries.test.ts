import assert from "node:assert/strict";
import { test } from "node:test";
import { packageEdge } from "../../../scripts/boundaries.js";

test("JPEG source edges permit only public core resource/PDF/data surfaces", () => {
  for (const specifier of ["./parser.js", "@updf/core", "@updf/core/resources", "@updf/core/pdf"])
    assert.doesNotThrow(() => packageEdge("jpeg", specifier));
  for (const specifier of [
    "node:fs",
    "@updf/fonts",
    "@updf/text",
    "@updf/core/internal",
    "@updf/core/vdom",
    "@updf/svg",
    "png",
    "jpeg-decoder",
  ])
    assert.throws(() => packageEdge("jpeg", specifier));
});
