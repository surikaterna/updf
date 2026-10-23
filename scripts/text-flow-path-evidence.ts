import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = "artifacts/text-flow/side-path-runtime-before";
const final = "artifacts/text-flow/side-path-runtime-vs-before";
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const allowed = new Set([
  "package-lock.json",
  "packages/text-flow/package.json",
  "packages/text-flow/README.md",
  "packages/text-flow/src/index.ts",
  "packages/text-flow/src/sibling.ts",
  "packages/text-flow/src/path.ts",
  "packages/text-flow/src/path-band.ts",
  "packages/text-flow/src/path-selection.ts",
  "packages/layout/src/content-inline-selection.ts",
  "packages/layout/src/content-paragraph-output.ts",
  "packages/layout/src/content-producer.ts",
  "packages/layout/src/internal-participation.ts",
  "packages/text/src/composition.ts",
  "scripts/boundaries.ts",
  "scripts/package-edges.ts",
  "scripts/packed-consumer.ts",
  "scripts/text-flow-costs.ts",
  "scripts/text-flow-path-cost-input.ts",
  "scripts/text-flow-path-evidence.ts",
  "tests/fixtures/text-flow/side-path.tsx",
  "tests/browser/text-flow-path.test.ts",
  "tests/consumer/types/text-flow-path-template.tsx",
  "packages/text-flow/test/path-band.test.ts",
  "packages/text-flow/test/path-band-oracle.test.ts",
  "packages/text-flow/test/path-protocol.test.ts",
  "packages/text-flow/test/side-path.test.ts",
  "docs/evidence/text-flow-side-path.md",
]);
async function scope() {
  const frozen = await json(`${base}/source-manifest.json`);
  const files = git("ls-files", "--cached", "--others", "--exclude-standard")
    .split("\n")
    .filter((p) => !/\.log$/u.test(p));
  const changed: Record<string, { before: string | null; current: string }> = {};
  for (const path of files) {
    const current = hash(await readFile(path));
    const before = frozen.hashes[path] ?? null;
    if (current === before) continue;
    assert.ok(allowed.has(path), `Protected/new unowned input changed: ${path}`);
    changed[path] = { before, current };
  }
  for (const path of Object.keys(frozen.hashes)) assert.ok(files.includes(path), `Protected input deleted: ${path}`);
  assert.equal(git("diff", "--cached", "--name-only"), "");
  assert.equal(git("rev-parse", "HEAD"), frozen.head);
  const lock = await json("package-lock.json");
  delete lock.packages["packages/text-flow"].dependencies["@updf/geometry"];
  assert.equal(hash(`${JSON.stringify(lock, null, 2)}\n`), frozen.hashes["package-lock.json"], "Unrelated lock edit");
  return {
    cwd: process.cwd(),
    branch: git("branch", "--show-current"),
    head: frozen.head,
    frozenInputs: Object.keys(frozen.hashes).length,
    changed,
    staged: [],
    lockDelta: "Only addon @updf/geometry dependency; baseline lock was frozen before edits",
    status: git("status", "--porcelain=v1", "--untracked-files=all"),
  };
}
async function charged(path: string) {
  const raw = await readFile(path, "utf8");
  const pattern = /function checkLimit\d*\(value2, maximum, path, unit\) \{/gu;
  assert.equal([...raw.matchAll(pattern)].length, 1, "Quota instrumentation must match one real owner");
  assert.equal(raw.split("this.totals[key] += amount;").length, 2, "Kernel ledger instrumentation owner");
  const instrumented = raw
    .replace(pattern, "$& (globalThis.__sideCharges[unit] ??= []).push(value2);")
    .replace("this.totals[key] += amount;", "(globalThis.__sideCharges['kernel/'+key] ??= []).push(amount); $&");
  const charges: Record<string, number[]> = {};
  Reflect.set(globalThis, "__sideCharges", charges);
  try {
    const module = await import(`data:text/javascript;base64,${Buffer.from(instrumented).toString("base64")}`);
    return { module, charges };
  } finally {
    Reflect.deleteProperty(globalThis, "__sideCharges");
  }
}
async function proof() {
  const before = await json(`${base}/report.json`);
  assert.ok(Object.values(before.comparison).every((row) => (row as { delta: number }).delta === 0));
  const old = await charged(`${base}/textFlowSiblings-node-raw.mjs`);
  const current = await charged(`${final}/textFlowSiblings-node-raw.mjs`);
  assert.deepEqual(current.module.result, old.module.result, "Legacy rectangle placements/native output changed");
  assert.deepEqual(current.module.pdf, old.module.pdf, "Legacy rectangle complete PDF bytes changed");
  assert.deepEqual(current.charges, old.charges, "Legacy quota checks or kernel work charges changed");
  const path = await import(pathToFileURL(resolve(`${final}/textFlowPath-node-min.mjs`)).href);
  const pdfPath = `${final}/path.pdf`;
  await writeFile(pdfPath, path.pdf, { flag: "wx" });
  const qpdf = execFileSync("qpdf", ["--check", pdfPath], { encoding: "utf8" });
  const text = execFileSync("pdftotext", ["-raw", pdfPath, "-"], { encoding: "utf8" }).replace(/\s+/gu, " ").trim();
  assert.equal(
    text,
    `First styled source paragraph with contour text. ${"Second paragraph continues to full width. ".repeat(24).trim()}`,
  );
  const report = {
    baselineZeroDeltaMetrics: Object.keys(before.metrics).length,
    rectangle: {
      identicalPlacementsAndNativeOutput: true,
      identicalPdfBytes: true,
      identicalQuotaAndKernelChargeSequences: true,
      charges: current.charges,
    },
    path: { pages: path.result.pageCount, bytes: path.pdf.length, sha256: hash(path.pdf), qpdf, text },
  };
  await writeFile(`${final}/runtime-proof.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log({ baselineMetrics: report.baselineZeroDeltaMetrics, rectangleParity: true, path: report.path });
}
async function costs() {
  const before = await json(`${base}/report.json`),
    current = await json(`${final}/report.json`);
  const keys = Object.keys(current.comparison).filter((key) =>
    /consumer\/(?:layout|textFlowSiblings|textFlowPath)-|^pack\/@updf\/(?:layout|text|text-flow)\//u.test(key),
  );
  const ordinary = current.consumers.filter((consumer: { label: string }) => !consumer.label.startsWith("textFlow"));
  for (const consumer of ordinary)
    assert.ok(
      !consumer.modules.some((path: string) =>
        /text-flow\/|geometry\/.*(?:normalize|scanner)|inline-band|profile-interpolation/u.test(path),
      ),
    );
  const summary = {
    beforeLock: before.lockSha256,
    currentLock: current.lockSha256,
    beforeMetrics: Object.keys(before.metrics).length,
    currentMetrics: Object.keys(current.metrics).length,
    comparisons: Object.fromEntries(keys.map((key) => [key, current.comparison[key]])),
    ordinaryPathCodeAbsent: true,
    packageMeaning: current.packageMeaning,
  };
  await writeFile(`${final}/cost-summary.json`, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify(summary, null, 2));
}
if (process.argv.includes("--costs-only")) await costs();
else if (process.argv.includes("--scope-only")) {
  const report = await scope();
  await writeFile(`${final}/scope-summary.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log({ frozen: report.frozenInputs, changed: Object.keys(report.changed), staged: report.staged });
} else await proof();
