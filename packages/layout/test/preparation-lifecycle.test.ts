import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createOperationCapability, defineOperationExtension } from "@updf/core/internal";
import { createContext, h, useContext, type ComponentContext } from "@updf/core/vdom";
import { Document, Flow, Page, Paragraph, layout } from "@updf/layout";
import {
  definePreparationResource,
  layoutPrepared,
  prepareDocument,
  type PreparationSignal,
} from "@updf/layout/internal-preparation";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { authored, owned, resourceFixture } from "./preparation-fixture.js";

test("data Document/body capture and mixed Page/Flow sections preserve scopes and section-local final callbacks", async () => {
  const Theme = createContext("default");
  const values: string[] = [];
  const Fixed = () => {
    values.push(useContext(Theme));
    return h("rect", {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      paint: { fill: [0, 0, 0], stroke: null },
    });
  };
  const input = h(Document, {
    children: [
      h(Theme.Provider, {
        value: "before",
        children: h(Page, { size: { width: 20, height: 20 }, children: h(Fixed, {}) }),
      }),
      h(Flow, { pageSize: { width: 20, height: 20 }, margins: { top: 0, right: 0, bottom: 0, left: 0 }, children: [] }),
      h(Theme.Provider, {
        value: "after",
        children: h(Page, { size: { width: 30, height: 30 }, children: h(Fixed, {}) }),
      }),
    ],
  });
  const handle = await prepareDocument(input);
  assert.deepEqual(values, []);
  const result = layoutPrepared(handle);
  assert.deepEqual(values, ["before", "after"]);
  assert.equal(result.pageCount, 3);
  assert.deepEqual(result.document, layout(input).document);
  const { document, flow, flowBody, paragraph } = await import("@updf/layout");
  const data = document({
    children: flow({
      pageSize: { width: 50, height: 50 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: flowBody({ children: paragraph({ children: "data" }) }),
    }),
  });
  const options = textOptions({});
  assert.deepEqual(layoutPrepared(await prepareDocument(data, options)).document, layout(data, options).document);
});

test("initial component metadata and existing aliases remain stable while independent stages append resources", async () => {
  const resource = owned();
  const fixture = resourceFixture(async () => resource);
  const snapshots: ComponentContext["resources"][] = [];
  const Child = (_props: object, context: ComponentContext) => {
    snapshots.push(context.resources);
    return h(fixture.Leaf, { url: "test:metadata" });
  };
  const input = authored(h(Child, {}));
  const options = {
    resources: { original: resource, alias: resource },
    resourceMetadata: [{ id: "Prepared0", kind: "test" }],
    extensions: [
      fixture.feature,
      defineOperationExtension(
        {},
        createOperationCapability(() => () => null),
        fixture.adapters,
      ),
    ],
  };
  const handles = await Promise.all([prepareDocument(input, options), prepareDocument(input, options)]);
  assert.equal(snapshots.length, 2);
  assert.notEqual(snapshots[0], snapshots[1]);
  const expected = [
    { id: "original", kind: "resource" },
    { id: "alias", kind: "resource" },
    { id: "Prepared0", kind: "test" },
  ];
  for (const handle of handles) {
    const result = layoutPrepared(handle);
    assert.deepEqual(Object.keys(result.options.resources), ["original", "alias"]);
    assert.ok(JSON.stringify(result.document).includes('"resource":"original"'));
  }
  for (const snapshot of snapshots) {
    assert.deepEqual(snapshot, expected);
    assert.ok(Object.isFrozen(snapshot));
  }
});

test("structural abort capability removes its one listener on success and failure without invoking option getters", async () => {
  let adds = 0,
    removes = 0;
  const signal: PreparationSignal = {
    aborted: false,
    addEventListener() {
      adds++;
    },
    removeEventListener() {
      removes++;
    },
  };
  const input = authored([]);
  layoutPrepared(await prepareDocument(input, {}, { signal }));
  assert.equal(adds, 1);
  assert.equal(removes, 1);
  await assert.rejects(prepareDocument(h(Paragraph, { children: "invalid root" }), {}, { signal }), DocumentError);
  assert.equal(adds, 2);
  assert.equal(removes, 2);
  let getters = 0;
  const preparation = Object.defineProperty({}, "signal", {
    enumerable: true,
    get() {
      getters++;
      return signal;
    },
  });
  await assert.rejects(prepareDocument(input, {}, preparation), DocumentError);
  await assert.rejects(prepareDocument(input, {}, { signal: undefined } as never), DocumentError);
  assert.equal(getters, 0);
});

test("a late header request rejects after seal without invoking the resolver or retrying layout", async () => {
  let resolves = 0;
  const fixture = resourceFixture(async () => {
    resolves++;
    return owned();
  });
  const input = authored(
    h(Flow.Header, { height: 10, children: h(() => h(fixture.Leaf, { url: "test:header" }), {}) }),
  );
  const handle = await prepareDocument(input, { extensions: [fixture.feature] });
  assert.equal(resolves, 0);
  assert.throws(
    () => layoutPrepared(handle),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "PHASE",
  );
  assert.equal(resolves, 0);
  assert.throws(() => layoutPrepared(handle), /unconsumed/u);
});

test("structural signals never read inherited abort-state getters", async () => {
  let getters = 0;
  Object.defineProperty(Object.prototype, "aborted", {
    configurable: true,
    get() {
      getters++;
      return false;
    },
  });
  try {
    const signal = { addEventListener() {}, removeEventListener() {} } as unknown as PreparationSignal;
    await assert.rejects(prepareDocument(authored([]), {}, { signal }), DocumentError);
  } finally {
    Reflect.deleteProperty(Object.prototype, "aborted");
  }
  assert.equal(getters, 0);
});

test("private descriptors reject inherited callback getters without executing them", () => {
  let getters = 0;
  Object.defineProperty(Object.prototype, "resolve", {
    configurable: true,
    get() {
      getters++;
      return () => owned();
    },
  });
  try {
    assert.throws(
      () => definePreparationResource({ identity: {}, capture() {}, replace() {} } as never),
      DocumentError,
    );
  } finally {
    Reflect.deleteProperty(Object.prototype, "resolve");
  }
  assert.equal(getters, 0);
});

test("abort before the resolver microtask prevents resolver invocation", async () => {
  const controller = new AbortController();
  let resolves = 0;
  const fixture = resourceFixture(async () => {
    resolves++;
    return owned();
  });
  const pending = prepareDocument(
    authored(h(fixture.Leaf, { url: "test:immediate-abort" })),
    { extensions: [fixture.feature] },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(pending, /aborted/u);
  assert.equal(resolves, 0);
});
