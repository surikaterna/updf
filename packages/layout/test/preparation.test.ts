import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import {
  contextLayoutOperation,
  defineOperationExtension,
  createOperationCapability,
  useOperationExtension,
} from "@updf/core/internal";
import { createOwnedResource } from "@updf/core/resources";
import { createContext, h, useContext, type ComponentContext } from "@updf/core/vdom";
import { Block, Column, Document, Flow, layout, Paragraph, Row, Span } from "@updf/layout";
import { layoutPrepared, prepareDocument, type PreparedDocument } from "@updf/layout/internal-preparation";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { authored, formProvider, owned, resourceFixture } from "./preparation-fixture.js";

const unavailable = (callback: () => unknown) =>
  assert.throws(
    callback,
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
  );
const textStyle = { fontSize: 10, color: [0, 0, 0] as const };
const textInput = {
  width: 100,
  paragraphs: [
    {
      runs: [{ text: "A" }],
      defaultStyle: { ...textStyle, font: "Helvetica" },
      lineHeight: 10,
      align: "left" as const,
      whiteSpace: "collapse" as const,
      breakLongWords: "error" as const,
    },
  ],
};

test("capture occurrences once, suspend all escaped contexts, seal and consume same-state layout", async () => {
  const Theme = createContext("default");
  const values: string[] = [];
  const contexts: ComponentContext[] = [];
  const Author = (_props: object, context: ComponentContext) => {
    values.push(useContext(Theme));
    contexts.push(context);
    assert.ok(context.measurement.measureText(textInput).lines.length > 0);
    assert.equal(contextLayoutOperation(context).resolveStyle(textStyle, "/capture").font, "Helvetica");
    unavailable(() => contextLayoutOperation(context).nativeInk([]));
    return h(Paragraph, { children: h(Span, { children: useContext(Theme) }) });
  };
  const occurrence = h(Author, {});
  const input = authored([
    h(Theme.Provider, { value: "one", children: h(Block, { children: h(Block.Body, { children: occurrence }) }) }),
    h(Row, { children: h(Column, { children: h(Theme.Provider, { value: "two", children: occurrence }) }) }),
  ]);
  const options = textOptions({});
  const pending = prepareDocument(input, options);
  assert.deepEqual(values, ["one", "two"]);
  for (const context of contexts) {
    unavailable(() => context.measurement.measureText(textInput));
    unavailable(() => contextLayoutOperation(context).resolveStyle(textStyle, "/escaped"));
  }
  const handle = await pending;
  unavailable(() => contexts[0]!.measurement.measureText(textInput));
  const result = layoutPrepared(handle);
  assert.deepEqual(values, ["one", "two"]);
  unavailable(() => layoutPrepared(handle));
  unavailable(() => contexts[0]!.measurement.measureText(textInput));
  const literal = authored([
    h(Block, { children: h(Paragraph, { children: h(Span, { children: "one" }) }) }),
    h(Row, { children: h(Column, { children: h(Paragraph, { children: h(Span, { children: "two" }) }) }) }),
  ]);
  const baseline = layout(literal, options);
  assert.deepEqual(result.document, baseline.document);
  assert.deepEqual(render(result.document, result.options), render(baseline.document, options));
});

test("test resource resolves sequentially before geometry and publishes deterministic unique bindings", async () => {
  const resource = owned();
  const order: string[] = [];
  let geometry = 0;
  const fixture = resourceFixture(
    async (request) => {
      order.push(request);
      assert.equal(geometry, 0);
      await Promise.resolve();
      return resource;
    },
    () => {
      geometry++;
    },
  );
  const input = authored(
    h(Flow.Body, {
      children: [
        h(Row, { children: h(Column, { children: h(fixture.Leaf, { url: "test:left" }) }) }),
        h(fixture.Leaf, { url: "test:right" }),
      ],
    }),
  );
  const reserved = createOwnedResource({ kind: "reserved" });
  const options = {
    resources: { Prepared0: reserved },
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
  const result = layoutPrepared(await prepareDocument(input, options));
  assert.deepEqual(order, ["test:left", "test:right"]);
  assert.ok(geometry > 0);
  assert.deepEqual(Object.keys(result.options.resources), ["Prepared0", "Prepared1"]);
  assert.equal(result.options.resources.Prepared1, resource);
  assert.equal(result.options.resources.Prepared0, reserved);
  assert.ok(Object.isFrozen(result.options.resources));
  const pdf = Buffer.from(render(result.document, result.options)).toString("latin1");
  assert.equal((pdf.match(/\/Subtype \/Form/g) ?? []).length, 1);
  assert.equal((pdf.match(/\/X1 Do/g) ?? []).length, 2);
});

test("owned handles share Node import/require identity and reject forged/copy/consumed handles", async () => {
  const require = createRequire(import.meta.url);
  const cjs = require("@updf/layout/internal-preparation") as { layoutPrepared: typeof layoutPrepared };
  assert.equal(cjs.layoutPrepared, layoutPrepared);
  const core = await import("@updf/core/internal-preparation");
  assert.equal(
    require("@updf/core/internal-preparation").createPreparingDrawingOperation,
    core.createPreparingDrawingOperation,
  );
  const input = h(Document, {
    children: h(Flow, {
      pageSize: { width: 10, height: 10 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: [],
    }),
  });
  const handle = await prepareDocument(input);
  unavailable(() => layoutPrepared({ ...handle } as PreparedDocument));
  unavailable(() => layoutPrepared({} as PreparedDocument));
  assert.equal(cjs.layoutPrepared(handle).pageCount, 1);
  unavailable(() => cjs.layoutPrepared(handle));
});

test("abort pending resolution closes contexts, ignores late completion, and prevents publication", async () => {
  const controller = new AbortController();
  let complete: (value: ReturnType<typeof owned>) => void = () => {};
  let entered: () => void = () => {};
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let context: ComponentContext | undefined;
  const fixture = resourceFixture(() => {
    entered();
    return new Promise((resolve) => {
      complete = resolve;
    });
  });
  const Author = (_props: object, captured: ComponentContext) => {
    context = captured;
    return h(fixture.Leaf, { url: "test:abort" });
  };
  const pending = prepareDocument(
    authored(h(Author, {})),
    { extensions: [fixture.feature] },
    { signal: controller.signal },
  );
  await started;
  controller.abort();
  await assert.rejects(pending, /aborted/u);
  unavailable(() => context!.measurement.measureText(textInput));
  complete(owned());
  await new Promise((resolve) => setImmediate(resolve));
  const preaborted = new AbortController();
  preaborted.abort();
  let calls = 0;
  await assert.rejects(
    prepareDocument(
      h(() => {
        calls++;
        return null;
      }, {}),
      {},
      { signal: preaborted.signal },
    ),
    /aborted/u,
  );
  assert.equal(calls, 0);
});

test("resolver/ownership/resource budget failures never reach geometry", async () => {
  for (const resolve of [
    async () => {
      throw new Error("failed resolver");
    },
    async () => ({ metadata: {} }) as never,
    async () => owned(),
  ]) {
    let geometry = 0;
    const fixture = resourceFixture(resolve, () => {
      geometry++;
    });
    await assert.rejects(
      prepareDocument(authored(h(fixture.Leaf, { url: "test:fail" })), {
        extensions: [fixture.feature],
        limits: { resourceBytes: 0 },
      }),
    );
    assert.equal(geometry, 0);
  }
});

test("capture rejects cycles, excessive depth and source exhaustion without geometry", async () => {
  let calls = 0;
  const Cycle = () => {
    calls++;
    return h(Cycle, {});
  };
  await assert.rejects(prepareDocument(authored(h(Cycle, {})), { limits: { nodes: 30 } }), DocumentError);
  assert.ok(calls <= 30);
  const Nested = ({ count }: { count: number }): ReturnType<typeof h> =>
    count ? h(Block, { children: h(Nested, { count: count - 1 }) }) : h(Paragraph, { children: "end" });
  await assert.rejects(prepareDocument(authored(h(Nested, { count: 30 })), { limits: { depth: 10 } }), /depth/iu);
  await assert.rejects(
    prepareDocument(authored(h(Paragraph, { children: "end" })), { limits: { nodes: 1 } }),
    /limit/iu,
  );
});

test("requests hidden in late adapters fail with a sourced phase diagnostic and no resolver call", async () => {
  let resolutions = 0;
  const fixture = resourceFixture(async () => {
    resolutions++;
    return owned();
  });
  // Adapter content is intentionally opaque to resource discovery.
  const { defineBlockAdapter, extension, createExtensions } = await import("@updf/layout");
  const late = defineBlockAdapter({
    name: "LateRequest",
    validate: (value) => value,
    measure(_props, context) {
      context.measureContent(h(fixture.Leaf, { url: "test:late" }), { width: context.width });
      throw new Error("unreachable");
    },
  });
  const input = authored(h(Flow.Body, { children: extension(late, {}) as never }));
  const adapters = createExtensions([late]);
  const handle = await prepareDocument(input, {
    extensions: [
      fixture.feature,
      defineOperationExtension(
        {},
        createOperationCapability(() => () => null),
        adapters,
      ),
    ],
  });
  assert.throws(
    () => layoutPrepared(handle),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]!.code === "PHASE" &&
      error.diagnostics[0]!.path.includes("children"),
  );
  assert.equal(resolutions, 0);
  unavailable(() => layoutPrepared(handle));
});

test("early selected capabilities cannot initialize pre-seal and bind the final immutable map at layout", async () => {
  const resource = owned();
  const feature = {};
  let initializations = 0;
  const capability = createOperationCapability((scope) => {
    initializations++;
    assert.equal(scope.bindings.get("Prepared0"), resource);
    assert.equal("set" in scope.bindings, false);
    return () => "final";
  });
  const fixture = resourceFixture(
    async () => resource,
    (context) => {
      assert.equal(useOperationExtension(context, feature), "final");
    },
  );
  const Child = (_props: object, context: ComponentContext) => {
    unavailable(() => useOperationExtension(contextLayoutOperation(context), feature));
    assert.equal(initializations, 0);
    return h(fixture.Leaf, { url: "test:final-bindings" });
  };
  const handle = await prepareDocument(authored(h(Child, {})), {
    extensions: [fixture.feature, defineOperationExtension(feature, capability, fixture.adapters)],
  });
  assert.equal(initializations, 0);
  layoutPrepared(handle);
  assert.equal(initializations, 1);
});
