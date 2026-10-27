import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { textFlowEntryGraph } from "./text-flow-entry-graph.js";

const out = process.env.TEXT_FLOW_MANUAL_OUT ?? "artifacts/text-flow/manual-shapes-fixed";
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const before = await read("artifacts/text-flow/manual-shapes-before/costs/report.json");
const after = await read(`${out}/costs/report.json`);
const priorFinal = await read("artifacts/text-flow/manual-shapes-final/costs/report.json");
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const inputs = Object.fromEntries(
  Object.entries(after.inputs).map(([name, source]) => [
    name,
    {
      before: before.inputs[name] === undefined ? null : hash(before.inputs[name]),
      after: hash(source as string),
      pairing:
        before.inputs[name] === undefined
          ? "new; absolute cost only"
          : before.inputs[name] === source
            ? "identical source"
            : "same authored content; intentional canonical API migration",
    },
  ]),
);
const profiles = {
  drawing: ["@updf/core"],
  ordinaryText: ["@updf/text"],
  layout: ["@updf/layout"],
  authoredRender: ["@updf/layout/render"],
  textFlowSiblings: ["@updf/text-flow"],
  textFlowPath: ["@updf/text-flow", "@updf/text-flow/path"],
  textFlowSyntax: ["@updf/text-flow", "@updf/text-flow/path", "@updf/text-flow/syntax"],
  textFlowSources: ["@updf/text-flow/sources"],
  textFlow: ["@updf/text-flow/atomic", "@updf/text/composition"],
};
async function loaded(root: string, entries: string[]) {
  const modules: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--no-experimental-require-module",
        "-e",
        `
    const Module=require('node:module'),seen=new Set(),load=Module._load;
    Module._load=function(id,parent,...rest){seen.add(Module._resolveFilename(id,parent));return load.call(this,id,parent,...rest)};
    for(const id of ${JSON.stringify(entries)})require(id);
    process.stdout.write(JSON.stringify([...seen]));`,
      ],
      { cwd: root, encoding: "utf8" },
    ),
  );
  const files = modules.filter((path) => path.startsWith(root));
  const bytes = await Promise.all(files.map(async (path) => (await readFile(path)).length));
  return {
    moduleCount: files.length,
    bytes: bytes.reduce((a, b) => a + b, 0),
    modules: files.map((path) => path.slice(root.length + 1)),
  };
}
const baseline = await mkdtemp("/tmp/opencode/updf-s3-baseline-pack-loads-");
for (const library of before.libraries) {
  const target = resolve(baseline, "node_modules", library.name);
  await mkdir(target, { recursive: true });
  execFileSync("tar", [
    "-xzf",
    resolve("artifacts/text-flow/manual-shapes-before/costs", library.pack.filename),
    "--strip-components=1",
    "-C",
    target,
  ]);
}
const loads: Record<string, object> = {};
for (const [name, entries] of Object.entries(profiles)) {
  const current = await loaded(process.cwd(), entries);
  textFlowEntryGraph(name, current.modules);
  const prior = ["textFlowSources", "textFlowSyntax"].includes(name) ? null : await loaded(baseline, entries);
  loads[name] = {
    current,
    before: prior,
    delta: prior ? { bytes: current.bytes - prior.bytes, moduleCount: current.moduleCount - prior.moduleCount } : null,
  };
}
assert.equal(after.lockSha256, before.lockSha256);
assert.deepEqual(after.versions, before.versions);
const consumers = Object.fromEntries(
  Object.entries(after.comparison).filter(([key]) => /consumer\/.*-min\//u.test(key)),
);
const totals = Object.fromEntries(Object.entries(after.comparison).filter(([key]) => key.startsWith("total/")));
const fixedDelta = Object.fromEntries(
  Object.entries(after.metrics).map(([key, value]) => [key, (value as number) - priorFinal.metrics[key]]),
);
for (const [key, delta] of Object.entries(fixedDelta)) {
  if (
    /^emitted\/(?!@updf\/text-flow\/)/u.test(key) ||
    /^consumer\/(?!textFlow)/u.test(key) ||
    key.includes("consumer/textFlowSources-")
  )
    assert.equal(delta, 0, `Must-fix slice changed protected retained cost: ${key}`);
}
assert.deepEqual(after.inputs, priorFinal.inputs);
assert.deepEqual(after.flags, priorFinal.flags);
await writeFile(
  `${out}/summary.json`,
  JSON.stringify({ inputs, loads, consumers, totals, fixedDelta, packageMeaning: after.packageMeaning }, null, 2),
);
console.log(
  JSON.stringify(
    {
      inputs,
      baseline,
      loads,
      consumers,
      totals,
    },
    null,
    2,
  ),
);
