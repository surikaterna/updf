import assert from "node:assert/strict";

function outcome(value: unknown): number {
  assert.ok(value && typeof value === "object" && "exit" in value && "error" in value && "signal" in value);
  assert.equal(value.error, null, "Harness must not fail to start");
  assert.equal(value.signal, null, "Harness must not time out or be killed");
  assert.equal(typeof value.exit, "number");
  return Number(value.exit);
}

function comparable(value: unknown) {
  assert.ok(value && typeof value === "object" && "raw" in value && "full" in value);
  assert.ok("fullResults" in value && "outputFiles" in value && "node" in value);
  return {
    rawExit: outcome(value.raw),
    fullExit: outcome(value.full),
    fullResults: value.fullResults,
    outputFiles: value.outputFiles,
    node: value.node,
  };
}

export function compareLegacy(before: unknown, after: unknown): void {
  assert.deepEqual(comparable(after), comparable(before), "Legacy baseline changed");
}
