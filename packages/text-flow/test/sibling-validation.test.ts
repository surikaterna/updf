import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, Document, Flow, Paragraph, document, flow, layout, paragraph, type BlockContent } from "@updf/layout";
import { siblingFlow as f, siblingOptions as options } from "../../../tests/fixtures/text-flow/siblings.js";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const pageSize = { width: 200, height: 100 };
function run(children: BlockContent[], data: boolean, installed = true) {
  const props = { pageSize, margins, ...(installed ? { participation: f.participation } : {}), children };
  return layout(data ? document({ children: flow(props) }) : h(Document, { children: h(Flow, props) }), options);
}
function autoBlock(data: boolean) {
  const props = { keepTogether: true, style: { height: 10, marginTop: "auto" as const }, children: [] };
  return data ? { type: "block" as const, ...props } : h(Block, props);
}
function text(data: boolean) {
  return data ? paragraph({ children: "later" }) : h(Paragraph, { children: "later" });
}
function floating() {
  return h(f.Block, { style: { width: 40, height: 20, float: "left" } });
}
function terminalError(action: () => unknown): DocumentError {
  let caught: DocumentError | undefined;
  assert.throws(action, (error: unknown) => {
    if (!(error instanceof DocumentError)) return false;
    caught = error;
    assert.equal(error.diagnostics[0]?.code, "VDOM_HIERARCHY");
    assert.equal(error.diagnostics[0]?.message, "Auto top margin requires the terminal body sibling");
    return true;
  });
  return caught!;
}
for (const data of [false, true]) {
  const api = data ? "data" : "h";
  test(`${api}: installed no-float participation preserves whole-body terminal auto-margin rejection`, () => {
    const children = [autoBlock(data), text(data)];
    const ordinary = terminalError(() => run(children, data, false));
    const installed = terminalError(() => run(children, data));
    assert.deepEqual(installed.diagnostics, ordinary.diagnostics);
  });
  test(`${api}: a float elsewhere does not let a nonterminal auto-margin barrier escape validation`, () => {
    const ordinary = terminalError(() => run([text(data), autoBlock(data), text(data)], data, false));
    const installed = terminalError(() => run([floating(), autoBlock(data), text(data)], data));
    assert.deepEqual(installed.diagnostics, ordinary.diagnostics);
  });
  for (const withFloat of [false, true])
    test(`${api}: valid terminal auto margin aligns at y90 with float=${withFloat}`, () => {
      const result = run([...(withFloat ? [floating()] : []), text(data), autoBlock(data)], data);
      assert.equal(result.pageCount, 1);
      assert.equal(result.placements.at(-1)!.box.y, 90);
      assert.equal(result.placements.at(-1)!.box.height, 10);
      assert.equal(result.placements.at(-1)!.sourceRange!.start, withFloat ? 2 : 1);
    });
}
