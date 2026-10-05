import assert from "node:assert/strict";
import { test } from "node:test";
import { compute } from "../src/compute.js";
import { exportProjection } from "../src/pdf.js";
import { project } from "../src/projection.js";
import { controls } from "./fixtures.js";

test("one bounded C operation accepts lines in order and row as one atomic unit", async () => {
  const snapshot = await compute(controls);
  assert.equal(snapshot.status, "done");
  assert.equal(snapshot.regions.length, 2);
  const placements = snapshot.regions.flatMap((region) => region.placements);
  const lines = placements.filter((placement) => placement.unit.line);
  assert.deepEqual(
    lines.map((placement) => placement.unit.lineIndex),
    lines.map((_, index) => index),
  );
  assert.equal(placements.at(-1)?.unit.id, "atomic-row");
  assert.equal(placements.filter((placement) => placement.unit.layout).length, 1);
  for (const region of snapshot.regions) {
    let end = 0;
    for (const placement of region.placements) {
      assert.equal(placement.y, end);
      end = placement.y + placement.unit.height;
      assert.ok(end <= region.height);
    }
  }
  assert.ok((snapshot.counts?.providerUnits ?? 0) >= lines.length + 1);
  const projection = project(snapshot);
  const before = JSON.stringify(projection);
  assert.ok(exportProjection(projection).length > 0);
  assert.equal(JSON.stringify(projection), before);
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.regions[0]?.placements));
  assert.ok(
    lines.every((placement) => Object.isFrozen(placement.unit.line) && Object.isFrozen(placement.unit.line?.fragments)),
  );
});

test("caps and blocked fresh regions retain visible prefix but prohibit PDF", async () => {
  for (const [height, pageCap, status] of [
    [108, 1, "cap"],
    [18, 20, "blocked"],
  ] as const) {
    const snapshot = await compute({ ...controls, height, pageCap });
    assert.equal(snapshot.status, status);
    assert.ok(snapshot.regions.length <= pageCap);
    assert.throws(() => exportProjection(project(snapshot)), { code: "INCOMPLETE", path: "/snapshot" });
    assert.ok(snapshot.regions.flatMap((region) => region.placements).length > 0);
    if (status === "blocked")
      assert.deepEqual(snapshot.blocked, { id: "atomic-row", height: 70, width: 260, regionHeight: 18 });
  }
});

test("B canvas full natural height and parent CONTENT-relative offsets", async () => {
  const canvas = project(await compute({ ...controls, paginate: false, height: 18 }));
  assert.equal(canvas.pages.length, 1);
  const row = canvas.pages[0]?.rectangles.find((rect) => rect.id === "atomic-row");
  const child = canvas.pages[0]?.rectangles.find((rect) => rect.id === "row-A");
  assert.equal(child?.x, (row?.x ?? 0) + controls.padding);
  assert.equal(child?.y, (row?.y ?? 0) + controls.padding);
  assert.ok((canvas.pages[0]?.height ?? 0) > 18 + 40);
  await assert.rejects(compute({ ...controls, width: 260.5 }), /integer/);
  await assert.rejects(compute({ ...controls, pageCap: 21 }), /integer/);
});
