import assert from "node:assert/strict";
import test from "node:test";
import { preparePathBand, pathShape } from "../src/path-band.js";
import { createLayoutOperation } from "@updf/core/internal";
import { chargeSourceWork } from "@updf/layout/internal-participation";

function band(d: string, side: "left" | "right" = "left", width = 100, height = 100) {
  return preparePathBand(pathShape(d, "/test")!, width, height, side, () => {}, "/test");
}
test("whole band clips sloping edges, includes internal vertices and horizontal touches", () => {
  const shape = band("M0 0 H20 L90 40 L20 80 H0 Z");
  assert.equal(shape.depth(0, 0), 20);
  assert.equal(shape.depth(0, 40), 90);
  assert.equal(shape.depth(30, 50), 90);
  assert.ok(shape.depth(10, 20) >= 55 && shape.depth(10, 20) < 56);
  assert.equal(shape.depth(80, 80), 20);
  assert.equal(shape.depth(81, 100), 0);
  const right = band("m100 0 h-20 l-70 40 70 40 h20 z", "right");
  assert.ok(right.depth(30, 50) >= 90 && right.depth(30, 50) < 91);
});
test("compound holes remain unavailable to the conservative side envelope", () => {
  const d = "M0 0H100V100H0Z M20 20H80V80H20Z";
  for (const fillRule of ["nonzero", "evenodd"] as const) {
    const shape = preparePathBand(pathShape({ d, fillRule }, "/test")!, 100, 100, "left", () => {}, "/test");
    assert.equal(shape.depth(40, 60), 100);
  }
});
test("invalid, open, curved, empty, degenerate and outside geometry rejects", () => {
  for (const d of [
    "",
    "M0 0L20 20",
    "M0 0L20 20Z",
    "M0 0Q20 0 20 20Z",
    "M0 0A20 20 0 0 1 20 20Z",
    "M0 0H101V20H0Z",
    "M-1 0H20V20Z",
    "url(image.svg)",
    "M0 0H20V20Z M1 1L2 2",
  ])
    assert.throws(() => band(d));
  assert.throws(() => pathShape({ d: "M0 0H20V20Z", fillRule: "bad" }, "/test"));
  assert.throws(() => pathShape({ d: "M0 0H20V20Z", transform: [] }, "/test"));
});
test("subnormal and huge closed paths retain finite outward bounds", () => {
  for (const n of [Number.MIN_VALUE, 1e-300, 1e300]) {
    const shape = band(`M0 0H${n}V${n}H0Z`, "left", n, n);
    assert.equal(shape.depth(0, n), n);
    assert.equal(band(`M0 0H${n}V${n}H0Z`, "right", n, n).depth(0, n), n);
  }
});
test("parse, retained geometry and every query charge before their work", () => {
  let used = 0;
  const shape = preparePathBand(
    pathShape("M0 0H20V20H0Z", "/test")!,
    20,
    20,
    "left",
    (n) => {
      used += n;
    },
    "/test",
  );
  const before = used;
  shape.depth(0, 10);
  const delta = used - before;
  assert.ok(before > 20 && delta > 1);
  shape.depth(0, 10);
  assert.equal(used, before + 2 * delta);
  assert.throws(
    () =>
      preparePathBand(
        pathShape("M0 0H20V20H0Z", "/test")!,
        20,
        20,
        "left",
        () => {
          throw Error("quota");
        },
        "/test",
      ),
    /quota/u,
  );
});
test("repeated path queries share the actual cumulative operation source budget", () => {
  const operation = createLayoutOperation({ limits: { nodes: 500 } });
  try {
    const shape = preparePathBand(
      pathShape("M0 0H20V20H0Z", "/test")!,
      20,
      20,
      "left",
      (n) => chargeSourceWork(n, operation, "/test"),
      "/test",
    );
    assert.throws(() => {
      for (let i = 0; i < 500; i++) shape.depth(0, 10);
    }, /Source work nodes limit/u);
    assert.throws(() => shape.depth(0, 10), /Source work nodes limit/u);
  } finally {
    operation.close();
  }
});
