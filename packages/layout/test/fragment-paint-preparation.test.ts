import assert from "node:assert/strict";
import test from "node:test";
import { createLayoutOperation, sum } from "@updf/core/internal";
import { decorate } from "../dist/cjs/decorated-producer.js";
import { createDecorationPlan } from "../dist/cjs/decorations.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { prepareContainerPlacements } from "../dist/cjs/container-placement.js";
import { fragmentGeometry, prepareFragmentPaint, wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { certifyGeneratedFragment, generatedIntervals } from "../dist/cjs/generated-interval.js";
import type { FragmentChild, PlacedFragment } from "../dist/cjs/protocol.js";
import { resolvePaint } from "../dist/cjs/protocol-runtime.js";
import { sizing } from "../dist/cjs/sizing.js";

const path = "/preparation";
function budget(): OutputBudget {
  const operation = createLayoutOperation({});
  const result = new OutputBudget(operation.policy);
  operation.close();
  return result;
}
function parent(children: readonly FragmentChild[]): PlacedFragment {
  return {
    height: 10,
    nextOffset: 1,
    geometry: fragmentGeometry([], children),
    paint: () => [],
    *paintSteps(context) {
      for (const child of context.children) yield child;
      return [];
    },
  };
}
function leaf(paint: PlacedFragment["paint"] = () => []): PlacedFragment {
  return { height: 1.1, nextOffset: 1, geometry: wholeBoxGeometry(1.1), paint };
}

test("authentic generated slot cannot certify an unchanged opaque semantic box", () => {
  const sequence = generatedIntervals();
  sequence.append(1.2, path);
  const interval = sequence.append(1.1, path);
  let paints = 0;
  const child = leaf(() => {
    paints++;
    return [];
  });
  const piece = certifyGeneratedFragment({ fragment: child, top: interval.sourceStart, interval }, [interval]);
  const selected = { pieces: [piece], height: interval.sourceEnd, nextOffset: 1, advance: false };
  const box = sizing({ paddingTop: 0.1 }, 100, path);
  const live = budget();
  const before = live.totals();
  const invalid = parent(prepareContainerPlacements(box, selected, 2.4, false, path));
  assert.throws(() => prepareFragmentPaint(invalid, { x: 0, y: 0 }, live, path), /whole box/);
  assert.equal(paints, 0);
  assert.deepEqual(live.totals(), before);
  const fitting = parent(prepareContainerPlacements(box, selected, 2.4000000000000004, false, path));
  const prepared = prepareFragmentPaint(fitting, { x: 0, y: 0 }, live, path);
  assert.equal(prepared.root.context.children[0]?.context.y, 1.3);
  assert.equal(prepared.root.context.children[0]?.context.partPositions[0], 1.3);
  assert.equal(child.height, 1.1);
  assert.equal(Object.isFrozen(child), false);
  assert.equal(Object.isFrozen(prepared.root.context.children), true);
  resolvePaint(prepared.root);
  assert.equal(paints, 1);
});

test("invalid final descendant preflights before any earlier paint or live work charge", () => {
  let paints = 0;
  const first = leaf(() => {
    paints++;
    return [];
  });
  const invalid = { ...leaf(), geometry: fragmentGeometry([{ offset: 2, height: 1, reservation: "whole-box" }]) };
  const root = parent([
    { fragment: first, x: 0, y: 0, frame: "local" },
    { fragment: parent([{ fragment: invalid, x: 0, y: 0, frame: "local" }]), x: 0, y: 0, frame: "local" },
  ]);
  const live = budget();
  const before = live.totals();
  assert.throws(() => prepareFragmentPaint(root, { x: 0, y: 0 }, live, path), /fragment reservation/);
  assert.equal(paints, 0);
  assert.deepEqual(live.totals(), before);
});

test("prepared child association rejects an otherwise authentic sibling record", () => {
  const child = leaf();
  const relation = { fragment: child, x: 0, y: 0, frame: "local" as const };
  const other = parent([relation]);
  const live = budget();
  const foreign = prepareFragmentPaint(other, { x: 0, y: 0 }, live, path).root.context.children[0]!;
  const root = {
    ...parent([relation]),
    *paintSteps() {
      yield foreign;
      return [];
    },
  };
  const prepared = prepareFragmentPaint(root, { x: 0, y: 0 }, live, path);
  assert.throws(() => resolvePaint(prepared.root), /undeclared prepared child/);
});

test("twenty-thousand-deep declared graph prepares and paints on heap continuations", () => {
  let paints = 0;
  let root = leaf(() => {
    paints++;
    return [];
  });
  for (let i = 0; i < 20000; i++) root = parent([{ fragment: root, x: 0, y: 0, frame: "local" }]);
  const live = budget();
  const prepared = prepareFragmentPaint(root, { x: 0, y: 0 }, live, path);
  assert.equal(prepared.work, 40002);
  resolvePaint(prepared.root);
  assert.equal(paints, 1);
});

test("ancestor cycles fail, but reused fragment occurrences remain distinct and valid", () => {
  const child = leaf();
  const root = parent([
    { fragment: child, x: 0, y: 0, frame: "local" },
    { fragment: child, x: 2, y: 0, frame: "local" },
  ]);
  const prepared = prepareFragmentPaint(root, { x: 0, y: 0 }, budget(), path);
  assert.notEqual(prepared.root.context.children[0], prepared.root.context.children[1]);
  const children: FragmentChild[] = [];
  const cycle = { ...parent([]), geometry: { parts: [], children, order: [{ child: 0 }] } };
  children.push({ fragment: cycle, x: 0, y: 0, frame: "local" });
  assert.throws(() => prepareFragmentPaint(cycle, { x: 0, y: 0 }, budget(), path), /Cyclic/);
});

test("hidden authentication must not materialize authentic ill-conditioned generated slots", () => {
  const sequence = generatedIntervals();
  sequence.append(1e20, path);
  sequence.append(30000, path);
  sequence.append(30000, path);
  const interval = sequence.append(30000, path);
  const child = { ...leaf(), height: 30000, geometry: wholeBoxGeometry(30000) };
  const piece = certifyGeneratedFragment({ fragment: child, top: interval.sourceStart, interval }, [interval]);
  const selected = { pieces: [piece], height: interval.sourceEnd, nextOffset: 1, advance: false };
  assert.doesNotThrow(() => prepareContainerPlacements(sizing({}, 100, path), selected, 10, true, path));
  const declared = certifyGeneratedFragment(
    {
      ...child,
      height: interval.sourceEnd,
      geometry: fragmentGeometry([
        { offset: interval.sourceStart, height: 30000, certificate: interval, reservation: "slot" },
      ]),
    },
    [interval],
  );
  const root = parent([{ fragment: declared, x: 0, y: 0, frame: "local", hidden: true }]);
  assert.equal(
    prepareFragmentPaint(root, { x: 0, y: 0 }, budget(), path).root.context.children[0]?.context.partPositions[0],
    interval.sourceStart,
  );
});

test("hidden parts and placements reject copied, unowned, foreign and wrong-owner certificates", () => {
  const interval = generatedIntervals().append(2, path);
  const foreign = generatedIntervals().append(2, path);
  const copied = { ...interval };
  for (const [certificate, bindings] of [
    [{ ...interval }, []],
    [copied, [copied]],
    [interval, []],
    [foreign, [interval]],
  ] as const) {
    const child = certifyGeneratedFragment(
      {
        ...leaf(),
        height: 2,
        geometry: fragmentGeometry([{ offset: 0, height: 2, certificate, reservation: "slot" }]),
      },
      bindings,
    );
    const piece = certifyGeneratedFragment({ fragment: child, top: 0, interval: certificate }, bindings);
    assert.throws(
      () =>
        prepareContainerPlacements(
          sizing({}, 100, path),
          { pieces: [piece], height: 2, nextOffset: 1, advance: false },
          1,
          true,
          path,
        ),
      /does not own/,
    );
    for (const fragment of [
      child,
      { ...child, geometry: fragmentGeometry([], [{ fragment: child, x: 0, y: 0, frame: "zero" }]) },
    ]) {
      const root = parent([{ fragment, x: 0, y: 0, frame: "local", hidden: true }]);
      assert.throws(() => prepareFragmentPaint(root, { x: 0, y: 0 }, budget(), path), /does not own/);
    }
  }
});

test("decoration body materializes one immediate origin: distinguishing native ULP association", () => {
  const operation = createLayoutOperation({});
  try {
    const sequence = generatedIntervals();
    sequence.append(1.1, path);
    const interval = sequence.append(0.1, path);
    const child = certifyGeneratedFragment(
      {
        height: 2,
        nextOffset: 1,
        geometry: fragmentGeometry([{ offset: 1.1, height: 0.1, certificate: interval, reservation: "slot" }]),
        paint: () => [],
      },
      [interval],
    );
    const producer = decorate(
      { fragmentation: "atomic", extent: 1, naturalSize: { width: 10, height: 2 }, fragment: () => child },
      createDecorationPlan([{ edge: "before", repeat: "all", height: 0.1, nodes: [] }]),
      operation,
      path,
    );
    const selected = producer.fragment({
      offset: 0,
      width: 10,
      usedHeight: 0,
      availableHeight: 10,
      freshHeight: 10,
      atFreshRegion: true,
    })!;
    const prepared = prepareFragmentPaint(selected, { x: 0, y: 0.1 }, new OutputBudget(operation.policy), path);
    assert.deepEqual(selected.geometry.order, [{ part: 0 }, { child: 0 }]);
    assert.equal(prepared.root.context.children[0]?.context.y, 0.2);
    assert.equal(prepared.root.context.children[0]?.context.partPositions[0], 1.3);
    assert.equal(sum([0.1, sum([0.1, 1.1])]), 1.3000000000000003);
    assert.notEqual(prepared.root.context.children[0]?.context.partPositions[0], sum([0.1, sum([0.1, 1.1])]));
  } finally {
    operation.close();
  }
});

test("undeclared, repeated and missing order entries reject, including empty parts", () => {
  for (const order of [[], [{ part: 0 }, { part: 0 }], [{ child: 0 }]]) {
    const invalid = {
      ...leaf(),
      geometry: fragmentGeometry([{ offset: 0, height: 0, reservation: "slot" }], [], order),
    };
    assert.throws(() => prepareFragmentPaint(invalid, { x: 0, y: 0 }, budget(), path), /order/);
  }
  const genuine = prepareFragmentPaint(leaf(), { x: 0, y: 0 }, budget(), path).root;
  assert.throws(() => resolvePaint({ ...genuine, context: { ...genuine.context } }), /not prepared/);
});
