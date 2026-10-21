import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { assertArithmeticPreserved, expectedArithmetic, originalArithmetic } from "./arithmetic-source-certificate.js";

test("arithmetic certificate accepts only original plus pinned fork and standalone documentation", () => {
  assert.throws(() => assertArithmeticPreserved(originalArithmetic), /Non-JSDoc source bytes/);
  assertArithmeticPreserved(expectedArithmetic);
  const documented = expectedArithmetic
    .replace("Compensated positive metric accumulation; nonfinite totals remain failures.", "Updated public contract.")
    .replace("  add(value", "  /**\n   * Accumulate one metric.\n   */\n  add(value");
  assertArithmeticPreserved(documented);
});

test("arithmetic certificate rejects executable mutations in the documented current source", async () => {
  const source = await readFile(new URL("../src/arithmetic.ts", import.meta.url), "utf8");
  assertArithmeticPreserved(source);
  for (const [before, after] of [
    ["private total = 0;", "private total = 1;"],
    ["this.total + value", "this.total - value"],
    ["2 * Number.EPSILON", "3 * Number.EPSILON"],
    ["return this.value;", 'return "/* not documentation */";'],
    ["result.correction = this.correction;", "result.correction = 0;"],
    ["return result;", "return this;"],
    ["  fork(): MetricSum {", "  extra(): number { return 0; }\n  fork(): MetricSum {"],
  ] as const) {
    const mutated = source.replace(before, after);
    assert.notEqual(mutated, source, "Mutation control must change the input");
    assert.throws(() => assertArithmeticPreserved(mutated), { message: /Non-JSDoc source bytes/ });
  }
});

test("arithmetic certificate retains ordinary comments and rejects inline comment/token concealment", () => {
  for (const [before, after] of [
    ["// Two relative machine epsilons", "// Changed historical explanation"],
    ["this.total + value", "this.total /** + value */"],
    ["return this.value;", 'return "/** not a comment */";'],
  ] as const) {
    const mutated = expectedArithmetic.replace(before, after);
    assert.notEqual(mutated, expectedArithmetic);
    assert.throws(() => assertArithmeticPreserved(mutated), { message: /Non-JSDoc source bytes/ });
  }
});
