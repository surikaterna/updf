import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";

const root = "artifacts/text-flow";
const target = `${root}/sibling-final-before`;
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
async function inventory(directory: string, result: Record<string, string>): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inventory(path, result);
    else result[path] = await hash(path);
  }
}
const paths = [...new Set(git("ls-files", "-co", "--exclude-standard", "-z").split("\0").filter(Boolean))].sort();
const hashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await hash(path)])));
const state = {
  cwd: process.cwd(),
  branch: git("branch", "--show-current").trim(),
  head: git("rev-parse", "HEAD").trim(),
  status: git("status", "--porcelain=v1", "--untracked-files=all"),
  hashes,
};
if (process.argv.includes("--freeze")) {
  const historical: Record<string, string> = {};
  await inventory(root, historical);
  await mkdir(target, { recursive: true });
  await writeFile(`${target}/start.json`, `${JSON.stringify({ ...state, historical }, null, 2)}\n`, { flag: "wx" });
  console.log({ sources: paths.length, historical: Object.keys(historical).length });
} else {
  const start = JSON.parse(await readFile(`${target}/start.json`, "utf8"));
  for (const [path, expected] of Object.entries(start.historical)) assert.equal(await hash(path), expected, path);
  for (const path of Object.keys(start.hashes)) assert.ok(path in hashes, `Removed inherited source: ${path}`);
  const changed = paths.filter((path) => start.hashes[path] && hashes[path] !== start.hashes[path]);
  const added = paths.filter((path) => !start.hashes[path]);
  assert.equal(state.cwd, start.cwd);
  assert.equal(state.branch, start.branch);
  assert.equal(state.head, start.head);
  assert.equal(git("diff", "--cached", "--name-only"), "");
  for (const path of paths.filter((path) =>
    /^packages\/(?:core|layout-boxes|fonts|geometry|jpeg|png|svg)\//u.test(path),
  ))
    assert.equal(hashes[path], start.hashes[path], `Protected owner changed: ${path}`);
  const permitted = new Set([
    "biome.json",
    "package-lock.json",
    "packages/layout/package.json",
    "packages/layout/src/content-inline-selection.ts",
    "packages/layout/src/content-paragraph-output.ts",
    "packages/layout/src/content-producer.ts",
    "packages/layout/src/document-data.ts",
    "packages/layout/src/document-types.ts",
    "packages/layout/src/mixed-layout.ts",
    "packages/layout/src/paginator.ts",
    "packages/layout/src/protocol.ts",
    "packages/text-flow/README.md",
    "packages/text-flow/package.json",
    "packages/text-flow/test/adapter.test.ts",
    "packages/text-flow/test/edge-profile.test.ts",
    "packages/text-flow/src/index.ts",
    "packages/text/src/inline-selection-types.ts",
    "packages/text/src/inline-selection.ts",
    "scripts/boundaries.ts",
    "scripts/package-edges.ts",
    "scripts/text-flow-costs.ts",
    "scripts/text-flow-final-evidence.ts",
    "tests/integration/text-flow-graphs.test.ts",
    "docs/evidence/text-flow-sibling-integration.md",
    "scripts/packed-consumer.ts",
  ]);
  for (const path of changed) assert.ok(permitted.has(path), `Unexpected inherited edit: ${path}`);
  const originalLock = JSON.parse(git("show", `${state.head}:package-lock.json`));
  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  assert.equal(lock.packages["packages/text-flow"].dependencies["@updf/layout-boxes"], "2.0.0-poc.0");
  delete lock.packages["packages/text-flow"].dependencies["@updf/layout-boxes"];
  assert.deepEqual(lock, originalLock, "Lock drift beyond the explicit existing kernel edge");
  const artifacts: Record<string, string> = {};
  await inventory(root, artifacts);
  const deliveryArtifacts = Object.fromEntries(
    Object.entries(artifacts).filter(([path]) => !(path in start.historical)),
  );
  const sizes = Object.fromEntries(
    await Promise.all(
      [...changed, ...added].map(async (path) => [
        path,
        { sha256: hashes[path], bytes: (await readFile(path)).length },
      ]),
    ),
  );
  const statusLines = state.status.trimEnd().split("\n");
  const scope = {
    inheritedChanged: changed.length,
    added: added.length,
    modifiedTracked: statusLines.filter((line) => !line.startsWith("??")).length,
    untracked: statusLines.filter((line) => line.startsWith("??")).length,
    staged: 0,
    newCommits: 0,
  };
  await writeFile(
    `${target}/result.json`,
    `${JSON.stringify(
      {
        ...state,
        changed,
        added,
        scope,
        sizes,
        deliveryArtifacts,
        historicalPreserved: Object.keys(start.historical).length,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  console.log({ changed, added, scope, historicalPreserved: Object.keys(start.historical).length });
  console.log({ manifestSha256: await hash(`${target}/result.json`) });
}
