import assert from "node:assert/strict";
import test from "node:test";
import { code39 } from "@updf/barcodes/code39";
import { DocumentError } from "@updf/core";

test("Code 39 uses exact standard widths, bounded modules, quiet zones and immutable geometry", () => {
  const value = code39("A");
  assert.equal(value.width, 36 + 3 * 15 + 2);
  assert.equal(value.height, 40);
  assert.equal(value.bars.length, 15);
  assert.equal(value.bars[0]?.x, 18);
  assert.equal(value.bars.at(-1)!.x + value.bars.at(-1)!.width, value.width - 18);
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.bars) && value.bars.every(Object.isFrozen));
  assert.deepEqual(code39("A", { checksum: "mod43" }), code39("AA"));
  assert.equal(code39("A", { wideRatio: 2 }).width, 36 + 3 * 12 + 2);
});

test("Code 39 rejects unsupported payloads and options rather than normalizing/coercing", () => {
  for (const value of ["", "lowercase", "*", "é", "A\n", 42, null])
    assert.throws(() => code39(value as string), DocumentError);
  assert.throws(
    () => code39("A".repeat(81)),
    (e: unknown) => e instanceof DocumentError && e.diagnostics[0]?.code === "LIMIT",
  );
  for (const options of [
    { moduleWidth: 0 },
    { moduleWidth: NaN },
    { moduleWidth: Infinity },
    { moduleWidth: 0.24 },
    { barHeight: 0 },
    { wideRatio: 2.5 },
    { checksum: "yes" },
    { width: 10 },
    { moduleWidth: undefined },
  ])
    assert.throws(() => code39("A", options as never), DocumentError);
  assert.throws(
    () =>
      code39("A", {
        get moduleWidth(): number {
          throw new Error("getter executed");
        },
      }),
    DocumentError,
  );
  assert.ok(code39("A".repeat(80), { moduleWidth: 0.25, barHeight: 1 }).width > 0);
});
