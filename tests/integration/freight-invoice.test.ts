import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import { calculateFreight, freightMoney } from "../../examples/business/freight-invoice-calculations.js";
import { mockFreightInvoice } from "../../examples/business/freight-invoice-data.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { freightGeometry, freightRaster } from "./freight-pdf-checks.js";
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
test("freight licensed pinned faces, frozen input, constant heading and one-page overflow failure", async () => {
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
    freightGeometry(bbox);
    const moved = bbox.replace(/y(Min|Max)="(\d+\.\d+)"/gu, (match, edge: string, value: string) =>
      Number(value) >= 592 && Number(value) <= 735 ? `y${edge}="${Number(value) - 100}"` : match,
    );
    assert.throws(() => freightGeometry(moved), assert.AssertionError);
    const prefix = new URL(`raster-${index}`, directory).pathname;
    execFileSync("pdftoppm", ["-r", "72", path, prefix]);
    const ppm = await readFile(`${prefix}-1.ppm`);
    freightRaster(ppm);
    for (const region of [
      [440, 367, 580, 369],
      [247, 695, 577, 698],
      [240, 591, 583, 595],
      [12, 738, 583, 742],
    ] as const)
      assert.throws(
        () => freightRaster(eraseRegion(ppm, region[0], region[1], region[2], region[3])),
        assert.AssertionError,
      );
  }
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
