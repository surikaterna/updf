import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const cwd = process.cwd();
const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const output = resolve(process.argv[2] ?? "/tmp/opencode/updf-slice-c-current");
const tracked = git("diff", "--name-only").split("\n").filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
const files = await Promise.all(
  [...tracked, ...untracked].sort().map(async (path) => {
    const contents = await readFile(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    return {
      path,
      bytes: contents?.length,
      sha256: contents && createHash("sha256").update(contents).digest("hex"),
      deleted: !contents,
    };
  }),
);
const profiles = await Promise.all(
  ["/tmp/opencode/updf-slice-a-f97-baseline", "/tmp/opencode/updf-slice-c-post-b", output].map(async (directory) => ({
    directory,
    reportSha256: createHash("sha256")
      .update(await readFile(resolve(directory, "report.json")))
      .digest("hex"),
  })),
);
const report = JSON.parse(await readFile(resolve(output, "report.json"), "utf8"));
for (const profile of report.profiles) {
  const compiled = await build({
    stdin: { contents: profile.input, resolveDir: cwd, sourcefile: `${profile.profile}.ts`, loader: "ts" },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    write: false,
  });
  assert.deepEqual(
    Buffer.from(compiled.outputFiles[0]!.contents),
    await readFile(resolve(output, `${profile.profile}.mjs`)),
  );
}
const virtualInputs = new Set<string>(report.profiles.map((profile: { profile: string }) => `${profile.profile}.ts`));
const emitted = await Promise.all(
  [...new Set<string>(report.profiles.flatMap((profile: { modules: string[] }) => profile.modules))]
    .sort()
    .filter((path) => !virtualInputs.has(path))
    .map(async (path) => ({
      path,
      sha256: createHash("sha256")
        .update(await readFile(resolve(cwd, path)))
        .digest("hex"),
    })),
);
const evidence = {
  cwd,
  branch: git("branch", "--show-current"),
  head: git("rev-parse", "HEAD"),
  base: "f97a07a223aad8ac6de043bf515777aec42f5778",
  status: git("status", "--short", "--untracked-files=all"),
  staged: git("diff", "--cached", "--name-only"),
  trackedCount: tracked.length,
  untrackedCount: untracked.length,
  files,
  profiles,
  emitted,
  virtualInputs: [...virtualInputs],
  matchedCurrentBundles: report.profiles.map((profile: { profile: string }) => profile.profile),
};
await writeFile(resolve(output, "delivery-manifest.json"), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(resolve(output, "delivery-tracked.patch"), execFileSync("git", ["diff", "--binary"], { cwd }));
console.log({ cwd, tracked: tracked.length, untracked: untracked.length, staged: evidence.staged, output });
