import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = "artifacts/text-flow/rectangle-clearance-before";
const after = "artifacts/text-flow/rectangle-clearance-vs-before";
const owned = [
  "packages/text-flow/src/sibling-selection.ts",
  "packages/text-flow/src/path-selection.ts",
  "packages/text-flow/src/sibling.ts",
  "packages/text-flow/test/path-fix.test.ts",
  "packages/text-flow/test/rectangle-clearance.test.ts",
  "scripts/text-flow-rectangle-evidence.ts",
  "docs/evidence/text-flow-rectangle-clearance.md",
];
const hash = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
async function files(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(entries.map((e) => (e.isDirectory() ? files(`${path}/${e.name}`) : [`${path}/${e.name}`])))
  ).flat();
}
async function inventory(paths: string[]) {
  return Object.fromEntries(await Promise.all(paths.sort().map(async (p) => [p, hash(await readFile(p))])));
}
async function freeze() {
  await mkdir(root);
  const source = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const history = (await files("artifacts/text-flow")).filter((p) => !p.startsWith(root + "/"));
  const preview = [...(await files("apps/showcase/src")), ...(await files("apps/showcase/dist"))];
  await writeFile(
    `${root}/protected.json`,
    JSON.stringify(
      {
        owned,
        hashes: await inventory([...new Set([...source, ...history, ...preview])]),
        cwd: process.cwd(),
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        dirty: execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }),
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  for (const path of owned.slice(0, 3))
    await writeFile(`${root}/${path.split("/").at(-1)}`, await readFile(path), { flag: "wx" });
}
function input(side: string, shape: string, tight: boolean) {
  const shapeOutside =
    shape === "omitted" ? "" : `,shapeOutside:${JSON.stringify(shape === "rect" ? "rect" : "M0 0H200V36H0Z")}`;
  return `import {h} from '@updf/core/vdom'; import {render} from '@updf/core';
import {layout,Document,Flow,Paragraph,pt} from '@updf/layout';
import {siblingOptions,siblingFlow as f} from './tests/fixtures/text-flow/siblings.js';
export const result=layout(h(Document,{children:h(Flow,{pageSize:{width:220,height:120},margins:{top:10,right:10,bottom:10,left:10},participation:f.participation,children:[
h(f.Block,{style:{width:200,height:36,float:'${side}',backgroundColor:[0,0,1]${shapeOutside}}}),
h(Paragraph,{style:{fontSize:20,lineHeight:pt(${tight ? 2 : 24}),color:[1,0,0]},children:'A'})]})}),siblingOptions);
export const pdf=render(result.document,siblingOptions);`;
}
function pixels(ppm: Buffer) {
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40))!;
  assert.ok(header);
  let inside = 0,
    red = 0,
    blue = 0;
  for (let y = 0; y < Number(header[2]); y++) {
    for (let x = 0; x < Number(header[1]); x++) {
      const at = header[0].length + 3 * (y * Number(header[1]) + x);
      if (ppm[at] === 0 && ppm[at + 1] === 0 && ppm[at + 2] === 255) blue++;
      if (ppm[at] !== 255 || ppm[at + 1] !== 0 || ppm[at + 2] !== 0) continue;
      red++;
      if (x > 26 && x < 414 && y > 22 && y < 91) inside++;
    }
  }
  assert.ok(red > 0 && blue > 1000);
  return { inside, red, blue };
}
async function capture(before: boolean) {
  const out = before ? root : after;
  if (!before) await mkdir(out, { recursive: true });
  const reports = [];
  for (const side of ["left", "right"]) {
    for (const shape of ["omitted", "rect", "path"]) {
      for (const tight of [true, false]) reports.push(await sample(out, side, shape, tight, before));
    }
  }
  await writeFile(`${out}/raster.json`, JSON.stringify(reports, null, 2), { flag: "wx" });
  console.log(reports);
}
async function sample(out: string, side: string, shape: string, tight: boolean, before: boolean) {
  const name = `${side}-${shape}-${tight ? "tight" : "normal"}`;
  const bundle = await build({
    stdin: { contents: input(side, shape, tight), resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "addon-source",
        setup(b) {
          b.onResolve({ filter: /^@updf\/text-flow$/ }, () => ({ path: resolve("packages/text-flow/src/index.ts") }));
        },
      },
    ],
  });
  const code = bundle.outputFiles[0]!.contents;
  const runtime = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const ppm = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input: runtime.pdf });
  const proof = pixels(ppm);
  assert.equal(proof.inside, before && tight && shape !== "path" ? 75 : 0, name);
  for (const [extension, bytes] of [
    ["mjs", code],
    ["pdf", runtime.pdf],
    ["ppm", ppm],
  ] as const)
    await writeFile(`${out}/${name}.${extension}`, bytes, { flag: "wx" });
  const qpdf = execFileSync("qpdf", ["--check", `${out}/${name}.pdf`], { encoding: "utf8" });
  const text = execFileSync("pdftotext", ["-raw", "-", "-"], { input: runtime.pdf, encoding: "utf8" });
  assert.equal(text.replace(/\s/gu, ""), "A");
  const pdfSha256 = hash(runtime.pdf);
  if (!before && !tight)
    assert.equal(
      pdfSha256,
      (await json(`${root}/raster.json`)).find((r: { name: string }) => r.name === name).pdfSha256,
    );
  return { name, ...proof, pdfSha256, rasterSha256: hash(ppm), qpdf, text, placements: runtime.result.placements };
}
async function verify() {
  const manifest = await json(`${root}/protected.json`);
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  for (const path of paths) assert.ok(path in manifest.hashes || owned.includes(path), path);
  for (const [path, sha] of Object.entries(manifest.hashes)) {
    if (!owned.includes(path)) assert.equal(hash(await readFile(path)), sha, path);
  }
  assert.equal(
    hash(await readFile("artifacts/migration-recovery-s0/manifest.json")),
    "5844eee1185c80686c062443ddacf13fd3868052cf2b59848bbf64642a661d78",
  );
  assert.equal(
    hash(await readFile("artifacts/migration-recovery-s0/recovery.tar.gz")),
    "8f63c6ac620f3099a11a8e3ffeca6e63c428810e32112714f819ac6370fa6347",
  );
  console.log("Protected source/history/preview hashes unchanged");
}
async function seal() {
  await verify();
  const preview = [];
  for (const path of ["", "chunk-graph.json"]) {
    const url = `http://100.74.77.69:5182/updf/${path}`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    preview.push({ url, status: response.status, sha256: hash(new Uint8Array(await response.arrayBuffer())) });
  }
  const artifacts = [
    ...(await files(root)),
    ...(await files(after)),
    ...(await files("artifacts/text-flow/rectangle-clearance-vs-library")),
  ];
  await writeFile(
    `${after}/delivery.json`,
    JSON.stringify(
      {
        cwd: process.cwd(),
        branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        dirty: execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }),
        owned: await inventory(owned),
        artifacts: await inventory(artifacts),
        preview,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
}
async function charged(path: string) {
  const raw = await readFile(path, "utf8");
  const pattern = /function checkLimit\d*\(value2, maximum, path, unit\) \{/gu;
  assert.equal([...raw.matchAll(pattern)].length, 1);
  const charges: Record<string, number[]> = {};
  Reflect.set(globalThis, "__rectangleCharges", charges);
  try {
    const code = raw
      .replace(pattern, "$& (globalThis.__rectangleCharges[unit] ??= []).push(value2);")
      .replace("this.totals[key] += amount;", "(globalThis.__rectangleCharges['kernel/'+key] ??= []).push(amount); $&");
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    return { runtime, charges };
  } finally {
    Reflect.deleteProperty(globalThis, "__rectangleCharges");
  }
}
async function summary() {
  const before = await json(`${root}/costs/report.json`),
    current = await json(`${after}/report.json`);
  assert.equal(Object.keys(before.metrics).length, 238);
  assert.equal(Object.keys(current.metrics).length, 238);
  assert.equal(before.lockSha256, current.lockSha256);
  assert.ok(
    Object.values((await json(`${root}/costs/report.json`)).comparison).every(
      (r) => (r as { delta: number }).delta === 0,
    ),
  );
  for (const [key, row] of Object.entries(current.comparison)) {
    if (/^(?:pack|emitted)\//u.test(key) && !key.includes("@updf/text-flow/"))
      assert.equal((row as { delta: number }).delta, 0, key);
  }
  for (const c of current.consumers) {
    const old = before.consumers.find((b: { label: string }) => b.label === c.label);
    assert.deepEqual(c.modules, old.modules, c.label);
    if (!c.label.startsWith("textFlow")) {
      for (const kind of ["bytes", "gzip"])
        assert.equal(current.metrics[`consumer/${c.label}/${kind}`], before.metrics[`consumer/${c.label}/${kind}`]);
    }
  }
  const parity = await representativeParity();
  await writeFile(
    `${after}/summary.json`,
    JSON.stringify(
      {
        pairedMetrics: 238,
        baselineReproduced: true,
        unchangedPackageAndOrdinaryConsumerCosts: true,
        allConsumerModuleGraphsIdentical: true,
        parity,
        nonzero: Object.fromEntries(
          Object.entries(current.comparison).filter(([, r]) => (r as { delta: number }).delta !== 0),
        ),
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    "238 paired metrics; protected packages and ordinary consumers unchanged; representative PDFs/results equal",
  );
}
async function representativeParity() {
  const parity = [];
  for (const profile of ["textFlowSiblings", "textFlowPath"]) {
    const old = await charged(`${root}/costs/${profile}-node-raw.mjs`);
    const fresh = await charged(`${after}/${profile}-node-raw.mjs`);
    assert.deepEqual(fresh.runtime.pdf, old.runtime.pdf);
    assert.deepEqual(fresh.runtime.result, old.runtime.result);
    parity.push({
      profile,
      pdfAndResultEqual: true,
      chargesEqual: JSON.stringify(old.charges) === JSON.stringify(fresh.charges),
      before: old.charges,
      after: fresh.charges,
    });
  }
  return parity;
}
const mode = process.argv[2];
if (mode === "freeze") {
  await freeze();
  await capture(true);
} else if (mode === "capture") await capture(false);
else if (mode === "verify") await verify();
else if (mode === "summary") await summary();
else if (mode === "seal") await seal();
else throw new Error("Expected freeze, capture, summary, verify or seal");
