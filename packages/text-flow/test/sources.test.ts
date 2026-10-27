import assert from "node:assert/strict";
import test from "node:test";
import { Source } from "@updf/text-flow/sources";

test("Source builders are immutable data, with omission-only fill rules and exact URLs", () => {
  assert.deepEqual(Source.url(" ./asset.png "), { kind: "url", src: " ./asset.png " });
  assert.deepEqual(Source.path("M0 0Z"), { kind: "path", d: "M0 0Z", fillRule: "nonzero" });
  const points = [0, 0, 2, 0, 0, 2];
  const polygon = Source.polygon(points, { fillRule: "evenodd" });
  points[0] = 9;
  assert.equal(polygon.points[0], 0);
  assert.ok(Object.isFrozen(polygon) && Object.isFrozen(polygon.points));
  for (const options of [undefined, null, { fillRule: undefined }, { fillRule: null }, { extra: 1 }, { [Symbol()]: 1 }])
    assert.throws(() => Source.path("", options as never), TypeError);
  assert.throws(() => Source.url(""), TypeError);
});
test("polygon rejects sparse, accessor, extra, nonfinite, coerced and excessive coordinates without invoking getters", () => {
  let calls = 0;
  const getter = Object.defineProperty([0, 0, 2, 0, 0, 2], "0", {
    get: () => {
      calls++;
      return 0;
    },
  });
  for (const points of [
    getter,
    new Array(6),
    [0, 0, 1, 1],
    [0, 0, 1, 1, 2],
    [0, 0, 1, 1, 2, Infinity],
    ["0", 0, 1, 1, 2, 2],
    Object.assign([0, 0, 2, 0, 0, 2], { x: 1 }),
    new Array(8192).fill(0),
  ])
    assert.throws(() => Source.polygon(points as never), TypeError);
  assert.equal(calls, 0);
});
