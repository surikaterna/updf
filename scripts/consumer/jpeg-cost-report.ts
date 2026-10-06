import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

interface Profile {
  profile: string;
  raw: number;
  gzip: number;
  input: string;
  modules: string[];
  contributions: { module: string; bytesInOutput: number }[];
}
const base = "artifacts/jpeg-resources";
const baseline = JSON.parse(await readFile(`${base}/baseline/report.json`, "utf8"));
const current = JSON.parse(await readFile(`${base}/current/report.json`, "utf8"));
assert.equal(baseline.node, current.node);
assert.equal(baseline.esbuild, current.esbuild);
function closure(paths: readonly string[]): string[] {
  return [
    ...new Set(
      paths
        .map((path) => /(?:^|\/)(packages\/[^/]+|node_modules\/(?:@[^/]+\/[^/]+|[^/]+))\//u.exec(path)?.[1])
        .filter(Boolean),
    ),
  ].sort() as string[];
}
const profiles = (current.profiles as Profile[]).map((profile) => {
  const before = (baseline.profiles as Profile[]).find((candidate) => candidate.profile === profile.profile);
  if (before) assert.equal(profile.input, before.input, "Existing workload changed");
  const retained = profile.contributions.filter(({ bytesInOutput }) => bytesInOutput > 0);
  return {
    profile: profile.profile,
    baselineRaw: before?.raw ?? null,
    raw: profile.raw,
    deltaRaw: before ? profile.raw - before.raw : null,
    baselineGzip: before?.gzip ?? null,
    gzip: profile.gzip,
    deltaGzip: before ? profile.gzip - before.gzip : null,
    parsedModules: profile.modules.length,
    retainedModules: retained.length,
    parsedClosure: closure(profile.modules),
    retainedClosure: closure(retained.map(({ module }) => module)),
  };
});
function drawingChanges(): { module: string; before: number; after: number; delta: number }[] {
  const before: Profile = baseline.profiles.find((profile: Profile) => profile.profile === "drawing");
  const after: Profile = current.profiles.find((profile: Profile) => profile.profile === "drawing");
  const normalize = (module: string) => module.slice(module.indexOf("packages/"));
  const old = new Map(before.contributions.map(({ module, bytesInOutput }) => [normalize(module), bytesInOutput]));
  return after.contributions
    .filter(({ module }) => module.includes("packages/"))
    .map(({ module, bytesInOutput }) => ({
      module,
      before: old.get(normalize(module)) ?? 0,
      after: bytesInOutput,
      delta: bytesInOutput - (old.get(normalize(module)) ?? 0),
    }))
    .filter(({ delta }) => delta !== 0)
    .sort((a, b) => b.delta - a.delta);
}
const report = {
  baselineRevision: "bb8395b07be4586ea3be181625de1e71ed301d37",
  conditions: ["browser"],
  target: "es2022",
  format: "esm",
  minify: true,
  node: current.node,
  esbuild: current.esbuild,
  profiles,
  packages: { baseline: baseline.packages, current: current.packages },
  assets: current.assets,
  drawingChanges: drawingChanges(),
  jpegComparison: "absolute only; baseline has no equivalent image API",
  mixedWorkload:
    "pdf(fontResource,jpegBytes) plus exported prepareFontResource for same-bundle identity; preparation cost retained; assets external",
};
await writeFile(`${base}/cost-summary.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(report);
