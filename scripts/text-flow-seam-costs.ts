import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const root = process.cwd();
const { values } = parseArgs({
  options: {
    out: { type: "string" },
    paired: { type: "string" },
    previous: { type: "string" },
  },
});
const current = values.out ?? "surgical-vs-baseline";
const directory = resolve(root, "artifacts/text-flow", current);
const reports = await Promise.all(
  ["library-baseline", values.previous ?? "runtime-final", current, values.paired ?? "surgical-vs-current"].map(
    async (name) => {
      const bytes = await readFile(resolve(root, `artifacts/text-flow/${name}/report.json`));
      return { name, sha256: createHash("sha256").update(bytes).digest("hex"), report: JSON.parse(bytes.toString()) };
    },
  ),
);
assert.deepEqual(reports[2]!.report.metrics, reports[3]!.report.metrics, "Both runs must measure the same delivery");
for (const before of reports.slice(0, 2)) {
  assert.deepEqual(before.report.flags, reports[2]!.report.flags, "Measurement flags must remain paired");
  for (const [profile, input] of Object.entries(before.report.inputs))
    if (profile !== "textFlow" || values.previous)
      assert.equal(input, reports[2]!.report.inputs[profile], `${profile} input changed`);
}
if (values.previous) {
  for (const [key, before] of Object.entries(reports[1]!.report.metrics)) {
    if (/^(?:emitted|pack)\//u.test(key) && !/^\w+\/@updf\/text(?:-flow)?\//u.test(key))
      assert.equal(reports[2]!.report.metrics[key], before, `Unchanged package cost: ${key}`);
  }
}
const groups: Record<string, RegExp> = {
  sealingAndAccounting: /\/core\/(?:native-leaf|native-leaf-ownership)\.js$/u,
  access: /\/core\/operation-capability\.js$/u,
  capture: /\/core\/(?:data|text-capture)\.js$/u,
  dispatch: /\/nodes\/(?:native-leaf|wiring|metadata)\.js$/u,
  operationWiring: /\/core\/(?:layout-operation|text-resources|text-service)\.js$|\/vdom\/measurement\.js$/u,
  layoutWiring: /\/layout\/dist\/(?:cjs\/)?(?:extension-producer|output-scan|content-measure)\.js$/u,
};
const retained = [];
function moduleBytes(meta: { outputs: Record<string, { inputs: Record<string, { bytesInOutput: number }> }> }) {
  const inputs: Record<string, number> = {};
  for (const output of Object.values(meta.outputs))
    for (const [path, value] of Object.entries(output.inputs)) inputs[path] = (inputs[path] ?? 0) + value.bytesInOutput;
  return inputs;
}
for (const profile of Object.keys(reports[2]!.report.inputs)) {
  for (const platform of ["browser", "node"]) {
    const label = `${profile}-${platform}-min`;
    const meta = JSON.parse(await readFile(resolve(directory, `${label}.meta.json`), "utf8"));
    const inputs = moduleBytes(meta);
    const categories = Object.fromEntries(
      Object.entries(groups).map(([name, pattern]) => [
        name,
        Object.fromEntries(Object.entries(inputs).filter(([path, bytes]) => bytes > 0 && pattern.test(path))),
      ]),
    );
    retained.push({ label, categories });
  }
}
const report = reports[2]!.report;
const optionalSubpath = report.libraries
  .find((entry: { name: string }) => entry.name === "@updf/text")
  .inventory.filter((entry: { path: string }) => /(?:^|\/)composition(?:-[\w-]+)?\./u.test(entry.path));
const summary = {
  meaning:
    "Exact esbuild bytesInOutput by module; shared-module totals, not attributable deltas or additive gzip costs",
  reports: reports.map(({ name, sha256 }) => ({ name, sha256 })),
  optionalSubpath,
  retained,
};
await writeFile(resolve(directory, "seams.json"), `${JSON.stringify(summary, null, 2)}\n`);
const selected = Object.entries(report.metrics).filter(
  ([key]) =>
    key.startsWith("total/") ||
    key.startsWith("emitted/@updf/core/") ||
    key.startsWith("pack/@updf/core/") ||
    /consumer\/.+-min\/gzip$/u.test(key) ||
    key.startsWith("emitted/@updf/text-flow/") ||
    key.startsWith("pack/@updf/text-flow/") ||
    key.startsWith("pack/@updf/text/") ||
    key.startsWith("emitted/@updf/text/"),
);
console.log(
  JSON.stringify(
    {
      reports: summary.reports,
      metrics: selected.map(([key, current]) => ({
        key,
        current,
        baseline: reports[0]!.report.metrics[key] ?? null,
        previous: reports[1]!.report.metrics[key] ?? null,
      })),
      retained: retained.map(({ label, categories }) => ({
        label,
        bytesInOutput: Object.fromEntries(
          Object.entries(categories).map(([key, modules]) => [
            key,
            Object.values(modules).reduce((sum, bytes) => sum + bytes, 0),
          ]),
        ),
      })),
      optionalSubpath,
    },
    null,
    2,
  ),
);
