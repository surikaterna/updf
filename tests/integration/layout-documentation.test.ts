import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { measure, paragraph, pt } from "@updf/layout";
import { LayoutInputError } from "@updf/layout-kernel";
import { createFragmentOperation } from "@updf/layout-kernel/fragmentation";
import { derivedAxis } from "@updf/layout-kernel/geometry";
import { textOptions } from "../fixtures/text-options.js";
import {
  authorMeasuredDocument,
  authorPagedTable,
  certifyHostMetrics,
  fragmentHostUnits,
  placeHostBoxes,
} from "./layout-documentation-examples.js";

test("documented layout measurement is unpaginated, frozen and explicitly serialized", () => {
  const { metrics, result, bytes } = authorMeasuredDocument();
  assert.equal(metrics.lines.length, 1);
  assert.equal(metrics.size.height, 12);
  assert.equal(result.pageCount, 1);
  assert.ok(Object.isFrozen(result.document.pages));
  assert.ok(Object.isFrozen(metrics.lines));
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
  assert.throws(
    () => measure(paragraph({ children: "x" }), { width: 100, height: 1 }, textOptions({})),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
  );
  assert.throws(() => pt(0));
});

test("documented paged table preserves body keys and whole-row source progress", () => {
  const result = authorPagedTable();
  assert.ok(result.pageCount > 1);
  assert.ok(Object.isFrozen(result.placements));
  assert.deepEqual(
    result.placements.flatMap((placement) => placement.sourceKeys ?? []),
    ["item-0", "item-1", "item-2", "item-3", "item-4"],
  );
  assert.equal(result.placements[0]?.sourceRange?.start, 0);
  assert.equal(result.placements.at(-1)?.sourceRange?.end, 5);
});

test("documented kernel boxes freeze structures, not host content, and offsets exclude padding", () => {
  const { root, boxes, placed } = placeHostBoxes();
  assert.ok(Object.isFrozen(boxes.boxes));
  assert.equal(boxes.boxes[0]?.content, root);
  assert.equal(Object.isFrozen(root), false);
  assert.deepEqual(
    placed.children.map(({ left, top }) => ({ left, top })),
    [
      { left: 0, top: 3 },
      { left: 12, top: 3 },
    ],
  );
});

test("documented kernel fragmentation consumes cursors and closes on replay failure", () => {
  const { first, last, counts } = fragmentHostUnits();
  assert.equal(first.status, "region-full");
  assert.equal(last.status, "done");
  assert.equal(first.placements[0]?.end, 2);
  assert.equal(last.placements[0]?.start, 2);
  assert.ok(counts.unitsExamined >= 3);
  const operation = createFragmentOperation({ next: () => ({ end: 1, height: 1, content: "x" }) });
  const cursor = operation.start({
    count: 0,
    at: () => {
      throw new Error("empty view");
    },
  });
  const region = { id: "page", width: 10, height: 10, usedHeight: 0 };
  operation.fragment(cursor, region);
  assert.throws(() => operation.fragment(cursor, region), LayoutInputError);
  assert.throws(
    () =>
      operation.start({
        count: 0,
        at: () => {
          throw new Error("closed");
        },
      }),
    { code: "VALUE", path: "/operation" },
  );
  assert.ok(Object.isFrozen(operation.counts()));
  operation.close();
});

test("documented numeric/arithmetic/geometry contracts retain host units", () => {
  const result = certifyHostMetrics();
  assert.equal(result.start, 2);
  assert.equal(result.top, 3);
  assert.equal(result.total, 12);
  assert.equal(result.sum, 12);
  assert.equal(result.roundtrip, 12);
  assert.ok(result.next > 12 && result.step > 0n && result.fits);
  assert.ok(Object.isFrozen(result.axis));
  assert.throws(() => derivedAxis(2, 2, "/axis"), { code: "GEOMETRY", path: "/axis" });
});

test("layout/table/kernel defining JSDoc survives ESM and canonical CJS declaration emission", async () => {
  const contracts = [
    ["layout", "mixed-layout", "Paginate exactly one layout Document"],
    ["layout", "content-measure", "Natural, unpaginated border-box measurement in points"],
    ["layout", "content-types", "Default collapse"],
    ["layout", "extension-types", "offset is not a vertical point coordinate"],
    ["layout", "page-context", "flow index zero-based"],
    ["tables", "index", "Install tableExtension by identity"],
    ["tables", "types", "cell defaults applied at row priority"],
    ["tables", "parts", "HeaderCell author slot accepted in Head only"],
    ["layout-kernel", "box-layout", "generic content payloads are retained"],
    ["layout-kernel", "fragment-types", "Opaque single-use operation cursor"],
    ["layout-kernel", "arithmetic", "Any nonfinite argument returns true"],
    ["layout-kernel", "binary64", "Preconditions are unchecked"],
    ["layout-kernel", "geometry", "greatest native-fitting positive capacity"],
  ];
  for (const [pkg, owner, contract] of contracts) {
    assert.ok(contract);
    for (const prefix of ["dist", "dist/cjs"]) {
      const path = `../../packages/${pkg}/${prefix}/${owner}.d.ts`;
      assert.ok((await readFile(new URL(path, import.meta.url), "utf8")).includes(contract), path);
    }
  }
});
