import assert from "node:assert/strict";
import test from "node:test";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { DocumentError } from "@updf/core";
import { type ComponentContext, createContext, h, useContext, type VDOMChild } from "@updf/core/vdom";
import { lower, render } from "../../../tests/fixtures/text-options.js";
import {
  createExtensions,
  defineBlockAdapter,
  extension,
  type FlowBlock,
  layoutFlow,
  type MeasureContext,
  Paragraph,
  paragraph,
} from "../../../tests/fixtures/transitional-layout.js";
import { Document, Flow } from "../dist/cjs/transitional-vdom.js";
import { flow } from "./fixtures.js";

const pageTemplate = flow().pageTemplate;
const textInput = richInput("p");
const Theme = createContext({ text: "default" });

function contentFlow(child: ReturnType<typeof h>) {
  // The runtime normalizes semantic VNodes, while the legacy definition type only lists data blocks.
  return flow([child as unknown as FlowBlock]);
}

function rejects(run: () => unknown, code: string, path?: RegExp): void {
  assert.throws(
    run,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!path || path.test(error.diagnostics[0].path)),
  );
}
const entries = {
  flow: (children: ReturnType<typeof h>) => h(Flow.Document, contentFlow(children)),
  compatibility: (children: ReturnType<typeof h>) => h(Document, { pageTemplate, children }),
};

function expired(context: MeasureContext): void {
  rejects(() => context.measureText(textInput), "MEASUREMENT_CONTEXT");
  rejects(() => context.measureContent(h(Paragraph, { children: "x" }), { width: 100 }), "MEASUREMENT_CONTEXT");
  rejects(() => context.readParts(h(Paragraph, { children: "x" }), []), "MEASUREMENT_CONTEXT");
  rejects(() => context.reserveDecorations([]), "MEASUREMENT_CONTEXT");
}

function repeatedAdapter(captured: MeasureContext[], failFirst: boolean) {
  return defineBlockAdapter({
    name: "vdom.repeated-lifetime",
    validate: (props: unknown) => props,
    measure: (_props, context) => {
      for (const previous of captured) expired(previous);
      captured.push(context);
      return {
        fragmentation: "atomic",
        naturalSize: { width: 100, height: 0 },
        extent: 1,
        fragment: () => {
          for (const previous of captured.slice(0, -1)) expired(previous);
          assert.ok(context.measureText(textInput).lines.length);
          if (failFirst && captured.length === 1) throw new Error("first fragment failure");
          return { status: "placed", nextOffset: 1, height: 0, nodes: [] };
        },
      };
    },
  });
}

for (const failFirst of [false, true]) {
  test(`borrowed layout remeasures the same descriptor after ${failFirst ? "caught failure" : "success"}`, () => {
    const captured: MeasureContext[] = [];
    const adapter = repeatedAdapter(captured, failFirst);
    const props = { pageTemplate, children: extension(adapter, {}), extensions: createExtensions([adapter]) };
    const Parent = (_props: Record<never, never>, context: ComponentContext) => {
      const invoke = () => Document(props, context);
      if (failFirst) rejects(invoke, "TYPE");
      else assert.ok(invoke());
      assert.equal(captured.length, 1);
      expired(captured[0]!);
      assert.ok(context.measurement.measureText(textInput).lines.length);
      const result = invoke();
      assert.equal(captured.length, 2);
      for (const measurement of captured) expired(measurement);
      assert.ok(context.measurement.measureText(textInput).lines.length);
      return result;
    };
    assert.equal(lower(h(Parent, {})).pages.length, 1);
    assert.equal(captured.length, 2);
    for (const measurement of captured) expired(measurement);
  });
}

for (const [name, document] of Object.entries(entries)) {
  test(`${name} VDOM uses the parent's provider and cumulative measurement policy`, () => {
    let retained: ComponentContext | undefined;
    const Body = (_props: Record<never, never>, context: ComponentContext) => {
      retained = context;
      return h(Paragraph, { children: useContext(Theme).text });
    };
    const Parent = (_props: Record<never, never>, context: ComponentContext) => {
      context.measurement.measureText(textInput);
      return document(h(Body, {}));
    };
    const tree = h(Theme.Provider, { value: { text: "xx" }, children: h(Parent, {}) });
    const expected = layoutFlow({ pageTemplate, body: [paragraph({ children: "xx" })] }).document;
    assert.deepEqual(render(lower(tree, { limits: { textCodePoints: 3 } })), render(expected));
    assert.ok(retained);
    rejects(() => retained?.measurement.measureText(textInput), "MEASUREMENT_CONTEXT");
    rejects(() => lower(tree, { limits: { textCodePoints: 2 } }), "LIMIT");
    rejects(() => retained?.measurement.measureText(textInput), "MEASUREMENT_CONTEXT");
  });

  test(`${name} VDOM applies parent page limits and prefixes normalization failures`, () => {
    const breaks = Array.from({ length: 20 }, () => ({ type: "pageBreak" as const }));
    const tree =
      name === "flow"
        ? h(Flow.Document, { pageTemplate, body: breaks })
        : h(Document, { pageTemplate, children: breaks });
    assert.equal(lower(tree).pages.length, 21);
    rejects(() => lower(tree, { profile: "service" }), "LIMIT", /^\/tree\//u);
    let retained: ComponentContext | undefined;
    const Failure = (_props: Record<never, never>, context: ComponentContext): VDOMChild => {
      retained = context;
      throw new Error("body failure");
    };
    rejects(() => lower(document(h(Failure, {}))), "VDOM_COMPONENT", /^\/tree\//u);
    assert.ok(retained);
    rejects(() => retained?.measurement.measureText(textInput), "MEASUREMENT_CONTEXT");
  });

  test(`${name} VDOM does not close the borrowed operation before native lowering`, () => {
    let retained: ComponentContext | undefined;
    const Parent = (_props: Record<never, never>, context: ComponentContext) => {
      retained = context;
      const body = h(Paragraph, { children: "x" });
      const result =
        name === "flow"
          ? Flow.Document(contentFlow(body), context)
          : Document({ pageTemplate, children: body }, context);
      assert.ok(context.measurement.measureText(textInput).lines.length);
      return result;
    };
    assert.equal(lower(h(Parent, {})).pages.length, 1);
    assert.ok(retained);
    rejects(() => retained?.measurement.measureText(textInput), "MEASUREMENT_CONTEXT");
  });
}

for (const fails of [false, true]) {
  test(`compatibility VDOM expires adapter callbacks on ${fails ? "failure" : "success"}, not the parent operation`, () => {
    let captured: MeasureContext | undefined;
    const adapter = defineBlockAdapter({
      name: "vdom.lifetime",
      validate: (props: unknown) => props,
      measure: (_props, context) => {
        captured = context;
        return {
          fragmentation: "atomic",
          naturalSize: { width: 100, height: 0 },
          extent: 1,
          fragment: () => {
            if (fails) throw new Error("fragment failure");
            return { status: "placed", nextOffset: 1, height: 0, nodes: [] };
          },
        };
      },
    });
    const Parent = (_props: Record<never, never>, context: ComponentContext) => {
      const invoke = () =>
        Document(
          {
            pageTemplate,
            children: extension(adapter, {}),
            extensions: createExtensions([adapter]),
          },
          context,
        );
      let result: VDOMChild;
      if (fails) rejects(invoke, "TYPE");
      else result = invoke();
      assert.ok(captured);
      rejects(() => captured?.measureText(textInput), "MEASUREMENT_CONTEXT");
      rejects(() => captured?.measureContent(h(Paragraph, { children: "x" }), { width: 100 }), "MEASUREMENT_CONTEXT");
      rejects(() => captured?.readParts(h(Paragraph, { children: "x" }), []), "MEASUREMENT_CONTEXT");
      rejects(() => captured?.reserveDecorations([]), "MEASUREMENT_CONTEXT");
      assert.ok(context.measurement.measureText(textInput).lines.length);
      return result ?? h("document", { version: 1, children: h("page", { width: 100, height: 40, children: [] }) });
    };
    assert.equal(lower(h(Parent, {})).pages.length, 1);
  });
}
