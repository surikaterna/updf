import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { invoiceExample } from "../../examples/business/invoice.js";
import { calculateInvoice, money } from "../../examples/business/invoice-calculations.js";
import { mockInvoice } from "../../examples/business/invoice-data.js";
import { eraseRegion } from "./manifest-pdf-checks.js";

test("#46-A audited invoice accepts deeply frozen application input without mutation", () => {
  const data = structuredClone(mockInvoice);
  const freeze = (value: object): void => {
    for (const child of Object.values(value)) if (child && typeof child === "object") freeze(child);
    Object.freeze(value);
  };
  freeze(data);
  const before = JSON.stringify(data);
  assert.deepEqual(invoiceExample(undefined, data).bytes, invoiceExample().bytes);
  assert.equal(JSON.stringify(data), before);
});

test("#46-A integer cents reconcile independently, round half-up and reject unsafe business inputs", () => {
  const totals = calculateInvoice(mockInvoice);
  assert.deepEqual(totals, {
    lines: [
      2590, 19450, 14250, 19960, 3500, 6850, 11250, 17990, 11450, 3435, 5560, 38000, 1295, 23340, 9500, 12475, 2625,
      54800, 7500, 8995, 13740, 2290, 3475, 28500, 10360, 15560, 4750, 14970, 1750, 34250, 5625, 71960, 9160, 1145,
      4170, 19000,
    ],
    subtotalCents: 515520,
    discountCents: 25776,
    taxableCents: 492194,
    vatCents: 98439,
    grandTotalCents: 590633,
  });
  const tiny = {
    ...mockInvoice,
    items: [{ code: "T", description: "Test", quantity: 1, unit: "each", unitCents: 5 }],
    shippingCents: 0,
    discountBasisPoints: 1000,
    vatBasisPoints: 5000,
  };
  assert.equal(calculateInvoice(tiny).discountCents, 1);
  assert.equal(calculateInvoice({ ...tiny, discountBasisPoints: 0 }).vatCents, 3);
  const tinyItem = tiny.items[0];
  assert.ok(tinyItem);
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER])
    assert.throws(() => calculateInvoice({ ...tiny, items: [{ ...tinyItem, quantity, unitCents: 100 }] }));
  for (const discountBasisPoints of [-1, 10001, NaN])
    assert.throws(() => calculateInvoice({ ...tiny, discountBasisPoints }));
  assert.throws(() => calculateInvoice({ ...tiny, shippingCents: Number.MAX_SAFE_INTEGER }));
  assert.throws(() => calculateInvoice({ ...tiny, items: [] }));
  assert.equal(money(5), "GBP 0.05");
});

test("#46-A actual PDF: qpdf, Poppler order/amounts, page-local geometry and raster grid/regions", async () => {
  const example = invoiceExample();
  assert.equal(example.result.pageCount, 3);
  assert.deepEqual(invoiceExample().bytes, example.bytes);
  const directory = new URL("../../artifacts/invoice/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("updf-invoice.pdf", directory).pathname;
  await writeFile(path, example.bytes);
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
  assertText(text);
  assertGeometry(execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" }));
  execFileSync("pdftoppm", ["-r", "72", path, new URL("page", directory).pathname]);
  for (let number = 1; number <= 3; number++) {
    const ppm = await readFile(new URL(`page-${number}.ppm`, directory));
    assertRaster(ppm);
    const blank = Buffer.from(ppm);
    blank.fill(255, blank.indexOf(Buffer.from("255\n")) + 4);
    assert.throws(() => assertRaster(blank), assert.AssertionError);
    assert.throws(() => assertRaster(eraseRegion(ppm, 30, 30, 566, 54)), assert.AssertionError);
    assert.throws(() => assertRaster(eraseRegion(ppm, 30, 790, 566, 813)), assert.AssertionError);
    assert.throws(() => assertRaster(eraseRegion(ppm, 326, 54, 328, 790)), assert.AssertionError);
  }
});

function assertText(text: string) {
  const pages = text.split("\f").filter((page) => page.trim());
  assert.equal(pages.length, 3);
  assert.deepEqual(
    text.match(/\b[A-Z]{3}-\d{3}\b/g),
    mockInvoice.items.map((item) => item.code),
  );
  const expectedRanges = [
    [0, 12],
    [12, 29],
    [29, 36],
  ] as const;
  pages.forEach((page, index) => {
    assert.ok(page.includes(`Page ${index + 1}/3`));
    assert.match(page, /MOCK - NOT FOR PAYMENT/);
    assert.match(page, /Item\s+Description\s+Qty\s+Unit\s+Unit price\s+Line total/);
    const [start, end] = expectedRanges[index] ?? [0, 0];
    assert.deepEqual(
      page.match(/\b[A-Z]{3}-\d{3}\b/g),
      mockInvoice.items.slice(start, end).map((item) => item.code),
    );
  });
  for (const item of mockInvoice.items) {
    const line = text.split("\n").find((value) => value.includes(item.code));
    assert.ok(line?.includes(`${item.quantity}    ${item.unit}`));
    assert.ok(line?.includes(money(item.unitCents)));
    assert.ok(line?.trimEnd().endsWith(money(item.quantity * item.unitCents)));
  }
  assert.match(pages[0] ?? "", /ORIGINAL MOCK DATA/);
  assert.match(pages[2] ?? "", /Goods subtotal\s+GBP 5155\.20/);
  assert.match(pages[2] ?? "", /Discount 5%\s+-GBP 257\.76/);
  assert.match(pages[2] ?? "", /Shipping \(taxable\)\s+GBP 24\.50/);
  assert.match(pages[2] ?? "", /VAT base\s+GBP 4921\.94/);
  assert.match(pages[2] ?? "", /VAT 20%\s+GBP 984\.39/);
  assert.match(pages[2] ?? "", /GRAND TOTAL\s+GBP 5906\.33/);
  assert.ok(text.indexOf("Settlement summary") > text.indexOf("KIT-036"));
  assert.match(text, /Unsigned mock document/);
}
function assertGeometry(bbox: string) {
  const pages = bbox.match(/<page\b[^>]*>[\s\S]*?<\/page>/g) ?? [];
  assert.equal(pages.length, 3);
  for (const page of pages) {
    assert.match(page, /width="595\.275591" height="841\.889764"/);
    const words = [
      ...page.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]+)<\/word>/g),
    ];
    assert.ok(words.length > 100);
    for (const word of words) {
      assert.ok(Number(word[1]) >= 30 && Number(word[3]) <= 565.28, word[0]);
      assert.ok(Number(word[2]) >= 30 && Number(word[4]) <= 812, word[0]);
    }
    assert.ok(words.some((word) => word[5] === "MOCK" && Number(word[2]) < 54));
    assert.ok(words.some((word) => word[5] === "PAYMENT" && Number(word[2]) > 790));
  }
}
function assertRaster(ppm: Buffer) {
  const header = /^P6\s+(\d+) (\d+)\s+255\s/u.exec(ppm.subarray(0, 60).toString("ascii"));
  assert.ok(header);
  const width = Number(header[1]),
    height = Number(header[2]);
  assert.equal(width, 596);
  assert.equal(height, 842);
  const pixels = ppm.subarray(header[0].length);
  assert.equal(pixels.length, width * height * 3);
  const dark = (x: number, y: number) => (pixels[(y * width + x) * 3] ?? 255) < 220;
  const regionInk = (top: number, bottom: number) => {
    let count = 0;
    for (let y = top; y < bottom; y++) for (let x = 30; x < 566; x++) if (dark(x, y)) count++;
    return count;
  };
  assert.ok(regionInk(30, 54) > 200, "Repeated header ink");
  assert.ok(regionInk(790, 813) > 200, "Repeated footer ink");
  for (const x of [30, 92, 327, 362, 402, 480, 565]) {
    let grid = 0;
    for (let y = 54; y < 790; y++) if (dark(x, y) || dark(x - 1, y)) grid++;
    assert.ok(grid > 200, `Table grid column ${x}: ${grid}`);
  }
  assert.equal(regionInk(0, 25), 0, "Top clear margin");
  assert.equal(regionInk(818, height), 0, "Bottom clear margin");
}
