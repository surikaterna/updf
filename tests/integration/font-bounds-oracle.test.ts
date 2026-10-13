import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { prepareFont } from "@updf/fontkite";
import type { FontBounds, FontMetadata } from "@updf/fonts";
import { fixture } from "../../packages/fontkite/test/helpers.js";
import { type BoundsOracle, checkOracle, loadOracle } from "../../scripts/font-corpus/bounds-oracle.js";
import { differences, passed, withOracle } from "../../scripts/font-corpus/compare.js";
import { corpus } from "../../scripts/font-corpus/manifest.js";

function oracleFor(metadata: FontMetadata): BoundsOracle {
  const bounds: FontBounds[] = Array.from({ length: metadata.glyphCount }, () => [0, 0, 0, 0]);
  for (const glyph of metadata.glyphs) bounds[glyph.glyphId] = glyph.bounds;
  return {
    id: corpus[0]!.id,
    sha256: corpus[0]!.font.sha256,
    unitsPerEm: metadata.unitsPerEm,
    glyphCount: metadata.glyphCount,
    bounds,
  };
}

test("oracle-backed acceptance checks every mapping and preserves bounds parity differences", async () => {
  const metadata = prepareFont(await fixture()).metadata,
    oracle = oracleFor(metadata);
  const reference = {
    ...metadata,
    glyphs: metadata.glyphs.map((glyph, i) => (i ? glyph : { ...glyph, bounds: [0, 0, 1, 1] as FontBounds })),
  };
  const differential = differences(metadata, reference);
  assert.equal(differential.status, "mismatch");
  assert.equal(passed(differential.status), false);
  const verified = withOracle(differential, metadata, oracle);
  assert.equal(verified.status, "verified-bounds-difference");
  assert.equal(verified.parity, "different");
  assert.equal(verified.boundsVerification?.checkedMappings, metadata.glyphs.length);
  assert.equal(verified.boundsVerification?.differenceCount, 0);
  assert.equal(passed(verified.status), true);
});

test("oracle disagreement fails even when Fontkit parity matches; no self-comparison fallback", async () => {
  const metadata = prepareFont(await fixture()).metadata,
    oracle = oracleFor(metadata);
  const bounds = [...oracle.bounds];
  bounds[metadata.glyphs[0]!.glyphId] = [0, 0, 1, 1];
  const result = withOracle(differences(metadata, metadata), metadata, { ...oracle, bounds });
  assert.equal(result.parity, "match");
  assert.equal(result.status, "oracle-mismatch");
  assert.ok(result.boundsVerification!.differenceCount > 0);
  assert.equal(passed(result.status), false);
});

test("verified bounds do not waive advances, mappings or descriptor differences", async () => {
  const metadata = prepareFont(await fixture()).metadata,
    oracle = oracleFor(metadata);
  const references = [
    { ...metadata, glyphs: metadata.glyphs.slice(1) },
    { ...metadata, glyphs: metadata.glyphs.map((glyph) => ({ ...glyph, advance: glyph.advance + 1 })) },
    { ...metadata, descriptor: { ...metadata.descriptor, capHeight: metadata.descriptor.capHeight + 1 } },
  ];
  for (const reference of references) {
    const result = withOracle(differences(metadata, reference), metadata, oracle);
    assert.equal(result.boundsVerification?.status, "verified");
    assert.equal(result.status, "mismatch");
    assert.equal(passed(result.status), false);
  }
});

test("oracle loader verifies manifest/source identity, schema and selected-face presence", async (t) => {
  const root = await mkdtemp("/tmp/opencode/font-bounds-oracle-test-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "oracle.json"),
    item = corpus[0]!;
  const font = oracleFor(prepareFont(await fixture()).metadata);
  const base = {
    version: 1,
    algorithm: "fonttools-fraction-quad-v1",
    coordinateModel: "materialized-binary64",
    fonttoolsVersion: "4.60.1",
    manifestSha256: createHash("sha256").update(JSON.stringify(corpus)).digest("hex"),
    fonts: [font],
  };
  await writeFile(path, JSON.stringify(base));
  const loaded = await loadOracle(path, item);
  assert.deepEqual(loaded.font, font);
  assert.match(loaded.sha256, /^[a-f0-9]{64}$/u);
  for (const changed of [
    { version: 2 },
    { algorithm: "fontkite-self-comparison" },
    { manifestSha256: "wrong" },
    { fonttoolsVersion: "latest" },
    { fonts: [] },
    { fonts: [font, font] },
    { fonts: [{ ...font, sha256: "wrong" }] },
  ]) {
    await writeFile(path, JSON.stringify({ ...base, ...changed }));
    await assert.rejects(loadOracle(path, item));
  }
  assert.throws(() => checkOracle({ ...font, bounds: [] }, item));
  await assert.rejects(loadOracle(join(root, "missing.json"), item));
});
