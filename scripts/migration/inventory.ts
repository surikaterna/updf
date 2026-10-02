import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { destination } from "./destinations.js";

const root = process.cwd();
const expectedHead = "7782bb3ba468a721ef7bd68fedd19b8f6c029d16";
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function paths(...args: string[]): string[] {
  return execFileSync("git", ["ls-files", "-z", ...args], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .sort();
}

function record(path: string, kind: string, target: string) {
  const bytes = readFileSync(resolve(root, path));
  return {
    old: path,
    new: target,
    kind,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function generatedFiles(directory: string): string[] {
  return readdirSync(resolve(root, directory))
    .sort()
    .flatMap((name) => {
      const path = `${directory}/${name}`;
      return statSync(resolve(root, path)).isDirectory() ? generatedFiles(path) : [path];
    });
}

function capture() {
  if (git("rev-parse", "HEAD") !== expectedHead) throw new Error("Unexpected HEAD");
  if (git("branch", "--show-current") !== "feature/declarative-cmr-poc") throw new Error("Unexpected branch");
  if (git("diff", "--name-only") || git("diff", "--cached", "--name-only")) throw new Error("Tracked delta exists");
  const tracked = paths();
  const untracked = paths("--others", "--exclude-standard", "--", "experimental/declarative");
  if (untracked.length !== 154) throw new Error(`Expected 154 POC files, got ${untracked.length}`);
  const entries = [
    ...tracked.map((path) => record(path, "tracked-legacy", destination(path))),
    ...untracked.map((path) =>
      record(path, path.includes("/roadmap/") ? "preserved-roadmap" : "untracked-native", destination(path)),
    ),
  ];
  if (new Set(entries.map((entry) => entry.new)).size !== entries.length) throw new Error("Destination collision");
  const generated = generatedFiles("lib").map((path) =>
    record(path, "ignored-generated-legacy", `packages/legacy/${path}`),
  );
  return {
    status: "pre-migration; destinations planned, no files moved",
    root,
    branch: git("branch", "--show-current"),
    head: expectedHead,
    counts: { tracked: tracked.length, native: 142, roadmap: 12, generated: generated.length },
    entries,
    generated,
  };
}

const output = process.argv[2];
if (!output) throw new Error("Usage: inventory.ts OUTPUT.json");
writeFileSync(output, `${JSON.stringify(capture(), null, 2)}\n`, { flag: "wx" });
