import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { tableProof } from "../../apps/browser-fonts/table-proof.js";
import { fixtureFont } from "../fixtures/fonts/font-fixture.js";
import { legacyInventory as tableExample } from "../fixtures/legacy-inventory.js";
import {
  assertInventoryBackgrounds,
  assertInventoryContent,
  assertInventoryGrid,
  type InventoryEdge,
  type InventoryRaster,
  inventoryEdges,
  inventoryRaster,
  withoutInventoryEdge,
  withoutInventoryGrid,
} from "../fixtures/table-raster.js";

test("table PDFs have repeated headers, ordered unique body rows and spatial grid/background raster", async (context) => {
  const { bytes, result } = tableExample("Inventory");
  const directory = new URL("../../artifacts/tables/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("tables.pdf", directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.equal(text.match(/Inventory item/gu)?.length, result.repeatedHeaderCount + 1);
  assert.deepEqual(
    text.match(/Item \d+/gu),
    Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`),
  );
  assert.match(text, /^Inventory[\s\S]*End of inventory/u);
  assert.equal(result.pageCount, 3);
  const prefix = new URL("tables", directory).pathname;
  execFileSync("pdftoppm", ["-r", "144", path, prefix]);
  const rasters: InventoryRaster[] = [];
  for (let i = 0; i < result.pageCount; i++) {
    const raster = inventoryRaster(await readFile(`${prefix}-${i + 1}.ppm`));
    assertInventoryContent(raster);
    assertInventoryGrid(raster, i);
    assertInventoryBackgrounds(raster, i);
    rasters.push(raster);
  }
  await context.test("spatial grid oracle rejects removed borders despite intact text/backgrounds", () => {
    rejectRemovedGrid(rasters);
  });
  await context.test("spatial grid oracle rejects missing and partial horizontal/vertical edges", () => {
    rejectRemovedEdges(rasters);
  });
});
function rejectRemovedGrid(rasters: readonly InventoryRaster[]): void {
  rasters.forEach((raster, pageIndex) => {
    const removed = withoutInventoryGrid(raster);
    assertInventoryContent(removed);
    assertInventoryBackgrounds(removed, pageIndex);
    assert.throws(() => assertInventoryGrid(removed, pageIndex), /Missing grid midpoint/u);
  });
}
function rejectRemovedEdges(rasters: readonly InventoryRaster[]): void {
  rasters.forEach((raster, pageIndex) => {
    for (const edge of inventoryEdges(pageIndex)) {
      rejectMissingEdge(raster, pageIndex, edge, false);
      rejectMissingEdge(raster, pageIndex, edge, true);
    }
  });
}
function rejectMissingEdge(raster: InventoryRaster, pageIndex: number, edge: InventoryEdge, partial: boolean): void {
  const expected = `Missing grid ${partial ? "coverage" : "midpoint"}: ${edge.name}`;
  assert.throws(
    () => assertInventoryGrid(withoutInventoryEdge(raster, edge, partial), pageIndex),
    (error: unknown) => error instanceof assert.AssertionError && error.message.startsWith(expected),
  );
}
test("prepared table font faces, repeated header text and body-cell extraction survive PDF serialization", async () => {
  const { bytes, result } = tableProof(await fixtureFont());
  const directory = new URL("../../artifacts/tables/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("fonts.pdf", directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.match(text, /^Привет[\s\S]*End/u);
  assert.deepEqual(
    text.match(/АБ \d/gu),
    Array.from({ length: 7 }, (_, i) => `АБ ${i}`),
  );
  assert.deepEqual(
    text.match(/Row\d/gu),
    Array.from({ length: 7 }, (_, i) => `Row${i}`),
  );
  assert.equal(text.match(/Header/gu)?.length, result.repeatedHeaderCount + 1);
  const fonts = execFileSync("pdffonts", [path], { encoding: "utf8" });
  assert.match(fonts, /Helvetica/u);
  assert.match(fonts, /LiberationSans[\s\S]*CID TrueType[\s\S]*yes/u);
  const prefix = new URL("fonts", directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", path, prefix]);
  let headerPages = 0;
  for (let i = 0; i < result.pageCount; i++) {
    if (checkFontRaster(await readFile(`${prefix}-${i + 1}.ppm`))) headerPages++;
  }
  assert.equal(headerPages, result.repeatedHeaderCount + 1);
});
function checkFontRaster(ppm: Buffer): boolean {
  assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+180 100\s+255\s/u);
  const rgb = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  let blue = 0,
    red = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i] ?? 255,
      g = rgb[i + 1] ?? 255,
      b = rgb[i + 2] ?? 255;
    if (Math.min(r, g, b) >= 150) continue;
    const x = (i / 3) % 180,
      y = Math.floor(i / 3 / 180);
    assert.ok(x >= 10 && x < 170 && y >= 10 && y < 90);
    if (r < 100 && g < 100 && b > 150) blue++;
    if (r > 150 && g < 100 && b < 100) red++;
  }
  assert.ok(blue > 10);
  return red > 10;
}
