import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const paths = git("ls-files", "--cached", "--others", "--exclude-standard").split("\n").sort();
const manifest = Object.fromEntries(
  await Promise.all(
    paths.map(async (path) => [
      path,
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    ]),
  ),
);
const fullHash = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
const out = process.argv[2];
if (!out) throw new Error("Supply a new receipt path");
await writeFile(
  out,
  JSON.stringify(
    { head: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"), manifest, fullHash },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log({ files: paths.length, fullHash });
