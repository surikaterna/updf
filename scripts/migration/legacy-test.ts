import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileLegacyCopy } from "./legacy-compile.js";
import { focusHarness, legacyReporter } from "./legacy-focus-harness.js";

export function prepareLegacyTests(legacy: string, modules: string): string {
  const dir = mkdtempSync("/tmp/opencode/updf-legacy-node-");
  compileLegacyCopy(legacy, dir);
  writeFileSync(join(dir, "package.json"), '{"private":true,"type":"commonjs"}\n');
  symlinkSync(modules, join(dir, "node_modules"), "dir");
  writeFileSync(join(dir, "focus-harness.cjs"), focusHarness);
  writeFileSync(join(dir, "reporter.cjs"), legacyReporter);
  return dir;
}

export function legacyTestArgs(): string[] {
  return ["--test", "--test-concurrency=1", "--test-reporter=./reporter.cjs", "focus-harness.cjs"];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const modules = fileURLToPath(new URL("../../node_modules", import.meta.url));
  const dir = prepareLegacyTests(process.cwd(), modules);
  const result = spawnSync(process.execPath, legacyTestArgs(), { cwd: dir, stdio: "inherit", timeout: 120000 });
  console.log(`Legacy execution evidence: ${dir}`);
  if (result.error || result.signal) throw result.error ?? new Error(`Legacy runner killed: ${result.signal}`);
  process.exitCode = result.status ?? 1;
}
