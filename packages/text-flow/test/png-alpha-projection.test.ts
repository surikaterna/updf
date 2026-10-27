import assert from "node:assert/strict";
import test from "node:test";
import { bits, dyadic } from "@updf/layout-boxes/numeric";
import { preparePng } from "@updf/png";
import { preparePngShape } from "@updf/text-flow/png-shape";
import { alphaProjection } from "../dist/cjs/png-alpha-projection.js";
import { alphaPng } from "./png-shape-fixture.js";

const exact = (n: number) => dyadic(bits(n));
function requiredDepth(
  pixels: number[],
  reference: { x: number; y: number; width: number; height: number },
  outer: number,
  side: "left" | "right",
  top: number,
  bottom: number,
) {
  let required = 0n;
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue;
    const row = Math.floor(i / 4),
      col = i % 4;
    const lo = exact(reference.y) * 4n + exact(reference.height) * BigInt(row);
    const hi = exact(reference.y) * 4n + exact(reference.height) * BigInt(row + 1);
    if (exact(top) * 4n > hi || exact(bottom) * 4n < lo) continue;
    const edge =
      side === "left"
        ? exact(reference.x) * 4n + exact(reference.width) * BigInt(col + 1)
        : (exact(outer) - exact(reference.x)) * 4n - exact(reference.width) * BigInt(col);
    required = required > edge ? required : edge;
  }
  return required;
}
test("intrinsic bands conservatively enclose exact transformed cells at fractional, tiny, large and successor boundaries", async () => {
  const pixels = [255, 0, 0, 255, 0, 0, 255, 0, 255, 0, 0, 255, 0, 255, 255, 0];
  const shape = await preparePngShape(await preparePng(alphaPng(4, 4, pixels)));
  for (const scale of [1e-290, 0.1, 1, 1e100]) {
    const reference = { x: 2.3 * scale, y: 1.7 * scale, width: 17.1 * scale, height: 11.3 * scale };
    const outer = 23.7 * scale;
    for (const side of ["left", "right"] as const) {
      let work = 0;
      const query = alphaProjection(
        shape,
        reference,
        outer,
        side,
        (n) => {
          work += n;
        },
        "/mask",
      );
      for (let j = 0; j < 80; j++) {
        const top = (j * scale) / 4,
          bottom = ((j + 1) * scale) / 4;
        const required = requiredDepth(pixels, reference, outer, side, top, bottom);
        assert.ok(exact(query.depth(top, bottom)) * 4n >= required, `${side}/${scale}/${j}`);
      }
      assert.ok(work > 80);
      assert.equal(query.depth(100 * scale, 101 * scale), 0);
    }
  }
});
test("right depth includes outer width and letterbox offsets, while holes/islands only project to the outside", async () => {
  const shape = await preparePngShape(await preparePng(alphaPng(4, 1, [0, 255, 0, 0])));
  const reference = { x: 20, y: 10, width: 200, height: 30 };
  const query = alphaProjection(shape, reference, 250, "right", () => {}, "/mask");
  assert.ok(query.depth(11, 12) >= 180 && query.depth(11, 12) < 180.000000001);
  assert.equal(query.depth(0, 9), 0);
  assert.equal(query.depth(41, 50), 0);
});
test("transparent and threshold-one masks are empty without changing positive visual frame semantics", async () => {
  for (const [alpha, threshold] of [
    [0, 0],
    [255, 1],
  ] as const) {
    const shape = await preparePngShape(await preparePng(alphaPng(1, 1, [alpha])), { shapeImageThreshold: threshold });
    const query = alphaProjection(shape, { x: 0, y: 0, width: 80, height: 80 }, 80, "left", () => {}, "/mask");
    assert.equal(query.depth(0, 80), 0);
  }
});
