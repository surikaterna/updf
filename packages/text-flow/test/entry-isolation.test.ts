import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { createLayoutOperation } from "@updf/core/internal";
import { useOperationCapability } from "@updf/core/resources";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { Document, Flow, Paragraph, layout, pt } from "@updf/layout";
import { createTextSelection } from "@updf/text/selection";
import { createTextComposition } from "@updf/text/composition";
import { createTextFlow, type FloatingBlockProps } from "@updf/text-flow";
import { createPathTextFlow } from "@updf/text-flow/path";
import { createAtomicTextFlow } from "@updf/text-flow/atomic";
import { rectangleQuery } from "../src/rectangle-policy.js";

const runtime = fontRuntime();
const selection = createTextSelection({ runtime, defaultFont: "Helvetica" });
const options = { ...selection, resources: { Helvetica: createHelvetica() }, providers: [fontProvider(runtime)] };

function document(f: ReturnType<typeof createTextFlow>, style: FloatingBlockProps["style"]) {
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 100 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      participation: f.participation,
      children: [
        h(f.Block, { style }),
        h(Paragraph, { style: { fontSize: 20, lineHeight: pt(2) }, children: "A\nA\nA" }),
        h(Paragraph, { style: { fontSize: 60, lineHeight: pt(2) }, children: "A" }),
      ],
    }),
  });
}
test("rectangle root and explicit path entry preserve complete output/PDF for rect modes and both sides", () => {
  const rect = createTextFlow(selection.capability),
    path = createPathTextFlow(selection.capability);
  assert.deepEqual(Object.keys(rect).sort(), ["Block", "participation"]);
  assert.deepEqual(Object.keys(path).sort(), ["Block", "Path", "participation"]);
  for (const float of ["left", "right"] as const) {
    for (const shape of [{}, { shapeOutside: "rect" as const }]) {
      const style = { width: 200, height: 36, float, backgroundColor: [0, 0, 1] as const, ...shape };
      const a = layout(document(rect, style), options),
        b = layout(document(path, style), options);
      assert.deepEqual(a, b);
      assert.deepEqual(render(a.document, options), render(b.document, options));
    }
  }
});
test("root rejects path grammar and explicit undefined; rectangle boundary arithmetic remains exact", () => {
  const f = createTextFlow(selection.capability);
  for (const shapeOutside of [undefined, "M0 0H20V20H0Z", { d: "M0 0H20V20H0Z" }])
    assert.throws(
      () =>
        layout(
          document(f, { width: 20, height: 20, float: "left", shapeOutside } as FloatingBlockProps["style"]),
          options,
        ),
      DocumentError,
    );
  const q = rectangleQuery(20, 36);
  assert.equal(q.clears(36, 36), true);
  assert.equal(q.available(100, 20), 80);
  assert.equal(q.retry(35, 36, 40), 36);
});
test("one combined capability can serve explicit factories without another service installation", () => {
  const combined = createTextComposition({ runtime, defaultFont: "Helvetica" });
  const atomic = createAtomicTextFlow(combined.capability);
  assert.deepEqual(Object.keys(atomic).sort(), ["TextFlow", "textFlowAdapter"]);
  assert.equal(atomic.textFlowAdapter.name, "updf.text-flow");
  const f = createTextFlow(combined.capability);
  assert.ok(layout(document(f, { width: 200, height: 36, float: "left" }), { ...options, ...combined }).pageCount > 0);
  assert.ok(createPathTextFlow(combined.capability).Path);
});
test("selection capability rejects copies and inactive contexts and exposes no atomic composer", () => {
  const operation = createLayoutOperation(options);
  const selected = useOperationCapability(operation, selection.capability);
  assert.equal("composeText" in selected, false);
  assert.throws(() => useOperationCapability(operation, { ...selection.capability }), DocumentError);
  operation.close();
  assert.throws(() => useOperationCapability(operation, selection.capability), DocumentError);
});
test("foreign selected capabilities retain the operation-scope diagnostic through both explicit entries", () => {
  const foreign = createTextSelection({ runtime, defaultFont: "Helvetica" });
  for (const create of [createTextFlow, createPathTextFlow]) {
    const f = create(foreign.capability);
    assert.throws(
      () => layout(document(f, { width: 200, height: 36, float: "left" }), options),
      (error: unknown) => {
        assert.ok(error instanceof DocumentError);
        assert.equal(error.diagnostics[0]!.code, "MEASUREMENT_CONTEXT");
        assert.equal(error.diagnostics[0]!.path, "");
        return true;
      },
    );
  }
});
