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
const baseline = JSON.parse(readFileSync("docs/evidence/architecture-tables-audit-baseline.json", "utf8")) as Baseline;
const previous = new Map(baseline.files.map((entry) => [entry.path, entry]));
const protectedPaths = baseline.files.filter(
  ({ path }) =>
    /^(docs\/|packages\/legacy\/|packages\/example-cmr\/|tests\/fixtures\/fonts\/|packages\/core\/|packages\/layout\/src\/tables\/)/u.test(
      path,
    ) ||
    [".github/workflows/pages.yml", "packages/layout/src/axis.ts", "packages/layout/src/binary64.ts"].includes(path),
);
for (const entry of protectedPaths)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, `Protected audit baseline changed: ${entry.path}`);
const preF = JSON.parse(readFileSync("docs/evidence/architecture-tables-baseline.json", "utf8")) as Baseline;
const protectedF = preF.files.filter(
  ({ path }) =>
    /^(docs\/|packages\/legacy\/|packages\/example-cmr\/|tests\/fixtures\/fonts\/)/u.test(path) ||
    [
      ".github/workflows/pages.yml",
      "packages/layout/src/axis.ts",
      "packages/layout/src/binary64.ts",
      "packages/core/src/measurement/arithmetic.ts",
    ].includes(path),
);
assert.equal(protectedF.length, 158);
for (const entry of protectedF)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, `Protected F baseline changed: ${entry.path}`);
const protectedE = JSON.parse(readFileSync("docs/evidence/architecture-mixed-baseline.json", "utf8")) as Baseline;
const inherited = protectedE.files.filter(
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
assert.equal(inherited.length, 133);
for (const entry of inherited)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, `Inherited protection changed: ${entry.path}`);
const paths = [...new Set([...list("ls-files"), ...list("ls-files", "--others", "--exclude-standard")])]
  .filter((path) => path !== "docs/evidence/architecture-tables-audit-delta.json")
  .sort();
const files = paths.map((path) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});
const current = new Set(paths);
for (const entry of baseline.files) assert.ok(current.has(entry.path), `Audit baseline file removed: ${entry.path}`);
assert.equal(git("rev-parse", "HEAD"), baseline.head);
assert.equal(list("diff", "--cached", "--name-only").length, 0);
const cmr = readFileSync("artifacts/cmr.pdf");
const summary = {
  cwd: process.cwd(),
  branch: git("branch", "--show-current"),
  base: baseline.head,
  head: git("rev-parse", "HEAD"),
  status: "F-AUD01–03 implemented, ready for independent re-audit; not verified; no G",
  initialTracked: baseline.tracked.length,
  initialUntrackedExcludingRecorder: baseline.untracked.filter((path) => path !== "scripts/record-slice-f-audit.ts")
    .length,
  committed: list("diff", `${baseline.head}..HEAD`, "--name-only"),
  staged: list("diff", "--cached", "--name-only"),
  tracked: list("diff", "--name-only"),
  untracked: list("ls-files", "--others", "--exclude-standard"),
  changed: files.filter((entry) => previous.has(entry.path) && previous.get(entry.path)?.sha256 !== entry.sha256),
  added: files.filter((entry) => !previous.has(entry.path)),
  protectedAudit: protectedPaths.length,
  protectedF: protectedF.length,
  protectedInherited: inherited.length,
  cmr: { bytes: cmr.length, sha256: hash(cmr) },
  files,
};
writeFileSync("docs/evidence/architecture-tables-audit-delta.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log({
  tracked: summary.tracked.length,
  untracked: summary.untracked.length,
  changed: summary.changed.length,
  added: summary.added.length,
  protectedAudit: summary.protectedAudit,
  protectedF: summary.protectedF,
  protectedInherited: summary.protectedInherited,
  cmr: summary.cmr,
  committed: summary.committed.length,
  staged: summary.staged.length,
});
