import assert from "node:assert/strict";

type LockRecord = Record<string, unknown>;
type Lock = { packages: Record<string, LockRecord> };
const oldName = "@updf/layout-kernel";
const newName = "@updf/layout-boxes";
const oldDirectory = "packages/layout-kernel";
const newDirectory = "packages/layout-boxes";
const additions = ["node_modules/@updf/jpeg", "packages/jpeg"];

function renameDependencies(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !(oldName in value)) return value;
  assert.ok(!(newName in value), "Ambiguous layout dependency identity");
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key === oldName ? newName : key, entry]));
}

function renamedRecord(path: string, record: LockRecord): LockRecord {
  const result = { ...record };
  if (path === oldDirectory) {
    assert.equal(record.name, oldName, "Historical layout package identity mismatch");
    result.name = newName;
  }
  if (path === `node_modules/${oldName}`) {
    assert.equal(record.resolved, oldDirectory, "Historical layout workspace target mismatch");
    assert.equal(record.link, true, "Historical layout workspace must be a link");
    result.resolved = newDirectory;
  }
  if ("dependencies" in record) result.dependencies = renameDependencies(record.dependencies);
  return result;
}

export function assertJpegLockProvenance(before: Lock, after: Lock): void {
  const renamed = newDirectory in after.packages;
  assert.ok(oldDirectory in before.packages, "Missing historical layout package");
  assert.notEqual(oldDirectory in after.packages, renamed, "Expected exactly one layout package identity");
  const expected: Record<string, LockRecord> = {};
  for (const [path, record] of Object.entries(before.packages)) {
    const target = renamed && path === oldDirectory ? newDirectory : path;
    const key = renamed && path === `node_modules/${oldName}` ? `node_modules/${newName}` : target;
    assert.ok(!(key in expected), `Ambiguous lock path: ${key}`);
    expected[key] = renamed ? renamedRecord(path, record) : record;
    assert.deepEqual(after.packages[key], expected[key], key);
  }
  assert.deepEqual(
    Object.keys(after.packages)
      .filter((path) => !(path in expected))
      .sort(),
    additions,
  );
}
