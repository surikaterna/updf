import assert from "node:assert/strict";
import { test } from "node:test";
import { load, verifyRoot } from "./bundle.mjs";

const root = verifyRoot();
const { capture } = await load("bridge.mjs", root);
const { render } = await load("terminal.ts", root);

test("real compiler/host snapshots retain source order and initial state across widths", () => {
  for (const state of ["hidden", "shown"]) {
    let host;
    capture(state, (snapshot, installed) => {
      host = installed;
      const before = JSON.stringify(snapshot.data);
      const revision = installed.currentRevision();
      assert.deepEqual(
        snapshot.controls.map((c) => c.nodeId),
        ["fullname", "company"],
      );
      assert.deepEqual(
        snapshot.controls.map((c) => c.value),
        ["Ada Lovelace", "Analytical Engines"],
      );
      assert.equal(
        snapshot.outputs[0].value,
        "A static form proof with deterministic wrapping and shared width allocation.",
      );
      assert.equal(snapshot.tree.children[3].children.length, state === "shown" ? 1 : 0);
      assert.equal(snapshot.outputs.length, state === "shown" ? 2 : 1);
      const narrow = render(snapshot, 32);
      const wide = render(snapshot, 80);
      assert.deepEqual(narrow.order, wide.order);
      assert.deepEqual(narrow.order, [
        "fullname",
        "company",
        "description",
        ...(state === "shown" ? ["extra-message"] : []),
      ]);
      assert.equal(narrow.body.includes("Extra details are visible."), state === "shown");
      assert.equal(narrow.body, expected(state, 32));
      assert.equal(wide.body, expected(state, 80));
      assert.equal(JSON.stringify(installed.snapshot().data), before);
      assert.equal(installed.currentRevision(), revision);
    });
    assert.equal(host.currentRevision(), undefined);
  }
});

function expected(state, width) {
  const prefix = width === 32 ? 11 : 25;
  const description =
    width === 32
      ? ["A static form proof with", "deterministic wrapping and", "shared width allocation."]
      : ["A static form proof with deterministic wrapping and shared width allocation."];
  return [
    `${"Full name".padEnd(prefix)}Ada Lovelace`,
    `${"Company".padEnd(prefix)}Analytical Engines`,
    ...description,
    ...(state === "shown" ? ["Extra details are visible."] : []),
    `+${"-".repeat(width - 2)}+`,
    `|${"STATIC / cell units".padEnd(width - 2)}|`,
    `+${"-".repeat(width - 2)}+`,
  ]
    .map((line) => line.padEnd(width))
    .join("\n");
}

test("host disposal also occurs when the consumer throws", () => {
  let host;
  assert.throws(
    () =>
      capture("hidden", (_snapshot, installed) => {
        host = installed;
        throw new Error("consumer failure");
      }),
    /consumer failure/,
  );
  assert.equal(host.currentRevision(), undefined);
  assert.throws(() => capture("invalid"), /Unknown proof state/);
});

test("both live states retain the characterized exact field projection at all 137 CLI widths", () => {
  const roundedUp = [26, 29, 32, 35, 38, 41, 44, 47, 51, 54, 57, 60, 63, 66, 69, 72];
  for (const state of ["hidden", "shown"]) {
    capture(state, (snapshot) => {
      for (let width = 24; width <= 160; width++) {
        const output = render(snapshot, width);
        const label = width <= 73 ? Math.max(8, Math.floor((width - 1) / 3)) : 24;
        const end = width <= 73 ? width - (roundedUp.includes(width) ? 1 : 0) : Math.min(width, 125);
        assert.equal(output.boxes[0].width, label);
        assert.equal(output.boxes[1].x, label + 1);
        assert.equal(output.boxes[1].width, end - label - 1);
        assert.equal(output.boxes.at(-1).width, width);
        assert.ok(output.body.split("\n").every((line) => line.length === width));
      }
    });
  }
});

test("invalid FSX fails closed through actual public compilation", async () => {
  const { compileFsx } = await load("compiler-test.mjs", root);
  assert.equal(compileFsx().ok, false);
});
verifyRoot();
