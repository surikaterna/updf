import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import { multipageFreightInvoice } from "../../examples/business/freight-invoice-data.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { freightPagesGeometry } from "./freight-pdf-checks.js";

async function inspect(name: string, bytes: Uint8Array) {
  const directory = new URL("../../artifacts/freight-invoice/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL(`${name}.pdf`, directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
  const words = freightPagesGeometry(execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" }));
  return { pages: text.split("\f").filter((p) => p.trim()), words };
}
test("freight long charges split only between complete rows with repeated headers and one final summary", async () => {
  const result = freightInvoiceExample(await freightFonts(), undefined, multipageFreightInvoice);
  assert.equal(result.result.pageCount, 2);
  const tables = result.result.placements.filter((p) => p.sourceIndex === 2);
  assert.equal(tables.length, 2);
  assert.deepEqual(
    tables.map((p) => p.sourceRange),
    [
      { start: 0, end: 10 },
      { start: 10, end: 20 },
    ],
  );
  assert.deepEqual(
    tables.flatMap((p) => p.sourceKeys ?? []),
    Array.from({ length: 20 }, (_, i) => `charge-${i}`),
  );
  const { pages, words } = await inspect("multipage", result.bytes);
  for (const [pageIndex, page] of pages.entries()) {
    assert.ok(page.includes(`Page ${pageIndex + 1} of 2`));
    assert.equal((page.match(/Charges/gu) ?? []).length, 1);
    assert.equal((page.match(/Invoice Total/gu) ?? []).length, pageIndex);
    const compact = words[pageIndex]!.filter((w) => w.x < 370)
      .map((w) => w.text)
      .join(" ");
    for (const [index, charge] of multipageFreightInvoice.charges.entries()) {
      const expected = index >= tables[pageIndex]!.sourceRange!.start && index < tables[pageIndex]!.sourceRange!.end;
      assert.equal(compact.includes(charge.label), expected, `Complete charge ${index} on page ${pageIndex}`);
    }
  }
  for (const value of ["£21.90", "£4.38", "£26.28"]) assert.ok(pages[1]!.includes(value), value);
  assert.equal(pages.join("").split("Payment contact (mock)").length - 1, 1);
});
test("freight totals move intact to a fresh page when the charge table leaves insufficient room", async () => {
  const data = { ...multipageFreightInvoice, charges: multipageFreightInvoice.charges.slice(0, 8) };
  const { result, bytes } = freightInvoiceExample(await freightFonts(), undefined, data);
  assert.equal(result.pageCount, 2);
  const table = result.placements.find((p) => p.sourceIndex === 2)!;
  const summary = result.placements.at(-1)!;
  assert.equal(table.pageIndex, 0);
  assert.deepEqual(table.sourceRange, { start: 0, end: 8 });
  assert.equal(summary.pageIndex, 1);
  assert.equal(summary.sourceIndex, 3);
  assert.ok(table.box.y + table.box.height + summary.box.height > 841.8897637795277 - 12);
  assert.equal(summary.box.y + summary.box.height, 841.8897637795277 - 12);
  const { pages } = await inspect("summary-carry", bytes);
  assert.ok(!pages[0]!.includes("Invoice Total"));
  assert.ok(!pages[1]!.includes("Charges"), "No orphan table header on summary-only page");
  assert.equal(pages[1]!.split("Invoice Total").length - 1, 1);
  assert.ok(pages[1]!.includes("Payment contact (mock)"));
});
test("freight long buyer, route and vehicle text grows measured panels without clipping", async () => {
  const data = {
    ...multipageFreightInvoice,
    buyer: [
      "Copper Finch Logistics and Exhibition Transport Coordination Limited",
      "Building 17, International Exhibition Cargo Consolidation Centre, Meadow Quay, Demo City",
      "accounts@example.invalid",
    ],
    route: [
      "MEADOW - LANTERN international demonstration passage",
      "Carrier: Copper Finch demonstration fleet and secured onward dispatch",
    ],
    vehicle: [
      "Goods: reusable exhibition display crates",
      "Handling: protective packing for refrigerated exhibition cargo",
    ],
  };
  const result = freightInvoiceExample(await freightFonts(), undefined, data);
  const { pages } = await inspect("long-parties", result.bytes);
  const first = pages[0]!.replace(/\s+/gu, " ");
  // Text extraction interleaves columns; inspect the unique ending words as well as PDF bounds/overlaps.
  for (const word of ["Limited", "Consolidation", "refrigerated", "protective"]) assert.ok(first.includes(word), word);
  assert.equal(result.result.placements.filter((p) => p.sourceIndex === 3).length, 1);
});
test("freight vehicle description preserves negative-bearing glyphs instead of rejecting or clipping them", async () => {
  const resources = await freightFonts();
  const sentence = "Goods: reusable exhibition display crates with refrigeration monitoring and protective handling";
  const example = freightInvoiceExample(resources, undefined, { ...multipageFreightInvoice, vehicle: [sentence] });
  const { words } = await inspect("vehicle-bearing", example.bytes);
  const vehicle = words[0]!.filter((w) => w.x >= 205 && w.right <= 390 && w.y >= 275 && w.y < 370);
  assert.equal(vehicle.map((w) => w.text).join(" "), sentence);
});
