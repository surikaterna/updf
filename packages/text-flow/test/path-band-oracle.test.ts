import assert from "node:assert/strict";
import test from "node:test";
import { bits, dyadic, value } from "@updf/layout-boxes/numeric";
import { pathShape, preparePathBand } from "../src/path-band.js";

type Point = readonly [number, number];
const exact = (n: number) => dyadic(bits(n));
function certify(depth: number, points: readonly Point[], low: number, high: number, width: number, right: boolean) {
  for (let index = 0; index < points.length; index++) {
    const p = points[index]!,
      q = points[(index + 1) % points.length]!;
    const a = p[1] <= q[1] ? p : q,
      b = p[1] <= q[1] ? q : p;
    if (low > b[1] || high < a[1]) continue;
    for (const y of [Math.max(low, a[1]), Math.min(high, b[1])]) {
      const span = exact(b[1]) - exact(a[1]);
      const base = span === 0n ? 1n : span;
      const x =
        span === 0n
          ? exact(right ? Math.min(a[0], b[0]) : Math.max(a[0], b[0]))
          : exact(a[0]) * span + (exact(b[0]) - exact(a[0])) * (exact(y) - exact(a[1]));
      const intrusion = right ? exact(width) * base - x : x;
      assert.ok(exact(depth) * base >= intrusion, "independent rational side-bound underflow");
    }
  }
}
test("independent rational clipped-edge oracle certifies both sides at extreme scales", () => {
  for (const scale of [Number.MIN_VALUE * 32, 1e-300, 1, 1e300]) {
    const points: Point[] = [
      [0, 0],
      [scale, 0],
      [scale / 4, scale / 3],
      [scale / 2, scale],
      [0, scale],
    ];
    const d = `${points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")}Z`;
    for (const side of ["left", "right"] as const) {
      const shape = preparePathBand(pathShape(d, "/oracle")!, scale, scale, side, () => {}, "/oracle");
      for (let i = 0; i <= 16; i++) {
        const low = (scale / 16) * i,
          high = Math.min(scale, low + scale / 8);
        certify(shape.depth(low, high), points, low, high, scale, side === "right");
      }
    }
  }
});
test("adjacent binary64 vertex heights retain both endpoints and exact touching caps", () => {
  const y = 1e300,
    next = value(bits(y) + 1n);
  const points: Point[] = [
    [0, 0],
    [100, y],
    [10, next],
    [0, next],
  ];
  const d = `M0 0L100 ${y}L10 ${next}H0Z`;
  for (const side of ["left", "right"] as const) {
    const shape = preparePathBand(pathShape(d, "/adjacent")!, 100, next, side, () => {}, "/adjacent");
    for (const [low, high] of [
      [y, y],
      [y, next],
      [next, next],
    ] as const)
      certify(shape.depth(low, high), points, low, high, 100, side === "right");
  }
});
