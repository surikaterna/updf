import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function gitPaths(root: string, args: string[]): string[] {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
}

async function sourceRecord(root: string, path: string) {
  try {
    const bytes = await readFile(join(root, path));
    return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path, deleted: true as const };
    throw error;
  }
}

export async function jpegSourceInventory(root: string, revision: string) {
  // Compare to the certified baseline, not HEAD, so committed changes remain evidence.
  const paths = gitPaths(root, ["diff", "--name-only", "--no-renames", "-z", revision, "--"]);
  paths.push(...gitPaths(root, ["ls-files", "--modified", "--others", "--exclude-standard", "-z"]));
  return Promise.all([...new Set(paths)].sort().map((path) => sourceRecord(root, path)));
}
