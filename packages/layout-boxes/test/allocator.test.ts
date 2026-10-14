import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError } from "@updf/core";
import { LayoutInputError, resolveWidths } from "@updf/layout-boxes";
import { bits, dyadic, floorDyadic, spacing, successor, value } from "@updf/layout-boxes/numeric";
import { oracle } from "../../../scripts/layout-boxes-oracle.js";
import { resolveWidths as layoutWidths } from "../../layout/src/width-resolver.js";

test("kernel and production wrapper match the pre-move 3,000-case binary64 oracle", () => {
  const expected = { count: 3000, sha256: "b298210b2436d5f829f2713bfa5fd5bae1fbcfdc6e8769330a4d26de1b57cb74" };
  assert.deepEqual(oracle(resolveWidths), expected);
  assert.deepEqual(oracle(layoutWidths), expected);
});
test("kernel errors retain exact production diagnostic fields without depending on DocumentError", () => {
  for (const input of [
    null,
    { availableWidth: 10, tracks: [] },
    { availableWidth: 10, tracks: [11] },
    { availableWidth: 10, tracks: [1], extra: 0 },
    { availableWidth: 10, tracks: [1], maxTracks: -1 },
  ]) {
    let kernel: LayoutInputError | undefined;
    assert.throws(
      () => resolveWidths(input, "/host"),
      (error: unknown) => {
        assert.ok(error instanceof LayoutInputError);
        assert.ok(!(error instanceof DocumentError));
        kernel = error;
        return true;
      },
    );
    assert.throws(
      () => layoutWidths(input, "/host"),
      (error: unknown) => {
        assert.ok(error instanceof DocumentError);
        assert.deepEqual(error.diagnostics, [{ code: kernel?.code, path: kernel?.path, message: kernel?.message }]);
        return true;
      },
    );
  }
});
test("accessors, sparse/extended arrays, nonordinary records and invalid optionals reject without evaluation", () => {
  let reads = 0;
  const getter = {
    get weight() {
      reads++;
      return 1;
    },
  };
  const accessor: unknown[] = [1];
  Object.defineProperty(accessor, "0", {
    get() {
      reads++;
      return 1;
    },
  });
  const extended = Object.assign([1], { extra: 1 });
  for (const tracks of [[getter], accessor, Array(1), extended, [{ weight: 1, min: undefined }], [new Date()]])
    assert.throws(() => resolveWidths({ availableWidth: 10, tracks }), LayoutInputError);
  assert.throws(
    () =>
      resolveWidths({
        get availableWidth() {
          reads++;
          return 10;
        },
        tracks: [1],
      }),
    LayoutInputError,
  );
  assert.equal(reads, 0);
  const valid = Object.assign(Object.create(null), { availableWidth: 10, tracks: [1] });
  assert.deepEqual(resolveWidths(valid).widths, [1]);
});
test("count budget precedes entry descriptors, while arbitrary host exceptions retain identity", () => {
  const failure = new Error("host failure");
  const tracks = new Proxy([1, 1], {
    ownKeys() {
      throw failure;
    },
  });
  assert.throws(() => resolveWidths({ availableWidth: 10, tracks, maxTracks: 1 }), { code: "LIMIT" });
  for (const resolve of [resolveWidths, layoutWidths])
    assert.throws(
      () => resolve({ availableWidth: 10, tracks }),
      (error) => error === failure,
    );
  const existing = new DocumentError("TYPE", "/host", "existing");
  const input = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw existing;
      },
    },
  );
  assert.throws(
    () => layoutWidths(input),
    (error) => error === existing,
  );
});
test("the moved primitive preserves subnormal, finite maximum, spacing and frozen allocation semantics", () => {
  for (const number of [0, -0, Number.MIN_VALUE, 1, 1e300, Number.MAX_VALUE]) {
    const encoded = bits(number);
    assert.equal(value(encoded), number === 0 ? 0 : number);
    assert.equal(floorDyadic(dyadic(encoded)), number === 0 ? undefined : encoded);
    assert.ok(spacing(encoded) > 0n);
  }
  assert.equal(successor(bits(Number.MAX_VALUE)), undefined);
  assert.equal(value(successor(0n) ?? 0n), Number.MIN_VALUE);
  const input = Object.freeze({
    availableWidth: 80,
    tracks: Object.freeze([20, Object.freeze({ weight: 1 })]),
    gap: 1,
  });
  const result = resolveWidths(input);
  assert.deepEqual(result.widths, [20, 59]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.widths));
});
