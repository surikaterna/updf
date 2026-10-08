import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { assertArithmeticPreserved, originalArithmetic } from "./arithmetic-source-certificate.js";

test("arithmetic certificate accepts original bytes and standalone documentation additions/replacements", () => {
  assertArithmeticPreserved(originalArithmetic);
  const documented = originalArithmetic
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
    const mutated = originalArithmetic.replace(before, after);
    assert.notEqual(mutated, originalArithmetic);
    assert.throws(() => assertArithmeticPreserved(mutated), { message: /Non-JSDoc source bytes/ });
  }
});
