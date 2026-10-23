import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";

const before = "artifacts/text-flow/entry-isolation-before";
const after = process.env.TEXT_FLOW_ENTRY_EVIDENCE_OUT ?? "artifacts/text-flow/entry-isolation-after";
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fileHash = async (p: string) => hash(await readFile(p));
async function files(p: string): Promise<string[]> {
  const entries = await readdir(p, { withFileTypes: true });
  return (
    await Promise.all(entries.map((e) => (e.isDirectory() ? files(`${p}/${e.name}`) : [`${p}/${e.name}`])))
  ).flat();
}
function migrated(profile: string, input: string): string {
  if (["textFlow", "textFlowExclusion", "textFlowProfile"].includes(profile))
    return input
      .replaceAll("createTextFlow", "createAtomicTextFlow")
      .replace("'@updf/text-flow'", "'@updf/text-flow/atomic'");
  if (profile === "textFlowSiblings" || profile === "textFlowPath") {
    const selection = input
      .replaceAll("createTextComposition", "createTextSelection")
      .replace("'@updf/text/composition'", "'@updf/text/selection'");
    return profile === "textFlowPath"
      ? selection
          .replaceAll("createTextFlow", "createPathTextFlow")
          .replace("'@updf/text-flow'", "'@updf/text-flow/path'")
      : selection;
  }
  return input;
}
async function execute(path: string, profile: string) {
  const raw = await readFile(path, "utf8");
  const check = /function checkLimit\d*\((\w+), (\w+), (\w+), (\w+)\) \{/gu;
  assert.equal([...raw.matchAll(check)].length, 1);
  const charges: Record<string, number[]> = {};
  const code = raw
    .replace(check, "$& (globalThis.__entryCharges[$4] ??= []).push($1);")
    .replace("this.totals[key] += amount;", "(globalThis.__entryCharges['kernel/'+key] ??= []).push(amount); $&");
  Reflect.set(globalThis, "__entryCharges", charges);
  try {
    const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const argument = await sampleArgument(profile);
    const output = module.size
      ? module.size(argument)
      : typeof module.pdf === "function"
        ? module.pdf(argument)
        : module.pdf;
    return { output, result: module.result, charges, bundleSha256: hash(raw) };
  } finally {
    Reflect.deleteProperty(globalThis, "__entryCharges");
  }
}
async function sampleArgument(profile: string) {
  if (profile === "preparedFont")
    return {
      ...(await json("tests/fixtures/fonts/liberation-sans.json")),
      bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
    };
  if (profile === "jpeg") return new Uint8Array(await readFile("tests/fixtures/jpeg/color-2x2.jpg"));
  if (profile.startsWith("textFlow"))
    return [
      {
        runs: [{ text: "Same rich source, same owned resources." }],
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
        lineHeight: 12,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ];
  return "Same ordinary source";
}
async function parity() {
  const base = await json(`${before}/costs/report.json`),
    current = await json(`${after}/costs/report.json`);
  assert.equal(base.lockSha256, current.lockSha256);
  const pairs = [];
  for (const [profile, input] of Object.entries(base.inputs)) {
    assert.equal(
      current.inputs[profile],
      migrated(profile, input as string),
      `${profile}: only explicit entry migration`,
    );
    for (const platform of ["browser", "node"])
      pairs.push(await runtimePair(profile, platform, input as string, current.inputs[profile]));
  }
  for (const [key, row] of Object.entries(current.comparison)) {
    if (/^(?:pack|emitted)\//u.test(key) && !/@updf\/(?:text|text-flow)\//u.test(key))
      assert.equal((row as { delta: number }).delta, 0, key);
    if (key.startsWith("consumer/") && !key.startsWith("consumer/textFlow"))
      assert.equal((row as { delta: number }).delta, 0, key);
  }
  const inventory = Object.fromEntries(
    await Promise.all((await files(`${before}/costs`)).map(async (p) => [p, await fileHash(p)])),
  );
  await writeFile(
    `${after}/parity.json`,
    JSON.stringify(
      {
        baselineMetrics: Object.keys(base.metrics).length,
        currentMetrics: Object.keys(current.metrics).length,
        baselineCostHashes: inventory,
        pairs,
        nonzeroCosts: Object.fromEntries(
          Object.entries(current.comparison).filter(([, r]) => (r as { delta: number }).delta !== 0),
        ),
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log({ pairedRuntimeCases: pairs.length, metrics: Object.keys(current.metrics).length });
}
async function runtimePair(profile: string, platform: string, input: string, currentInput: string) {
  const label = `${profile}-${platform}-raw`;
  const old = await execute(`${before}/costs/${label}.mjs`, profile);
  const fresh = await execute(`${after}/costs/${label}.mjs`, profile);
  assert.deepEqual(fresh.output, old.output, `${label}: output/PDF`);
  assert.deepEqual(fresh.result, old.result, `${label}: layout/provenance`);
  assert.deepEqual(fresh.charges, old.charges, `${label}: cumulative charge order`);
  return {
    label,
    inputKind: currentInput === input ? "unchanged ordinary fixture" : "explicit entry migration",
    beforeInputSha256: hash(input),
    afterInputSha256: hash(currentInput),
    beforeBundleSha256: old.bundleSha256,
    afterBundleSha256: fresh.bundleSha256,
    outputSha256: hash(JSON.stringify(fresh.output)),
    resultSha256: hash(JSON.stringify(fresh.result) ?? "undefined"),
    charges: fresh.charges,
  };
}
async function protectedState() {
  const manifest = await json(`${before}/manifest.json`);
  const protectedPaths = [
    ...manifest.history,
    ...manifest.dist,
    ...manifest.sources.filter((p: string) => /^packages\/(?:core|layout|layout-boxes|fonts|geometry)\//u.test(p)),
  ];
  for (const p of protectedPaths) assert.equal(await fileHash(p), manifest.hashes[p], p);
  assert.equal(execFileSync("ps", ["-p", "665048", "-o", "pid=,args="], { encoding: "utf8" }), manifest.pid);
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), manifest.head);
  assert.equal(execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" }), "");
  for (const check of manifest.urls) {
    const response = await fetch(`http://100.74.77.69:5182/updf/${check.path}`);
    assert.equal(response.status, 200);
    assert.equal(hash(new Uint8Array(await response.arrayBuffer())), check.hash);
  }
  const parity = await json(`${after}/parity.json`);
  for (const [p, sha] of Object.entries(parity.baselineCostHashes)) assert.equal(await fileHash(p), sha, p);
  console.log({
    historicalPreserved: manifest.history.length,
    servedDistPreserved: manifest.dist.length,
    protectedFiles: protectedPaths.length,
    pidAndHttpUnchanged: true,
  });
}
async function summary() {
  const current = await json(`${after}/costs/report.json`);
  const library = await json("artifacts/text-flow/library-baseline/report.json");
  const historical = Object.fromEntries(
    Object.entries(current.metrics).map(([key, n]) => [
      key,
      {
        before: library.metrics[key] ?? null,
        current: n,
        delta: library.metrics[key] === undefined ? null : (n as number) - library.metrics[key],
        status: library.metrics[key] === undefined ? "N/A: absent historical profile" : "historical; not same-lock",
      },
    ]),
  );
  const report = {
    pairedRevision: current.revision,
    libraryRevision: library.revision,
    libraryLock: library.lockSha256,
    currentLock: current.lockSha256,
    metricCount: Object.keys(current.metrics).length,
    historical,
    paired: current.comparison,
  };
  await writeFile(`${after}/cost-summary.json`, JSON.stringify(report, null, 2), { flag: "wx" });
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(current.comparison).filter(
          ([key]) =>
            key.startsWith("total/") || /consumer\/textFlow(?:Siblings|Path)?-(?:browser|node)-min\//u.test(key),
        ),
      ),
      null,
      2,
    ),
  );
}
async function seal() {
  await protectedState();
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trimEnd();
  const tracked = git("diff", "--name-only").split("\n").filter(Boolean);
  const untracked = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
  const hashes = Object.fromEntries(
    await Promise.all(
      [...tracked, ...untracked].map(async (path) => [
        path,
        path === "packages/text-flow/src/path-selection.ts" ? null : await fileHash(path),
      ]),
    ),
  );
  const artifacts = Object.fromEntries(
    await Promise.all((await files(after)).map(async (path) => [path, await fileHash(path)])),
  );
  const report = {
    cwd: process.cwd(),
    branch: git("branch", "--show-current"),
    head: git("rev-parse", "HEAD"),
    staged: git("diff", "--cached", "--name-only"),
    tracked,
    untracked,
    hashes,
    artifacts,
    status: "implemented; pending independent audit",
    issue: "N/A",
    commits: 0,
  };
  await writeFile(`${after}/delivery.json`, JSON.stringify(report, null, 2), { flag: "wx" });
  console.log({
    tracked: tracked.length,
    untracked: untracked.length,
    staged: report.staged,
    deliverySha256: await fileHash(`${after}/delivery.json`),
  });
}
if (process.argv[2] === "parity") await parity();
else if (process.argv[2] === "protected") await protectedState();
else if (process.argv[2] === "summary") await summary();
else if (process.argv[2] === "seal") await seal();
else throw new Error("Expected parity, protected, summary or seal");
