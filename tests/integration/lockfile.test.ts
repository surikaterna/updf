import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface LockRecord {
  version?: string;
  resolved?: string;
  integrity?: string;
  optionalDependencies?: Record<string, string>;
}

const { packages } = JSON.parse(readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, LockRecord>;
};

test("registry lock records retain tarball resolution and integrity", () => {
  for (const [path, record] of Object.entries(packages)) {
    if (!path.includes("node_modules/") || !record.version) continue;
    assert.match(record.resolved ?? "", /^https?:\/\//u, path);
    assert.match(record.integrity ?? "", /^sha(?:1|256|384|512)-[A-Za-z0-9+/]+=*$/u, path);
  }
});

test("canvas lock retains every declared native platform at the parent pin", () => {
  const parent = packages["node_modules/@napi-rs/canvas"];
  assert.ok(parent?.optionalDependencies);
  for (const [name, version] of Object.entries(parent.optionalDependencies)) {
    const record = packages[`node_modules/${name}`];
    assert.ok(record, name);
    assert.equal(record.version, version, name);
    assert.equal(record.version, parent.version, name);
    assert.ok(record.resolved && record.integrity, name);
  }
});
