import assert from "node:assert/strict";
import test from "node:test";
import { textWidth } from "../dist/cjs/helvetica-metrics.js";

test("Helvetica width units retain no-kerning arithmetic and numeric extremes", () => {
  assert.equal(textWidth("Hello", 10), 22.78);
  assert.equal(textWidth("AV", 10), 13.34);
  assert.equal(textWidth("a", Number.MAX_VALUE), 0.556 * Number.MAX_VALUE);
});
