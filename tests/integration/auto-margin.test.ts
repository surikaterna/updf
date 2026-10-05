import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DocumentDefinition, NodeDefinition } from "@updf/core";
import { block, document, flow, flowFooter, flowHeader, paragraph } from "@updf/layout";
import { autoMarginData, autoMarginExample } from "../../examples/auto-margin.js";
import { layout, render } from "../fixtures/text-options.js";

function fixedSummary(input: DocumentDefinition, y: number): DocumentDefinition {
  return {
    ...input,
    pages: input.pages.map((page) => ({
      ...page,
      children: Array.from(page.children).map((node, index): NodeDefinition => {
        if (index !== 2) return node;
        assert.equal(node.type, "paintGroup");
        if (node.type !== "paintGroup") throw new Error("Expected summary container");
        return { ...node, transform: [1, 0, 0, 1, 10, y] };
      }),
    })),
  };
}

function checkSummary(y: number): void {
  assert.ok(y >= 52, "Summary overlaps preceding body");
  assert.ok(y + 20 <= 132, "Summary overlaps reserved footer");
}

function ordinaryControl() {
  const text = (children: string) => paragraph({ children, style: { fontSize: 10, lineHeight: 1 } });
  return layout(
    document({
      children: flow({
        pageSize: { width: 120, height: 160 },
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [
          flowHeader({ height: 12, children: text("HEADER") }),
          block({ style: { height: 30 }, children: [text("BODY")] }),
          block({ keepTogether: true, style: { height: 20 }, children: [text("SUMMARY")] }),
          flowFooter({ height: 18, children: text("FOOTER") }),
        ],
      }),
    }),
  );
}

test("#53 TSX/data PDF equals independently positioned control; qpdf/Poppler and overlap raster controls", async () => {
  const actual = autoMarginExample();
  assert.deepEqual(layout(autoMarginData()), actual.result);
  assert.deepEqual(
    actual.result.placements.map((p) => [p.box.y, p.box.height]),
    [
      [22, 30],
      [112, 20],
    ],
  );
  const summary = actual.result.placements[1];
  assert.ok(summary);
  checkSummary(summary.box.y);
  const ordinary = ordinaryControl();
  assert.deepEqual(render(fixedSummary(ordinary.document, 112)), actual.bytes);
  const directory = await mkdtemp(join(tmpdir(), "updf53-pdf-"));
  const proofs = [];
  for (const [name, pdf] of [
    ["actual", actual.result.document],
    ["control", fixedSummary(ordinary.document, 112)],
    ["body-overlap", fixedSummary(ordinary.document, 32)],
    ["footer-overlap", fixedSummary(ordinary.document, 132)],
  ] as const) {
    const path = join(directory, `${name}.pdf`);
    await writeFile(path, render(pdf));
    execFileSync("qpdf", ["--check", path]);
    const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
    for (const word of ["HEADER", "BODY", "SUMMARY", "FOOTER"])
      assert.equal(text.match(new RegExp(word, "g"))?.length, 1);
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    execFileSync("pdftoppm", ["-r", "144", "-singlefile", path, join(directory, name)]);
    proofs.push({ bbox, ink: await readFile(join(directory, `${name}.ppm`)) });
  }
  assert.deepEqual(proofs[0], proofs[1]);
  assert.notDeepEqual(proofs[0]?.ink, proofs[2]?.ink);
  assert.notDeepEqual(proofs[0]?.ink, proofs[3]?.ink);
  assert.throws(() => checkSummary(32), /preceding body/);
  assert.throws(() => checkSummary(132), /reserved footer/);
});
