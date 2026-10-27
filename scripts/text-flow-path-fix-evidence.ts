import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const base = "artifacts/text-flow/side-path-runtime-before";
const oldFinal = "artifacts/text-flow/side-path-runtime-vs-before";
const final = "artifacts/text-flow/side-path-fixed-vs-before";
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function charged(path: string) {
  const raw = await readFile(path, "utf8");
  const pattern = /function checkLimit\d*\(value2, maximum, path, unit\) \{/gu;
  assert.equal([...raw.matchAll(pattern)].length, 1);
  assert.equal(raw.split("this.totals[key] += amount;").length, 2);
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
async function costs() {
  const before = await json(`${base}/report.json`),
    current = await json(`${final}/report.json`);
  const previous = await json(`${oldFinal}/report.json`);
  assert.equal(current.lockSha256, previous.lockSha256);
  const fixOnly = Object.fromEntries(
    Object.entries(current.metrics).map(([key, n]) => [
      key,
      {
        before: previous.metrics[key],
        current: n,
        delta: (n as number) - previous.metrics[key],
      },
    ]),
  );
  const ordinary = current.consumers.filter((c: { label: string }) => !c.label.startsWith("textFlow"));
  for (const consumer of ordinary) {
    assert.ok(
      !consumer.modules.some((p: string) => /text-flow\/|geometry\/.*(?:normalize|scanner)|inline-band/u.test(p)),
    );
    for (const [key, row] of Object.entries(fixOnly))
      if (key.startsWith(`consumer/${consumer.label}-`)) assert.equal(row.delta, 0, key);
  }
  const frozen = await charged(`${base}/textFlowSiblings-node-raw.mjs`);
  const fixed = await charged(`${final}/textFlowSiblings-node-raw.mjs`);
  assert.deepEqual(fixed.module.result, frozen.module.result);
  assert.deepEqual(fixed.module.pdf, frozen.module.pdf);
  assert.deepEqual(fixed.charges, frozen.charges);
  const path = await import(pathToFileURL(resolve(`${final}/textFlowPath-node-min.mjs`)).href);
  await writeFile(`${final}/path.pdf`, path.pdf);
  const qpdf = execFileSync("qpdf", ["--check", `${final}/path.pdf`], { encoding: "utf8" });
  const text = execFileSync("pdftotext", ["-raw", `${final}/path.pdf`, "-"], { encoding: "utf8" })
    .replace(/\s+/gu, " ")
    .trim();
  assert.equal(
    text,
    `First styled source paragraph with contour text. ${"Second paragraph continues to full width. ".repeat(24).trim()}`,
  );
  const report = {
    baselineMetrics: Object.keys(before.metrics).length,
    finalMetrics: Object.keys(current.metrics).length,
    fixOnly,
    rectangle: { identicalOutputPdfAndCharges: true, charges: fixed.charges },
    path: { bytes: path.pdf.length, sha256: hash(path.pdf), pages: path.result.pageCount, qpdf, text },
  };
  await writeFile(`${final}/fix-proof.json`, JSON.stringify(report, null, 2) + "\n");
  console.log({ path: report.path, nonzeroFixOnly: Object.entries(fixOnly).filter(([, r]) => r.delta !== 0) });
}
async function oldSelector() {
  const path = "packages/text-flow/src/path-selection.ts";
  const source = await readFile(`${final}/frozen-path-selection.ts`, "utf8");
  const frozen = await json(`${final}/fix-before-manifest.json`);
  assert.equal(
    hash(source),
    frozen.hashes[path],
    "Proof must use the byte-exact frozen selector, not an approximation",
  );
  return source;
}
function input() {
  return `import {h} from '@updf/core/vdom'; import {render} from '@updf/core';
import {layout,Document,Flow,Paragraph,pt} from '@updf/layout';
import {siblingOptions,siblingFlow as f} from './tests/fixtures/text-flow/siblings.js';
export const result=layout(h(Document,{children:h(Flow,{pageSize:{width:220,height:120},margins:{top:10,right:10,bottom:10,left:10},participation:f.participation,children:[
h(f.Path,{d:'M0 0H198L200 36H0Z',fill:'blue',style:{width:200,height:36,float:'left'}}),
h(Paragraph,{style:{fontSize:20,lineHeight:pt(2),color:[1,0,0]},children:'A'})]})}),siblingOptions);
export const pdf=render(result.document,siblingOptions);`;
}
function inside(ppm: Buffer) {
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40))!;
  assert.ok(header);
  const width = Number(header[1]),
    start = header[0].length;
  let count = 0;
  for (let y = 76; y < 91; y++)
    for (let x = 27; x < 414; x++) {
      const at = start + 3 * (y * width + x);
      if (ppm[at] === 255 && ppm[at + 1] === 0 && ppm[at + 2] === 0) count++;
    }
  return count;
}
async function regression() {
  const old = await oldSelector();
  const counts: Record<string, unknown> = {};
  for (const before of [true, false]) {
    const label = before ? "audit-before" : "audit-fixed";
    const bundle = await build({
      stdin: { contents: input(), resolveDir: process.cwd(), loader: "ts" },
      bundle: true,
      write: false,
      platform: "node",
      format: "esm",
      target: "es2022",
      plugins: [
        {
          name: "frozen-selector-proof-only",
          setup(builder) {
            builder.onResolve({ filter: /^@updf\/text-flow$/ }, () => ({
              path: resolve("packages/text-flow/src/index.ts"),
            }));
            if (before)
              builder.onLoad({ filter: /\/text-flow\/src\/path-selection\.ts$/ }, () => ({
                contents: old,
                loader: "ts",
              }));
          },
        },
      ],
    });
    const code = bundle.outputFiles![0]!.contents;
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const ppm = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input: runtime.pdf });
    const redInside = inside(ppm);
    if (before) assert.ok(redInside > 0, "Independent raster guard must detect the original overlap");
    else assert.equal(redInside, 0);
    await writeFile(`${final}/${label}.mjs`, code);
    await writeFile(`${final}/${label}.pdf`, runtime.pdf);
    await writeFile(`${final}/${label}.ppm`, ppm);
    counts[label] = {
      redInside,
      pdfSha256: hash(runtime.pdf),
      rasterSha256: hash(ppm),
      placements: runtime.result.placements,
    };
  }
  await writeFile(`${final}/regression-proof.json`, JSON.stringify(counts, null, 2) + "\n");
  console.log(counts);
}
async function preview() {
  const root = "http://100.74.77.69:5182/updf/";
  const old = await json(`${oldFinal}/preview-proof.json`);
  assert.ok(execFileSync("ps", ["-p", "665048", "-o", "args="], { encoding: "utf8" }).includes("vite"));
  const urls = [root, `${root}chunk-graph.json`];
  const graphResponse = await fetch(urls[1]!);
  assert.equal(graphResponse.status, 200);
  const graph = (await graphResponse.json()) as { fileName: string; imports: string[]; dynamicImports: string[] }[];
  for (const chunk of graph)
    for (const path of [chunk.fileName, ...chunk.imports, ...chunk.dynamicImports]) urls.push(new URL(path, root).href);
  for (const check of old.checks) urls.push(new URL(check.path, root).href);
  const checks = [];
  for (const url of new Set(urls)) {
    const response = await fetch(url);
    assert.equal(response.status, 200, url);
    checks.push({ url, status: response.status, sha256: hash(new Uint8Array(await response.arrayBuffer())) });
  }
  await writeFile(`${final}/preview-proof.json`, JSON.stringify(checks, null, 2) + "\n");
}
await regression();
await costs();
await preview();
