import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { glob, mkdir, readFile, writeFile } from "node:fs/promises";

const cwd = "/home/sprawl/projects/updf/trees/image-preparation";
assert.equal(process.cwd(), cwd);
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const hash = (input: Uint8Array | string) => createHash("sha256").update(input).digest("hex");
const mode = process.argv[2]!;
const out =
  process.env.VISUAL_PROOF_OUT ?? `artifacts/visual-preparation-bridge-${mode === "before" ? "before" : "after"}`;
await mkdir(out, { recursive: true });
if (mode.startsWith("dist-")) {
  const hashes: Record<string, string> = {};
  for await (const entry of glob("packages/*/dist/**/*", { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = `${entry.parentPath}/${entry.name}`;
    hashes[path] = hash(await readFile(path));
  }
  await writeFile(`${out}/${mode}.json`, JSON.stringify(hashes, null, 2), { flag: "wx" });
  console.log({ out, files: Object.keys(hashes).length });
  process.exit(0);
}
if (mode === "run") {
  const command = process.argv.slice(3);
  const result = spawnSync(command[0]!, command.slice(1), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const log = `${out}/${command
    .join("_")
    .replaceAll(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 170)}.log`;
  await writeFile(log, `\n${command.join(" ")}\nExit: ${result.status}\n${result.stdout}${result.stderr}`, {
    flag: "a",
  });
  console.log({ command, status: result.status, log });
  process.exit(result.status ?? 1);
}
const paths = git("ls-files", "--cached", "--others", "--exclude-standard").trimEnd().split("\n");
const hashes: Record<string, string> = {};
for (const path of paths) {
  const bytes = await readFile(path);
  const digest = hash(bytes);
  hashes[path] = digest;
  if (mode !== "before") continue;
  const directory = `artifacts/url-images-before/source-hashes/${digest.slice(0, 2)}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${digest}`, bytes, { flag: "wx" }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
}
const receipt = {
  cwd,
  branch: git("branch", "--show-current").trim(),
  head: git("rev-parse", "HEAD").trim(),
  status: git("status", "--porcelain=v1", "--untracked-files=all"),
  hashes,
  sourceCount: paths.length,
};
await writeFile(`${out}/source.json`, JSON.stringify(receipt, null, 2), { flag: mode === "before" ? "wx" : "w" });
console.log({ out, sourceCount: paths.length, manifestHash: hash(JSON.stringify(receipt)) });
