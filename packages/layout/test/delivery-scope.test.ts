import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import * as layout from "@updf/layout";
import { createFragmentOperation } from "@updf/layout-boxes/fragmentation";

test("unused host admission scaffolding is absent from source, emitted files and public layout exports", () => {
  for (const directory of ["../src/", "../dist/", "../dist/cjs/"]) {
    const files = readdirSync(new URL(directory, import.meta.url));
    assert.deepEqual(
      files.filter((name) => name.startsWith("flow-admission-")),
      [],
    );
  }
  assert.equal("createAdmissionSession" in layout, false);
});

test("the public kernel candidate API remains available independently of the removed host session", () => {
  const operation = createFragmentOperation({
    next: (_descriptor: unknown, { offset }) => ({ end: offset + 1, height: 1, content: "retained" }),
  });
  try {
    const source = operation.prepare({
      id: "candidate",
      path: "/candidate",
      descriptor: {},
      extent: 2,
      mode: "splittable",
      width: { mode: "fixed", value: 10 },
    });
    const first = operation.nextCandidate(operation.candidates(source, { offset: 0, width: 10 }));
    assert.ok(!first.done);
    assert.equal(operation.materializeCandidate(first.endpoint).units[0]!.content, "retained");
    const second = operation.nextCandidate(first.cursor);
    assert.ok(!second.done);
    assert.equal(operation.materializeCandidate(second.endpoint).units.length, 2);
    operation.close();
    assert.throws(() => operation.nextCandidate(second.cursor), /closed/);
  } finally {
    operation.close();
  }
});
