import assert from "node:assert/strict";
import test from "node:test";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { paintContainerSteps } from "../dist/cjs/container-paint.js";
import { prepareContainerPlacements } from "../dist/cjs/container-placement.js";
import { fragmentGeometry, prepareFragmentPaint, wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { paintPrepared } from "./prepared-paint.js";
import {
  certifyGeneratedFragment,
  generatedIntervals,
  materializeGeneratedInterval,
} from "../dist/cjs/generated-interval.js";
import type { FragmentChild, FragmentPaintContext, PlacedFragment, PreparedBlock } from "../dist/cjs/protocol.js";
import { rowProducer } from "../dist/cjs/row-producer.js";
import { sizing } from "../dist/cjs/sizing.js";
import type { StackPiece, StackSelection } from "../dist/cjs/stack.js";

const path = "/container";
const fragment = (height: number): PlacedFragment => ({
  height,
  geometry: wholeBoxGeometry(height),
  nextOffset: 1,
  paint: () => [],
});
function preparedChild(relation: FragmentChild) {
  const operation = createDrawingLayoutOperation(textOptions({}));
  try {
    const root = { ...fragment(100), geometry: fragmentGeometry([], [relation]) };
    return prepareFragmentPaint(root, { x: 0, y: 0 }, new OutputBudget(operation.policy), path).root.context
      .children[0]!;
  } finally {
    operation.close();
  }
}
const selection = (pieces: readonly StackPiece[], height = 10): StackSelection => ({
  pieces,
  height,
  nextOffset: 1,
  advance: false,
});
const box = sizing({ paddingTop: 0.25, paddingLeft: 0.5, paddingBottom: 0.75 }, 100, path);

test("uncertified Row coordinates and declared parts are frozen snapshots, not mutable pieces", () => {
  const child = fragment(2);
  const piece = { fragment: child, top: 3, left: 4 };
  const selected = { ...selection([piece]), height: 10 };
  const placements = prepareContainerPlacements(box, selected, 11, false, path);
  const placed = placements[0];
  assert.ok(placed);
  assert.ok(Object.isFrozen(placements));
  assert.ok(Object.isFrozen(placed));
  assert.equal(Object.isFrozen(child), false);
  assert.equal(Object.isFrozen(piece), false);
  piece.top = 99;
  piece.left = 99;
  piece.fragment = fragment(0);
  selected.pieces = [];
  selected.height = 0;
  assert.equal(placed.fragment, child);
  const part = (offset: number, height: number) =>
    preparedChild({
      ...placed,
      fragment: { ...child, geometry: fragmentGeometry([{ offset, height, reservation: "whole-box" }]) },
    });
  assert.deepEqual([placed.x, placed.y, part(1, 1).context.partPositions[0]], [4.5, 3.25, 4.25]);
  assert.throws(() => part(-0.1, 0), /nonnegative/);
  assert.throws(() => part(1, 1.1), /Materialized child part/);
});

test("certified fractional and large local origins use materialized y without shrinking semantic height", () => {
  const cases = [
    [0, 1.2, 1.1],
    [0.1, 1.2, 1.1],
    [700, 1.25, 1.125],
    [1_000_000, 1.25, 1.125],
  ] as const;
  for (const [origin, first, extent] of cases) {
    const intervals = generatedIntervals();
    intervals.append(first, path);
    const interval = intervals.append(extent, path);
    const child = fragment(interval.semanticExtent);
    const piece = certifyGeneratedFragment({ fragment: child, top: interval.sourceStart, interval }, [interval]);
    const local = sizing({ paddingTop: origin }, 100, path);
    const expected = materializeGeneratedInterval(
      interval,
      origin,
      { sourceStart: 0, sourceEnd: interval.sourceEnd },
      path,
    );
    const placed = prepareContainerPlacements(
      local,
      selection([piece], interval.sourceEnd),
      origin + 3,
      false,
      path,
    )[0];
    assert.ok(placed);
    assert.equal(placed.y, expected.start);
    assert.equal(placed.y, origin + piece.top);
    assert.equal(placed.fragment.height, extent);
    assert.equal(placed.fragment, child);
    assert.ok(expected.allocationExtent <= child.height);
  }
});

test("large-origin ill-conditioned generated intervals retain their existing fatal rejection", () => {
  const intervals = generatedIntervals();
  intervals.append(1.2, path);
  const interval = intervals.append(1.1, path);
  const piece = certifyGeneratedFragment({ fragment: fragment(1.1), top: interval.sourceStart, interval }, [interval]);
  assert.throws(
    () =>
      prepareContainerPlacements(
        sizing({ paddingTop: 700 }, 100, path),
        selection([piece], interval.sourceEnd),
        703,
        false,
        path,
      ),
    /precision budget/,
  );
});

test("forged, wrong-owner and source-outside certificates fail before painting", () => {
  const interval = generatedIntervals().append(2, path);
  const child = fragment(2);
  const piece = { fragment: child, top: 0, interval };
  assert.throws(() => prepareContainerPlacements(box, selection([piece]), 11, false, path), /does not own/);
  const forged = { ...interval };
  const forgedPiece = certifyGeneratedFragment({ ...piece, interval: forged }, [forged]);
  assert.throws(() => prepareContainerPlacements(box, selection([forgedPiece]), 11, false, path), /does not own/);
  certifyGeneratedFragment(piece, [interval]);
  assert.throws(() => prepareContainerPlacements(box, selection([piece], 1), 11, false, path), /source reservation/);
  assert.throws(() => prepareContainerPlacements(box, selection([piece]), 2, false, path), /reserved content region/);
});

test("descendant certificate ownership preflights and uses the captured fragment", () => {
  const interval = generatedIntervals().append(2, path);
  const child = certifyGeneratedFragment(
    {
      ...fragment(2),
      geometry: fragmentGeometry([{ offset: 0, height: 2, certificate: interval, reservation: "slot" }]),
    },
    [interval],
  );
  const piece = { fragment: child, top: 1 };
  const placed = prepareContainerPlacements(box, selection([piece]), 11, false, path)[0];
  assert.ok(placed);
  piece.fragment = fragment(0);
  assert.equal(preparedChild(placed).context.partPositions[0], 1.25);
  for (const part of [
    { offset: 0, height: 1, certificate: interval, reservation: "slot" as const },
    { offset: 0, height: 2, certificate: { ...interval }, reservation: "slot" as const },
  ]) {
    const invalid = certifyGeneratedFragment({ ...child, geometry: fragmentGeometry([part]) }, [interval]);
    assert.throws(() => preparedChild({ ...placed, fragment: invalid }), /does not own/);
  }
});

test("hidden authenticates certificates but bypasses part bounds; painter adds explicit padding-edge clip", () => {
  const interval = generatedIntervals().append(20, path);
  const piece = certifyGeneratedFragment({ fragment: fragment(20), top: 0, interval }, [interval]);
  const forged = { ...interval };
  const invalid = certifyGeneratedFragment({ ...piece, interval: forged }, [forged]);
  assert.throws(() => prepareContainerPlacements(box, selection([invalid]), 4, true, path), /does not own/);
  const placements = prepareContainerPlacements(box, selection([piece]), 4, true, path);
  assert.equal(placements[0]?.y, 0.25);
  assert.equal(preparedChild(placements[0]!).context.partPositions[0], 0.25);
  const operation = createDrawingLayoutOperation(textOptions({}));
  try {
    const root = { ...fragment(4), geometry: fragmentGeometry([], placements) };
    const context = prepareFragmentPaint(root, { x: 5, y: 6 }, new OutputBudget(operation.policy), path).root.context;
    const steps = paintContainerSteps(box, 4, true, context, path);
    const first = steps.next();
    assert.ok(!first.done);
    assert.equal(first.value.fragment, placements[0]?.fragment);
    const result = steps.next([]);
    assert.ok(result.done);
    const outer = result.value[0];
    assert.equal(outer?.type, "paintGroup");
    if (outer?.type !== "paintGroup") return;
    assert.deepEqual(outer.transform, [1, 0, 0, 1, 5, 6]);
    assert.deepEqual(outer.children[0], {
      type: "paintGroup",
      clip: { x: 0, y: 0, width: 100, height: 4 },
      children: [],
    });
  } finally {
    operation.close();
  }
});

test("zero container never inspects pieces; zero-height advance child still has a placement", () => {
  const poison = {
    ...selection([]),
    get pieces(): readonly StackPiece[] {
      throw Error("read pieces");
    },
  };
  assert.deepEqual(prepareContainerPlacements(box, poison, 0, false, path), []);
  const child = { ...fragment(0), advance: true };
  const placed = prepareContainerPlacements(box, selection([{ fragment: child, top: 0 }], 0), 1, false, path)[0];
  assert.equal(placed?.fragment, child);
  assert.equal(preparedChild(placed!).context.partPositions[0], 0.25);
});

function rowFixture(top: number, painted: FragmentPaintContext[]) {
  const child: PreparedBlock = {
    fragmentation: "atomic",
    extent: 1,
    naturalSize: { width: 10, height: 1 },
    fragment: () => ({
      height: 1,
      geometry: wholeBoxGeometry(1),
      nextOffset: 1,
      paint: (context) => {
        painted.push(context);
        return [];
      },
    }),
  };
  return rowProducer(
    sizing({}, 100, path),
    [child, child],
    {
      height: 20,
      children: [
        { left: 2, top: 3, width: 10, height: 1 },
        { left: 10, top, width: 10, height: 1 },
      ],
    },
    path,
  );
}
const request = { offset: 0, width: 100, usedHeight: 0, availableHeight: 20, freshHeight: 20, atFreshRegion: true };

test("invalid second Row child throws during construction with zero paint and operation cleanup", () => {
  const painted: FragmentPaintContext[] = [];
  const operation = createDrawingLayoutOperation(textOptions({}));
  let closed = false;
  assert.throws(() => {
    try {
      rowFixture(30, painted).fragment(request);
    } finally {
      operation.close();
      closed = true;
    }
  }, /Materialized child exceeds/);
  assert.equal(closed, true);
  assert.deepEqual(painted, []);
});

test("production Row reuses stored coordinates across repeated prepared paint calls", () => {
  const painted: FragmentPaintContext[] = [];
  const selected = rowFixture(7, painted).fragment(request);
  assert.ok(selected);
  const operation = createDrawingLayoutOperation(textOptions({}));
  try {
    const budget = new OutputBudget(operation.policy);
    assert.deepEqual(paintPrepared(selected, budget, 50, 60), paintPrepared(selected, budget, 50, 60));
    assert.deepEqual(
      painted.map(({ x, y }) => [x, y]),
      [
        [2, 3],
        [10, 7],
        [2, 3],
        [10, 7],
      ],
    );
    assert.deepEqual(painted[0]?.partPositions, painted[2]?.partPositions);
    assert.deepEqual(painted[1]?.partPositions, painted[3]?.partPositions);
  } finally {
    operation.close();
  }
});
