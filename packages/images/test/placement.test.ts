import assert from "node:assert/strict";
import test from "node:test";
import { imagePlacement } from "../dist/cjs/placement.js";

test("contain/fill use independently expected centered geometry, including extreme pixel aspects", () => {
  assert.deepEqual(imagePlacement(120, 80, { width: 2, height: 2 }, "contain", "/test"), {
    x: 20,
    y: 0,
    width: 80,
    height: 80,
  });
  assert.deepEqual(imagePlacement(120, 80, { width: 2, height: 2 }, "fill", "/test"), {
    x: 0,
    y: 0,
    width: 120,
    height: 80,
  });
  assert.deepEqual(imagePlacement(100, 100, { width: 1, height: 100 }, "contain", "/test"), {
    x: 49.5,
    y: 0,
    width: 1,
    height: 100,
  });
  assert.deepEqual(imagePlacement(100, 100, { width: 100, height: 1 }, "contain", "/test"), {
    x: 0,
    y: 49.5,
    width: 100,
    height: 1,
  });
  const huge = imagePlacement(1e300, 1e300, { width: Number.MAX_SAFE_INTEGER, height: 1 }, "contain", "/test");
  assert.equal(huge.width, 1e300);
  assert.ok(huge.height > 0 && Number.isFinite(huge.height));
  assert.throws(() => imagePlacement(Number.MIN_VALUE, 1, { width: 2, height: 1 }, "contain", "/test"));
  assert.deepEqual(imagePlacement(Number.MIN_VALUE, Number.MIN_VALUE, { width: 1, height: 1 }, "fill", "/test"), {
    x: 0,
    y: 0,
    width: Number.MIN_VALUE,
    height: Number.MIN_VALUE,
  });
});
