import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { render, type NodeDefinition } from "@updf/core";
import { layout } from "@updf/layout";
import { siblingDocument, siblingOptions } from "../../../tests/fixtures/text-flow/siblings.js";

function flatten(nodes: Iterable<NodeDefinition>): NodeDefinition[] {
  return [...nodes].flatMap((node) => (node.type === "paintGroup" ? flatten(node.children) : [node]));
}
for (const side of ["left", "right"] as const)
  test(`real ${side} Block and rich sibling paragraphs paginate and paint once`, () => {
    const result = layout(siblingDocument(side), siblingOptions);
    const nodes = result.document.pages.flatMap((page) => flatten(page.children));
    const rectangles = nodes.filter((node) => node.type === "rect" && node.paint?.fill?.[0] === 0.2);
    assert.equal(rectangles.length, 1);
    assert.ok(result.pageCount > 1);
    assert.deepEqual(result.placements[0]!.sourceKeys, ["visual", "first", "second"]);
    assert.deepEqual(result.placements[0]!.sourceRange, { start: 0, end: 3 });
    assert.ok(result.placements[0]!.box.height >= 96);
    assert.ok(result.placements.some((p) => p.sourceKeys?.length === 1 && p.sourceKeys[0] === "second"));
    const control = result.placements.find((p) => p.box.height === 0)!;
    assert.equal(control.sourceIndex, 3);
    assert.match(control.sourcePath, /\/body\/3$/u);
    const pdf = render(result.document, siblingOptions);
    assert.ok(pdf.length > 500);
    const extracted = execFileSync("pdftotext", ["-raw", "-", "-"], { input: pdf, encoding: "utf8" })
      .replace(/\s+/gu, " ")
      .trim();
    assert.equal((extracted.match(/Second paragraph/gu) ?? []).length, 12);
    assert.equal((extracted.match(/styled span/gu) ?? []).length, 1);
    assert.equal((extracted.match(/After page break/gu) ?? []).length, 1);
    assert.equal(
      extracted,
      `Rich styled span and first paragraph. ${"Second paragraph has ordinary full width text. ".repeat(12)}After page break.`,
    );
  });
test("near-bottom sibling group defers intact and does not paint the float twice", () => {
  const result = layout(siblingDocument("left", 200), siblingOptions);
  assert.equal(result.placements[0]!.pageIndex, 0);
  assert.equal(result.placements[1]!.pageIndex, 1);
  assert.equal(result.placements[1]!.box.y, 10);
  assert.deepEqual(result.placements[1]!.sourceKeys, ["visual", "first", "second"]);
  assert.equal(
    result.document.pages
      .flatMap((p) => flatten(p.children))
      .filter((n) => n.type === "rect" && n.paint?.fill?.[0] === 0.2).length,
    1,
  );
});
