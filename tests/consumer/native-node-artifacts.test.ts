import assert from "node:assert/strict";
import test from "node:test";
import { checkCoreArtifacts } from "../../scripts/consumer/core-artifacts.js";

test("node owner migration rejects stale XObject measurement artifacts in every emitted graph", () => {
  for (const graph of ["", "cjs/", "node/"]) {
    for (const extension of ["js", "mjs", "d.ts", "d.mts", "d.cts"])
      assert.throws(() => checkCoreArtifacts([`dist/${graph}core/xobject-measure.${extension}`]), /Obsolete/);
    assert.doesNotThrow(() => checkCoreArtifacts([`dist/${graph}nodes/xobject.js`]));
  }
});
