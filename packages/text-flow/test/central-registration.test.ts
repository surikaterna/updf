import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { createLayoutOperation, createOperationCapability, requestTextService } from "@updf/core/internal";
import { useOperationCapability, type TextService } from "@updf/core/resources";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { Block, Document, Flow, Paragraph, Span, layout, measure, paragraph, createExtensions } from "@updf/layout";
import { createTextService } from "@updf/text";
import { render as renderAuthored } from "@updf/layout/render";
import { createTextSelection, inlineSelectionRequest } from "@updf/text/selection";
import { floatable, textFlow } from "@updf/text-flow";
import { siblingParticipation } from "../src/sibling.js";
import { rectanglePolicy } from "../src/rectangle-policy.js";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";

const FloatingBlock = floatable(Block);
const region = { pageSize: { width: 220, height: 260 }, margins: { top: 10, right: 10, bottom: 10, left: 10 } };
const style = { width: 72, height: 96, float: "left" as const, backgroundColor: [0.2, 0.4, 0.6] as const };
function content(visual = h(FloatingBlock, { style })) {
  return h(Document, {
    children: h(Flow, {
      ...region,
      children: [
        visual,
        h(Paragraph, { children: ["normal ", h(Span, { style: { font: "Other", fontSize: 14 }, children: "rich" })] }),
        h(Paragraph, { children: "full width continuation ".repeat(20) }),
      ],
    }),
  });
}
function ordinary() {
  return h(Document, { children: h(Flow, { ...region, children: h(Paragraph, { children: "ordinary" }) }) });
}
function noProvider(service: TextService): TextService {
  const { provide: _provide, ...ordinary } = service;
  return ordinary;
}
function base() {
  const runtime = fontRuntime();
  return {
    runtime,
    options: {
      resources: { Custom: createHelvetica(), Other: createHelvetica() },
      text: createTextService({ runtime, defaultFont: "Custom" }),
      providers: [fontProvider(runtime)],
    },
  };
}
test("configured plain service, nondefault prepared font and Span bindings preserve legacy metrics and exact PDF", async () => {
  const { runtime, options } = base();
  const resources = { Custom: await fixtureFont(), Other: createHelvetica() };
  const legacy = createTextSelection({ runtime, defaultFont: "Custom" });
  const path = siblingParticipation(legacy.capability, rectanglePolicy);
  const before = h(Document, {
    children: h(Flow, {
      ...region,
      participation: path.participation,
      children: [
        h(path.Block, { style }),
        h(Paragraph, { children: ["normal ", h(Span, { style: { font: "Other", fontSize: 14 }, children: "rich" })] }),
        h(Paragraph, { children: "full width continuation ".repeat(20) }),
      ],
    }),
  });
  const selected = { ...options, resources, extensions: [textFlow()] };
  const result = layout(content(), selected);
  const previous = layout(before, { ...options, resources, ...legacy });
  assert.deepEqual(result, previous);
  assert.deepEqual(renderAuthored(content(), selected), render(result.document, selected));
  assert.throws(() => render(content() as never, selected), DocumentError);
  assert.deepEqual(render(result.document, selected), render(previous.document, { ...options, resources, ...legacy }));
});
test("installed unused extension and native output never request a missing custom-service provider", () => {
  const { options } = base();
  const selected = { ...options, text: noProvider(options.text), extensions: [textFlow()] };
  assert.deepEqual(layout(ordinary(), selected), layout(ordinary(), { ...options, text: selected.text }));
  const lowered = layout(ordinary(), selected).document;
  assert.deepEqual(render(lowered, selected), render(lowered, { ...options, text: selected.text }));
});
test("missing installation or unsupported provider fails at source before any late painter", () => {
  const { options } = base();
  let painted = 0;
  const visual = h(FloatingBlock, {
    style,
    children: h(Block.Header, {
      height: 1,
      children: h(() => {
        painted++;
        return null;
      }, {}),
    }),
  });
  for (const selected of [options, { ...options, text: noProvider(options.text), extensions: [textFlow()] }]) {
    assert.throws(
      () => layout(content(visual), selected),
      (error: unknown) => {
        assert.ok(error instanceof DocumentError);
        assert.match(error.diagnostics[0]!.path, /document\/children\/children\/0/u);
        return true;
      },
    );
    assert.equal(painted, 0);
  }
});
test("provider capture retains receiver and callback, initializes once and reuses descriptors across operations", () => {
  const { options } = base();
  let calls = 0;
  const service = {
    ...options.text,
    provide(...args: Parameters<NonNullable<TextService["provide"]>>) {
      assert.equal(this, service);
      calls++;
      return options.text.provide!(...args);
    },
  };
  const extension = textFlow();
  const selected = { ...options, text: service, extensions: [extension] };
  assert.doesNotThrow(() => layout(content(), selected));
  assert.equal(calls, 1);
  assert.doesNotThrow(() => layout(content(), selected));
  assert.equal(calls, 2);
  assert.doesNotThrow(() => layout(ordinary(), selected));
  assert.equal(calls, 2);
});
test("provider snapshot ignores later mutation; fake requests, absent values and accessors reject without execution", () => {
  const { options } = base();
  const service = { ...options.text };
  const authored = h(() => {
    service.provide = () => {
      throw new Error("mutated provider");
    };
    return content();
  }, {});
  assert.doesNotThrow(() => layout(authored, { ...options, text: service, extensions: [textFlow()] }));
  assert.throws(() => layout(content(), { ...options, text: service, extensions: [textFlow()] }), /mutated provider/u);
  let calls = 0;
  const accessor = Object.defineProperty({ ...options.text }, "provide", {
    get() {
      calls++;
      return options.text.provide;
    },
  });
  for (const text of [accessor, { ...options.text, provide: undefined }, { ...options.text, provide: 1 }])
    assert.throws(() => layout(ordinary(), { ...options, text } as never), DocumentError);
  assert.equal(calls, 0);
  const capability = createOperationCapability((scope) => requestTextService(scope, {} as never));
  const operation = createLayoutOperation({ ...options, capability });
  assert.throws(() => useOperationCapability(operation, capability), /version-one/u);
  operation.close();
});
test("separate canonical and legacy Flows coexist; both compiler families in one Flow reject", () => {
  const { runtime, options } = base();
  const legacy = createTextSelection({ runtime, defaultFont: "Custom" });
  const path = siblingParticipation(legacy.capability, rectanglePolicy);
  const canonical = h(Flow, { ...region, children: h(FloatingBlock, { style }) });
  const explicit = h(Flow, { ...region, participation: path.participation, children: h(path.Block, { style }) });
  const selected = { ...options, ...legacy, extensions: [textFlow()] };
  assert.equal(layout(h(Document, { children: [canonical, explicit] }), selected).pageCount, 2);
  for (const props of [
    { participation: path.participation, children: h(FloatingBlock, { style }) },
    { children: [h(FloatingBlock, { style }), h(path.Block, { style })] },
  ]) {
    assert.throws(() => layout(h(Document, { children: h(Flow, { ...region, ...props }) }), selected), /Conflicting/u);
  }
});
test("natural adapters stay local and operation extensions are validated rather than stripped", () => {
  const { options } = base();
  assert.equal(
    measure(
      paragraph({ children: "x" }),
      { width: 100 },
      {
        ...options,
        adapters: createExtensions([]),
        extensions: [textFlow()],
      },
    ).lines.length,
    1,
  );
  assert.throws(
    () =>
      measure(paragraph({ children: "x" }), { width: 100 }, {
        ...options,
        adapters: createExtensions([]),
        extensions: [{}],
      } as never),
    DocumentError,
  );
  assert.throws(() => floatable(Paragraph as unknown as typeof Block), /layout Block/u);
});
test("generic request reuses selection ownership and closes retained methods without a second runtime", () => {
  const { options } = base();
  const capability = createOperationCapability((scope) => requestTextService(scope, inlineSelectionRequest));
  const a = createLayoutOperation({ ...options, capability });
  const b = createLayoutOperation({ ...options, resources: { Custom: createHelvetica() }, capability });
  const first = useOperationCapability(a, capability),
    second = useOperationCapability(b, capability);
  const input = {
    runs: [{ text: "source" }],
    defaultStyle: { font: "Custom", fontSize: 10, color: [0, 0, 0] as const },
    lineHeight: 12,
    align: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "error" as const,
  };
  const source = first.prepareInline(input, () => [], 100, false);
  assert.throws(() => second.inlinePosition(source), DocumentError);
  const selected = first.selectInline(source, { width: 100 })!;
  assert.throws(() => second.selectedInline(selected), DocumentError);
  a.close();
  assert.throws(() => first.inlinePosition(source), DocumentError);
  assert.doesNotThrow(() => second.prepareInline(input, () => [], 100, false));
  b.close();
});
