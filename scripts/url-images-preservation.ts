import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const target = "/home/sprawl/projects/updf/trees/image-preparation";
const source = "/home/sprawl/projects/updf/trees/text-flow-design";
assert.equal(process.cwd(), target);
const out = process.env.URL_IMAGES_OUT ?? "artifacts/url-images-runtime-after";
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });
const original = await read("/tmp/opencode/updf-s5b1-fidelity/source-manifest.json");
for (const [path, entry] of Object.entries(original) as [string, { sha256: string }][]) {
  assert.equal(hash(await readFile(join(source, path))), entry.sha256, path);
}
assert.equal(
  git(source, "status", "--porcelain=v1", "--untracked-files=all"),
  await readFile("/tmp/opencode/updf-s5b1-fidelity/source-status.txt", "utf8"),
);
const protectedFiles = await read("/tmp/opencode/updf-s5a1-before-20261023/manifest.json");
for (const path of [...protectedFiles.history, ...protectedFiles.dist])
  assert.equal(hash(await readFile(join(source, path))), protectedFiles.hashes[path], path);
const before = await read(`${process.env.URL_IMAGES_BEFORE ?? "artifacts/url-images-runtime-before"}/source.json`);
const after = await read(`${out}/source.json`);
const entries = Object.entries(after.hashes)
  .filter(([path, digest]) => before.hashes[path] !== digest)
  .map(([path, digest]) => ({ path, before: before.hashes[path] ?? null, after: digest }));
const allowed = new Set([
  "package-lock.json",
  "packages/images/package.json",
  "packages/images/README.md",
  ...[
    "index",
    "types",
    "capture",
    "source",
    "visual",
    "format-handler",
    "load-options",
    "load-session",
    "load",
    "png",
    "jpeg",
  ].map((name) => `packages/images/src/${name}.ts`),
  ...[
    "url-helpers.ts",
    "types.ts",
    "url-render.test.ts",
    "url-boundaries.test.ts",
    "url-cancellation.test.ts",
    "url-composition.test.ts",
    "url-snapshots.test.ts",
  ].map((name) => `packages/images/test/${name}`),
  "packages/core/src/core/operation.ts",
  "packages/core/src/core/preparation-bindings.ts",
  "packages/core/src/internal-preparation.ts",
  "packages/layout/package.json",
  ...[
    "async",
    "render",
    "serialization-options",
    "internal-preparation",
    "preparation-resource",
    "extensions",
    "sizing",
    "internal-visual",
  ].map((name) => `packages/layout/src/${name}.ts`),
  "scripts/boundaries.ts",
  "scripts/package-edges.ts",
  "scripts/url-image-cost-inputs.ts",
  "scripts/url-images-consumer.ts",
  "scripts/url-images-evidence.ts",
  "scripts/url-images-preservation.ts",
  "docs/evidence/url-images.md",
  "packages/images/test/own-source.test.ts",
  "tests/browser/url-images.test.ts",
  "tests/consumer/types/images-template.tsx",
  "tests/consumer/types/images-load-template.tsx",
]);
for (const { path } of entries) assert.ok(allowed.has(path), `Outside assignment: ${path}`);
if (process.env.URL_IMAGES_BEFORE) {
  const fixOnly = new Set([
    "packages/images/src/source.ts",
    "packages/images/test/own-source.test.ts",
    "docs/evidence/url-images.md",
    "scripts/url-images-consumer.ts",
    "scripts/url-images-evidence.ts",
    "scripts/url-images-preservation.ts",
  ]);
  for (const { path } of entries) assert.ok(fixOnly.has(path), `Outside audit fix: ${path}`);
}
for (const path of Object.keys(before.hashes))
  assert.ok(Object.hasOwn(after.hashes, path), `Deleted baseline: ${path}`);
for (const [path, digest] of Object.entries(after.hashes)) assert.equal(hash(await readFile(path)), digest, path);
assert.equal(git(target, "rev-parse", "HEAD").trim(), "fbf2f78fd59635c6b965f2a707f35508dc1e4392");
for (const cwd of [source, target]) assert.equal(git(cwd, "diff", "--cached", "--name-only"), "");
const links = Object.fromEntries(
  await Promise.all(
    ["core", "layout", "images", "assets", "png", "jpeg"].map(async (name) => {
      const path = await realpath(`node_modules/@updf/${name}`);
      assert.equal(path, `${target}/packages/${name}`);
      return [name, path];
    }),
  ),
);
if (process.env.URL_IMAGES_BEFORE) {
  const checks = await Promise.all(
    [
      "npm_run_format_check",
      "npm_run_lint",
      "npm_run_typecheck",
      "npm_test",
      "npm_run_build_browser",
      "npm_run_check_graphs",
      "npm_run_build_showcase",
      "npm_run_test_showcase",
      "npm_run_test_browser",
      "npm_run_test_consumer",
      "npm_run_check_licenses",
      "node_modules_.bin_tsx_scripts_url-images-consumer.ts",
      "node_modules_.bin_tsx_--test_packages_images_test_own-source.test.ts",
    ].map(async (name) => {
      const path = `${out}/${name}.log`;
      const log = await readFile(path, "utf8");
      const outcomes = [...log.matchAll(/^Exit: (\d+)$/gmu)].map((match) => Number(match[1]));
      assert.equal(outcomes.at(-1), 0, path);
      return { path, sha256: hash(Buffer.from(log)), outcomes, completedAt: (await stat(path)).mtime.toISOString() };
    }),
  );
  await writeFile(`${out}/checks.json`, JSON.stringify(checks, null, 2));
}
await writeFile(
  `${out}/preservation.json`,
  JSON.stringify(
    {
      target,
      source,
      branch: after.branch,
      head: after.head,
      issue: "N/A",
      owner: "Engineer integration owner",
      baselineSources: before.sourceCount,
      finalSources: after.sourceCount,
      entries,
      protectedOriginalSources: Object.keys(original).length,
      protectedHistory: protectedFiles.history.length,
      protectedDist: protectedFiles.dist.length,
      liveAssetRequests: 0,
      links,
      pid: execFileSync("ps", ["-p", "665048", "-o", "pid=,args="], { encoding: "utf8" }).trim(),
      committed: "none",
      staged: "none",
      slice: "unstaged/untracked; inherited dirty scope preserved outside listed entries",
    },
    null,
    2,
  ),
);
console.log({
  baseline: before.sourceCount,
  after: after.sourceCount,
  changed: entries.length,
  preservedOriginal: Object.keys(original).length,
  history: protectedFiles.history.length,
  dist: protectedFiles.dist.length,
  links,
});
