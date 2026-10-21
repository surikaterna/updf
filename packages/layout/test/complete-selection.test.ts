import assert from "node:assert/strict";
import test from "node:test";
import {
  block,
  column,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  type Extensions,
  fixed,
  flow,
  layout,
  row,
} from "@updf/layout";
import { DocumentError } from "@updf/core";
import { containerProducer } from "../dist/cjs/container-producer.js";
import { wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { FragmentState } from "../dist/cjs/fragment-state.js";
import type { FragmentRequest, PreparedBlock } from "../dist/cjs/protocol.js";
import { sizing } from "../dist/cjs/sizing.js";

const region = { offset: 0, width: 10, freshHeight: 10, availableHeight: 10, usedHeight: 0, atFreshRegion: true };
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
function run(children: NonNullable<Parameters<typeof flow>[0]["children"]>, height: number, extensions?: Extensions) {
  return layout(
    document({
      children: flow({ pageSize: { width: 10, height }, margins, children, ...(extensions ? { extensions } : {}) }),
    }),
  );
}
function child(height: number, calls: FragmentRequest[]): PreparedBlock {
  return {
    fragmentation: "atomic",
    naturalSize: { width: 10, height },
    extent: 1,
    fragment(request) {
      calls.push(request);
      assert.equal(request.mode, "complete");
      for (const key of ["freshHeight", "availableHeight", "usedHeight", "atFreshRegion"])
        assert.equal(Object.hasOwn(request, key), false, key);
      return { height, nextOffset: 1, geometry: wholeBoxGeometry(height), paint: () => [] };
    },
  };
}

test("kept containers query whole children while their real outer region remains bounded", () => {
  const calls: FragmentRequest[] = [];
  const prepared = containerProducer(sizing(undefined, 10, "/kept"), [child(2, calls)], true, 10, "/kept");
  assert.equal(prepared.fragment({ ...region, availableHeight: 1, usedHeight: 9 }), undefined);
  assert.equal(calls.length, 0);
  const fragment = prepared.fragment(region)!;
  assert.equal(fragment.height, 2);
  assert.equal(fragment.nextOffset, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.width, 10);
});

test("complete stacks consume gaps and all children without a synthetic capacity", () => {
  const calls: FragmentRequest[] = [];
  const prepared = containerProducer(
    sizing({ gap: 0.25 }, 10, "/stack"),
    [child(2, calls), child(3, calls)],
    false,
    10,
    "/stack",
  );
  const selected = prepared.fragment({ mode: "complete", offset: 0, width: 10, state: new FragmentState() })!;
  assert.equal(selected.nextOffset, prepared.extent);
  assert.equal(selected.height, 5.25);
  assert.deepEqual(
    selected.geometry.children.map((entry) => entry.y),
    [0, 2, 2.25],
  );
  assert.equal(calls.length, 2);
});

test("authored definite alignment still passes the actual bounded content region", () => {
  let query: FragmentRequest | undefined;
  const aligned: PreparedBlock = {
    fragmentation: "atomic",
    naturalSize: { width: 10, height: 2 },
    extent: 1,
    autoMargin: true,
    fragment(request) {
      query = request;
      return { nextOffset: 1, height: 2, geometry: wholeBoxGeometry(2), paint: () => [] };
    },
  };
  const prepared = containerProducer(sizing({ height: 10 }, 10, "/aligned"), [aligned], true, 10, "/aligned", true);
  const selected = prepared.fragment(region)!;
  assert.ok(query && query.mode !== "complete");
  assert.equal(query.freshHeight, 10);
  assert.equal(query.usedHeight, 8);
  assert.equal(query.availableHeight, 2);
  assert.equal(selected.geometry.children[0]!.y, 8);
});

test("complete selection does not bypass explicit height or hidden-clipping policy", () => {
  const picture = fixed({
    width: 1,
    height: 40,
    children: [{ type: "rect", x: 0, y: 0, width: 1, height: 40, paint: { fill: [0, 0, 0], stroke: null } }],
  });
  const result = run(block({ style: { height: 10, overflow: "hidden" }, children: [picture] }), 20);
  assert.equal(result.pageCount, 1);
  assert.equal(result.placements[0]!.box.height, 10);
  assert.throws(() => run(block({ style: { height: 10, overflow: "error" }, children: [picture] }), 20), DocumentError);
});

test("Row Columns and ordinary splittable Blocks retain placement and page controls", () => {
  const boxes = [fixed({ height: 2, children: [] }), fixed({ height: 3, children: [] })];
  const split = run(block({ style: { gap: 0.25 }, children: boxes }), 3);
  assert.equal(split.pageCount, 2);
  assert.deepEqual(
    split.placements.map((placed) => placed.box.height),
    [2.25, 3],
  );
  const whole = run(row({ children: [column({ width: 10, children: boxes })] }), 6);
  assert.equal(whole.pageCount, 1);
  assert.equal(whole.placements[0]!.box.height, 5);
  assert.throws(
    () => run(block({ keepTogether: true, children: [boxes[0]!, { type: "pageBreak" }, boxes[1]!] }), 6),
    DocumentError,
  );
});

test("complete selection cannot silently discard positive units in a zero-height kept container", () => {
  const adapter = defineBlockAdapter({
    name: "complete.understated",
    validate: () => ({}),
    measure: () => ({
      fragmentation: "atomic",
      naturalSize: { width: 1, height: 0 },
      extent: 1,
      next: () => ({
        end: 1,
        height: 0.5,
        nodes: [{ type: "rect", x: 0, y: 0, width: 1, height: 0.5, paint: { fill: [0, 0, 0], stroke: null } }],
      }),
    }),
  });
  const extensions = createExtensions([adapter]);
  const visual = extension(adapter, {});
  assert.equal(run(visual, 10, extensions).placements[0]!.box.height, 0.5);
  assert.throws(
    () => run(block({ keepTogether: true, children: [visual] }), 10, extensions),
    (error) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "GEOMETRY" &&
      error.diagnostics[0].message === "Zero-height container cannot discard positive content",
  );
});
