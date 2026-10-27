import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render, type NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import {
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  flow,
  layout,
  paragraph,
  pt,
  type BlockContent,
  type BlockAdapterIdentity,
  type BlockUnitRequest,
} from "@updf/layout";
import { createAtomicTextFlow } from "@updf/text-flow/atomic";
import { useOperationCapability } from "@updf/core/resources";
import type { TextCompositionOperation } from "@updf/text/composition";
import { compositionOptions, installation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

const props = () => ({ paragraphs: rectangular("AB").paragraphs, style: { maxHeight: 100 } });
const { TextFlow, textFlowAdapter } = createAtomicTextFlow(installation.capability);
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
function content(children: BlockContent, height = 40, adapters: readonly BlockAdapterIdentity[] = [textFlowAdapter]) {
  return document({
    children: flow({ pageSize: { width: 100, height }, margins, extensions: createExtensions(adapters), children }),
  });
}
function rejects(invoke: () => unknown, code: string) {
  assert.throws(invoke, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
function findPrepared(nodes: readonly NodeDefinition[]): Extract<NodeDefinition, { type: "nativeLeaf" }> | undefined {
  for (const node of nodes) {
    if (node.type === "nativeLeaf") return node;
    if (node.type === "paintGroup") {
      const found = findPrepared(node.children);
      if (found) return found;
    }
  }
  return undefined;
}
test("atomic TextFlow data/TSX use actual height, durable returned native output and fresh-page admission", () => {
  const options = compositionOptions();
  const data = extension(textFlowAdapter, props());
  const result = layout(
    content([paragraph({ children: "A", style: { fontSize: 10, lineHeight: pt(30) } }), data]),
    options,
  );
  assert.equal(result.pageCount, 2);
  const node = findPrepared(result.document.pages[1]!.children);
  assert.equal(node?.width, 100);
  assert.equal(node?.height, 16);
  assert.ok(render(result.document, options).length > 0);
  const jsx = layout(content(h(TextFlow, props())), options);
  assert.deepEqual(render(jsx.document, options), render(layout(content(data), options).document, options));
  rejects(() => layout(content(data, 15), options), "LAYOUT_OVERSIZED");
  rejects(
    () => layout(content(extension(textFlowAdapter, { ...props(), style: { maxHeight: 15 } })), options),
    "VERTICAL_OVERFLOW",
  );
});
test("adapter rejects unsupported props/modes and exact authored width exceeding region", () => {
  const options = compositionOptions();
  for (const style of [
    { width: 101, maxHeight: 100 },
    { width: undefined, maxHeight: 100 },
    { maxHeight: 100, float: "left" },
    { width: "100px", maxHeight: 100 },
  ])
    assert.throws(() => layout(content(extension(textFlowAdapter, { ...props(), style } as never)), options));
  rejects(
    () =>
      layout(
        content(
          extension(textFlowAdapter, { ...props(), paragraphs: rectangular("AB", { align: "right" }).paragraphs }),
        ),
        options,
      ),
    "VALUE",
  );
  assert.throws(() =>
    layout(content(extension(textFlowAdapter, { ...props(), children: "not parsed" } as never)), options),
  );
  const narrow = layout(
    content(extension(textFlowAdapter, { ...props(), style: { width: 80, maxHeight: 100 } })),
    options,
  );
  assert.equal(findPrepared(narrow.document.pages[0]!.children)?.width, 80);
});
test("real operation closes composition contexts on success/failure; repeated next is deterministic", () => {
  let retained: TextCompositionOperation | undefined;
  const requests: BlockUnitRequest[] = [];
  const probe = defineBlockAdapter({
    name: "composition.probe",
    validate: (input) => input,
    measure(_props, context) {
      if (retained)
        rejects(() => retained!.composeText({ ...rectangular("A"), maxHeight: 100 }), "MEASUREMENT_CONTEXT");
      retained = useOperationCapability(context, installation.capability);
      const frame = retained.composeText({ ...rectangular("AB"), maxHeight: 100 });
      const nodes = [retained.composedText(frame)];
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: frame.height },
        next(request) {
          requests.push(request);
          return { end: 1, height: frame.height, nodes };
        },
      };
    },
  });
  const options = compositionOptions();
  const input = content(
    [paragraph({ children: "A", style: { fontSize: 10, lineHeight: pt(30) } }), extension(probe, {})],
    40,
    [probe],
  );
  assert.equal(layout(input, options).pageCount, 2);
  assert.deepEqual(requests[0], requests[1]);
  layout(input, options);
  rejects(() => retained!.composeText({ ...rectangular("A"), maxHeight: 100 }), "MEASUREMENT_CONTEXT");
  rejects(() => layout(content(extension(probe, {}), 15, [probe]), options), "LAYOUT_OVERSIZED");
  rejects(() => retained!.composeText({ ...rectangular("A"), maxHeight: 100 }), "MEASUREMENT_CONTEXT");
});
test("repeated occurrences charge the same operation composition ledger and output text quotas", () => {
  const options = compositionOptions();
  const one = extension(textFlowAdapter, props());
  rejects(() => layout(content(one, 100), { ...options, limits: { nodes: 80 } }), "LIMIT");
  layout(content(one, 100), { ...options, limits: { nodes: 200 } });
  rejects(
    () => layout(content([one, extension(textFlowAdapter, props())], 100), { ...options, limits: { nodes: 200 } }),
    "LIMIT",
  );
  rejects(() => layout(content([one, one], 100), { ...options, limits: { textCodePoints: 3 } }), "LIMIT");
});

test("adapter capability selection is explicit and failures retain the real origin", () => {
  const options = compositionOptions();
  const { capability: _capability, ...ordinary } = options;
  const input = content(extension(textFlowAdapter, props()));
  for (const selection of [ordinary, compositionOptions({}, (plan) => plan)]) {
    assert.throws(
      () => layout(input, selection),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT" &&
        error.diagnostics[0]?.path === "/document/children/body/0",
    );
  }
  const probe = defineBlockAdapter({
    name: "origin.probe",
    validate: (value) => value,
    measure(_props, context) {
      const api = useOperationCapability(context, options.capability);
      assert.throws(
        () => api.composeText({ ...rectangular("A"), maxHeight: 0 }, "/spoof"),
        (error: unknown) =>
          error instanceof DocumentError && error.diagnostics[0]?.path.startsWith(context.sourcePath) === true,
      );
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 0 },
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  layout(content(extension(probe, {}), 40, [probe]), options);
});

test("TextFlow forwards one edge reservation without changing atomic transport or painting visuals", () => {
  const options = compositionOptions();
  const reserved = { ...props(), exclusion: { shape: "rect", side: "right", width: 100, height: 16 } as const };
  const result = layout(content(extension(textFlowAdapter, reserved)), options);
  assert.equal(result.pageCount, 1);
  assert.equal(findPrepared(result.document.pages[0]!.children)?.height, 32);
  assert.deepEqual(
    render(result.document, options),
    render(layout(content(h(TextFlow, reserved)), options).document, options),
  );
});
