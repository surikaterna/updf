import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { legacyTestArgs, prepareLegacyTests } from "./legacy-test.js";

const root = process.cwd();
const legacy = resolve(process.argv[2] ?? root);
const output = process.argv[3];
if (!output) throw new Error("Usage: legacy-baseline.ts LEGACY_DIRECTORY OUTPUT.json");

function disposableCopy(): string {
  return prepareLegacyTests(legacy, join(root, "node_modules"));
}

function run(dir: string, command: string, args: string[], name: string) {
  const env = { ...process.env, UPDF_LEGACY_FULL: name === "full" ? "1" : "" };
  const result = spawnSync(command, args, { cwd: dir, env, encoding: "utf8", timeout: 120000 });
  writeFileSync(join(dir, `${name}.stdout.log`), result.stdout ?? "");
  writeFileSync(join(dir, `${name}.stderr.log`), result.stderr ?? "");
  return {
    command: [command, ...args],
    cwd: dir,
    exit: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    stdout: `${name}.stdout.log`,
    stderr: `${name}.stderr.log`,
  };
}

function pdfs(dir: string) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".pdf"))
    .sort()
    .map((name) => {
      const bytes = readFileSync(join(dir, name));
      return { name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    });
}

const rawDir = disposableCopy();
const raw = run(rawDir, process.execPath, legacyTestArgs(), "raw");
const fullDir = disposableCopy();
const full = run(fullDir, process.execPath, legacyTestArgs(), "full");
const result = {
  status: "baseline evidence, not a passing legacy gate",
  root,
  legacy,
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  node: process.version,
  raw,
  full,
  rawResults: JSON.parse(readFileSync(join(rawDir, "full-result.json"), "utf8")) as unknown,
  fullResults: JSON.parse(readFileSync(join(fullDir, "full-result.json"), "utf8")) as unknown,
  outputFiles: { raw: pdfs(rawDir), full: pdfs(fullDir) },
};
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
