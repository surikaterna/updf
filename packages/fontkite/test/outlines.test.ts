import assert from "node:assert/strict";
import test from "node:test";
import { outlineBounds } from "../src/bounds.js";
import { Reader } from "../src/reader.js";
import { simple } from "../src/simple.js";
import { diagnostic } from "./helpers.js";
import { composite, outlineReader, triangle, words } from "./outline-helpers.js";

test("quadratic bounds use curve extrema rather than control points", () => {
  assert.deepEqual(
    outlineBounds([
      [
        { x: 0, y: 0, on: true },
        { x: 50, y: 100, on: false },
        { x: 100, y: 0, on: true },
      ],
    ]),
    [0, 0, 100, 50],
  );
  assert.deepEqual(outlineBounds([]), [0, 0, 0, 0]);
  assert.deepEqual(
    outlineBounds([
      [
        { x: -0.5, y: -0.25, on: true },
        { x: 1.25, y: 0.5, on: true },
      ],
    ]),
    [-1, -1, 2, 1],
  );
});

test("implicit on-curve midpoints and off-curve contour starts close correctly", () => {
  const contour = [
    { x: 0, y: 0, on: false },
    { x: 100, y: 100, on: false },
    { x: 0, y: 100, on: false },
  ];
  assert.deepEqual(outlineBounds([contour]), [0, 25, 75, 100]);
  assert.deepEqual(
    outlineBounds([
      [
        { x: 50, y: 100, on: false },
        { x: 100, y: 0, on: true },
        { x: 0, y: 0, on: true },
      ],
    ]),
    [0, 0, 100, 50],
  );
});

test("simple decoding, composite affine transforms and empty glyphs", () => {
  const glyph = triangle();
  const scaled = composite(0, 3 | 128, [8192, 4096, 0, 16384]);
  const reader = outlineReader([glyph, scaled, new Uint8Array()]);
  assert.deepEqual(outlineBounds(reader.get(0)), [0, 0, 100, 100]);
  assert.deepEqual(outlineBounds(reader.get(1)), [0, 0, 50, 100]);
  assert.deepEqual(reader.get(1)[0]![1], { x: 50, y: 25, on: true });
  assert.deepEqual(outlineBounds(reader.get(2)), [0, 0, 0, 0]);
});

test("short coordinate flags, repeated flags and zero-contour glyphs", () => {
  const data = new Uint8Array([...words([2, 0]), 0x3f, 2, 0, 10, 0, 0, 0, 10]);
  const contours = simple(new Reader(data), 1, () => {});
  assert.deepEqual(outlineBounds(contours), [0, 0, 10, 10]);
  assert.deepEqual(
    simple(new Reader(words([0])), 0, () => {}),
    [],
  );
  assert.throws(() => simple(new Reader(new Uint8Array([...words([0, 0]), 9, 1])), 1, () => {}), diagnostic());
});

test("invalid references, cycles, point attachment and scaled offsets reject explicitly", () => {
  assert.throws(() => outlineReader([composite(1)]).get(0), diagnostic());
  assert.throws(() => outlineReader([composite(0)]).get(0), diagnostic());
  assert.throws(() => outlineReader([composite(1), composite(0)]).get(0), diagnostic());
  for (const flags of [1, 3 | 0x800, 3 | 0x8000, 3 | 8 | 64]) {
    assert.throws(() => outlineReader([triangle(), composite(0, flags)]).get(1), diagnostic());
  }
  assert.throws(() => outlineReader([triangle().slice(0, -1)]).get(0), diagnostic());
  assert.throws(() => outlineReader([triangle(), composite(0, 3 | 256, [100])]).get(1), diagnostic());
});

test("composite depth and cached expansion have hard work budgets", () => {
  const chain = Array.from({ length: 17 }, (_, i) => composite(i + 1));
  chain.push(triangle());
  assert.throws(() => outlineReader(chain).get(0), diagnostic("LIMIT"));
  const expanded = [triangle()];
  for (let i = 1; i <= 10; i++) {
    expanded.push(words([-1, 0, 0, 100, 100, 35, i - 1, 0, 0, 35, i - 1, 0, 0, 35, i - 1, 0, 0, 3, i - 1, 0, 0]));
  }
  assert.throws(() => outlineReader(expanded).get(10), diagnostic("LIMIT"));
});
