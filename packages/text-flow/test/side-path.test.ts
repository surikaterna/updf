import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { render, type NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { layout, Paragraph, Document, Flow, pt } from "@updf/layout";
import { sidePathDocument } from "../../../tests/fixtures/text-flow/side-path.js";
import { siblingOptions, pathFlow as f } from "../../../tests/fixtures/text-flow/siblings.js";
import { protocolFixture } from "./path-protocol-fixture.js";

function flatten(nodes: Iterable<NodeDefinition>): NodeDefinition[] {
  return [...nodes].flatMap((node) => (node.type === "paintGroup" ? flatten(node.children) : [node]));
}
for (const side of ["left", "right"] as const)
  test(`${side} real TSX Path shares sibling participation and paints once`, () => {
    const result = layout(sidePathDocument(side), siblingOptions);
    const paths = result.document.pages.flatMap((page) => flatten(page.children)).filter((n) => n.type === "path");
    assert.equal(paths.length, 1);
    assert.deepEqual(paths[0]!.paint?.fill, [52 / 255, 152 / 255, 219 / 255]);
    assert.ok(result.pageCount > 1);
    assert.deepEqual(result.placements[0]!.sourceKeys, ["path", "first", "second"]);
    const pdf = render(result.document, siblingOptions);
    const extracted = execFileSync("pdftotext", ["-raw", "-", "-"], { input: pdf, encoding: "utf8" })
      .replace(/\s+/gu, " ")
      .trim();
    assert.equal(
      extracted,
      `First styled source paragraph with contour text. ${"Second paragraph continues to full width. ".repeat(24).trim()}`,
    );
  });
test("near-bottom path defers intact without source consumption or duplicate painting", () => {
  const result = layout(sidePathDocument("left", 200), siblingOptions);
  assert.equal(result.placements[1]!.pageIndex, 1);
  assert.deepEqual(result.placements[1]!.sourceKeys, ["path", "first", "second"]);
  assert.equal(
    result.document.pages.flatMap((page) => flatten(page.children)).filter((n) => n.type === "path").length,
    1,
  );
});
test("authored Block shape accepts object and string with resolved constraints", () => {
  for (const shapeOutside of ["M0 0H20V36H0Z", { d: "m0 0h20v36h-20z", fillRule: "evenodd" as const }]) {
    const fixture = protocolFixture([
      h(f.Block, { style: { width: 72, height: 72, maxHeight: 36, float: "left", shapeOutside } }),
      h(Paragraph, { children: "first ordinary paragraph source" }),
    ]);
    try {
      assert.ok(fixture.block.fragment(fixture.request));
    } finally {
      fixture.close();
    }
  }
  assert.throws(() =>
    protocolFixture([
      h(f.Block, { style: { width: 72, height: 72, maxHeight: 36, float: "left", shapeOutside: "M0 0H20V72H0Z" } }),
      h(Paragraph, { children: "first ordinary paragraph source" }),
    ]),
  );
});
test("compound Path preserves native fill rules after resolved min/max dimensions", () => {
  for (const fillRule of ["nonzero", "evenodd"] as const) {
    const result = layout(
      h(Document, {
        children: h(Flow, {
          pageSize: { width: 220, height: 260 },
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          participation: f.participation,
          children: [
            h(f.Path, {
              d: "M0 0H60V60H0Z M10 10H50V50H10Z",
              fillRule,
              fill: [0.2, 0.3, 0.4],
              style: { width: 100, maxWidth: 60, height: 100, maxHeight: 60, float: "right" },
            }),
            h(Paragraph, { children: "ordinary paragraph" }),
          ],
        }),
      }),
      siblingOptions,
    );
    const paths = result.document.pages.flatMap((page) => flatten(page.children)).filter((n) => n.type === "path");
    assert.equal(paths.length, 1);
    assert.equal(paths[0]!.paint?.fillRule, fillRule);
    assert.equal(result.placements[0]!.box.height, 60);
  }
});
test("oversized crossing line uses ordinary fresh-body rejection", () => {
  assert.throws(
    () =>
      layout(
        h(Document, {
          children: h(Flow, {
            pageSize: { width: 220, height: 260 },
            margins: { top: 10, right: 10, bottom: 10, left: 10 },
            participation: f.participation,
            children: [
              h(f.Path, { d: "M0 0H100L20 96H0Z", fill: "blue", style: { width: 100, height: 96, float: "left" } }),
              h(Paragraph, { style: { lineHeight: pt(300) }, children: "A" }),
            ],
          }),
        }),
        siblingOptions,
      ),
    /fit|oversized|exceed/iu,
  );
});
