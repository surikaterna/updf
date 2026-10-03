import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

interface Entry {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}
interface Baseline {
  readonly files: readonly Entry[];
  readonly tracked: readonly string[];
  readonly untracked: readonly string[];
  readonly head: string;
}
const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8" }).trim();
const list = (...args: string[]): string[] =>
  git(...args)
    .split("\n")
    .filter(Boolean);
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const baseline = JSON.parse(readFileSync("docs/evidence/architecture-tables-baseline.json", "utf8")) as Baseline;
const previous = new Map(baseline.files.map((entry) => [entry.path, entry]));
const paths = [...new Set([...list("ls-files"), ...list("ls-files", "--others", "--exclude-standard")])]
  .filter((path) => path !== "docs/evidence/architecture-tables-delta.json")
  .sort();
const files = paths.map((path) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});
const protectedPaths = baseline.files.filter(
  ({ path }) =>
    /^(docs\/|packages\/legacy\/|packages\/example-cmr\/|tests\/fixtures\/fonts\/)/u.test(path) ||
    [
      ".github/workflows/pages.yml",
      "packages/layout/src/axis.ts",
      "packages/layout/src/binary64.ts",
      "packages/core/src/measurement/arithmetic.ts",
    ].includes(path),
);
for (const entry of protectedPaths)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, `Protected baseline changed: ${entry.path}`);
const inheritedBaseline = JSON.parse(
  readFileSync("docs/evidence/architecture-mixed-baseline.json", "utf8"),
) as Baseline;
const inheritedProtection = inheritedBaseline.files.filter(
  ({ path }) =>
    /^(docs\/evidence\/|packages\/legacy\/|packages\/example-cmr\/|tests\/fixtures\/fonts\/)/u.test(path) ||
    [
      ".github/workflows/pages.yml",
      "docs/roadmap/current.md",
      "packages/layout/src/axis.ts",
      "packages/layout/src/binary64.ts",
      "packages/core/src/measurement/arithmetic.ts",
    ].includes(path),
);
assert.equal(inheritedProtection.length, 133);
for (const entry of inheritedProtection)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, `Inherited protection changed: ${entry.path}`);
assert.equal(git("rev-parse", "HEAD"), baseline.head);
assert.equal(list("diff", "--cached", "--name-only").length, 0);
const current = new Set(files.map((entry) => entry.path));
const removed = baseline.files.filter((entry) => !current.has(entry.path));
assert.deepEqual(
  removed.map((entry) => entry.path),
  ["apps/showcase/src/tables.ts"],
);
assert.ok(current.has("apps/showcase/src/tables.tsx"), "Actual JSX showcase migration missing");
const summary = {
  cwd: process.cwd(),
  branch: git("branch", "--show-current"),
  base: baseline.head,
  head: git("rev-parse", "HEAD"),
  status: "F implemented for independent audit; not verified; G remains next",
  committed: list("diff", `${baseline.head}..HEAD`, "--name-only"),
  staged: list("diff", "--cached", "--name-only"),
  tracked: list("diff", "--name-only"),
  untracked: list("ls-files", "--others", "--exclude-standard"),
  initialTracked: baseline.tracked.length,
  initialUntrackedExcludingRecorder: baseline.untracked.filter((path) => path !== "scripts/record-slice-f.ts").length,
  changed: files.filter((entry) => previous.has(entry.path) && previous.get(entry.path)?.sha256 !== entry.sha256),
  added: files.filter((entry) => !previous.has(entry.path)),
  removed,
  protectedUnchanged: protectedPaths.length,
  inheritedProtectedUnchanged: inheritedProtection.length,
  files,
};
writeFileSync("docs/evidence/architecture-tables-delta.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log({
  tracked: summary.tracked.length,
  untracked: summary.untracked.length,
  fChanged: summary.changed.length,
  fAdded: summary.added.length,
  protectedUnchanged: protectedPaths.length,
  committed: summary.committed.length,
  staged: summary.staged.length,
});
