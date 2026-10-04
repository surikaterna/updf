import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { manifestExample } from "../../examples/business/manifest.js";
import { expectedCartons, expectedGrams, expectedPackages, expectedPallets } from "./manifest-expected.js";
import {
  assertManifestGeometry,
  assertManifestRaster,
  assertManifestText,
  eraseHighlights,
  eraseRegion,
} from "./manifest-pdf-checks.js";

test("#46-B actual 11-page PDF: independent text/count/mass/order, orientation, qpdf, geometry and selective raster negatives", async () => {
  const example = manifestExample();
  assert.equal(example.result.pageCount, 11);
  const directory = new URL("../../artifacts/manifest/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("updf-manifest.pdf", directory).pathname;
  await writeFile(path, example.bytes);
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
  assertManifestText(text);
  assert.throws(() => assertManifestText(text.replace("CN-023", "CN-024")), assert.AssertionError);
  assert.throws(() => assertManifestText(text.replace("Page 7/11", "Page 6/11")), assert.AssertionError);
  assertLineValues(text);
  assert.throws(() => assertLineValues(text.replace("259.500 kg", "259.501 kg")), assert.AssertionError);
  const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
  assertManifestGeometry(bbox);
  assert.throws(() => assertManifestGeometry(bbox.replace(/xMin="[^"]+"/, 'xMin="10"')), assert.AssertionError);
  assert.throws(
    () => assertManifestGeometry(bbox.replace('width="841.889764"', 'width="595.275591"')),
    assert.AssertionError,
  );
  execFileSync("pdftoppm", ["-r", "72", path, new URL("page", directory).pathname]);
  for (let number = 1; number <= 11; number++) {
    const ppm = await readFile(new URL(`page-${String(number).padStart(2, "0")}.ppm`, directory));
    const portrait = number === 1 || number === 11,
      width = portrait ? 596 : 842,
      height = portrait ? 842 : 596;
    assertManifestRaster(ppm, portrait);
    assert.throws(
      () => assertManifestRaster(eraseRegion(ppm, 30, 30, width - 30, 54), portrait),
      assert.AssertionError,
    );
    assert.throws(
      () => assertManifestRaster(eraseRegion(ppm, 30, height - 50, width - 30, height - 29), portrait),
      assert.AssertionError,
    );
    if (!portrait)
      assert.throws(() => assertManifestRaster(eraseRegion(ppm, 232, 54, 234, 540), false), assert.AssertionError);
    if (!portrait) assert.throws(() => assertManifestRaster(eraseHighlights(ppm), false), assert.AssertionError);
  }
});

function assertLineValues(text: string) {
  const lines = text.split("\n").filter((line) => /CN-\d{3}/.test(line));
  assert.equal(lines.length, 48);
  lines.forEach((line, index) => {
    const item = index % 16,
      grams = expectedGrams[Math.floor(index / 16)]?.[item];
    assert.ok(grams !== undefined);
    assert.ok(line.includes(`${expectedCartons[item]}/${expectedPallets[item]}/${expectedPackages[item]}`), line);
    assert.ok(line.includes(`${(grams / 1000).toFixed(3)} kg`), line);
    assert.ok(line.includes(["08:00-09:30", "09:30-11:00", "11:00-12:30", "13:00-14:30"][item % 4] ?? ""), line);
    assert.ok(line.trimEnd().endsWith(["Staged", "Checked", "Hold: wrap", "Ready"][item % 4] ?? ""), line);
  });
}
