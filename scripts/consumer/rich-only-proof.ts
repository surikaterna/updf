import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import type { TextRun, TextRuntime } from "@updf/core/resources";

const revision = "ad0529e1f579fdff2ea7c9b72e9a7386bdc14e03";
const baseline = resolve(process.argv[2]!);
const inventory = execFileSync("git", ["ls-tree", "-r", "--format=%(objectname) %(path)", revision], {
  encoding: "utf8",
});
for (const line of inventory.trim().split("\n")) {
  const bytes = await readFile(join(baseline, line.slice(41)));
  assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), line.slice(0, 40));
}
function load(root: string) {
  const require = createRequire(join(root, "package.json"));
  return {
    core: require("@updf/core"),
    fonts: require("@updf/fonts"),
    text: require("@updf/text"),
    resources: require("@updf/core/resources"),
  };
}
const before = load(baseline),
  after = load(process.cwd());
const prepared = {
  ...JSON.parse(await readFile("tests/fixtures/fonts/liberation-sans.json", "utf8")),
  bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
};
const host: TextRuntime = {
  validateResource() {},
  validateText() {},
  lineMetrics: () => ({ ascent: 8, descent: 2 }),
  measure: (_resource, text) => ({
    advance: Array.from(text).length * 5,
    left: 0,
    right: Array.from(text).length * 5,
    ascent: 8,
    descent: 2,
    top: -8,
    bottom: 2,
    empty: !text,
    run: Object.freeze({}) as TextRun,
  }),
  joinRuns: () => Object.freeze({}) as TextRun,
};
function composition(library: ReturnType<typeof load>, mode: string) {
  const runtime =
    mode === "host"
      ? library === before
        ? { ...host, fixedPolicy: () => ({ baseline: "ascent", checkInk: false }) }
        : host
      : library.fonts.fontRuntime();
  const resource =
    mode === "host"
      ? library.resources.createOwnedResource({})
      : mode === "prepared"
        ? library.fonts.createPreparedFont(prepared)
        : library.fonts.createHelvetica();
  return {
    measurement: { resources: { Demo: resource }, measurer: library.text.createTextMeasurer({ runtime }) },
    rendering: {
      resources: { Demo: resource },
      text: library.text.createTextService({ runtime, defaultFont: "Demo" }),
      providers: mode === "host" ? [] : [library.fonts.fontProvider(runtime)],
    },
  };
}
function outcome(library: ReturnType<typeof load>, input: unknown, options: object) {
  try {
    return library.text.measureTextUnknown(input, options);
  } catch (error) {
    if (error instanceof library.core.DocumentError) return (error as { diagnostics: unknown }).diagnostics;
    throw error;
  }
}
let comparisons = 0,
  nativeComparisons = 0;
for (const mode of ["helvetica", "prepared", "host"]) {
  const old = composition(before, mode),
    current = composition(after, mode);
  const paragraph = {
    runs: [{ text: mode === "prepared" ? "А Б\nА" : "A B\nA" }],
    defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 0] },
    lineHeight: 12,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
  const input = { width: 20, paragraphs: [paragraph] };
  for (const value of [
    input,
    { ...input, height: 24 },
    { ...input, height: 23 },
    { ...input, paragraphs: [] },
    { ...input, paragraphs: [{ ...paragraph, runs: [] }] },
    { ...input, paragraphs: [{ ...paragraph, runs: [{ text: "" }] }] },
  ]) {
    assert.deepEqual(
      outcome(after, value, current.measurement),
      outcome(before, { ...value, kind: "rich" }, old.measurement),
    );
    comparisons++;
  }
  if (mode !== "host") {
    const document = {
      version: 1,
      pages: [
        {
          width: 100,
          height: 100,
          children: [
            {
              type: "richText",
              x: 0,
              y: 0,
              width: 90,
              height: 30,
              paragraphs: [paragraph],
            },
          ],
        },
      ],
    };
    assert.deepEqual(after.core.render(document, current.rendering), before.core.render(document, old.rendering));
    nativeComparisons++;
  }
}
console.log({
  revision,
  immutableSourceFiles: inventory.trim().split("\n").length,
  richDTOComparisons: comparisons,
  unchangedRichNativePDFComparisons: nativeComparisons,
  historicalPlainParity: "accepted E1/E2 semantic changes, not asserted",
  sizes: "separate sizes.ts rich-vs-rich reports",
});
