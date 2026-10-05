import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build, version } from "esbuild";
import { costInputs } from "./consumer/cost-inputs.js";

const root = resolve(process.argv[2] ?? process.cwd());
const historical = process.argv[3] === "baseline";
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
const output = resolve(process.cwd(), "artifacts/font-extraction", historical ? "baseline" : "current");
await mkdir(output, { recursive: true });
const profiles = [];
const inputs = costInputs(historical);
if (!historical)
  inputs.measurementHost = await readFile(resolve(root, "tests/consumer/types/host-metrics-template.ts"), "utf8");
for (const [profile, contents] of Object.entries(inputs)) {
  const result = await build({
    stdin: { contents, resolveDir: root, sourcefile: `${profile}.ts`, loader: "ts" },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    format: "esm",
    metafile: true,
    write: false,
  });
  const bytes = result.outputFiles[0]?.contents;
  assert.ok(bytes);
  const modules = Object.keys(result.metafile.inputs);
  assert.ok(!modules.some((path) => /packages\/[^/]+\/src\//u.test(path)), "Source alias in cost profile");
  if (!historical && profile === "drawing")
    assert.ok(!modules.some((path) => /packages\/(?:fonts|text)\//u.test(path)), "Drawing imported fonts/text");
  if (profile === "measurementHost")
    assert.ok(!modules.some((path) => /packages\/fonts\//u.test(path)), "Host measurement imported fonts");
  if (profile !== "fontkit") assert.ok(!modules.some((path) => /node_modules\/fontkit\//u.test(path)));
  await writeFile(resolve(output, `${profile}.mjs`), bytes);
  profiles.push({ profile, raw: bytes.length, gzip: gzipSync(bytes).length, modules, input: contents });
}
const packages = [];
for (const name of ["layout-kernel", "core", ...(historical ? [] : ["fonts", "text"]), "fontkit"]) {
  const [pack]: { size: number; unpackedSize: number; files: { path: string; size: number }[] }[] = JSON.parse(
    execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", output], {
      cwd: resolve(root, "packages", name),
      encoding: "utf8",
      stdio: "pipe",
    }),
  );
  assert.ok(pack);
  packages.push({ name, tarGzip: pack.size, installed: pack.unpackedSize });
}
const assets = [];
for (const name of ["LiberationSans-Regular.ttf", "liberation-sans.json"]) {
  const bytes = await readFile(resolve(root, "tests/fixtures/fonts", name));
  assets.push({ name, raw: bytes.length, gzip: gzipSync(bytes).length });
}
const report = { root, historical, node: process.version, esbuild: version, profiles, packages, assets };
await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log({ profiles: profiles.map(({ profile, raw, gzip }) => ({ profile, raw, gzip })), packages, assets });
