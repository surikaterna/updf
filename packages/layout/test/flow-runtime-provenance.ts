import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const digest = (path: string) =>
  createHash("sha256")
    .update(readFileSync(new URL(path, `file://${root}`)))
    .digest("hex");

export function saveProvenance(evidence: unknown): void {
  const destination = process.env.FLOW_RUNTIME_BASELINE;
  if (!destination) return;
  const testDirectory = "packages/layout/test/";
  const tests = readdirSync(new URL(testDirectory, `file://${root}`))
    .filter((name) => name.startsWith("flow-runtime-") && name.endsWith(".ts"))
    .sort()
    .map((name) => `${testDirectory}${name}`);
  const protectedFiles = git("ls-files")
    .split("\n")
    .filter((path) => path.includes("/src/") || path.startsWith("src/"));
  const hashes = (paths: string[]) => Object.fromEntries(paths.map((path) => [path, digest(path)]));
  const manifest = {
    objective: "S2 test-only pre-extraction characterization",
    issue: "N/A",
    cwd: root,
    branch: git("branch", "--show-current"),
    head: git("rev-parse", "HEAD"),
    base: "c48b5a3032b31dbf45f5024934fd49071ab6a30b",
    dirty: git("status", "--porcelain=v1"),
    trackedDiff: git("diff", "HEAD", "--name-only"),
    testHashes: hashes(tests),
    protectedSourceHashes: hashes(protectedFiles),
    evidence,
  };
  writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
}
