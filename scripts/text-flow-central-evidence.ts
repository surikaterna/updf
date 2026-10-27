import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const out = "artifacts/text-flow";
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fileHash = async (path: string) => hash(await readFile(path));

function loaded(root: string, entries: string[]): string[] {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--no-experimental-require-module",
        "-e",
        `
    const Module=require('node:module'), seen=new Set(), load=Module._load;
    Module._load=function(id,parent,...rest){seen.add(Module._resolveFilename(id,parent));return load.call(this,id,parent,...rest)};
    for(const entry of ${JSON.stringify(entries)}) require(entry);
    process.stdout.write(JSON.stringify([...seen]));
  `,
      ],
      { cwd: root, encoding: "utf8" },
    ),
  );
}

async function preservation() {
  const before = await json(`${out}/central-before/manifest.json`);
  for (const path of [...before.history, ...before.dist]) assert.equal(await fileHash(path), before.hashes[path], path);
  const urls = [];
  for (const entry of before.urls) {
    try {
      const response = await fetch(`http://100.74.77.69:5182/updf/${entry.path}`, {
        signal: AbortSignal.timeout(3000),
      });
      urls.push({
        path: entry.path,
        status: response.status,
        hash: hash(new Uint8Array(await response.arrayBuffer())),
      });
    } catch {
      urls.push({ path: entry.path, status: "unavailable" });
    }
  }
  for (const [index, entry] of urls.entries()) {
    assert.equal(entry.status, 200, "Protected HTTP endpoint unavailable");
    assert.equal(entry.hash, before.urls[index].hash, "Protected HTTP fingerprint changed");
  }
  const pid =
    execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" })
      .split("\n")
      .find((line) => /^\s*665048\s/u.test(line)) ??
    "PID absent at assignment entry and seal; no process mutation performed";
  return { history: before.history.length, dist: before.dist.length, files: "all hashes match", pid, urls };
}

async function summary() {
  const before = await json(`${out}/central-before/costs/report.json`);
  const after = await json(`${out}/central-after/report.json`);
  const inputs = Object.fromEntries(
    Object.entries(after.inputs).map(([name, input]) => [
      name,
      {
        before: before.inputs[name] === undefined ? null : hash(before.inputs[name]),
        after: hash(input as string),
        pairing:
          name === "textFlowSiblings"
            ? "same document; API migrated"
            : before.inputs[name] === input
              ? "identical source"
              : "new opt-in profile",
      },
    ]),
  );
  const consumers = Object.fromEntries(
    Object.entries(after.comparison).filter(([key]) => /consumer\/.*-min\//u.test(key)),
  );
  const payloads = Object.fromEntries(
    Object.entries(after.comparison).filter(([key]) => /^(?:pack|total|emitted)\//u.test(key)),
  );
  const { traces, loadComparison } = await traceEvidence();
  const result = { inputs, consumers, payloads, traces, loadComparison, packageMeaning: after.packageMeaning };
  await writeFile(`${out}/central-summary.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      { consumers, totals: Object.fromEntries(Object.entries(payloads).filter(([k]) => k.startsWith("total/"))) },
      null,
      2,
    ),
  );
}

async function traceEvidence() {
  const traces = Object.fromEntries(
    Object.entries({
      drawing: ["@updf/core"],
      ordinaryText: ["@updf/text"],
      layout: ["@updf/layout"],
      authoredRender: ["@updf/layout/render"],
      rectangle: ["@updf/text-flow"],
      path: ["@updf/text-flow/path"],
      atomic: ["@updf/text-flow/atomic"],
    }).map(([name, entries]) => [
      name,
      loaded(process.cwd(), entries).map((path) => path.replace(`${process.cwd()}/`, "")),
    ]),
  );
  for (const name of ["drawing", "ordinaryText", "layout", "authoredRender"]) {
    assert.ok(
      !traces[name]!.some((path) =>
        /text-flow\/|text\/dist\/.*(?:source-index|indexed-selector|inline-selection|composition)\./u.test(path),
      ),
    );
  }
  assert.ok(!traces.drawing!.some((path) => /(?:layout|text|fonts)\/dist\//u.test(path)));
  assert.ok(
    !traces.rectangle!.some((path) => /geometry\/dist\/|text-flow\/dist\/.*(?:path-band|atomic)\.js$/u.test(path)),
  );
  const baselineLoads = await json(`${out}/central-base-loads.json`);
  const loadComparison = Object.fromEntries(
    Object.entries(baselineLoads.traces).map(([name, previous]) => {
      const beforePaths = previous as string[];
      const current = traces[name]!;
      return [
        name,
        {
          added: current.filter((p) => !beforePaths.includes(p)),
          removed: beforePaths.filter((p) => !current.includes(p)),
        },
      ];
    }),
  );
  return { traces, loadComparison };
}

async function seal() {
  assert.equal(git("rev-parse", "HEAD"), "fbf2f78fd59635c6b965f2a707f35508dc1e4392");
  assert.equal(git("diff", "--cached", "--name-only"), "");
  const paths = git("ls-files", "-m", "-o", "--exclude-standard").split("\n").filter(Boolean);
  const hashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await fileHash(path)])));
  const patch = git("diff", "--binary", "HEAD");
  await writeFile(`${out}/central-final.patch`, patch);
  const state = {
    cwd: resolve("."),
    branch: git("branch", "--show-current"),
    base: git("rev-parse", "HEAD"),
    issue: "N/A",
    status: "engineering evidence; consult delivery notes for readiness",
    hashes,
    staged: [],
    statusOutput: git("status", "--short"),
    patchSha256: hash(patch),
    preserved: await preservation(),
  };
  await writeFile(`${out}/central-final.json`, JSON.stringify(state, null, 2));
  console.log(state.preserved);
}

if (process.argv[2] === "summary") await summary();
else if (process.argv[2] === "seal") await seal();
else throw new Error("Use summary or seal");
