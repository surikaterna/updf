import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";

const root = "artifacts/text-flow";
const target = `${root}/sibling-state-fixed-vs-before`;
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const paths = [...new Set(git("ls-files", "-co", "--exclude-standard", "-z").split("\0").filter(Boolean))].sort();
const hashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await hash(path)])));
const state = {
  cwd: process.cwd(),
  branch: git("branch", "--show-current").trim(),
  head: git("rev-parse", "HEAD").trim(),
  status: git("status", "--porcelain=v1", "--untracked-files=all"),
  hashes,
};
async function inventory(directory: string, result: Record<string, string>): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inventory(path, result);
    else result[path] = await hash(path);
  }
}
if (process.argv.includes("--freeze")) {
  const historical: Record<string, string> = {};
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === "sibling-state-fixed-vs-before") continue;
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) await inventory(path, historical);
    else historical[path] = await hash(path);
  }
  await mkdir(target, { recursive: true });
  await writeFile(`${target}/start.json`, `${JSON.stringify({ ...state, historical }, null, 2)}\n`, { flag: "wx" });
  console.log({ sources: paths.length, historical: Object.keys(historical).length });
} else {
  const start = await json(`${target}/start.json`);
  for (const [path, expected] of Object.entries(start.historical)) assert.equal(await hash(path), expected, path);
  const before = await json(`${root}/sibling-integration-before/report.json`);
  const current = await json(`${target}/report.json`);
  const unfixed = await json(`${root}/sibling-integration-vs-before/report.json`);
  const prior = await json(`${root}/sibling-integration-vs-before/evidence.json`);
  for (const [path, expected] of Object.entries(prior.hashes)) assert.equal(start.hashes[path], expected, path);
  for (const field of ["inputs", "versions", "flags", "lockSha256"]) assert.deepEqual(current[field], before[field]);
  const changed = paths.filter((path) => start.hashes[path] && hashes[path] !== start.hashes[path]);
  const added = paths.filter((path) => !start.hashes[path]);
  const permitted = new Set([
    "packages/layout/src/fragment-slot.ts",
    "packages/layout/src/fragment-state.ts",
    "packages/layout/test/fragment-state.test.ts",
    "packages/text/src/wrap-selector.ts",
    "packages/text/src/inline-selection.ts",
    "packages/text/test/wrap-selector.test.ts",
    "scripts/boundaries.ts",
    "scripts/text-flow-costs.ts",
    "scripts/text-flow-state-evidence.ts",
    "tests/integration/text-flow-graphs.test.ts",
    "docs/evidence/text-flow-sibling-integration.md",
  ]);
  for (const path of changed) assert.ok(permitted.has(path), `Source drift: ${path}`);
  for (const path of Object.keys(start.hashes)) assert.ok(path in hashes, `Removed inherited source: ${path}`);
  for (const [key, row] of Object.entries(current.comparison) as [string, { delta: number }][]) {
    if (/^(?:emitted|pack)\/@updf\/(?!text\/|layout\/)/u.test(key)) assert.equal(row.delta, 0, key);
    if (/^consumer\/(?:ordinaryText|preparedFont|drawing|jpeg)-/u.test(key)) assert.equal(row.delta, 0, key);
  }
  const costs = Object.fromEntries(
    Object.entries(current.metrics)
      .filter(([key]) => /^consumer\/.*-min\//u.test(key) || /^(?:emitted|pack)\/@updf\/(?:text|layout)\//u.test(key))
      .map(([key, value]) => [
        key,
        {
          before: before.metrics[key],
          unfixed: unfixed.metrics[key],
          current: value,
          delta: (value as number) - before.metrics[key],
          fixDelta: (value as number) - unfixed.metrics[key],
        },
      ]),
  );
  await writeFile(
    `${target}/evidence.json`,
    `${JSON.stringify(
      {
        ...state,
        changed,
        added,
        historicalPreserved: Object.keys(start.historical).length,
        reportSha256: await hash(`${target}/report.json`),
        comparison: current.comparison,
        costs,
        sizes: Object.fromEntries(
          await Promise.all(
            [...changed, ...added].map(async (path) => [
              path,
              { sha256: hashes[path], bytes: (await readFile(path)).length },
            ]),
          ),
        ),
      },
      null,
      2,
    )}\n`,
  );
  console.log({ changed, added, historicalPreserved: Object.keys(start.historical).length });
  console.log(costs);
}
