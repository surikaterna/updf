import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import {
  block,
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
  layoutFlowUnknown,
} from "../../../tests/fixtures/transitional-layout.js";
import { flow, paragraph } from "./fixtures.js";
import { richNode } from "../../../tests/fixtures/rich-input.js";

function rejects(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
test("generic all/first/last decorations reserve before selection and final footer needs no blank retry page", () => {
  const plan = createDecorationPlan([
    { edge: "before", repeat: "first", height: 8, nodes: [] },
    { edge: "after", repeat: "last", height: 6, nodes: [] },
  ]);
  const result = layoutFlow(
    flow([block({ children: [{ type: "paragraph", paragraph: paragraph("A\nB\nC\nD") }], decorations: plan })]),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [38, 16],
  );
  const all = createDecorationPlan([
    { edge: "before", repeat: "all", height: 8, nodes: [] },
    { edge: "after", repeat: "last", height: 6, nodes: [] },
  ]);
  const repeated = layoutFlow(
    flow([block({ children: [{ type: "paragraph", paragraph: paragraph("A\nB\nC\nD") }], decorations: all })]),
  );
  assert.deepEqual(
    repeated.placements.map((p) => p.box.height),
    [38, 24],
  );
});
test("atomic header/content/footer must fit together and zero-height advancing content can carry static nodes", () => {
  const plan = createDecorationPlan([
    { edge: "before", repeat: "all", height: 8, nodes: [] },
    { edge: "after", repeat: "last", height: 6, nodes: [] },
  ]);
  rejects(
    () =>
      layoutFlow(flow([block({ children: [{ type: "spacer", height: 30 }], keepTogether: true, decorations: plan })])),
    "LAYOUT_OVERSIZED",
  );
  assert.equal(layoutFlow(flow([block({ children: [], decorations: plan })])).placements[0]?.box.height, 14);
});
test("owned plans reject getters, forged serialized identities and nonprogressing header-only adapters", () => {
  let reads = 0;
  const entry = Object.defineProperty({}, "height", {
    enumerable: true,
    get() {
      reads++;
      return 10;
    },
  });
  rejects(() => createDecorationPlan([entry as never]), "TYPE");
  assert.equal(reads, 0);
  const plan = createDecorationPlan([{ edge: "before", repeat: "all", height: 10, nodes: [] }]);
  rejects(
    () => layoutFlowUnknown(flow([{ type: "block", children: [], decorations: { ...plan } as typeof plan }])),
    "TYPE",
  );
  const adapter = defineBlockAdapter({
    name: "header-only",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "splittable",
      extent: 2,
      naturalSize: { width: 100, height: 0 },
      decorations: plan,
      fragment: () => ({ status: "placed", nextOffset: 0, height: 0, nodes: [] }),
    }),
  });
  rejects(() => layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter])), "TYPE");
});
test("last reservation trials have at most two synchronous candidates and do not amplify emitted budgets", () => {
  let calls = 0;
  const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [] }]);
  const adapter = defineBlockAdapter({
    name: "candidate",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "splittable",
      extent: 2,
      naturalSize: { width: 100, height: 40 },
      decorations: plan,
      fragment(request) {
        calls++;
        const count = Math.min(2 - request.offset, Math.floor(request.availableHeight / 20));
        if (!count) return { status: "defer" };
        return {
          status: "placed",
          nextOffset: request.offset + count,
          height: count * 20,
          nodes: [richNode("A", { height: 20 }, { lineHeight: 10 })],
        };
      },
    }),
  });
  const result = layoutFlow(
    flow([extension(adapter, {})]),
    { profile: "service", limits: { textCodePoints: 2 } },
    createExtensions([adapter]),
  );
  assert.equal(result.pageCount, 2);
  assert.ok(calls <= 5);
});
test("later candidate callbacks cannot mutate nodes of an already selected fragment", () => {
  const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [] }]);
  const shared = {
    status: "placed" as const,
    nextOffset: 1,
    height: 20,
    nodes: [] as import("@updf/core").NodeDefinition[],
  };
  const adapter = defineBlockAdapter({
    name: "mutated-candidate",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "splittable",
      extent: 2,
      naturalSize: { width: 100, height: 40 },
      decorations: plan,
      fragment(request) {
        const count = Math.min(2 - request.offset, Math.floor(request.availableHeight / 20));
        if (!count) return { status: "defer" };
        shared.nextOffset = request.offset + count;
        shared.height = count * 20;
        shared.nodes = [
          richNode(count === 1 ? "selected" : "discarded", { height: shared.height }, { lineHeight: 10 }),
        ];
        return shared;
      },
    }),
  });
  const result = layoutFlow(flow([extension(adapter, {})]), {}, createExtensions([adapter]));
  const first = result.document.pages[0]?.children[0];
  assert.equal(first?.type, "paintGroup");
  if (first?.type === "paintGroup") {
    const node = first.children[0];
    assert.equal(node?.type, "richText");
    if (node?.type === "richText") assert.equal(node.paragraphs[0]?.runs[0]?.text, "selected");
  }
});
