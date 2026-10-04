import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import { calculateFreight, freightMoney } from "../../examples/business/freight-invoice-calculations.js";
import { extendedFreightInvoice, mockFreightInvoice } from "../../examples/business/freight-invoice-data.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { freightGeometry, freightMultipageGeometry, freightRaster } from "./freight-pdf-checks.js";
import { eraseRegion } from "./manifest-pdf-checks.js";

test("freight independent literal pence, signed per-charge half-up and unsafe range guards", () => {
  assert.deepEqual(calculateFreight(mockFreightInvoice.charges), {
    taxes: [0, 4368, 655],
    netPence: 26750,
    vatPence: 5023,
    grossPence: 31773,
  });
  const charge = (netPence: number, vatBasisPoints = 2000) => ({ label: "Test", netPence, vatBasisPoints });
  assert.deepEqual(calculateFreight([charge(5, 1000), charge(5, 1000), charge(-5, 1000)]), {
    taxes: [1, 1, -1],
    netPence: 5,
    vatPence: 1,
    grossPence: 6,
  });
  for (const netPence of [NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER])
    assert.throws(() => calculateFreight([charge(netPence), charge(0), charge(0)]));
  for (const rate of [-1, 10001, 1.5, NaN])
    assert.throws(() => calculateFreight([charge(1, rate), charge(0), charge(0)]));
  assert.throws(() => calculateFreight([]));
  assert.throws(() => calculateFreight(Array.from({ length: 21 }, () => charge(1))), /1 to 20/u);
  assert.deepEqual(calculateFreight([charge(-5, 1000)]), { taxes: [-1], netPence: -5, vatPence: -1, grossPence: -6 });
  assert.deepEqual(calculateFreight(extendedFreightInvoice.charges), {
    taxes: [0, 4368, 655, 840, 370, 0, 750, -250],
    netPence: 37900,
    vatPence: 6733,
    grossPence: 44633,
  });
  assert.throws(() => calculateFreight([charge(Number.MAX_SAFE_INTEGER - 5000, 0), charge(6000, 0), charge(0)]));
  assert.equal(freightMoney(-5), "-£0.05");
  assert.equal(freightMoney(31773), "£317.73");
});
test("freight realistic wrapped body text preserves the bottom financial anchor", async () => {
  const resources = await freightFonts();
  const data = {
    ...mockFreightInvoice,
    route: [
      "MEADOW - LANTERN",
      "12 SEP 2026 06:30",
      "Vessel: Demo Tide coastal demonstrator",
      "Carrier: Copper Finch demonstration fleet",
      "Reference: MOCK-TRIP",
    ],
    vehicle: [
      "Driver: Demo operator",
      "Unit: accompanied",
      "Vehicle: MOCK-UNIT",
      "Trailer: MOCK-TRAILER",
      "Goods: reusable exhibition display crates",
    ],
  };
  const example = freightInvoiceExample(resources, "Wrapped body demonstration", data);
  assert.equal(example.result.pageCount, 1);
  const path = new URL("../../artifacts/freight-invoice/wrapped-body.pdf", import.meta.url).pathname;
  await mkdir(new URL("../../artifacts/freight-invoice/", import.meta.url), { recursive: true });
  await writeFile(path, example.bytes);
  execFileSync("qpdf", ["--check", path]);
  freightGeometry(execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" }));
  const prefix = path.replace(/\.pdf$/u, "");
  execFileSync("pdftoppm", ["-r", "72", path, prefix]);
  freightRaster(await readFile(`${prefix}-1.ppm`));
});
test("freight licensed pinned faces, frozen input, constant heading and atomic oversize failure", async () => {
  const resources = await freightFonts();
  const result = freightInvoiceExample(resources);
  assert.deepEqual(result.bytes, freightInvoiceExample(resources).bytes);
  const before = JSON.stringify(mockFreightInvoice);
  freightInvoiceExample(resources, "W".repeat(40));
  assert.equal(JSON.stringify(mockFreightInvoice), before);
  assert.throws(() => freightInvoiceExample(resources, "X".repeat(41)), /at most 40/u);
  assert.throws(() => freightInvoiceExample(resources, "two\nlines"), /one line/u);
  assert.throws(() =>
    freightInvoiceExample(resources, "Overflow", {
      ...mockFreightInvoice,
      buyer: Array.from({ length: 60 }, () => "Extra mock address"),
    }),
  );
  assert.throws(
    () =>
      freightInvoiceExample(resources, "Oversize charges", {
        ...mockFreightInvoice,
        charges: Array.from({ length: 20 }, () => ({
          label: "Long realistic cold storage handling service description",
          netPence: 100,
          vatBasisPoints: 2000,
        })),
      }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics.some((d) => d.code === "VERTICAL_OVERFLOW" && d.message === "Atomic Row exceeds a fresh page"),
  );
  for (const [face, hash] of [
    ["Regular", "76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8"],
    ["Bold", "788abee4c806d660e8aee46689dd8540cd4bb98da03dcc9d171ce3efd99a9173"],
  ]) {
    const bytes = await readFile(new URL(`../fixtures/fonts/LiberationSans-${face}.ttf`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
    assert.ok(Buffer.from(result.bytes).includes(bytes), "Full unmodified embedded font program");
  }
});
test("freight real qpdf/fonts/Poppler bbox and raster, stable variants and realistic negative controls", async () => {
  const resources = await freightFonts();
  const directory = new URL("../../artifacts/freight-invoice/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [index, description] of ["Single mock freight passage", "W".repeat(40)].entries()) {
    const example = freightInvoiceExample(resources, description);
    assert.equal(example.result.pageCount, 1);
    const path = new URL(`test-${index}.pdf`, directory).pathname;
    await writeFile(path, example.bytes);
    execFileSync("qpdf", ["--check", path]);
    const fonts = execFileSync("pdffonts", [path], { encoding: "utf8" });
    assert.equal((fonts.match(/CID TrueType\s+Identity-H\s+yes\s+no\s+yes/gu) ?? []).length, 2);
    assert.match(fonts, /LiberationSans-Bold/u);
    const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    assertFreightText(text);
    if (index === 0) assert.ok(text.includes(description));
    else assert.equal((text.match(/W{2,}/gu) ?? []).join("").length, 40);
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    const summary = example.result.placements.at(-1)!;
    assert.equal(summary.box.y + summary.box.height, 841.8897637795277 - 12);
    freightGeometry(bbox, summary.box.y);
    const moved = bbox.replace(/y(Min|Max)="(\d+\.\d+)"/gu, (match, edge: string, value: string) =>
      Number(value) >= summary.box.y && Number(value) <= 830 ? `y${edge}="${Number(value) - 100}"` : match,
    );
    assert.throws(() => freightGeometry(moved), assert.AssertionError);
    const prefix = new URL(`raster-${index}`, directory).pathname;
    execFileSync("pdftoppm", ["-r", "72", path, prefix]);
    const ppm = await readFile(`${prefix}-1.ppm`);
    freightRaster(ppm);
    for (const region of [
      [440, 367, 580, 369],
      [247, 721, 577, 724],
      [240, 617, 583, 621],
      [12, 764, 583, 768],
    ] as const)
      assert.throws(
        () => freightRaster(eraseRegion(ppm, region[0], region[1], region[2], region[3])),
        assert.AssertionError,
      );
  }
});
test("freight extended real charges naturally advance one intact summary, final headers and literal totals", async () => {
  const example = freightInvoiceExample(await freightFonts(), undefined, extendedFreightInvoice);
  assert.equal(example.result.pageCount, 2);
  const [billing, shipment, summary] = example.result.placements;
  assert.ok(billing && shipment && summary);
  assert.deepEqual(
    example.result.placements.map((p) => p.pageIndex),
    [0, 0, 1],
  );
  assert.equal(summary.box.y + summary.box.height, 841.8897637795277 - 12);
  assert.ok(shipment.box.height < 841.8897637795277 - 24 - 112);
  assert.ok(shipment.box.y + shipment.box.height + summary.box.height > 841.8897637795277 - 12);
  const directory = new URL("../../artifacts/freight-invoice/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("extended.pdf", directory).pathname;
  await writeFile(path, example.bytes);
  execFileSync("qpdf", ["--check", path]);
  const pages = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" })
    .split("\f")
    .filter((p) => p.trim());
  assert.equal(pages.length, 2);
  for (const [index, page] of pages.entries()) {
    assert.ok(page.includes(`Page ${index + 1} of 2`));
    assert.equal((page.match(/Invoice Total/gu) ?? []).length, index);
    assert.equal((page.match(/Payment contact \(mock\)/gu) ?? []).length, index);
    for (const charge of extendedFreightInvoice.charges)
      assert.equal(page.split(charge.label).length - 1, 1, charge.label);
  }
  for (const literal of ["£379.00", "£67.33", "£446.33", "-£12.50"]) assert.ok(pages[1]!.includes(literal));
  assert.ok(pages[0]!.includes("ORDER NET £379.00"));
  const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
  freightMultipageGeometry(bbox, summary.box.y);
  assert.throws(
    () => freightMultipageGeometry(bbox.replaceAll(">NET<", ">BAD<"), summary.box.y),
    assert.AssertionError,
  );
});
function assertFreightText(text: string) {
  for (const value of [
    "MOCK - NOT FOR PAYMENT",
    "Page 1 of 1",
    "£16.35",
    "£218.40",
    "£32.75",
    "£267.50",
    "£50.23",
    "£317.73",
  ])
    assert.ok(text.includes(value), value);
  assert.equal((text.match(/Invoice Total/gu) ?? []).length, 1);
}
test("freight summary measures variable labels and counts rather than reserving a financial footer", async () => {
  const resources = await freightFonts();
  const examples = [
    mockFreightInvoice,
    { ...mockFreightInvoice, charges: mockFreightInvoice.charges.slice(0, 1) },
    {
      ...mockFreightInvoice,
      charges: mockFreightInvoice.charges.map((c) => ({
        ...c,
        label: `${c.label} for refrigerated exhibition cargo handling and secured onward dispatch`,
      })),
    },
  ].map((data) => freightInvoiceExample(resources, undefined, data));
  const heights = examples.map((e) => {
    const summary = e.result.placements.at(-1)!;
    assert.equal(e.result.pageCount, 1);
    assert.equal(summary.box.y + summary.box.height, 841.8897637795277 - 12);
    assert.equal(summary.pageIndex, 0);
    return summary.box.height;
  });
  assert.ok(heights[1]! < heights[0]!);
  assert.ok(heights[2]! > heights[0]!);
});
