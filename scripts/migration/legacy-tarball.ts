import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { smokeFixture } from "./legacy-smoke-fixture.js";

const root = process.cwd();
const legacy = resolve(process.argv[2] ?? root);
const output = process.argv[3];
if (!output) throw new Error("Usage: legacy-tarball.ts LEGACY_DIRECTORY OUTPUT.json");

function run(cwd: string, command: string, args: string[]): string {
  return execFileSync(command, args, { cwd, encoding: "utf8", timeout: 120000 });
}

function copy(): string {
  const dir = mkdtempSync("/tmp/opencode/updf-legacy-pack-");
  for (const name of [
    "src",
    "test",
    "lib",
    "index.js",
    "keytest.html",
    "readme.md",
    "package.json",
    ".babelrc",
    ".eslintrc",
    ".npmignore",
  ]) {
    cpSync(join(legacy, name), join(dir, name), { recursive: true });
  }
  symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
  if (existsSync(join(legacy, "LICENSE.svgpath")))
    cpSync(join(legacy, "LICENSE.svgpath"), join(dir, "LICENSE.svgpath"));
  return dir;
}

function smoke(dir: string, entry: string, deepPrefix: string, register = false): unknown {
  const filename = join(dir, "smoke.cjs");
  writeFileSync(filename, smokeFixture(entry, deepPrefix));
  const args = register ? ["-r", "babel-register", filename] : [filename];
  return JSON.parse(run(dir, process.execPath, args)) as unknown;
}

const dir = copy();
const manifest: unknown = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
assert.ok(manifest && typeof manifest === "object" && "name" in manifest && "main" in manifest);
assert.equal(typeof manifest.name, "string");
assert.equal(manifest.main, "lib/index.js");
const name = String(manifest.name);
const generated = smoke(dir, "./lib/index.js", "./lib");
const shim = smoke(dir, "./index.js", "./src", true);
assert.deepEqual(generated, shim);
run(dir, "npm", ["run", "compile"]);
const rebuilt = smoke(dir, "./lib/index.js", "./lib");
assert.deepEqual(generated, rebuilt);
unlinkSync(join(dir, "smoke.cjs"));
const pack: unknown = JSON.parse(run(dir, "npm", ["pack", "--ignore-scripts", "--json"]));
assert.ok(Array.isArray(pack) && pack.length === 1);
const first: unknown = pack[0];
assert.ok(first && typeof first === "object" && "filename" in first && typeof first.filename === "string");
const consumer = mkdtempSync("/tmp/opencode/updf-legacy-consumer-");
writeFileSync(join(consumer, "package.json"), '{"private":true}\n');
run(consumer, "npm", [
  "install",
  join(dir, first.filename),
  "--omit=dev",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
]);
const installed = smoke(consumer, name, `${name}/lib`);
assert.deepEqual(generated, installed);
const result = {
  status: "baseline tarball smoke passed; migration not performed",
  legacy,
  package: name,
  main: manifest.main,
  generated,
  shim,
  rebuilt,
  installed,
  pack,
  dir,
  consumer,
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(result, null, 2));
