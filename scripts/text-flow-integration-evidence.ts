import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = "artifacts/text-flow/sibling-integration-before";
const run = (...args: string[]) => execFileSync(args[0]!, args.slice(1), { encoding: "utf8" }).trim();
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const paths = run("git", "ls-files", "-co", "--exclude-standard", "-z").split("\0").filter(Boolean);
const hashes = Object.fromEntries(
  await Promise.all([...new Set(paths)].sort().map(async (path) => [path, await hash(path)])),
);
const historical: Record<string, string> = {};
async function inventory(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inventory(path);
    else historical[path] = await hash(path);
  }
}
for (const name of ["sibling-before", "sibling-vs-before", "sibling-vs-library", "sibling-prereq-fixed-vs-before"])
  await inventory(`artifacts/text-flow/${name}`);
const report = JSON.parse(await readFile(`${directory}/report.json`, "utf8"));
assert.equal(Object.keys(report.metrics).length, 222);
assert.ok(Object.values(report.comparison).every((row) => (row as { delta: number }).delta === 0));
const manifest = {
  cwd: process.cwd(),
  branch: run("git", "branch", "--show-current"),
  head: run("git", "rev-parse", "HEAD"),
  status: run("git", "status", "--porcelain=v1", "--untracked-files=all"),
  versions: { ...report.versions, tsx: run("npm", "exec", "--", "tsx", "--version") },
  hashes,
  historical,
  reportSha256: await hash(`${directory}/report.json`),
  flags: report.flags,
  inputs: report.inputs,
};
const target = resolve(directory, "manifest.json");
try {
  await readFile(target);
  throw new Error("Refusing to overwrite frozen manifest");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
console.log({ target, sources: Object.keys(hashes).length, historical: Object.keys(historical).length, metrics: 222 });
