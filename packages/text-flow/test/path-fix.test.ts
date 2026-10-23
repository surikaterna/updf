import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { layout, Paragraph, Document, Flow, Block, pt } from "@updf/layout";
import { siblingOptions, pathFlow as f } from "../../../tests/fixtures/text-flow/siblings.js";
import { protocolFixture } from "./path-protocol-fixture.js";
import { prepareFragmentPaint } from "../../layout/dist/cjs/fragment-paint-preparation.js";
import { collectPreparedLines } from "../../layout/dist/cjs/prepared-line-reports.js";
import type { ContentLine } from "@updf/layout";
import type { BlockContent } from "@updf/layout";
import type { FloatingPathProps, FloatingBlockProps } from "@updf/text-flow/path";
import { authoredGeometry } from "../src/path-band.js";

const style = { width: 200, height: 36, float: "left" as const };
function document(side: "left" | "right", rectangle: boolean, defer = false, tail = true) {
  const d = rectangle ? "M0 0H200V36H0Z" : side === "left" ? "M0 0H198L200 36H0Z" : "M2 0H200V36H0Z";
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 220, height: 120 },
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      participation: f.participation,
      children: [
        ...(defer ? [h(Block, { style: { height: 70 }, children: null })] : []),
        h(f.Path, { d, fill: "blue", style: { ...style, float: side } }, "contour"),
        h(
          Paragraph,
          { style: { fontSize: 20, lineHeight: pt(2), color: [1, 0, 0] }, children: tail ? "A\nA\nA" : "A" },
          "tight",
        ),
        ...(tail
          ? [h(Paragraph, { style: { fontSize: 60, lineHeight: pt(2), color: [1, 0, 0] }, children: "A" }, "later")]
          : []),
      ],
    }),
  });
}
function rasterProof(pdf: Uint8Array) {
  const ppm = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-f", "1", "-"], { input: pdf });
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40))!;
  assert.ok(header);
  const width = Number(header[1]),
    height = Number(header[2]),
    start = header[0].length;
  let redInside = 0,
    redOutside = 0,
    blue = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = start + 3 * (y * width + x);
      if (ppm[at] === 0 && ppm[at + 1] === 0 && ppm[at + 2] === 255) blue++;
      if (ppm[at] !== 255 || ppm[at + 1] !== 0 || ppm[at + 2] !== 0) continue;
      // This strict interior is inside all three authored polygons, independent of band/layout data.
      if (x / 2 > 13 && x / 2 < 207 && y / 2 > 11 && y / 2 < 45.5) redInside++;
      else redOutside++;
    }
  }
  assert.equal(redInside, 0);
  assert.ok(redOutside > 0 && blue > 1000, "Exact color guards must see both glyphs and path");
  return { ppm, redInside, redOutside, blue };
}
for (const side of ["left", "right"] as const)
  for (const rectangle of [false, true])
    for (const tail of [false, true])
      test(`${side} ${rectangle ? "rectangle" : "slope"} ${tail ? "tail" : "single"}: native PDF tight-leading never reenters path`, () => {
        const result = layout(document(side, rectangle, false, tail), siblingOptions);
        const pdf = render(result.document, siblingOptions);
        const proof = rasterProof(pdf);
        const text = execFileSync("pdftotext", ["-raw", "-", "-"], { input: pdf, encoding: "utf8" });
        assert.equal(text.replace(/\s/gu, ""), tail ? "AAAA" : "A");
        const dir = `artifacts/text-flow/entry-isolation-after/path-regression/${side}-${rectangle ? "rect" : "slope"}-${tail ? "tail" : "single"}`;
        mkdirSync(dir, { recursive: true });
        writeFileSync(`${dir}/output.pdf`, pdf);
        writeFileSync(`${dir}/output.ppm`, proof.ppm);
        execFileSync("qpdf", ["--check", `${dir}/output.pdf`]);
        const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
        writeFileSync(
          `${dir}/report.json`,
          JSON.stringify({
            ...proof,
            ppm: undefined,
            pdfSha256: hash(pdf),
            rasterSha256: hash(proof.ppm),
            placements: result.placements,
          }),
        );
      });
test("path safe prefix reserves its real gap and defers intact to a fresh page", () => {
  const result = layout(document("left", true, true), siblingOptions);
  assert.equal(result.placements[1]!.pageIndex, 1);
  assert.deepEqual(result.placements[1]!.sourceKeys, ["contour", "tight"]);
  assert.ok(result.placements.some((p) => p.sourceKeys?.includes("later")));
  assert.ok(result.placements[1]!.box.height > 36);
  const fixture = protocolFixture([
    h(f.Path, { d: "M0 0H200V36H0Z", fill: "blue", style }),
    h(Paragraph, { style: { fontSize: 20, lineHeight: pt(2) }, children: "A" }),
  ]);
  try {
    const selected = fixture.block.fragment(fixture.request)!;
    assert.ok(selected.height > 36);
    const lines: ContentLine[] = [];
    const tail = fixture.block.fragment({ ...fixture.request, offset: selected.nextOffset })!;
    collectPreparedLines(
      prepareFragmentPaint(tail, { x: 0, y: selected.height }, fixture.request.budget, "/tail").root,
      lines,
    );
    assert.ok(lines[0]!.top > 36);
    assert.equal(lines[0]!.fragments[0]!.source.path, "/siblings/1/children");
  } finally {
    fixture.close();
  }
});
function diagnostic(children: BlockContent[], path: string, code?: string) {
  assert.throws(
    () =>
      layout(
        h(Document, {
          children: h(Flow, {
            pageSize: { width: 220, height: 120 },
            margins: { top: 10, right: 10, bottom: 10, left: 10 },
            participation: f.participation,
            children,
          }),
        }),
        siblingOptions,
      ),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]!.path, path);
      if (code) assert.equal(error.diagnostics[0]!.code, code);
      return true;
    },
  );
}
test("fillRule defaults only on omission for both authored facades", () => {
  for (const fillRule of [null, undefined, "bogus"]) {
    diagnostic(
      [h(f.Path, { d: "M0 0H200V36H0Z", fill: "blue", fillRule, style } as unknown as FloatingPathProps)],
      "/document/children/children/0/fillRule",
      "VALUE",
    );
    diagnostic(
      [
        h(f.Block, {
          style: { ...style, shapeOutside: { d: "M0 0H200V36H0Z", fillRule } },
        } as unknown as FloatingBlockProps),
      ],
      "/document/children/children/0/style/shapeOutside/fillRule",
      "VALUE",
    );
  }
});
test("parser and color failures retain authored sibling fields and parser offsets", () => {
  const prefix = h(Paragraph, { children: "prefix" });
  diagnostic(
    [prefix, h(f.Path, { d: "M0 nope", fill: "blue", style })],
    "/document/children/children/1/d/3",
    "PATH_SYNTAX",
  );
  diagnostic(
    [prefix, h(f.Path, { d: "M0 0H200V36H0Z", fill: "bogus", style })],
    "/document/children/children/1/fill",
    "PAINT",
  );
  diagnostic(
    [prefix, h(f.Block, { style: { ...style, shapeOutside: { d: "M0 nope" } } })],
    "/document/children/children/1/style/shapeOutside/d/3",
    "PATH_SYNTAX",
  );
  diagnostic(
    [prefix, h(f.Block, { style: { ...style, shapeOutside: "M0 nope" } })],
    "/document/children/children/1/style/shapeOutside/3",
    "PATH_SYNTAX",
  );
  const unexpected = new TypeError("original host failure");
  assert.throws(
    () =>
      authoredGeometry(
        () => {
          throw unexpected;
        },
        "/path",
        "/body/1/d",
      ),
    (e) => e === unexpected,
  );
});
