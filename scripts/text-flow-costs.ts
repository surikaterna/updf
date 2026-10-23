import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { build, version } from "esbuild";
import { textFlowCostInputs, exclusionCostInput } from "./text-flow-cost-inputs.js";
import { profileCostInput } from "./text-flow-profile-cost-input.js";
import { sourceIndexGraph } from "./text-source-index-graph.js";
import { siblingCostInput } from "./text-flow-sibling-cost-input.js";
import { pathCostInput } from "./text-flow-path-cost-input.js";

const { values } = parseArgs({
  options: {
    root: { type: "string" },
    out: { type: "string" },
    compare: { type: "string" },
  },
});
const root = resolve(values.root ?? process.cwd());
assert.ok(values.out, "Required: --out PATH; optional: --root PATH --compare BASE/report.json");
const out = resolve(values.out);
const run = (command: string, args: string[], cwd = root) =>
  execFileSync(command, args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const metrics: Record<string, number> = {};

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? files(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat().sort();
}

async function emitted(directory: string, name: string) {
  const inventory = [];
  for (const path of await files(resolve(directory, "dist"))) {
    const local = relative(resolve(directory, "dist"), path);
    const kind = local.startsWith("node/") ? "nodeFacade" : local.startsWith("cjs/") ? "cjs" : "browserEsm";
    const type = /\.d\.(?:ts|mts|cts)$/u.test(path) ? "declarations" : /\.(?:js|mjs)$/u.test(path) ? "js" : "other";
    const bytes = (await readFile(path)).length;
    const key = `emitted/${name}/${kind}/${type}`;
    metrics[key] = (metrics[key] ?? 0) + bytes;
    inventory.push({ path: local, kind, type, bytes });
  }
  return inventory;
}

async function packages() {
  const libraries = [];
  const privateApplications = [];
  for (const parent of ["packages", "apps"]) {
    for (const entry of await readdir(resolve(root, parent), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = resolve(root, parent, entry.name);
      const manifest = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
      if (parent === "apps" || !manifest.exports) {
        privateApplications.push({ path: relative(root, directory), name: manifest.name, private: manifest.private });
        continue;
      }
      const inventory = await emitted(directory, manifest.name);
      const [pack] = JSON.parse(
        run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", out], directory),
      );
      metrics[`pack/${manifest.name}/size`] = pack.size;
      metrics[`pack/${manifest.name}/unpackedSize`] = pack.unpackedSize;
      libraries.push({ name: manifest.name, private: manifest.private, inventory, pack });
    }
  }
  return { libraries, privateApplications };
}

async function checkBandIsolation(modules: string[], optional: boolean) {
  const bandModules = modules.filter((path) => /\/text\/dist\/(?:cjs\/)?composition-band\.js$/u.test(path));
  assert.equal(bandModules.length > 0, optional, "Exclusion band graph isolation");
  if (optional) return;
  for (const path of modules.filter((path) => /\/text\/dist\//u.test(path))) {
    const emitted = await readFile(resolve(root, path), "utf8");
    assert.ok(
      !/selectionBand|glyphTop|glyphBottom|lowLeading|profileDepth|Profile retry/u.test(emitted),
      "Hidden exclusion geometry in ordinary module",
    );
  }
}

async function checkConsumerGraph(profile: string, modules: string[], platform: "browser" | "node") {
  const composition = profile.startsWith("textFlow");
  if (profile === "textFlowPath") {
    assert.ok(modules.some((path) => /\/text-flow\/dist\/(?:cjs\/)?path-band\.js$/u.test(path)));
    assert.ok(modules.some((path) => /\/geometry\/dist\/(?:cjs\/)?normalize\.js$/u.test(path)));
  }
  await checkBandIsolation(modules, composition);
  assert.equal(
    modules.some((path) => /\/(?:composition-profile|profile-exclusion|profile-interpolation)\.js$/u.test(path)),
    composition,
    "Profile graph isolation",
  );
  assert.ok(!modules.some((path) => /packages\/[^/]+\/src\//u.test(path)), "Source alias in retained consumer");
  if (profile === "drawing")
    assert.ok(!modules.some((path) => /packages\/(?:text|fonts|layout)\//u.test(path)), "Drawing dependency leak");
  if (!composition)
    assert.ok(
      !modules.some((path) => /packages\/text-flow\/|\/text\/dist\/(?:cjs\/)?composition\.js$/u.test(path)),
      "Composition dependency leak",
    );
  else {
    assert.ok(
      modules.some((path) => /packages\/text-flow\/dist\//u.test(path)),
      "Missing addon positive control",
    );
    assert.ok(
      modules.some((path) => /\/text\/dist\/(?:cjs\/)?composition\.js$/u.test(path)),
      "Missing composition positive control",
    );
    assert.ok(
      !modules.some((path) => /packages\/(?:svg|jpeg|png|fontkit|fontkite)\//u.test(path)),
      "Unrequested feature dependency",
    );
  }
  if (platform === "browser")
    assert.ok(!modules.some((path) => /packages\/[^/]+\/dist\/(?:node|cjs)\//u.test(path)), "Wrong browser condition");
}

async function consumer(profile: string, contents: string, platform: "browser" | "node", minify: boolean) {
  const label = `${profile}-${platform}-${minify ? "min" : "raw"}`;
  const result = await build({
    stdin: { contents, resolveDir: root, sourcefile: `${profile}.ts`, loader: "ts" },
    bundle: true,
    minify,
    target: "es2022",
    platform,
    format: "esm",
    conditions: platform === "browser" ? ["browser"] : ["node", "import"],
    metafile: true,
    write: false,
  });
  const bytes = result.outputFiles[0]?.contents;
  assert.ok(bytes);
  const modules = Object.keys(result.metafile.inputs);
  await checkConsumerGraph(profile, modules, platform);
  await sourceIndexGraph(modules, result.outputFiles[0]!.text, profile.startsWith("textFlow"), root);
  metrics[`consumer/${label}/bytes`] = bytes.length;
  // Node emits a zero-mtime gzip header; level is fixed for paired measurements.
  metrics[`consumer/${label}/gzip`] = gzipSync(bytes, { level: 9 }).length;
  await writeFile(resolve(out, `${label}.mjs`), bytes);
  await writeFile(resolve(out, `${label}.meta.json`), JSON.stringify(result.metafile, null, 2));
  return { label, modules, minify, platform };
}

async function compare() {
  if (!values.compare) return undefined;
  const baseline = JSON.parse(await readFile(resolve(values.compare), "utf8"));
  const before: Record<string, number> = baseline.metrics;
  return Object.fromEntries(
    [...new Set([...Object.keys(before), ...Object.keys(metrics)])].sort().map((key) => {
      const base = before[key];
      const current = metrics[key];
      const delta = base === undefined || current === undefined ? null : current - base;
      return [
        key,
        {
          base: base ?? null,
          current: current ?? null,
          delta,
          percent: delta === null || !base ? null : (100 * delta) / base,
          status: base === undefined ? "new; absolute cost only" : current === undefined ? "removed" : "paired",
        },
      ];
    }),
  );
}

await mkdir(out, { recursive: true });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
const workspace = await packages();
for (const field of ["size", "unpackedSize"] as const)
  metrics[`total/pack/${field}`] = workspace.libraries.reduce((sum, entry) => sum + entry.pack[field], 0);
for (const kind of ["browserEsm", "nodeFacade", "cjs"])
  for (const type of ["js", "declarations"])
    metrics[`total/emitted/${kind}/${type}`] = Object.entries(metrics)
      .filter(([key]) => key.startsWith("emitted/") && key.endsWith(`/${kind}/${type}`))
      .reduce((sum, [, bytes]) => sum + bytes, 0);
const consumers = [];
const inputs = {
  ...textFlowCostInputs(),
  textFlowExclusion: exclusionCostInput(),
  textFlowProfile: profileCostInput(),
  textFlowSiblings: siblingCostInput(),
  textFlowPath: pathCostInput(),
};
for (const [profile, contents] of Object.entries(inputs)) {
  for (const platform of ["browser", "node"] as const) {
    for (const minify of [false, true]) consumers.push(await consumer(profile, contents, platform, minify));
  }
}
const report = {
  root,
  revision: run("git", ["rev-parse", "HEAD"]).trim(),
  dirty: run("git", ["status", "--porcelain=v1", "--untracked-files=all"]),
  lockSha256: createHash("sha256")
    .update(await readFile(resolve(root, "package-lock.json")))
    .digest("hex"),
  versions: {
    node: process.version,
    npm: run("npm", ["--version"]).trim(),
    esbuild: version,
    typescript: run("npm", ["exec", "--", "tsc", "--version"]).trim(),
  },
  flags: {
    target: "es2022",
    format: "esm",
    gzip: { level: 9, mtime: 0 },
    bundle: true,
    build: "npm run build",
    pack: "npm pack --ignore-scripts --json --pack-destination OUT",
  },
  packageMeaning: "Package payload only, NOT dependency closure; installed dependency footprint unavailable",
  newRuntimePackages: ["@updf/text-flow"],
  ...workspace,
  consumers,
  inputs,
  metrics,
  comparison: await compare(),
};
await writeFile(resolve(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log({
  report: resolve(out, "report.json"),
  libraries: workspace.libraries.length,
  comparisons: report.comparison ? Object.keys(report.comparison).length : 0,
  totals: Object.fromEntries(Object.entries(metrics).filter(([key]) => key.startsWith("total/"))),
  nonzeroDeltas: Object.entries(report.comparison ?? {}).filter(([, row]) => row.delta !== 0),
});
