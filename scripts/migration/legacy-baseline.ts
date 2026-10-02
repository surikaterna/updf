import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { focusHarness } from "./legacy-focus-harness.js";

const root = process.cwd();
const legacy = resolve(process.argv[2] ?? root);
const output = process.argv[3];
if (!output) throw new Error("Usage: legacy-baseline.ts LEGACY_DIRECTORY OUTPUT.json");

function disposableCopy(): string {
  const dir = mkdtempSync("/tmp/opencode/updf-legacy-baseline-");
  for (const name of ["src", "test", "lib", "index.js", "package.json", ".babelrc", ".eslintrc", ".npmignore"]) {
    if (existsSync(join(legacy, name))) cpSync(join(legacy, name), join(dir, name), { recursive: true });
  }
  symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
  writeFileSync(join(dir, "focus-harness.cjs"), focusHarness);
  return dir;
}

function run(dir: string, command: string, args: string[], name: string) {
  const result = spawnSync(command, args, { cwd: dir, encoding: "utf8", timeout: 120000 });
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
const raw = run(rawDir, "npm", ["test"], "raw");
const fullDir = disposableCopy();
const full = run(fullDir, process.execPath, ["focus-harness.cjs"], "full");
const result = {
  status: "baseline evidence, not a passing legacy gate",
  root,
  legacy,
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  node: process.version,
  raw,
  full,
  fullResults: JSON.parse(readFileSync(join(fullDir, "full-result.json"), "utf8")) as unknown,
  outputFiles: { raw: pdfs(rawDir), full: pdfs(fullDir) },
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
