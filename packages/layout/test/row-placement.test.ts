import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError } from "@updf/core";
import type { FragmentRequest, PreparedBlock } from "../dist/cjs/protocol.js";
import { rowProducer } from "../dist/cjs/row-producer.js";
import { sizing } from "../dist/cjs/sizing.js";
import { wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";

function column(height: number, selectedHeight = height): PreparedBlock {
  return {
    fragmentation: "atomic",
    naturalSize: { width: 20, height },
    extent: 1,
    fragment: () => ({
      height: selectedHeight,
      geometry: wholeBoxGeometry(selectedHeight),
      nextOffset: 1,
      paint: () => [],
    }),
  };
}
const request = { offset: 0, availableHeight: 40, freshHeight: 40, atFreshRegion: true, width: 80, usedHeight: 0 };
test("Row reuses frozen offsets and requests complete Columns without synthetic capacities", () => {
  const calls: FragmentRequest[] = [],
    child = column(3);
  const observed = {
    ...child,
    fragment: (input: FragmentRequest) => {
      calls.push(input);
      return child.fragment(input);
    },
  };
  const row = rowProducer(
    sizing({ gap: 1, paddingTop: 1, paddingBottom: 2 }, 80, "/row"),
    [observed, column(5)],
    Object.freeze({
      height: 13,
      children: Object.freeze([
        Object.freeze({ left: 0, top: 7, width: 20, height: 3 }),
        Object.freeze({ left: 21, top: 5, width: 20, height: 5 }),
      ]),
    }),
    "/row",
  );
  assert.deepEqual(row.rowPlacement?.children, [
    { left: 0, top: 7, width: 20, height: 3 },
    { left: 21, top: 5, width: 20, height: 5 },
  ]);
  assert.ok(Object.isFrozen(row.rowPlacement) && Object.isFrozen(row.rowPlacement?.children[0]));
  assert.equal(row.fragment(request)?.height, 13);
  assert.equal(row.fragment(request)?.height, 13);
  assert.equal(calls.length, 2);
  const selected = calls[0];
  assert.ok(selected?.mode === "complete");
  assert.deepEqual(Object.keys(selected).sort(), ["mode", "offset", "reserve", "width"]);
  assert.equal(selected.width, 20);
  assert.equal(selected.offset, 0);
});
test("complete Row children must retain prepared sizes instead of triggering placement reflow", () => {
  const row = rowProducer(
    sizing(undefined, 80, "/row"),
    [column(10, 9)],
    { height: 10, children: [{ left: 0, top: 0, width: 20, height: 10 }] },
    "/row",
  );
  assert.throws(
    () => row.fragment(request),
    (error) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE" && error.diagnostics[0].path === "/row",
  );
});
