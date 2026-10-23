import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = "artifacts/text-flow/";
async function report(name: string) {
  const bytes = await readFile(`${root}${name}/report.json`);
  return { ...JSON.parse(bytes.toString()), sha256: createHash("sha256").update(bytes).digest("hex") };
}
const names = [
  "surgical-vs-baseline",
  "exclusion-fixed-vs-surgical",
  "exclusion-fixed-vs-baseline",
  "exclusion-optimization-before",
  "exclusion-optimized-vs-surgical",
  "exclusion-optimized-vs-unoptimized",
];
const [surgical, fixed, historical, before, current, repeat] = await Promise.all(names.map(report));
assert.deepEqual(before.metrics, fixed.metrics, "Fresh before-build reproduces audited delivery");
assert.deepEqual(current.metrics, repeat.metrics, "Independent complete builds reproduce final sizes");
assert.deepEqual(current.inputs, before.inputs);
for (const [profile, input] of Object.entries(surgical.inputs)) assert.equal(current.inputs[profile], input);
for (const entry of [surgical, fixed, historical, before, repeat]) {
  assert.deepEqual(current.flags, entry.flags);
  assert.deepEqual(current.versions, entry.versions);
  assert.equal(current.lockSha256, entry.lockSha256);
}
const unchangedPackages = [];
for (const library of current.libraries) {
  if (["@updf/text", "@updf/text-flow"].includes(library.name)) continue;
  unchangedPackages.push(library.name);
  for (const [key, value] of Object.entries(current.metrics)) {
    if (!key.startsWith(`pack/${library.name}/`) && !key.startsWith(`emitted/${library.name}/`)) continue;
    assert.equal(value, surgical.metrics[key], key);
    assert.equal(value, fixed.metrics[key], key);
  }
}
assert.equal(unchangedPackages.length, 13);
const metrics = Object.fromEntries(
  Object.entries(current.metrics).map(([key, value]) => [
    key,
    {
      current: value,
      versusSurgical: current.comparison[key]?.delta,
      versusUnoptimized: repeat.comparison[key]?.delta,
    },
  ]),
);
const paths = execFileSync("git", ["ls-files", "--modified", "--others", "--exclude-standard"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .sort();
const fingerprints = Object.fromEntries(
  await Promise.all(
    paths.map(async (path) => [
      path,
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    ]),
  ),
);
const output = {
  cwd: process.cwd(),
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  revision: current.revision,
  fingerprints,
  unchangedPackages,
  versions: current.versions,
  reports: Object.fromEntries(
    names.map((name, i) => [name, [surgical, fixed, historical, before, current, repeat][i].sha256]),
  ),
  packages: current.libraries.map((library: { name: string; pack: { size: number; unpackedSize: number } }) => ({
    name: library.name,
    ...library.pack,
  })),
  metrics,
};
await writeFile(`${root}wrap-optimization-cost-summary.json`, JSON.stringify(output, null, 2));
console.log(
  JSON.stringify(
    {
      reports: output.reports,
      versions: output.versions,
      unchangedPackages,
      packages: output.packages.map(
        ({ name, size, unpackedSize }: { name: string; size: number; unpackedSize: number }) => ({
          name,
          size,
          unpackedSize,
        }),
      ),
      consumers: Object.fromEntries(
        Object.entries(metrics).filter(([key]) => key.startsWith("consumer/") && key.includes("-min/")),
      ),
    },
    null,
    2,
  ),
);
