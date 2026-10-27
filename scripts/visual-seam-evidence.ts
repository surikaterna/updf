import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { textFlowEntryGraph } from "./text-flow-entry-graph.js";

const root = process.cwd();
const out = resolve("artifacts/text-flow/image-visual-seam-final");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const originalDirectory = "/tmp/opencode/updf-s5a1-original-fresh-costs";
const checkpointDirectory = "/tmp/opencode/updf-s5a1-checkpoint-fresh-costs";
const original = await read(`${originalDirectory}/report.json`);
const checkpoint = await read(`${checkpointDirectory}/report.json`);
const current = await read(`${out}/report.json`);
const historicalPath = "artifacts/text-flow/library-baseline/report.json";
const historical = await read(historicalPath);
const hash = (source: string) => createHash("sha256").update(source).digest("hex");

async function installed(directory: string, report: typeof original) {
  const target = await mkdtemp("/tmp/opencode/updf-s5a1-packed-loads-");
  for (const library of report.libraries) {
    const destination = resolve(target, "node_modules", library.name);
    await mkdir(destination, { recursive: true });
    execFileSync("tar", ["-xzf", resolve(directory, library.pack.filename), "--strip-components=1", "-C", destination]);
  }
  return target;
}

async function loaded(directory: string, entries: readonly string[]) {
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
    process.stdout.write(JSON.stringify([...seen]));
  `,
      ],
      { cwd: directory, encoding: "utf8" },
    ),
  );
  const files = modules.filter((path) => path.startsWith(directory));
  const sizes = await Promise.all(files.map(async (path) => (await readFile(path)).length));
  return {
    modules: files.map((path) => path.slice(directory.length + 1)),
    moduleCount: files.length,
    bytes: sizes.reduce((a, b) => a + b, 0),
  };
}

function comparison(before: typeof original) {
  return Object.fromEntries(
    Object.entries(current.metrics).map(([key, value]) => {
      const base = before.metrics[key];
      return [
        key,
        { before: base ?? null, current: value, delta: base === undefined ? null : (value as number) - base },
      ];
    }),
  );
}

function sourcePairing(before: typeof original) {
  return Object.fromEntries(
    Object.entries(current.inputs).map(([name, source]) => [
      name,
      {
        before: before.inputs[name] === undefined ? null : hash(before.inputs[name]),
        current: hash(source as string),
        pairing:
          before.inputs[name] === undefined
            ? "new; absolute cost only"
            : before.inputs[name] === source
              ? "identical source"
              : "different source; not a matched document",
      },
    ]),
  );
}

function timing(profile: string) {
  const path = resolve(out, `${profile}-node-raw.mjs`);
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--expose-gc",
        "--input-type=module",
        "-e",
        `
    import assert from 'node:assert/strict';
    import {pathToFileURL} from 'node:url';
    const start=performance.now();
    const {result}=await import(pathToFileURL(${JSON.stringify(path)}));
    const importMs=performance.now()-start;
    const firstStart=performance.now();const first=result();const firstMs=performance.now()-firstStart;
    assert.equal(first.pageCount,1);assert.equal(first.placements[0].box.height,20);
    for(let i=0;i<20;i++)result();
    global.gc();const before=process.memoryUsage().heapUsed;
    const samples=[];let last;
    for(let batch=0;batch<5;batch++){
      const start=performance.now();for(let i=0;i<100;i++)last=result();
      samples.push((performance.now()-start)/100);
    }
    assert.deepEqual(last.document,first.document);
    global.gc();const after=process.memoryUsage().heapUsed;
    process.stdout.write(JSON.stringify({importMs,firstMs,warmMsPerLayout:samples,
      retainedHeapDelta:after-before,pageCount:first.pageCount,placements:first.placements}));
  `,
      ],
      { cwd: root, encoding: "utf8" },
    ),
  );
}

assert.deepEqual(original.flags, current.flags);
assert.deepEqual(checkpoint.flags, current.flags);
assert.deepEqual(original.versions, current.versions);
assert.deepEqual(checkpoint.versions, current.versions);
assert.equal(original.lockSha256, current.lockSha256);
assert.equal(checkpoint.lockSha256, current.lockSha256);
for (const [name, source] of Object.entries(original.inputs)) assert.equal(current.inputs[name], source, name);
for (const [key, value] of Object.entries(current.metrics)) {
  if (
    key.startsWith("emitted/@updf/core/") ||
    key.startsWith("pack/@updf/core/") ||
    key.startsWith("consumer/drawing-")
  )
    assert.equal(value, original.metrics[key], key);
}
const originalRoot = await installed(originalDirectory, original);
const checkpointRoot = await installed(checkpointDirectory, checkpoint);
const profiles: Record<string, readonly string[]> = {
  drawing: ["@updf/core"],
  ordinaryText: ["@updf/text"],
  layout: ["@updf/layout"],
  textFlowSiblings: ["@updf/text-flow"],
  textFlowPath: ["@updf/text-flow", "@updf/text-flow/path"],
  visualOrdinary: ["@updf/layout", "@updf/layout/internal-visual"],
  textFlowVisual: ["@updf/layout", "@updf/layout/internal-visual", "@updf/text-flow"],
};
const loads: Record<string, object> = {};
for (const [name, entries] of Object.entries(profiles)) {
  const final = await loaded(root, entries);
  textFlowEntryGraph(name, final.modules);
  assert.ok(!final.modules.some((p) => /\/(?:jpeg|png|svg|fontkit|fontkite)\//u.test(p)));
  const before = name.includes("Visual") || name === "visualOrdinary" ? null : await loaded(originalRoot, entries);
  const prior = before ? await loaded(checkpointRoot, entries) : null;
  loads[name] = {
    current: final,
    original: before,
    checkpoint: prior,
    originalDelta: before
      ? { bytes: final.bytes - before.bytes, modules: final.moduleCount - before.moduleCount }
      : null,
    checkpointDelta: prior
      ? { bytes: final.bytes - prior.bytes, modules: final.moduleCount - prior.moduleCount }
      : null,
  };
}
const timingProfiles = Object.fromEntries(
  ["visualOrdinary", "textFlowVisual"].map((name) => [
    name,
    {
      meaning: "Absolute local timing; no speed claim or historical timing pair",
      samples: [timing(name), timing(name), timing(name)],
    },
  ]),
);
const summary = {
  original: { directory: originalDirectory, comparison: comparison(original), inputs: sourcePairing(original) },
  checkpoint: { directory: checkpointDirectory, comparison: comparison(checkpoint), inputs: sourcePairing(checkpoint) },
  historical: {
    path: historicalPath,
    revision: historical.revision,
    lockMatches: historical.lockSha256 === current.lockSha256,
    flagsMatch: JSON.stringify(historical.flags) === JSON.stringify(current.flags),
    comparison: comparison(historical),
    inputs: sourcePairing(historical),
    meaning: "Full historical costs retained as context, not a same-lock matched slice comparison",
  },
  loads,
  timingProfiles,
  packageMeaning: current.packageMeaning,
};
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    {
      loads,
      timingProfiles,
      packages: Object.fromEntries(
        Object.entries(current.metrics).filter(([key]) => key.startsWith("pack/") || key.startsWith("total/pack/")),
      ),
    },
    null,
    2,
  ),
);
