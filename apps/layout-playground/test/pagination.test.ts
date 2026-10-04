import assert from "node:assert/strict";
import { test } from "node:test";
import { paginate } from "../src/pagination.js";
import { prepareParagraph } from "../src/pdf.js";
import { type Unit, unit } from "../src/snapshot.js";
import { controls, mixedUnits } from "./fixtures.js";

function placed(units: readonly Unit[], height = 90, cap = 8) {
  return paginate(units, controls.width, height, cap, null, true);
}

test("adjacent line runs preserve input coverage, page order and run-local offsets", async () => {
  const mixed = await mixedUnits();
  const row = mixed[1]!;
  const second = Object.freeze({ ...row, id: "second-row", path: "/second-row" });
  for (const input of [
    mixed,
    [row, ...mixed.filter((item) => item.line)],
    [row, second, ...mixed.filter((item) => item.line)],
    [],
  ]) {
    const snapshot = placed(input);
    assert.equal(snapshot.status, "done");
    const accepted = snapshot.regions.flatMap((region) => region.placements);
    assert.deepEqual(
      accepted.map((placement) => placement.unit),
      input,
    );
    assert.ok(accepted.every((placement) => placement.end === placement.start + 1));
  }
});

test("run-local offsets do not replace original paths or UTF16 line metadata, including blank lines", async () => {
  const mixed = await mixedUnits();
  const accepted = placed(mixed).regions.flatMap((region) => region.placements);
  assert.deepEqual(
    accepted.map(({ start, end }) => [start, end]),
    [
      [0, 1],
      [0, 1],
      [0, 1],
      [1, 2],
    ],
  );
  assert.deepEqual(
    accepted.map(({ unit }) => unit.path),
    mixed.map((item) => item.path),
  );
  assert.deepEqual(
    accepted.map(({ unit }) => unit.line),
    mixed.map((item) => item.line),
  );
  const blank = prepareParagraph("\n", controls.width).lines.map((line, index) =>
    unit(`blank-${index}`, { line, height: line.height }),
  );
  assert.deepEqual(
    placed(blank).regions.flatMap((region) => region.placements.map(({ unit }) => unit)),
    blank,
  );
});

test("caps retain exactly the input prefix; blocked metadata identifies the next oversized unit", async () => {
  const input = await mixedUnits();
  const capped = placed(input, 18, 1);
  assert.equal(capped.status, "cap");
  assert.deepEqual(
    capped.regions.flatMap((region) => region.placements.map(({ unit }) => unit)),
    input.slice(0, 1),
  );
  for (const units of [
    input,
    [input[1]!, input[0]!],
    [input[0]!, Object.freeze({ ...input[2]!, id: "tall-line", path: "/tall-line", height: 100 }), input[3]!],
  ]) {
    const snapshot = placed(units, 18);
    const accepted = snapshot.regions.flatMap((region) => region.placements.map(({ unit }) => unit));
    const next = units[accepted.length]!;
    assert.equal(snapshot.status, "blocked");
    assert.deepEqual(accepted, units.slice(0, accepted.length));
    assert.deepEqual(snapshot.blocked, { id: next.id, height: next.height, width: controls.width, regionHeight: 18 });
  }
});

test("line group identities are stable and cannot collide with atomic IDs; duplicate unit IDs reject", async () => {
  const mixed = await mixedUnits();
  const row = mixed[1]!;
  const input = [
    mixed[0]!,
    unit("paragraph", { height: row.height }),
    mixed[2]!,
    unit("paragraph-2", { height: 1 }),
    mixed[3]!,
  ];
  assert.deepEqual(placed(input), placed(input));
  assert.equal(placed(input).status, "done");
  assert.throws(() => placed([row, row]), { code: "VALUE", path: row.path });
});
