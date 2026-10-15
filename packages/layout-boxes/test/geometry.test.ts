import assert from "node:assert/strict";
import test from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import { derivedAxis, materializedStart, tryMaterializedStart } from "@updf/layout-boxes/geometry";

test("throwing and nonthrowing certificates share exact native association and diagnostics", () => {
  const axis = derivedAxis(0, 0.3, "/axis");
  assert.equal(tryMaterializedStart(axis, 0, 0.1), 0);
  assert.equal(tryMaterializedStart(axis, 0.1, 0.2), undefined);
  assert.throws(
    () => materializedStart(axis, 0.1, 0.2, "/candidate"),
    (error: unknown) => {
      assert.ok(error instanceof LayoutInputError);
      assert.equal(error.code, "GEOMETRY");
      assert.equal(error.path, "/candidate");
      assert.equal(
        error.message,
        "Materialized geometry exceeds its derived region under native coordinate association.",
      );
      return true;
    },
  );
});

test("certificate does not acquire host metric domain validation", () => {
  const axis = derivedAxis(1, 5, "");
  for (const [offset, extent, expected] of [
    [1, -1, 2],
    [-0, 0, 1],
    [-1, 1, undefined],
    [0, -10, 1],
  ] as const) {
    assert.equal(tryMaterializedStart(axis, offset, extent), expected);
    if (expected !== undefined) assert.equal(materializedStart(axis, offset, extent, ""), expected);
  }
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(tryMaterializedStart(axis, bad, 1), undefined);
    assert.equal(tryMaterializedStart(axis, 0, bad), undefined);
  }
});

test("certificate retains translated native fits and tiny remainders without deriving a remaining axis", () => {
  assert.equal(tryMaterializedStart(derivedAxis(700, 730.9, ""), 20.6, 10.3), 720.6);
  assert.equal(tryMaterializedStart(derivedAxis(0, 1, ""), 0.9999999999999999, 1e-17), 0.9999999999999999);
});
