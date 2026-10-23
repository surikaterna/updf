import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";
import type { Atom } from "../packages/text/src/wrap.js";
import type { ParagraphDefinition } from "../packages/text/src/types.js";

const root = process.cwd();
const artifact = resolve("artifacts/text-flow/wrap-optimization-sources.json");
const hash = (source: string) => createHash("sha256").update(source).digest("hex");
const source = async (name: string) => readFile(resolve(root, `packages/text/src/${name}.ts`), "utf8");
if (process.argv.includes("--capture")) {
  const old = execFileSync("git", ["show", "882d6d3:packages/text/src/wrap.ts"], { encoding: "utf8" });
  const sources = { old, wrap: await source("wrap"), selector: await source("wrap-selector") };
  await writeFile(
    artifact,
    JSON.stringify(
      { sources, hashes: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, hash(v)])) },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log({ captured: artifact });
  process.exit(0);
}
const saved = JSON.parse(await readFile(artifact, "utf8"));
async function observedHorizontal() {
  const contents = (await source("horizontal"))
    .replace(
      "export class HorizontalMeasure {",
      "export const observation = { measures: 0, horizontal: 0, joined: 0, adds: 0 }; export class HorizontalMeasure { constructor() { observation.measures++; }",
    )
    .replace(
      "  const measure = new HorizontalMeasure();",
      "  observation.horizontal++; const measure = new HorizontalMeasure();",
    )
    .replace(
      "  const advance = sum([a.advance, b.advance]);",
      "  observation.joined++; const advance = sum([a.advance, b.advance]);",
    )
    .replace("  add(metrics: RunMetrics): void {", "  add(metrics: RunMetrics): void { observation.adds++;");
  return { contents, loader: "ts" as const, resolveDir: resolve(root, "packages/text/src") };
}
async function implementation(name: string, observed = false) {
  const overrides: Record<string, string> =
    name === "old"
      ? { wrap: saved.sources.old }
      : name === "unoptimized"
        ? { wrap: saved.sources.wrap, "wrap-selector": saved.sources.selector }
        : {};
  const result = await build({
    stdin: {
      contents:
        'export {wrap} from "./packages/text/src/wrap.ts"; export {lineSelector} from "./packages/text/src/wrap-selector.ts"; export {ledger} from "./packages/text/src/ledger.ts";' +
        (observed ? 'export {observation} from "./packages/text/src/horizontal.ts";' : ""),
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [
      {
        name: "snapshot",
        setup(api) {
          if (observed) api.onLoad({ filter: /\/text\/src\/horizontal\.ts$/ }, observedHorizontal);
          api.onLoad({ filter: /\/text\/src\/(wrap|wrap-selector)\.ts$/ }, async ({ path }) => {
            const key = path.endsWith("wrap.ts") ? "wrap" : "wrap-selector";
            return {
              contents: overrides[key] ?? (await readFile(path, "utf8")),
              loader: "ts",
              resolveDir: resolve(root, "packages/text/src"),
            };
          });
        },
      },
    ],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.text).toString("base64")}#${name}`);
}
type WrapAPI = Pick<typeof import("../packages/text/src/wrap.js"), "wrap"> &
  Pick<typeof import("../packages/text/src/wrap-selector.js"), "lineSelector"> &
  Pick<typeof import("../packages/text/src/ledger.js"), "ledger">;
const implementations: Record<string, WrapAPI> = Object.fromEntries(
  await Promise.all(["old", "unoptimized", "optimized"].map(async (name) => [name, await implementation(name)])),
);
let seed = 0x58f03a;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
const style = { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const };
function atoms(text: string, varied = false, count?: { reads: number; textReads: number }): Atom[] {
  let offset = 0;
  return Array.from(text, (text, i) => {
    const start = offset;
    offset += text.length;
    const advance = varied ? [0.1, 0.3, 1, 2.7, 9][i % 5]! : 1;
    const atom: Atom = {
      text,
      start,
      end: offset,
      runIndex: i % 3,
      style: varied ? { ...style, fontSize: 8 + (i % 5) } : style,
      path: "/text",
      metrics: {
        advance,
        left: i % 7 ? 0 : -0.1,
        right: advance,
        ascent: 1,
        descent: 0,
        top: -1,
        bottom: 0,
        empty: text === " ",
      },
    };
    if (count) {
      Object.defineProperty(atom, "text", {
        enumerable: true,
        get() {
          count.textReads++;
          return text;
        },
      });
      Object.defineProperty(atom.metrics, "advance", {
        enumerable: true,
        get() {
          count.reads++;
          return advance;
        },
      });
    }
    return atom;
  });
}
function paragraph(
  whiteSpace: "collapse" | "preserve" = "collapse",
  breakLongWords: "error" | "codePoint" = "codePoint",
): ParagraphDefinition {
  return { runs: [], defaultStyle: style, lineHeight: 2, align: "left", whiteSpace, breakLongWords };
}
function outcome(api: (typeof implementations)[string], input: Atom[], width: number, p: ParagraphDefinition) {
  try {
    return api.wrap(input, width, p, api.ledger(), "");
  } catch (error) {
    return JSON.parse(JSON.stringify(error));
  }
}
function variable(api: (typeof implementations)[string], input: Atom[], widths: number[], p: ParagraphDefinition) {
  const charges: number[] = [];
  const selector = api.lineSelector(input, p, api.ledger(), "", (n: number) => charges.push(n));
  const lines = [];
  for (let i = 0; !selector.done && i < input.length * 4 + 10; i++)
    lines.push(selector.next(widths[i % widths.length]!));
  return JSON.parse(JSON.stringify({ lines, charges, done: selector.done }));
}
function differential() {
  for (let i = 0; i < 30000; i++) {
    const text = Array.from(
      { length: Math.floor(random() * 80) },
      () => ["a", "b", " ", "\n", "😀"][Math.floor(random() * 5)]!,
    ).join("");
    const input = atoms(text, true).map((atom, j) => ({ ...atom, atomic: i % 4 === 0 && j % 7 === 0 }));
    const p = paragraph(random() < 0.5 ? "collapse" : "preserve", random() < 0.5 ? "error" : "codePoint");
    const width = 0.1 + random() * 35;
    const current = outcome(implementations.optimized!, input, width, p);
    assert.deepEqual(current, outcome(implementations.old!, input, width, p), `old case ${i}`);
    assert.deepEqual(current, outcome(implementations.unoptimized!, input, width, p), `unoptimized case ${i}`);
    assert.deepEqual(
      variable(implementations.optimized!, input, [width, 0.05, 40], p),
      variable(implementations.unoptimized!, input, [width, 0.05, 40], p),
      `variable case ${i}`,
    );
  }
}
const texts = [
  "A short ordinary paragraph with several words.",
  "The quick brown fox jumps over the lazy dog. ".repeat(180),
  "longword".repeat(1024),
  "Mixed style fractional advances with spaces. ".repeat(140),
];
const samples = texts.map((text, i) => atoms(text, i === 3));
const p = paragraph();
function trial(api: WrapAPI, iterations: number, inputs = samples) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) for (const input of inputs) api.wrap(input, 127, p, api.ledger(), "");
  return performance.now() - start;
}
function benchmark(inputs = samples) {
  const names = Object.keys(implementations);
  const iterations = inputs.length === 1 && inputs[0]!.length < 100 ? 10000 : 30;
  const warmupIterations = Math.ceil(iterations / 3);
  for (let i = 0; i < 12; i++) for (const name of names) trial(implementations[name]!, warmupIterations, inputs);
  const times: Record<string, number[]> = Object.fromEntries(names.map((name) => [name, []]));
  const orders = [];
  for (let round = 0; round < 24; round++) {
    const rotated = [...names.slice(round % 3), ...names.slice(0, round % 3)];
    const order = round % 2 ? rotated.reverse() : rotated;
    orders.push(order);
    for (const name of order) times[name]!.push(trial(implementations[name]!, iterations, inputs));
  }
  return {
    iterations,
    warmupRounds: 12,
    warmupIterations,
    orders,
    times,
    summary: Object.fromEntries(
      names.map((name) => {
        const sorted = [...times[name]!].sort((a, b) => a - b);
        return [name, { min: sorted[0], median: (sorted[11]! + sorted[12]!) / 2, max: sorted.at(-1) }];
      }),
    ),
  };
}
async function workCounts() {
  return Object.fromEntries(
    await Promise.all(
      Object.keys(implementations).map(async (name) => {
        const api = await implementation(name, true);
        const count = { reads: 0, textReads: 0 };
        for (const text of texts) api.wrap(atoms(text, true, count), 127, p, api.ledger(), "");
        assert.ok(api.observation.adds > 0 && api.observation.joined > 0);
        return [name, { ...count, ...api.observation }];
      }),
    ),
  );
}
differential();
const output = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  node: process.version,
  seed: "0x58f03a",
  timingInputs: texts,
  hashes: { ...saved.hashes, optimized: hash(await source("wrap-selector")) },
  constantCases: 30000,
  variableCases: 30000,
  benchmark: benchmark(),
  byFixture: samples.map((sample) => benchmark([sample])),
  work: await workCounts(),
};
await writeFile(
  resolve(process.argv[2] ?? "artifacts/text-flow/wrap-optimization-final.json"),
  JSON.stringify(output, null, 2),
);
console.log(JSON.stringify(output, null, 2));
