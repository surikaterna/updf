import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, readFile, readlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { rectangular } from "../tests/fixtures/text-flow/rectangular.js";

const out = "artifacts/text-flow/migration-baseline";
const historical = "artifacts/text-flow/side-path-fixed-vs-before/report.json";
const owned = ["scripts/text-flow-migration-baseline.ts", "docs/evidence/text-flow-migration-baseline.md"];
const cwd = process.cwd();
const run = (cmd: string, args: string[], input?: string | Buffer) =>
  execFileSync(cmd, args, { cwd, input, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const save = (name: string, value: unknown) =>
  writeFile(`${out}/${name}`, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
type Inventory = Record<string, string>;

async function walk(path: string): Promise<string[]> {
  if (path === out) return [];
  const info = await lstat(path);
  if (!info.isDirectory()) return [path];
  const children = await readdir(path);
  return (await Promise.all(children.sort().map((name) => walk(`${path}/${name}`)))).flat();
}

async function inventory(paths: string[]): Promise<Inventory> {
  const entries = await Promise.all(
    [...new Set(paths)].sort().map(async (path) => {
      const info = await lstat(path);
      const value = info.isSymbolicLink() ? `symlink:${await readlink(path)}` : await readFile(path);
      return [path, hash(value)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function sources() {
  const paths = run("git", ["ls-files", "-co", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
  const selected = [...new Set(paths)].filter((path) => !owned.includes(path));
  for (const path of selected) {
    assert.ok(!/(^|\/)(?:node_modules|\.git|artifacts|dist|\.cache)(\/|$)/u.test(path), path);
    assert.ok(!/(^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key)|credentials.*)$/iu.test(path), `Secret candidate: ${path}`);
  }
  const existing = [];
  for (const path of selected) {
    const info = await lstat(path).catch(() => undefined);
    if (info) existing.push(path);
  }
  return inventory(existing);
}

async function outputs() {
  const paths = [];
  for (const parent of ["packages", "apps"]) {
    for (const name of await readdir(parent)) {
      const directory = `${parent}/${name}`;
      if (!(await lstat(directory)).isDirectory()) continue;
      const children = await readdir(directory);
      for (const child of children.filter((name) => /^(?:dist(?:-.*)?|build|out)$/u.test(name))) {
        paths.push(...(await walk(`${directory}/${child}`)));
      }
    }
  }
  return inventory(paths);
}

async function preview() {
  const url = "http://100.74.77.69:5182/updf/";
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return {
    observedAt: new Date().toISOString(),
    pid: 665048,
    command: run("ps", ["-p", "665048", "-o", "args="]).trim(),
    cwd: await readlink("/proc/665048/cwd"),
    listener: run("ss", ["-ltnp", "sport = :5182"]),
    url,
    status: response.status,
    bodySha256: hash(new Uint8Array(await response.arrayBuffer())),
    dist: await inventory(await walk("apps/showcase/dist")),
  };
}

async function capture() {
  await mkdir(out); // Exclusive reservation: an existing baseline is never overwritten.
  const source = await sources();
  const dirty = run("git", ["status", "--porcelain=v1", "-uall"]);
  const baseline = await captureState(source, dirty);
  assert.equal(baseline.staged, "");
  await save("before.json", baseline);
  const list = Object.keys(source).join("\0") + "\0";
  run("tar", ["--null", "--verbatim-files-from", "-T", "-", "-czf", `${out}/source.tar.gz`], list);
  await save("archive.json", {
    path: `${out}/source.tar.gz`,
    sha256: hash(await readFile(`${out}/source.tar.gz`)),
    meaning:
      "Inherited tracked/nonignored sources; deleted paths in dirty status. No Git history or ignored caches/assets.",
  });
  console.log({
    sourceFingerprint: baseline.sourceFingerprint,
    sources: Object.keys(source).length,
    historicalFiles: Object.keys(baseline.historical).length,
    distFiles: Object.keys(baseline.preview.dist).length,
  });
}

async function captureState(source: Inventory, dirty: string) {
  return {
    capturedAt: new Date().toISOString(),
    cwd,
    branch: run("git", ["branch", "--show-current"]).trim(),
    head: run("git", ["rev-parse", "HEAD"]).trim(),
    preFeature: run("git", ["rev-parse", "244c093"]).trim(),
    dirty,
    staged: run("git", ["diff", "--cached", "--name-only"]),
    excludedOwned: owned,
    source,
    sourceFingerprint: hash(JSON.stringify(source)),
    outputs: await outputs(),
    historical: await inventory(await walk("artifacts/text-flow")),
    instructions: await inventory([
      "AGENTS.md",
      "/home/sprawl/.config/opencode/AGENTS.md",
      "/home/sprawl/.config/opencode/principles/universal.md",
    ]),
    preview: await preview(),
    versions: {
      node: process.version,
      npm: run("npm", ["--version"]).trim(),
      tsx: run("node_modules/.bin/tsx", ["--version"]).trim(),
      typescript: run("node_modules/.bin/tsc", ["--version"]).trim(),
      qpdf: run("qpdf", ["--version"]).trim(),
    },
    auditProvenance:
      "User-provided independent plan audit/approval; no audit report or new verification state inferred.",
  };
}

async function costs() {
  await mkdir(`${out}/current`);
  const log = run("node_modules/.bin/tsx", [
    "scripts/text-flow-costs.ts",
    "--out",
    `${out}/current`,
    "--compare",
    historical,
  ]);
  await writeFile(`${out}/costs.log`, log, { flag: "wx" });
  const current = await json(`${out}/current/report.json`);
  const previous = await json(historical);
  assert.equal(Object.keys(current.metrics).length, 238);
  assert.deepEqual(Object.keys(current.metrics).sort(), Object.keys(previous.metrics).sort());
  assert.equal(current.lockSha256, hash(await readFile("package-lock.json")));
  await save("cost-summary.json", {
    metricCount: Object.keys(current.metrics).length,
    consumers: current.consumers.length,
    lockSha256: current.lockSha256,
    historicalLockSha256: previous.lockSha256,
    sameLock: current.lockSha256 === previous.lockSha256,
    nonzero: Object.entries(current.comparison).filter(([, row]) => (row as { delta: number }).delta !== 0),
    historicalMeaning:
      "Previous reports reused, not rebuilt; fresh report measures current rebuilt package outputs, not showcase dist.",
    totals: Object.fromEntries(Object.entries(current.metrics).filter(([key]) => key.startsWith("total/"))),
  });
}

function rectangleInput(side: string) {
  return `import {h} from '@updf/core/vdom'; import {render} from '@updf/core';
import {layout,Document,Flow,Paragraph,pt} from '@updf/layout';
import {siblingOptions,siblingFlow as f} from './tests/fixtures/text-flow/siblings.js';
export const result=layout(h(Document,{children:h(Flow,{pageSize:{width:220,height:120},margins:{top:10,right:10,bottom:10,left:10},participation:f.participation,children:[
h(f.Block,{style:{width:200,height:36,float:'${side}',backgroundColor:[0,0,1]}}),
h(Paragraph,{style:{fontSize:20,lineHeight:pt(2),color:[1,0,0]},children:'A'})]})}),siblingOptions);
export const pdf=render(result.document,siblingOptions);`;
}

function redInside(ppm: Buffer) {
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40));
  assert.ok(header);
  const width = Number(header[1]);
  let count = 0;
  for (let y = 76; y < 91; y++) {
    for (let x = 27; x < 414; x++) {
      const at = header[0].length + 3 * (y * width + x);
      if (ppm[at] === 255 && ppm[at + 1] === 0 && ppm[at + 2] === 0) count++;
    }
  }
  return count;
}

async function rectangle() {
  const results = [];
  for (const side of ["left", "right"]) {
    const input = rectangleInput(side);
    const bundle = await build({
      stdin: { contents: input, resolveDir: cwd, loader: "ts" },
      bundle: true,
      write: false,
      platform: "node",
      format: "esm",
      target: "es2022",
    });
    const code = bundle.outputFiles[0]!.contents;
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const prefix = `${out}/legacy-rect-${side}`;
    await writeFile(`${prefix}.input.ts.txt`, input, { flag: "wx" });
    await writeFile(`${prefix}.mjs`, code, { flag: "wx" });
    await writeFile(`${prefix}.pdf`, runtime.pdf, { flag: "wx" });
    const ppm = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input: runtime.pdf });
    await writeFile(`${prefix}.ppm`, ppm, { flag: "wx" });
    const overlap = redInside(ppm);
    assert.ok(overlap > 0, "Expected known legacy defect; zero requires investigation, not silent acceptance");
    results.push({
      side,
      redInsideProtectedRegion: overlap,
      knownReleaseBlocker: true,
      qpdf: run("qpdf", ["--check", `${prefix}.pdf`]),
      text: run("pdftotext", ["-raw", `${prefix}.pdf`, "-"]),
      placements: runtime.result.placements,
      pdfSha256: hash(runtime.pdf),
      rasterSha256: hash(ppm),
    });
  }
  await save("legacy-rectangle.json", {
    meaning: "Diagnostic reproduction, NOT a passing production safety test or waiver",
    results,
  });
}

async function preservation() {
  const before = await json(`${out}/before.json`);
  assert.deepEqual(await sources(), before.source, "Inherited source changed");
  assert.deepEqual(
    await inventory(await walk("artifacts/text-flow")),
    before.historical,
    "Historical artifacts changed",
  );
  const after = await preview();
  for (const key of ["pid", "command", "cwd", "bodySha256", "dist"] as const) {
    assert.deepEqual(after[key], before.preview[key], `Preview changed: ${key}`);
  }
  assert.equal(run("git", ["rev-parse", "HEAD"]).trim(), before.head);
  assert.equal(run("git", ["branch", "--show-current"]).trim(), before.branch);
  assert.deepEqual(await inventory(Object.keys(before.instructions)), before.instructions);
  assert.equal(run("git", ["diff", "--cached", "--name-only"]), "");
  return after;
}

async function seal() {
  const after = await preservation();
  await save("after.json", {
    preview: after,
    outputs: await outputs(),
    dirty: run("git", ["status", "--porcelain=v1", "-uall"]),
    owned: await inventory(owned),
  });
  const artifacts = await inventory(await walkBaseline());
  await save("manifest.json", {
    artifacts,
    fingerprint: hash(JSON.stringify(artifacts)),
    exclusion:
      "manifest.json excludes itself; its SHA-256 is printed externally. Owned source hashes are in after.json.",
  });
  console.log({
    manifestSha256: hash(await readFile(`${out}/manifest.json`)),
    fingerprint: hash(JSON.stringify(artifacts)),
  });
}

async function walkBaseline() {
  const children = (await readdir(out)).filter((name) => name !== "manifest.json");
  return (await Promise.all(children.map((name) => walk(`${out}/${name}`)))).flat();
}

async function verify() {
  const manifest = await json(`${out}/manifest.json`);
  assert.deepEqual(await inventory(await walkBaseline()), manifest.artifacts);
  assert.equal(hash(JSON.stringify(manifest.artifacts)), manifest.fingerprint);
  const after = await json(`${out}/after.json`);
  assert.deepEqual(await inventory(owned), after.owned);
  assert.deepEqual(await outputs(), after.outputs, "Final built outputs changed");
  await preservation();
  const entries = run("tar", ["-tzf", `${out}/source.tar.gz`])
    .trim()
    .split("\n")
    .sort();
  const before = await json(`${out}/before.json`);
  assert.deepEqual(entries, Object.keys(before.source).sort());
  run("tar", ["-dzf", `${out}/source.tar.gz`]);
  console.log({
    verified: true,
    fingerprint: manifest.fingerprint,
    manifestSha256: hash(await readFile(`${out}/manifest.json`)),
  });
}

async function pdfEvidence(label: string, pdf: Uint8Array, placements?: unknown) {
  const prefix = `${out}/${label}`;
  const existing = await readFile(`${prefix}.pdf`).catch(() => undefined);
  if (existing) assert.deepEqual(existing, Buffer.from(pdf), "Resume must preserve byte-exact partial evidence");
  else await writeFile(`${prefix}.pdf`, pdf, { flag: "wx" });
  const raster = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input: pdf });
  if (existing) assert.deepEqual(await readFile(`${prefix}.ppm`), raster);
  else await writeFile(`${prefix}.ppm`, raster, { flag: "wx" });
  return {
    label,
    reusedPartialCapture: Boolean(existing),
    pdfSha256: hash(pdf),
    rasterSha256: hash(raster),
    qpdf: run("qpdf", ["--check", `${prefix}.pdf`]),
    text: run("pdftotext", ["-raw", `${prefix}.pdf`, "-"]),
    placements,
  };
}

async function representative() {
  const results = [];
  for (const profile of ["textFlowSiblings", "textFlowPath", "textFlow", "textFlowProfile"]) {
    const load = (directory: string) => import(pathToFileURL(resolve(directory, `${profile}-node-raw.mjs`)).href);
    const current = await load(`${out}/current`);
    const old = await load("artifacts/text-flow/side-path-fixed-vs-before");
    const paragraphs = rectangular("Representative ordinary atomic and profile text. ".repeat(8)).paragraphs;
    const pdf = typeof current.pdf === "function" ? current.pdf(paragraphs) : current.pdf;
    const prior = typeof old.pdf === "function" ? old.pdf(paragraphs) : old.pdf;
    assert.deepEqual(pdf, prior, `${profile} historical PDF mismatch`);
    results.push(await pdfEvidence(profile, pdf, current.result?.placements));
  }
  for (const [label, input] of representativeInputs()) {
    const bundle = await build({
      stdin: { contents: input!, resolveDir: cwd, loader: "ts" },
      bundle: true,
      write: false,
      platform: "node",
      format: "esm",
      target: "es2022",
    });
    const code = bundle.outputFiles[0]!.contents;
    const existing = await readFile(`${out}/${label}.mjs`).catch(() => undefined);
    if (existing) assert.deepEqual(existing, Buffer.from(code));
    else await writeFile(`${out}/${label}.mjs`, code, { flag: "wx" });
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    results.push(await pdfEvidence(label!, runtime.pdf, runtime.result.placements));
  }
  await save("representative.json", {
    results,
    charges: "Historical fix-proof.json retained by hash; not freshly instrumented.",
  });
}

function representativeInputs() {
  const plain = rectangleInput("left")
    .replace(/h\(f.Block,.*\),\n/u, "")
    .replace("lineHeight:pt(2)", "lineHeight:pt(24)");
  return [
    ["ordinary-no-extension", plain.replace("participation:f.participation,", "")],
    ["installed-no-float", plain],
    ["rect-normal", rectangleInput("left").replace("lineHeight:pt(2)", "lineHeight:pt(24)")],
    [
      "path-negative-leading-current",
      rectangleInput("left")
        .replace("h(f.Block,{", "h(f.Path,{d:'M0 0H198L200 36H0Z',fill:'blue',")
        .replace(",backgroundColor:[0,0,1]", ""),
    ],
  ];
}

const mode = process.argv[2];
assert.ok(
  ["capture", "costs", "rectangle", "representative", "seal", "verify"].includes(mode ?? ""),
  "Usage: tsx scripts/text-flow-migration-baseline.ts capture|costs|rectangle|representative|seal|verify",
);
if (mode === "capture") await capture();
if (mode === "costs") await costs();
if (mode === "rectangle") await rectangle();
if (mode === "representative") await representative();
if (mode === "seal") await seal();
if (mode === "verify") await verify();
