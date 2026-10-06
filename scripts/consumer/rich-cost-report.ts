import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

interface Contribution {
  module: string;
  bytesInOutput: number;
}
interface Profile {
  profile: string;
  raw: number;
  gzip: number;
  input: string;
  contributions: Contribution[];
}
interface Report {
  root: string;
  node: string;
  esbuild: string;
  generation: string;
  profiles: Profile[];
}
const directory = resolve(process.argv[2]!);
const before: Report = JSON.parse(await readFile(join(directory, "baseline/report.json"), "utf8"));
const after: Report = JSON.parse(await readFile(join(directory, "current/report.json"), "utf8"));
assert.equal(before.generation, "ad052-compatible");
assert.equal(after.generation, "canonical-rich");
assert.equal(before.node, after.node);
assert.equal(before.esbuild, after.esbuild);
for (const root of [before.root, after.root])
  for (const name of ["layout-kernel", "core", "fonts", "text"])
    assert.equal(await realpath(join(root, "node_modules/@updf", name)), join(root, "packages", name));
const tools = [];
for (const name of ["typescript", "esbuild", "vite"]) {
  const old = JSON.parse(await readFile(join(before.root, "node_modules", name, "package.json"), "utf8"));
  const current = JSON.parse(await readFile(join(after.root, "node_modules", name, "package.json"), "utf8"));
  assert.equal(old.version, current.version);
  tools.push({ name, version: current.version });
}
const nonmeasurement =
  /packages\/(?:core\/dist\/core\/(?:text-service|text-output)|text\/dist\/(?:service|inline|inline-paint))\.js$/u;
const sizes = after.profiles.map((current) => {
  const old = before.profiles.find((item) => item.profile === current.profile);
  assert.ok(old);
  for (const profile of [old, current]) {
    if (current.profile.startsWith("measurement")) assert.match(profile.input, /paragraphs:/u);
    else if (current.profile !== "drawing") assert.match(profile.input, /type: 'richText'/u);
    if (current.profile.startsWith("measurement"))
      assert.deepEqual(
        profile.contributions.filter((item) => nonmeasurement.test(item.module) && item.bytesInOutput > 0),
        [],
      );
  }
  const delta = { raw: current.raw - old.raw, gzip: current.gzip - old.gzip };
  return {
    profile: current.profile,
    before: { raw: old.raw, gzip: old.gzip },
    after: { raw: current.raw, gzip: current.gzip },
    delta,
    percent: { raw: (delta.raw / old.raw) * 100, gzip: (delta.gzip / old.gzip) * 100 },
    emittedContributions: { before: old.contributions, after: current.contributions },
  };
});
const sourcePaths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
});
const sourceHashes = [];
for (const path of sourcePaths.split("\0").filter(Boolean)) {
  try {
    const bytes = await readFile(path);
    sourceHashes.push({ path, sha256: createHash("sha256").update(bytes).digest("hex") });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
const proof = {
  base: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  cwd: process.cwd(),
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  status: execFileSync("git", ["status", "--short"], { encoding: "utf8" }),
  node: after.node,
  tools,
  sizes,
  sourceHashes,
  interpretation:
    "Rich-vs-rich minified emitted browser JS and gzip; no timing or allocation-speed claim. Pre-extraction host profile is unavailable, not zero cost.",
};
await writeFile(join(directory, "final-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log({
  tools,
  sizes: sizes.map(({ emittedContributions: _contributions, ...size }) => size),
  sourceFiles: sourceHashes.length,
});
