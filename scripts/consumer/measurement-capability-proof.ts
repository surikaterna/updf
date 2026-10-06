import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TextRun, TextRuntime } from "@updf/core/resources";

const baseline = resolve(process.argv[2]!);
const beforeDirectory = resolve(process.argv[3]!);
const afterDirectory = resolve(process.argv[4]!);
const output = resolve("artifacts/text-measurer");
const revision = "d179f0123b833c96531c7a4695ccd5e4bdb3a2e8";
await mkdir(output, { recursive: true });
const inventory = execFileSync("git", ["ls-tree", "-r", "--format=%(objectname) %(path)", revision], {
  encoding: "utf8",
});
for (const line of inventory.trim().split("\n")) {
  const bytes = await readFile(join(baseline, line.slice(41)));
  const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(hash, line.slice(0, 40), `Merged baseline modified: ${line.slice(41)}`);
}
for (const name of ["core", "fonts", "text", "layout-kernel"])
  assert.equal(await realpath(join(baseline, "node_modules/@updf", name)), join(baseline, "packages", name));
for (const name of ["typescript", "esbuild", "vite"]) {
  const before = JSON.parse(await readFile(join(baseline, "node_modules", name, "package.json"), "utf8"));
  const after = JSON.parse(await readFile(join("node_modules", name, "package.json"), "utf8"));
  assert.equal(before.version, after.version);
}
const load = (root: string) => {
  const require = createRequire(join(root, "package.json"));
  return {
    core: require("@updf/core"),
    resources: require("@updf/core/resources"),
    fonts: require("@updf/fonts"),
    text: require("@updf/text"),
  };
};
const before = load(baseline),
  after = load(process.cwd());
assert.equal(before.text.createTextMeasurer, undefined, "Baseline must execute the supported old API");
const fontInput = {
  ...JSON.parse(await readFile("tests/fixtures/fonts/liberation-sans.json", "utf8")),
  bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
};
function hostRuntime(): TextRuntime {
  return {
    validateResource() {},
    validateText() {},
    fixedPolicy: () => ({ baseline: "ascent", checkInk: false }),
    lineMetrics: () => ({ ascent: 8, descent: 2 }),
    measure: (_resource, text) => ({
      advance: text.length * 5,
      left: 0,
      right: text.length * 5,
      ascent: 8,
      descent: 2,
      top: -8,
      bottom: 2,
      empty: !text,
      run: Object.freeze({}) as TextRun,
    }),
    joinRuns: () => Object.freeze({}) as TextRun,
  };
}
function composition(library: ReturnType<typeof load>, mode: string, current: boolean) {
  const resource =
    mode === "host"
      ? library.resources.createOwnedResource({ host: true })
      : mode === "prepared"
        ? library.fonts.createPreparedFont(fontInput)
        : library.fonts.createHelvetica();
  const runtime = mode === "host" ? hostRuntime() : library.fonts.fontRuntime();
  const configured = { runtime, defaultFont: "Demo" };
  return current
    ? { resources: { Demo: resource }, measurer: library.text.createTextMeasurer(configured) }
    : { resources: { Demo: resource }, text: library.text.createTextService(configured) };
}
function outcome(library: ReturnType<typeof load>, input: unknown, options: object) {
  try {
    const result = library.text.measureTextUnknown(input, options);
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.lines));
    return result;
  } catch (error) {
    if (error instanceof library.core.DocumentError) return (error as { diagnostics: unknown }).diagnostics;
    throw error;
  }
}
const cases = [];
for (const mode of ["helvetica", "prepared", "host"]) {
  const oldOptions = composition(before, mode, false),
    newOptions = composition(after, mode, true);
  const plain = {
    kind: "plain",
    text: mode === "prepared" ? "А Б\nА" : "A B\nA",
    width: 20,
    fontSize: 10,
    lineHeight: 12,
    align: "left",
  };
  const paragraph = {
    defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 0] },
    runs: [{ text: plain.text }],
    lineHeight: 12,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "codePoint",
  };
  const rich = { kind: "rich", width: 20, paragraphs: [paragraph] };
  for (const input of [
    plain,
    rich,
    { ...plain, text: "" },
    null,
    {},
    { ...plain, font: undefined },
    { ...plain, font: "Missing" },
    { ...rich, height: 1 },
    { ...rich, width: Infinity },
    { ...plain, text: "😀" },
  ]) {
    assert.deepEqual(outcome(after, input, newOptions), outcome(before, input, oldOptions));
    cases.push({ mode, input });
  }
  for (const limits of [{ textCodePoints: 0 }, { nodes: 0 }, { resourceBytes: 0 }, { pages: 0, outputBytes: 0 }])
    assert.deepEqual(outcome(after, rich, { ...newOptions, limits }), outcome(before, rich, { ...oldOptions, limits }));
}
const reports = [];
for (const profile of ["drawing", "helvetica", "prepared", "measurementFonts"]) {
  const old = await import(pathToFileURL(join(beforeDirectory, `${profile}.mjs`)).href);
  const current = await import(pathToFileURL(join(afterDirectory, `${profile}.mjs`)).href);
  if (profile === "measurementFonts") {
    for (const text of ["Hello", "A B\nA", ""]) assert.deepEqual(current.measure(text), old.measure(text));
  } else {
    const arg = profile === "prepared" ? fontInput : "Hello";
    assert.deepEqual(current.pdf(arg), old.pdf(arg), `${profile} merged-base PDF bytes changed`);
  }
  reports.push({ profile, equal: true });
}
const beforeReport = JSON.parse(await readFile(join(beforeDirectory, "report.json"), "utf8"));
const afterReport = JSON.parse(await readFile(join(afterDirectory, "report.json"), "utf8"));
assert.equal(beforeReport.esbuild, afterReport.esbuild);
assert.equal(beforeReport.node, afterReport.node);
const measurementGraphs = ["measurementFonts", "measurementHost"].map((name) => {
  const old = beforeReport.profiles.find((item: { profile: string }) => item.profile === name);
  const current = afterReport.profiles.find((item: { profile: string }) => item.profile === name);
  const fullOnly =
    /packages\/(?:core\/dist\/core\/(?:text-service|text-output)|text\/dist\/(?:service|inline|inline-paint))\.js$/u;
  type Contribution = { module: string; bytesInOutput: number };
  const removed = old.contributions.filter(
    (item: Contribution) => fullOnly.test(item.module) && item.bytesInOutput > 0,
  );
  const retained = current.contributions.filter(
    (item: Contribution) => fullOnly.test(item.module) && item.bytesInOutput > 0,
  );
  assert.ok(removed.length > 0, "Old full-service code must be retained for a non-vacuous baseline");
  assert.deepEqual(retained, [], `${name} retained nonmeasurement-only code`);
  return { profile: name, removed, retained };
});
const sizes = afterReport.profiles.map((profile: { profile: string; raw: number; gzip: number }) => {
  const old = beforeReport.profiles.find((item: typeof profile) => item.profile === profile.profile);
  return {
    profile: profile.profile,
    before: { raw: old.raw, gzip: old.gzip },
    after: { raw: profile.raw, gzip: profile.gzip },
    delta: { raw: profile.raw - old.raw, gzip: profile.gzip - old.gzip },
  };
});
for (const name of ["measurementFonts", "measurementHost"]) {
  const size = sizes.find((item: { profile: string }) => item.profile === name);
  assert.ok(size.delta.raw < 0 && size.delta.gzip < 0, `${name} must reduce both JS and gzip`);
}
const proof = {
  revision,
  baseline,
  node: process.version,
  trackedFiles: inventory.trim().split("\n").length,
  isolatedWorkspaceLinks: true,
  toolsMatch: true,
  reports,
  measurementGraphs,
  cases,
  sizes,
};
await writeFile(join(output, "merged-base-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log({ baseline: revision, cases: cases.length, reports, sizes });
