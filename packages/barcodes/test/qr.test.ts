import assert from "node:assert/strict";
import test from "node:test";
import { qrCode } from "@updf/barcodes/qr";
import { DocumentError } from "@updf/core";

test("QR profile is bounded, deterministic, square and immutable with four quiet modules", () => {
  for (const value of ["A", "https://example.com/test?x=1", "x".repeat(192)]) {
    const qr = qrCode(value);
    assert.equal(qr.width, qr.height);
    assert.ok(qr.width >= 58 && qr.width <= 130);
    assert.deepEqual(qr, qrCode(value));
    assert.ok(Object.isFrozen(qr) && Object.isFrozen(qr.bars) && qr.bars.every(Object.isFrozen));
    assert.ok(
      qr.bars.every(
        (bar) => bar.x >= 8 && bar.y >= 8 && bar.x + bar.width <= qr.width - 8 && bar.y + bar.height <= qr.height - 8,
      ),
    );
  }
});

test("QR rejects Unicode/control text, over-budget input, malformed options and getters", () => {
  for (const value of ["", "\n", "é", "😀", 42, null]) assert.throws(() => qrCode(value as string), DocumentError);
  assert.throws(
    () => qrCode("x".repeat(193)),
    (e: unknown) => e instanceof DocumentError && e.diagnostics[0]?.code === "LIMIT",
  );
  for (const options of [{ moduleSize: 0 }, { moduleSize: Infinity }, { moduleSize: undefined }, { version: 40 }])
    assert.throws(() => qrCode("A", options as never), DocumentError);
  assert.throws(
    () =>
      qrCode("A", {
        get moduleSize(): number {
          throw new Error("getter executed");
        },
      }),
    DocumentError,
  );
});
