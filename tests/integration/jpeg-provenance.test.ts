import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assertJpegLockProvenance } from "../../scripts/consumer/jpeg-lock-provenance.js";
import { jpegSourceInventory } from "../../scripts/consumer/jpeg-source-provenance.js";

function lock(identity: string, jpeg = false) {
  const packages: Record<string, Record<string, unknown>> = {
    [`packages/${identity}`]: { name: `@updf/${identity}`, version: "2.0.0-poc.0", license: "MIT" },
    [`node_modules/@updf/${identity}`]: { resolved: `packages/${identity}`, link: true },
    "node_modules/registry": { version: "1.2.3", resolved: "https://example.org/a.tgz", integrity: "sha512-exact" },
  };
  for (const path of ["apps/layout-playground", "packages/core", "packages/layout", "packages/text"]) {
    packages[path] = { dependencies: { [`@updf/${identity}`]: "2.0.0-poc.0", unrelated: "1.0.0" } };
  }
  if (jpeg) {
    packages["node_modules/@updf/jpeg"] = { resolved: "packages/jpeg", link: true };
    packages["packages/jpeg"] = { name: "@updf/jpeg", version: "2.0.0-poc.0" };
  }
  return { packages };
}

for (const identity of ["layout-kernel", "layout-boxes"]) {
  test(`JPEG lock provenance permits only JPEG additions and ${identity} identity`, () => {
    const before = lock("layout-kernel");
    const snapshot = structuredClone(before);
    assertJpegLockProvenance(before, lock(identity, true));
    assert.deepEqual(before, snapshot);
  });
}

const changes = [
  ["packages/layout-boxes", "version", "wrong"],
  ["packages/layout-boxes", "integrity", "sha512-wrong"],
  ["packages/layout-boxes", "name", "@updf/wrong"],
  ["node_modules/@updf/layout-boxes", "resolved", "packages/wrong"],
  ["node_modules/@updf/layout-boxes", "link", false],
  ["node_modules/registry", "integrity", "sha512-wrong"],
  ["node_modules/registry", "version", "9.9.9"],
  ["node_modules/registry", "resolved", "https://example.org/wrong.tgz"],
  ["packages/core", "dependencies", { "@updf/layout-boxes": "wrong", unrelated: "1.0.0" }],
  ["packages/text", "dependencies", { "@updf/layout-boxes": "2.0.0-poc.0", unrelated: "wrong" }],
] as const;

for (const [path, field, value] of changes) {
  test(`JPEG lock provenance rejects drift: ${path} ${field}`, () => {
    const after = lock("layout-boxes", true);
    after.packages[path]![field] = value;
    assert.throws(() => assertJpegLockProvenance(lock("layout-kernel"), after));
  });
}

test("JPEG lock provenance rejects ambiguous identities and extra or missing records", () => {
  const before = lock("layout-kernel");
  const ambiguous = lock("layout-boxes", true);
  ambiguous.packages["packages/layout-kernel"] = before.packages["packages/layout-kernel"]!;
  assert.throws(() => assertJpegLockProvenance(before, ambiguous));
  const extra = lock("layout-boxes", true);
  extra.packages["node_modules/unrelated"] = { version: "1" };
  assert.throws(() => assertJpegLockProvenance(before, extra));
  const missing = lock("layout-boxes", true);
  delete missing.packages["node_modules/registry"];
  assert.throws(() => assertJpegLockProvenance(before, missing));
});

function git(root: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

test("JPEG inventory includes committed, staged, unstaged, untracked and deleted paths against its base", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "jpeg-provenance-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, "init", "-q");
  for (const path of ["committed", "staged", "unstaged", "deleted", "staged-deleted"]) {
    await writeFile(join(root, path), "before");
  }
  await writeFile(join(root, ".gitignore"), "ignored\n");
  git(root, "add", ".");
  const commit = () =>
    git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.org", "commit", "-qm", "fixture");
  commit();
  const base = git(root, "rev-parse", "HEAD");
  await writeFile(join(root, "committed"), "after");
  git(root, "add", "committed");
  commit();
  await writeFile(join(root, "staged"), "after");
  await rm(join(root, "staged-deleted"));
  git(root, "add", "staged", "staged-deleted");
  await writeFile(join(root, "unstaged"), "after");
  await writeFile(join(root, "untracked space"), "after");
  await writeFile(join(root, "ignored"), "after");
  await rm(join(root, "deleted"));
  const inventory = await jpegSourceInventory(root, base);
  assert.deepEqual(
    inventory.map((entry) => entry.path),
    ["committed", "deleted", "staged", "staged-deleted", "unstaged", "untracked space"],
  );
  assert.deepEqual(
    inventory.filter((entry) => entry.deleted),
    [
      { path: "deleted", deleted: true },
      { path: "staged-deleted", deleted: true },
    ],
  );
  const sha256 = createHash("sha256").update("after").digest("hex");
  assert.deepEqual(
    inventory.find((entry) => entry.path === "committed"),
    { path: "committed", bytes: 5, sha256 },
  );
  git(root, "add", ".");
  commit();
  assert.deepEqual(await jpegSourceInventory(root, base), inventory);
});
