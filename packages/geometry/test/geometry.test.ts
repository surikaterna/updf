import assert from "node:assert/strict";
import test from "node:test";
import type { PathCommand } from "@updf/core";
import { DocumentError } from "@updf/core";
import { arc, ellipse, parseColor, parsePathData, polygon } from "@updf/geometry";

const end = (command: PathCommand | undefined) => (command && command.type !== "close" ? [command.x, command.y] : []);
test("all SVG commands/case, repeated moveto, relative coordinates and close reset", () => {
  const path = parsePathData(
    "m10 10 20 0 h5 v5 l-5-5 H20 V20 C20 10 30 10 30 20 s10 10 20 0 Q60 10 60 20 t10 0 a5 5 0 0 1 10 0 z l5 5",
  );
  assert.equal(path[0]?.type, "move");
  assert.equal(path[1]?.type, "line");
  assert.deepEqual(end(path[1]), [30, 10]);
  assert.deepEqual(end(path.at(-1)), [15, 15]);
  assert.ok(path.some((command) => command.type === "cubic") && path.some((command) => command.type === "close"));
  assert.deepEqual(
    parsePathData("M1 2 3 4 5 6").map((command) => command.type),
    ["move", "line", "line"],
  );
  assert.deepEqual(parsePathData("M1 2h3v4c1 1 2 2 3 3s2 2 3 3q1 1 2 2t2 2z")[1], { type: "line", x: 4, y: 2 });
});

test("strict scanner consumes exponents, decimals and adjacent signs, including compact arc flags", () => {
  assert.deepEqual(parsePathData("M1e1-2E+0L.5.6"), [
    { type: "move", x: 10, y: -2 },
    { type: "line", x: 0.5, y: 0.6 },
  ]);
  assert.deepEqual(end(parsePathData("M0 0A10 10 0 0110 20").at(-1)), [10, 20]);
  for (const invalid of [
    "M0 0garbage",
    "M0,",
    "M,,0 0",
    "M0 0 L",
    "L0 0",
    "M1e 0",
    "M0 0 R1 2",
    "M0 0A1 1 0 2 0 3 4",
    "M0 0A1 1 0 -1 0 3 4",
  ]) {
    assert.throws(() => parsePathData(invalid), DocumentError, invalid);
  }
  assert.throws(() => parsePathData("M0 0" + "Z".repeat(4096)), DocumentError);
});

test("quadratic is cubic math, S/T reflect only compatible source commands and reset after close/arc", () => {
  const quad = parsePathData("M0 0Q3 6 9 0")[1];
  assert.deepEqual(quad, { type: "cubic", x1: 2, y1: 4, x2: 5, y2: 4, x: 9, y: 0 });
  const smooth = parsePathData("M0 0C1 2 3 4 5 6S7 8 9 10")[2];
  assert.ok(smooth?.type === "cubic");
  assert.deepEqual([smooth.x1, smooth.y1], [7, 8]);
  const reset = parsePathData("M0 0Q1 2 3 4S5 6 7 8")[2];
  assert.ok(reset?.type === "cubic");
  assert.deepEqual([reset.x1, reset.y1], [3, 4]);
  const t = parsePathData("M0 0Q3 6 9 0T18 0")[2];
  assert.ok(t?.type === "cubic");
  assert.deepEqual([t.x1, t.y1], [13, -4]);
  const afterArc = parsePathData("M0 0A5 5 0 0 1 10 0S12 2 14 0").at(-1);
  assert.ok(afterArc?.type === "cubic");
  assert.deepEqual([afterArc.x1, afterArc.y1], [10, 0]);
});

test("attributed arc handles radius correction/negative radii/degeneracy and flags", () => {
  assert.deepEqual(arc(0, 0, 10, 10, 0, 2, 0, 0, 1), [{ type: "line", x: 10, y: 10 }]);
  assert.deepEqual(arc(5, 5, 5, 5, 10, 20, 45, 1, 1), []);
  assert.deepEqual(arc(0, 0, 20, 0, -10, -5, 0, 0, 1), arc(0, 0, 20, 0, 10, 5, 0, 0, 1));
  const corrected = arc(0, 0, 200, 20, 1, 2, 30, 1, 0);
  assert.ok(corrected.length >= 2 && corrected.length <= 4);
  assert.deepEqual(end(corrected.at(-1)), [200, 20]);
  const large = arc(0, 0, 10, 10, 100, 50, 45, 1, 1);
  assert.ok(large.length >= 3);
  assert.throws(() => arc(0, 0, 5, 5, 2, 2, 0, 2, 0), DocumentError);
});

test("immutable polygon/ellipse helpers and strict normalized color/alpha parsing", () => {
  const points = Object.freeze([10, 10, 20, 10, 20, 20]);
  assert.equal(polygon(points).at(-1)?.type, "close");
  assert.equal(polygon(points, false).length, 3);
  assert.deepEqual(points, [10, 10, 20, 10, 20, 20]);
  assert.equal(ellipse(10, 10, 5, 3).filter((command) => command.type === "cubic").length, 4);
  assert.deepEqual(parseColor("rgba(255,0,128,0.25)"), { rgb: [1, 0, 128 / 255], opacity: 0.25 });
  assert.deepEqual(parseColor("#f008"), { rgb: [1, 0, 0], opacity: 136 / 255 });
  assert.deepEqual(parseColor("none"), { rgb: null, opacity: 1 });
  for (const invalid of ["#123garbage", "#1 2 3", "r gb(0,0,0)", "rgb(256,0,0)", "rgba(0,0,0,5)", "rgb(0,0,0)junk"])
    assert.throws(() => parseColor(invalid), DocumentError);
});
