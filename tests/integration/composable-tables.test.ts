import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { composableInventory } from "../fixtures/composable-inventory.js";
import { legacyInventory } from "../fixtures/legacy-inventory.js";
import {
  assertInventoryBackgrounds,
  assertInventoryContent,
  assertInventoryGrid,
  inventoryRaster,
  withoutInventoryGrid,
} from "../fixtures/table-raster.js";

test("F converted public-adapter pipeline preserves the historical 63-edge raster oracle without changing CMR/reference thresholds", async () => {
  const directory = new URL("../../artifacts/composable-tables/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const fresh = composableInventory("Inventory"),
    legacy = legacyInventory("Inventory");
  const weighted = composableInventory("Inventory", [
    { width: { weight: 140, min: 100 } },
    { width: { weight: 68, max: 68 }, style: { textAlign: "right" } },
  ]);
  assert.deepEqual(weighted.bytes, fresh.bytes);
  assert.deepEqual(weighted.result.placements, fresh.result.placements);
  assert.equal(fresh.result.pageCount, 3);
  const tablePlacements = fresh.result.placements.filter((placement) => placement.sourceIndex === 1);
  assert.deepEqual(
    tablePlacements.flatMap((placement) => placement.sourceKeys ?? []),
    Array.from({ length: 12 }, (_, i) => `item-${i + 1}`),
  );
  await writeFile(new URL("converted.pdf", directory), fresh.bytes);
  await writeFile(new URL("legacy.pdf", directory), legacy.bytes);
  const path = new URL("converted.pdf", directory).pathname;
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.deepEqual(
    text.match(/Item \d+/gu),
    Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`),
  );
  assert.equal(text.match(/Inventory item/gu)?.length, 3);
  const prefix = new URL("converted", directory).pathname;
  execFileSync("pdftoppm", ["-r", "144", path, prefix]);
  for (let page = 0; page < 3; page++) {
    const raster = inventoryRaster(await readFile(`${prefix}-${page + 1}.ppm`));
    assertInventoryContent(raster);
    assertInventoryBackgrounds(raster, page);
    assertInventoryGrid(raster, page);
    assert.throws(() => assertInventoryGrid(withoutInventoryGrid(raster), page), /Missing grid midpoint/u);
  }
});
