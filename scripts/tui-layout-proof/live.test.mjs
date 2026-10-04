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

test("invalid FSX fails closed through actual public compilation", async () => {
  const { compileFsx } = await load("compiler-test.mjs", root);
  assert.equal(compileFsx().ok, false);
});
verifyRoot();
