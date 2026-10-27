import assert from "node:assert/strict";
import test from "node:test";
import { profileDepth } from "../src/profile-interpolation.js";
import { profileExclusion, profileInterval } from "../src/profile-exclusion.js";
import { MetricSum } from "../src/arithmetic.js";
import { selectProfileLine } from "../src/composition-profile.js";
import { DocumentError } from "@updf/core";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { lineSelector } from "../src/wrap-selector.js";
import { ledger } from "../src/ledger.js";

// Independent exact rational oracle: decode IEEE fields here, not with the
// production numeric helpers or the algorithm's rounded operation sequence.
function integer(n: number): bigint {
  const data = new DataView(new ArrayBuffer(8));
  data.setFloat64(0, n);
  const bits = data.getBigUint64(0),
    exponent = (bits >> 52n) & 2047n;
  const fraction = bits & ((1n << 52n) - 1n);
  return exponent === 0n ? fraction : ((1n << 52n) | fraction) << (exponent - 1n);
}
function check(x0: number, x1: number, y0: number, y1: number, query: number) {
  const result = profileDepth({ x: x0, y: y0 }, { x: x1, y: y1 }, query);
  const a = integer(x0),
    b = integer(x1),
    start = integer(y0),
    end = integer(y1),
    y = integer(query);
  const exactNumerator = a * (end - y) + b * (y - start);
  assert.ok(integer(result) * (end - start) >= exactNumerator, `${[x0, x1, y0, y1, query, result]}`);
  assert.ok(result >= Math.min(x0, x1) && result <= Math.max(x0, x1));
  if (query === y0 || x0 === x1) assert.equal(result, x0);
  else if (query === y1) assert.equal(result, x1);
}
test("outward interpolation bounds an independent BigInt rational oracle across normal, subnormal and huge scales", () => {
  const depths = [Number.MIN_VALUE, 2 * Number.MIN_VALUE, 1e-310, 1e-300, 0.1, 0.3, 1, 1e100, Number.MAX_VALUE];
  const spans = [Number.MIN_VALUE, 4 * Number.MIN_VALUE, 1e-310, 1e-100, 0.3, 16, 1e300, Number.MAX_VALUE];
  for (const a of depths)
    for (const b of depths)
      for (const span of spans) {
        [0, span / 4, span / 2, span * 0.75, span].forEach((query) => {
          check(a, b, 0, span, query);
        });
      }
});
test("translated cancellation and exact endpoint identity remain conservative without unit-sized tolerances", () => {
  for (const top of [1e-300, 0.1, 1e10, 1e300]) {
    const end = top * 1.000000000000001;
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) check(1e-300, 1e100, top, end, top + (end - top) * fraction);
  }
});
test("clipped whole-band scans include vertices, convex/concave segments and exact cap touches", () => {
  const points = [
    { x: 1, y: 0 },
    { x: 9, y: 4 },
    { x: 2, y: 8 },
    { x: 8, y: 12 },
  ];
  const charges: number[] = [],
    charge = (n: number) => {
      charges.push(n);
    };
  for (const side of ["left", "right"] as const) {
    const profile = profileExclusion({ shape: "edge-profile", side, top: 10, points }, 20, "", charge);
    for (const [band, depth] of [
      [[0, 10], 0],
      [[22, 25], 0],
      [[13, 15], 9],
      [[14, 14], 9],
      [[10, 22], 9],
    ] as const) {
      const region = profileInterval(profile, 20, 0, band, "", charge);
      assert.equal(region.depth, depth);
      assert.equal(region.origin, side === "left" ? depth : 0);
      assert.equal(region.width, 20 - depth);
    }
  }
  assert.ok(charges.length > 20);
});
test("profile retry rejects exact no-progress even if compensated state might eventually advance", () => {
  const height = new MetricSum();
  height.add(1e300);
  const input = { ...rectangular("", {}, 60), maxHeight: Number.MAX_VALUE };
  const paragraph = input.paragraphs[0]!;
  const selector = lineSelector([], paragraph, ledger(), "");
  const profile = profileExclusion(
    {
      shape: "edge-profile",
      side: "left",
      top: 1e300,
      points: [
        { x: 60, y: 0 },
        { x: 60, y: 1e300 },
      ],
    },
    60,
    "",
    () => {},
  );
  assert.throws(
    () => selectProfileLine(selector, height, 16, input, profile, [0, 1e290], "", () => {}),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "GEOMETRY",
  );
});
