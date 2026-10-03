import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8" }).trim();
const tracked = git("diff", "--name-only").split("\n").filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
const paths = [...new Set([...git("ls-files").split("\n"), ...untracked])].sort();
const files = paths.map((path) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
});
writeFileSync(
  "docs/evidence/architecture-mixed-baseline.json",
  `${JSON.stringify(
    {
      cwd: process.cwd(),
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      staged: git("diff", "--cached", "--name-only"),
      tracked,
      untracked,
      files,
      note: "Actual pre-E baseline; recorder itself is the only E file present at capture.",
    },
    null,
    2,
  )}\n`,
  { flag: "wx" },
);
