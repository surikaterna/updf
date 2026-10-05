import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { createLayoutOperation, layoutTableFlow, lower, render } from "../../../tests/fixtures/text-options.js";
import {
  LegacyFlow as Flow,
  type FlowDocumentDefinition,
  layoutFlow,
} from "../../../tests/fixtures/transitional-layout.js";
import { Paginator } from "../dist/cjs/paginator.js";
import { Tables } from "../dist/cjs/tables/vdom.js";
import { template } from "../dist/cjs/template.js";
import { flow } from "./fixtures.js";

const rectangle: NodeDefinition = { type: "rect", x: 5, y: 5, width: 1, height: 1 };
function deep(): NodeDefinition {
  let node: NodeDefinition = rectangle;
  for (let i = 0; i < 3000; i++) node = { type: "paintGroup", children: [node] };
  return node;
}
function limited(run: () => unknown): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT");
}
function parity(input: FlowDocumentDefinition): void {
  const native = render(layoutFlow(input).document);
  assert.deepEqual(render(lower(h(Flow.Document, input))), native);
  assert.deepEqual(render(layoutTableFlow(input).document), native);
  assert.deepEqual(render(lower(h(Tables.Document, input))), native);
  const service = { profile: "service" } as const;
  limited(() => layoutFlow(input, service));
  limited(() => layoutTableFlow(input, service));
  limited(() => lower(h(Flow.Document, input), service));
  limited(() => lower(h(Tables.Document, input), service));
}
test("F4: depth-3000 fixed native data and Flow/Tables VDOM share exact trusted bytes", () => {
  parity(flow([{ type: "fixed", height: 20, children: [deep()] }]));
});
test("F4: depth-3000 repeated header/footer conversion is iterative in both VDOM adapters", () => {
  const region = { height: 10, children: [deep()] };
  parity(flow([{ type: "pageBreak" }], { header: region, footer: region }));
});
test("F5: five empty-region pages use seven distinct source containers and zero emitted nodes", () => {
  const region = { height: 10, children: [] };
  const input = flow(Array(4).fill({ type: "pageBreak" }), { header: region, footer: region });
  const result = layoutFlow(input, { limits: { nodes: 7 } });
  assert.equal(result.pageCount, 5);
  assert.ok(result.document.pages.every((page) => page.children.length === 0));
  assert.equal(result.placements[0]?.box.y, 10);
  limited(() => layoutFlow(input, { limits: { nodes: 6 } }));
});
test("F5: empty fixed blocks reserve geometry without phantom generated wrappers", () => {
  const block = { type: "fixed" as const, height: 5, children: [] };
  const region = { height: 1, children: block.children };
  const result = layoutFlow(flow(Array(20).fill(block), { header: region, footer: region }), { limits: { nodes: 20 } });
  assert.equal(result.pageCount, 3);
  assert.ok(result.document.pages.every((page) => page.children.length === 0));
  assert.equal(result.placements.length, 20);
  assert.equal(result.placements[0]?.box.height, 5);
});
test("F5: real repeated nodes succeed at the exact generated budget and fail at plus one", () => {
  const region = { height: 10, children: [rectangle] };
  const input = flow(Array(4).fill({ type: "pageBreak" }), { header: region });
  assert.equal(layoutFlow(input, { limits: { nodes: 10 } }).pageCount, 5);
  limited(() => layoutFlow(input, { limits: { nodes: 9 } }));
});
test("F5: a repeated region exceeding generated nodes fails before its snapshot reads", () => {
  let copies = 0;
  const node = new Proxy(rectangle, {
    get(target, key) {
      if (key === "x") copies++;
      return Reflect.get(target, key);
    },
  });
  const operation = createLayoutOperation({ limits: { nodes: 9 } });
  const geometry = template(flow([], { header: { height: 10, children: [node] } }).pageTemplate, operation);
  const paginator = new Paginator(geometry, operation.policy);
  for (let i = 0; i < 3; i++) paginator.advance("/break");
  copies = 0;
  limited(() => paginator.advance("/break"));
  assert.equal(copies, 0);
  assert.equal(paginator.pages.length, 4);
});
