import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { contextLayoutOperation, createOperationCapability, defineOperationExtension } from "@updf/core/internal";
import { createContext, h, useContext, type ComponentContext, type VDOMChild } from "@updf/core/vdom";
import { Column, Flow, Row, layout } from "@updf/layout";
import { layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { authored, formProvider, owned, resourceFixture } from "./preparation-fixture.js";

function gate<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const rect = () => ({
  type: "rect",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  paint: { fill: [0, 0, 0], stroke: null },
});
const cases = [
  () => ({ type: "block" as const, style: { height: 5 }, children: [{ type: "spacer", height: 1 }] }),
  () => ({ type: "spacer" as const, height: 1 }),
  () => ({ type: "fixed" as const, height: 5, children: [rect()] }),
];
function mutate(raw: ReturnType<(typeof cases)[number]>, height: number) {
  assert.equal(Object.isFrozen(raw), false);
  if ("style" in raw) {
    assert.equal(Object.isFrozen(raw.style), false);
    raw.style.height = height;
    raw.children[0]!.height = height;
  } else raw.height = height;
  if ("children" in raw) {
    assert.equal(Object.isFrozen(raw.children), false);
    if (raw.type === "fixed") raw.children[0]!.width = height;
  }
}

for (const make of cases) {
  test(`preparation owns raw ${make().type} before either resolver await, without freezing callers`, async () => {
    const raw = make();
    let calls = 0;
    const first = gate<void>(),
      second = gate<void>();
    const releases = [gate<ReturnType<typeof owned>>(), gate<ReturnType<typeof owned>>()];
    const fixture = resourceFixture((request) => {
      const index = request === "first" ? 0 : 1;
      [first, second][index]!.resolve();
      return releases[index]!.promise;
    });
    const Author = () => {
      calls++;
      return raw as unknown as VDOMChild;
    };
    const tree = authored([h(Author, {}), h(fixture.Leaf, { url: "first" }), h(fixture.Leaf, { url: "second" })]);
    const resource = owned();
    const options = resourceOptions(fixture, resource);
    const expected = layout(authored(raw as unknown as VDOMChild));
    const pending = prepareDocument(tree, options);
    await first.promise;
    mutate(raw, 25);
    releases[0]!.resolve(resource);
    await second.promise;
    mutate(raw, 45);
    releases[1]!.resolve(resource);
    const handle = await pending;
    mutate(raw, 65);
    const result = layoutPrepared(handle);
    assert.equal(calls, 1);
    assert.deepEqual(result.placements[0]!.box, expected.placements[0]!.box);
    assert.equal(result.options.resources.Prepared0, resource);
    assert.equal(
      (
        Buffer.from(render(result.document, result.options))
          .toString("latin1")
          .match(/\/X1 Do/g) ?? []
      ).length,
      2,
    );
  });
}

function resourceOptions(fixture: ReturnType<typeof resourceFixture>, resource: ReturnType<typeof owned>) {
  return {
    providers: [formProvider(resource)],
    extensions: [
      fixture.feature,
      defineOperationExtension(
        {},
        createOperationCapability(() => () => null),
        fixture.adapters,
      ),
    ],
  };
}

function literalBlock(height: number) {
  return h(
    () =>
      ({
        type: "block",
        style: { height, backgroundColor: [1, 0, 0] },
        children: [{ type: "spacer", height: 1 }],
      }) as unknown as VDOMChild,
    {},
  );
}

test("shared raw outputs capture per occurrence under providers and deferred Column bodies without replay", async () => {
  const Theme = createContext(5);
  const raw = {
    type: "block",
    style: { height: 5, backgroundColor: [1, 0, 0] },
    children: [{ type: "spacer", height: 1 }],
  };
  const values: number[] = [];
  const Author = () => {
    const height = useContext(Theme);
    values.push(height);
    raw.style.height = height;
    return raw as unknown as VDOMChild;
  };
  const occurrence = h(Author, {}, "same");
  const tree = authored(
    h(Flow.Body, {
      children: h(Row, {
        children: [
          h(Column, { children: h(Theme.Provider, { value: 5, children: occurrence }) }),
          h(Column, { children: h(Theme.Provider, { value: 9, children: occurrence }) }),
        ],
      }),
    }),
  );
  const handle = await prepareDocument(tree);
  raw.style.height = 65;
  const result = layoutPrepared(handle);
  assert.deepEqual(values, [5, 9]);
  const literal = authored(
    h(Row, {
      children: [5, 9].map((height) =>
        h(Column, {
          children: literalBlock(height),
        }),
      ),
    }),
  );
  assert.deepEqual(result.document, layout(literal).document);
  assert.deepEqual(result.placements, layout(literal).placements);
  assert.equal(Object.isFrozen(raw), false);
});

test("unsafe raw data fails with sourced errors before getters or resource callbacks", async () => {
  let getters = 0,
    resolutions = 0;
  const fixture = resourceFixture(async () => {
    resolutions++;
    return owned();
  });
  const accessor = Object.defineProperty({}, "height", {
    enumerable: true,
    get() {
      getters++;
      return 5;
    },
  });
  const cycle: Record<string, unknown> = {};
  cycle.height = cycle;
  for (const style of [accessor, new Map(), { [Symbol("height")]: 5 }, cycle]) {
    const raw = { type: "block", style, children: [] };
    const tree = authored([h(() => raw as unknown as VDOMChild, {}), h(fixture.Leaf, { url: "never" })]);
    await assert.rejects(
      prepareDocument(tree, { extensions: [fixture.feature] }),
      (error: unknown) => error instanceof DocumentError && /expanded\/style/u.test(error.diagnostics[0]!.path),
    );
    assert.equal(Object.isFrozen(raw), false);
    assert.equal(Object.isFrozen(style), false);
  }
  assert.equal(getters, 0);
  assert.equal(resolutions, 0);
});

test("raw capture depth, occurrence and Unicode quotas stop before later components or resolution", async () => {
  let progress = 0;
  const Later = () => {
    progress++;
    return null;
  };
  const wide = { type: "fixed", height: 5, children: Array.from({ length: 500 }, rect) };
  let nested: unknown = {};
  for (let i = 0; i < 30; i++) nested = { child: nested };
  for (const [raw, limits] of [
    [wide, { nodes: 40 }],
    [{ type: "block", style: nested, children: [] }, { depth: 12 }],
    [{ type: "fixed", height: 5, children: [{ text: "😀".repeat(20) }] }, { textCodePoints: 10 }],
  ] as const) {
    const tree = authored([h(() => raw as unknown as VDOMChild, {}), h(Later, {})]);
    await assert.rejects(
      prepareDocument(tree, { limits }),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]!.code === "LIMIT",
    );
    assert.equal(Object.isFrozen(raw), false);
  }
  assert.equal(progress, 0);
});

test("ordinary synchronous raw data keeps its existing caller ownership", () => {
  const raw = cases[0]!();
  const input = authored(h(() => raw as unknown as VDOMChild, {}));
  assert.equal(layout(input).placements[0]!.box.height, 5);
  mutate(raw, 65);
  assert.equal(layout(input).placements[0]!.box.height, 65);
});

test("fixed native emission data is captured before the caller's first microtask", async () => {
  const raw = { type: "fixed", height: 5, children: [rect()] };
  const tree = authored(h(() => raw as unknown as VDOMChild, {}));
  const expected = layout(tree);
  const pending = prepareDocument(tree);
  raw.children[0]!.width = 65;
  raw.children[0]!.paint.fill[0] = 1;
  raw.children.push(rect());
  const result = layoutPrepared(await pending);
  assert.deepEqual(result.document, expected.document);
  assert.equal(Object.isFrozen(raw.children[0]!.paint.fill), false);
});

test("failed data capture closes escaped contexts and never starts queued resource resolution", async () => {
  let context: ComponentContext | undefined;
  let resolves = 0;
  const fixture = resourceFixture(async () => {
    resolves++;
    return owned();
  });
  const Author = (_props: object, captured: ComponentContext) => {
    context = captured;
    return [
      h(fixture.Leaf, { url: "queued" }),
      { type: "fixed", height: 1, children: [() => {}] },
    ] as unknown as VDOMChild;
  };
  await assert.rejects(prepareDocument(authored(h(Author, {})), { extensions: [fixture.feature] }), DocumentError);
  assert.throws(
    () => contextLayoutOperation(context!).resolveStyle({ fontSize: 10, color: [0, 0, 0] }, "/escaped"),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]!.code === "MEASUREMENT_CONTEXT",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resolves, 0);
});
