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
const baseline = JSON.parse(readFileSync("docs/evidence/architecture-mixed-baseline.json", "utf8")) as Baseline;
const previous = new Map(baseline.files.map((entry) => [entry.path, entry]));
const staged = list("diff", "--cached", "--name-only"),
  tracked = list("diff", "--name-only"),
  untracked = list("ls-files", "--others", "--exclude-standard");
const paths = [...new Set([...list("ls-files"), ...untracked])]
  .filter((path) => path !== "docs/evidence/architecture-mixed-delta.json")
  .sort();
const files = paths.map((path) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});
const changed = files.filter((entry) => previous.has(entry.path) && previous.get(entry.path)?.sha256 !== entry.sha256);
const added = files.filter((entry) => !previous.has(entry.path));
const protectedPaths = baseline.files.filter(
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
for (const entry of protectedPaths)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, `Protected baseline changed: ${entry.path}`);
const architecture = "docs/architecture/composable-layout.md";
const source = readFileSync(architecture, "utf8");
const historical =
  "# Composable layout: approved blueprint and bounded foundation\n\n" +
  source.slice(source.indexOf("## Current D delivery — 2026-10-03"));
assert.equal(hash(Buffer.from(historical)), previous.get(architecture)?.sha256, "Historical architecture body changed");
const native = previous.get("docs/native-api.md");
assert.ok(native);
assert.equal(
  hash(readFileSync(native.path).subarray(0, native.bytes)),
  native.sha256,
  "Historical native API body changed",
);
assert.equal(git("rev-parse", "HEAD"), baseline.head);
assert.equal(staged.length, 0);
const summary = {
  cwd: process.cwd(),
  branch: git("branch", "--show-current"),
  base: baseline.head,
  head: git("rev-parse", "HEAD"),
  committed: list("diff", `${baseline.head}..HEAD`, "--name-only"),
  staged,
  tracked,
  untracked,
  initialTracked: baseline.tracked.length,
  initialUntrackedExcludingRecorder: baseline.untracked.filter((path) => path !== "scripts/record-slice-e.ts").length,
  changed,
  added,
  protectedUnchanged: protectedPaths.length,
  files,
};
writeFileSync("docs/evidence/architecture-mixed-delta.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log({
  tracked: tracked.length,
  untracked: untracked.length,
  eChanged: changed.length,
  eAdded: added.length,
  protectedUnchanged: protectedPaths.length,
  committed: summary.committed.length,
  staged: staged.length,
});
