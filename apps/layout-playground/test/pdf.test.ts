import assert from "node:assert/strict";
import { test } from "node:test";
import { compute } from "../src/compute.js";
import { paginate } from "../src/pagination.js";
import { exportProjection } from "../src/pdf.js";
import { project } from "../src/projection.js";
import { controls, mixedUnits } from "./fixtures.js";
import { assertPDFGeometry, inspectPDF } from "./pdf-tools.js";
import { assertAtomicRaster } from "./raster.js";

test("mixed input order survives real PDF text and atomic-row geometry; old partition order rejects", async () => {
  const units = await mixedUnits();
  const projection = project(paginate(units, controls.width, 108, 8, null, true));
  assert.equal(projection.pages.length, 2);
  assert.equal(projection.pages[0]?.rectangles.find((rect) => rect.id === "atomic-row")?.y, 38);
  assertPDFGeometry(projection, inspectPDF(exportProjection(projection), "mixed-order"));
  assertAtomicRaster(projection, "mixed-order");
  const reordered = [
    ...units.filter((item) => item.line !== undefined),
    ...units.filter((item) => item.line === undefined),
  ];
  const negative = project(paginate(reordered, controls.width, 108, 8, null, true));
  const actual = inspectPDF(exportProjection(negative), "mixed-old-order");
  assert.throws(() => assertPDFGeometry(projection, actual));
  assert.throws(() => assertAtomicRaster(projection, "mixed-old-order"));
});

test("qpdf + Poppler confirm actual page count, source order and accepted text coordinates", async () => {
  const projection = project(await compute(controls));
  const actual = inspectPDF(exportProjection(projection), "selected-pages");
  assertPDFGeometry(projection, actual);
  assertAtomicRaster(projection, "selected-pages");
  const words = actual.words;
  assert.throws(() => assertPDFGeometry(projection, { ...actual, words: words.slice(1) }));
  assert.throws(() =>
    assertPDFGeometry(projection, { ...actual, words: [words[0] as (typeof words)[number], ...words] }),
  );
  assert.throws(() =>
    assertPDFGeometry(projection, {
      ...actual,
      words: words.map((word, index) => (index === 0 ? { ...word, y: word.y + 4 } : word)),
    }),
  );
});

test("actual native negative PDFs expose displaced, duplicated, skipped lines and absent/displaced atomic rows", async () => {
  const projection = project(await compute(controls));
  const first = projection.pages[0];
  assert.ok(first);
  const line = first.lines[0];
  assert.ok(line);
  for (const [name, lines] of [
    ["displaced-line", [{ ...line, y: line.y + 4 }, ...first.lines.slice(1)]],
    ["duplicated-line", [line, ...first.lines]],
    ["skipped-line", first.lines.slice(1)],
  ] as const) {
    const negative = { ...projection, pages: [{ ...first, lines }, ...projection.pages.slice(1)] };
    const actual = inspectPDF(exportProjection(negative), name);
    assert.throws(() => assertPDFGeometry(projection, actual));
  }
  for (const name of ["missing-row", "displaced-row"]) {
    const negative = {
      ...projection,
      pages: projection.pages.map((page) => ({
        ...page,
        rectangles: name === "missing-row" ? [] : page.rectangles.map((rect) => ({ ...rect, y: rect.y + 4 })),
      })),
    };
    inspectPDF(exportProjection(negative), name);
    assert.throws(() => assertAtomicRaster(projection, name));
  }
});
