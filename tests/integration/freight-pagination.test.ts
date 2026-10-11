import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import {
  extendedFreightInvoice,
  freightPreset,
  mockFreightInvoice,
} from "../../examples/business/freight-invoice-data.js";
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

test("freight presets retain the original three body sections and summary-only continuation", async () => {
  const resources = await freightFonts();
  for (const data of [mockFreightInvoice, extendedFreightInvoice]) {
    const example = freightInvoiceExample(resources, undefined, data);
    assert.deepEqual(
      example.result.placements.map((p) => p.sourceIndex),
      [0, 1, 2],
    );
    const shipment = example.result.placements[1]!,
      summary = example.result.placements[2]!;
    assert.deepEqual(shipment.sourceRange, { start: 0, end: 1 });
    assert.equal(summary.pageIndex, data === mockFreightInvoice ? 0 : 1);
    assert.equal(summary.box.height, data === mockFreightInvoice ? 212 : 292);
    assert.equal(summary.box.y + summary.box.height, 841.8897637795277 - 12);
  }
  assert.throws(() => freightPreset("multipage"), /original or extended/u);
});

test("freight long buyer, route and vehicle text grows original panels without clipping", async () => {
  const data = {
    ...mockFreightInvoice,
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
  const example = freightInvoiceExample(await freightFonts(), undefined, data);
  const { pages } = await inspect("long-parties", example.bytes);
  const first = pages[0]!.replace(/\s+/gu, " ");
  for (const word of ["Limited", "Consolidation", "refrigerated", "protective"]) assert.ok(first.includes(word), word);
  assert.equal(example.result.placements.filter((p) => p.sourceIndex === 2).length, 1);
});

test("freight vehicle description preserves negative-bearing glyphs in the restored original column", async () => {
  const sentence = "Goods: reusable exhibition display crates with refrigeration monitoring and protective handling";
  const example = freightInvoiceExample(await freightFonts(), undefined, {
    ...mockFreightInvoice,
    vehicle: [sentence],
  });
  const { words } = await inspect("vehicle-bearing", example.bytes);
  const vehicle = words[0]!.filter((w) => w.x >= 154 && w.right <= 297 && w.y >= 275 && w.y < 410);
  assert.equal(vehicle.map((w) => w.text).join(" "), sentence);
});
