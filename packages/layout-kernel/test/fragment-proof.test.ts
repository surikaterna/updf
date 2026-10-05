import assert from "node:assert/strict";
import { test } from "node:test";
import { proofFragments } from "../../../scripts/tui-layout-proof/fragment-provider.js";
import { fragmentProof } from "../../../scripts/tui-layout-proof/fragment-regions.js";

test("headless ASCII proof covers exact whitespace/LF offsets in one and two explicit regions", () => {
  for (const two of [false, true]) {
    const proof = fragmentProof(two);
    const pieces = proof.placements
      .filter((placement) => placement.sourceId === "text")
      .flatMap((placement) => placement.units);
    assert.equal(pieces[0]!.start, 0);
    for (let index = 1; index < pieces.length; index++) assert.equal(pieces[index]!.start, pieces[index - 1]!.end);
    assert.equal(pieces.at(-1)!.end, proof.text.length);
    assert.equal(proof.placements[0]!.top, 0);
    assert.equal(proof.placements[1]!.top, 2);
    if (two) assert.equal(proof.placements[2]!.width, 5);
    assert.ok(proof.counts.providerUnits >= proof.text.length);
    assert.ok(proof.counts.unitsExamined >= pieces.length + 1);
  }
});
test("ASCII provider rejects unsupported glyphs without claiming universal rich-text reflow", () => {
  const op = proofFragments();
  const source = op.prepare({
    id: "bad",
    path: "/bad",
    descriptor: { kind: "ascii", text: "é" },
    extent: 1,
    mode: "splittable",
    width: { mode: "reflow" },
  });
  assert.throws(() => op.select(source, { offset: 0, width: 5, height: 10, usedHeight: 0 }), /Only printable ASCII/);
});
