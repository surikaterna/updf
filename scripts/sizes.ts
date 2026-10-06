import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { build, version } from "esbuild";
import { costInputs, hostCostInput, jpegCostInputs } from "./consumer/cost-inputs.js";

const root = resolve(process.argv[2] ?? process.cwd());
const historical = process.argv[3] === "baseline";
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
const output = resolve(
  process.argv[4] ?? resolve(process.cwd(), "artifacts/font-extraction", historical ? "baseline" : "current"),
);
await mkdir(output, { recursive: true });
const profiles = [];
const textExports = historical ? undefined : createRequire(resolve(root, "package.json"))("@updf/text");
const jpegEnabled = !historical && existsSync(resolve(root, "packages/jpeg/package.json"));
// Historical libraries need the discriminator; both sides still author the identical rich workload.
const inputs = costInputs(
  historical,
  typeof textExports?.createTextMeasurer === "function",
  historical || process.argv[5] === "discriminated",
);
if (!historical)
  inputs.measurementHost = hostCostInput(
    process.argv[5] === "discriminated",
    typeof textExports?.createTextMeasurer === "function",
  );
if (jpegEnabled) Object.assign(inputs, jpegCostInputs());
for (const [profile, contents] of Object.entries(inputs)) {
  const result = await build({
    stdin: { contents, resolveDir: root, sourcefile: `${profile}.ts`, loader: "ts" },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    metafile: true,
    write: false,
  });
  const bytes = result.outputFiles[0]?.contents;
  assert.ok(bytes);
  const modules = Object.keys(result.metafile.inputs);
  const contributions = Object.values(result.metafile.outputs)
    .flatMap((output) =>
      Object.entries(output.inputs).map(([module, { bytesInOutput }]) => ({ module, bytesInOutput })),
    )
    .sort((a, b) => b.bytesInOutput - a.bytesInOutput);
  assert.ok(!modules.some((path) => /packages\/[^/]+\/src\//u.test(path)), "Source alias in cost profile");
  assert.ok(
    !modules.some((path) => /packages\/[^/]+\/dist\/(?:cjs|node)\//u.test(path)),
    "Non-browser package condition in cost profile",
  );
  if (!historical && profile === "drawing")
    assert.ok(!modules.some((path) => /packages\/(?:fonts|text)\//u.test(path)), "Drawing imported fonts/text");
  if (profile === "measurementHost")
    assert.ok(!modules.some((path) => /packages\/fonts\//u.test(path)), "Host measurement imported fonts");
  if (profile !== "fontkit") assert.ok(!modules.some((path) => /node_modules\/fontkit\//u.test(path)));
  if (!profile.startsWith("jpeg"))
    assert.ok(!modules.some((path) => /packages\/jpeg\//u.test(path)), "JPEG leaked into existing profile");
  if (profile === "jpeg")
    assert.ok(!modules.some((path) => /packages\/(?:fonts|text)\//u.test(path)), "JPEG imported fonts/text");
  await writeFile(resolve(output, `${profile}.mjs`), bytes);
  profiles.push({ profile, raw: bytes.length, gzip: gzipSync(bytes).length, modules, contributions, input: contents });
}
const packages = [];
for (const name of [
  "layout-kernel",
  "core",
  ...(historical ? [] : ["fonts", "text"]),
  ...(jpegEnabled ? ["jpeg"] : []),
  "fontkit",
]) {
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
if (jpegEnabled) {
  const bytes = await readFile(resolve(root, "tests/fixtures/jpeg/color-1x1.jpg"));
  assets.push({ name: "color-1x1.jpg", raw: bytes.length, gzip: gzipSync(bytes).length });
}
const report = {
  root,
  historical,
  generation: historical
    ? "pre-extraction"
    : process.argv[5] === "discriminated"
      ? "ad052-compatible"
      : "canonical-rich",
  unavailableProfiles: historical ? ["measurementHost"] : [],
  node: process.version,
  esbuild: version,
  profiles,
  packages,
  assets,
};
await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log({ profiles: profiles.map(({ profile, raw, gzip }) => ({ profile, raw, gzip })), packages, assets });
