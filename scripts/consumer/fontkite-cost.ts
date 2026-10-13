import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { prepareFont as kite } from "@updf/fontkite";
import { prepareFont as kit } from "@updf/fontkit";
import { build } from "esbuild";
import { costInputs } from "./cost-inputs.js";

const application = costInputs(false).fontkit!;
const sources = {
  prepared: costInputs(false).prepared!,
  fontkit: application,
  fontkite: application.replace("'@updf/fontkit'", "'@updf/fontkite'"),
  prepareFontkit: "export {prepareFont} from '@updf/fontkit';",
  prepareFontkite: "export {prepareFont} from '@updf/fontkite';",
  loadFontkite: "export {loadFont} from '@updf/fontkite/load';",
};

async function bundle(profile: string, contents: string) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    metafile: true,
    write: false,
  });
  const modules = Object.keys(result.metafile.inputs),
    output = result.outputFiles[0]!;
  assert.ok(!modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:cjs|node))\//u.test(path)));
  if (profile === "prepared") assert.ok(!modules.some((path) => /packages\/(?:fontkit|fontkite|assets)\//u.test(path)));
  if (profile.toLowerCase().includes("fontkite")) {
    assert.ok(
      !modules.some((path) =>
        /(?:node_modules\/(?:fontkit|brotli|restructure|unicode-)|packages\/fontkit\/)/u.test(path),
      ),
    );
    if (profile !== "loadFontkite") assert.ok(!modules.some((path) => /packages\/assets\//u.test(path)));
  }
  await writeFile(`artifacts/fontkite/${profile}.mjs`, output.contents);
  return { profile, js: output.contents.length, gzip: gzipSync(output.contents, { level: 9 }).length, modules };
}

function timing(prepare: typeof kite, bytes: Uint8Array<ArrayBuffer>): number {
  for (let i = 0; i < 3; i++) prepare(bytes);
  const samples = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    prepare(bytes);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return (samples[4]! + samples[5]!) / 2;
}

await mkdir("artifacts/fontkite", { recursive: true });
const report = [];
for (const [profile, contents] of Object.entries(sources)) report.push(await bundle(profile, contents));
const reference = await import(new URL("../../artifacts/fontkite/fontkit.mjs", import.meta.url).href);
const candidate = await import(new URL("../../artifacts/fontkite/fontkite.mjs", import.meta.url).href);
const prebuilt = await import(new URL("../../artifacts/fontkite/prepared.mjs", import.meta.url).href);
const fonts = [];
for (const weight of ["Regular", "Bold"]) {
  const bytes = new Uint8Array(await readFile(`tests/fixtures/fonts/LiberationSans-${weight}.ttf`));
  const actual: Uint8Array = candidate.pdf(bytes);
  assert.deepEqual(actual, reference.pdf(bytes));
  const { byteLength: _byteLength, ...metadata } = kite(bytes).metadata;
  const json = JSON.stringify(metadata);
  assert.deepEqual(actual, prebuilt.pdf({ ...JSON.parse(json), bytes }));
  await writeFile(`artifacts/fontkite/${weight}.pdf`, actual);
  execFileSync("qpdf", ["--check", `artifacts/fontkite/${weight}.pdf`], { stdio: "pipe" });
  const text = execFileSync("pdftotext", [`artifacts/fontkite/${weight}.pdf`, "-"], { encoding: "utf8" });
  assert.match(text, /Москва/u);
  const raster = execFileSync("pdftoppm", [
    "-singlefile",
    "-scale-to",
    "256",
    "-png",
    `artifacts/fontkite/${weight}.pdf`,
  ]);
  assert.deepEqual([...raster.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  await writeFile(`artifacts/fontkite/${weight}.png`, raster);
  fonts.push({
    weight,
    pdfBytes: actual.length,
    fontBytes: bytes.length,
    fontGzip: gzipSync(bytes, { level: 9 }).length,
    metadataJsonBytes: Buffer.byteLength(json),
    metadataJsonGzip: gzipSync(json, { level: 9 }).length,
    preparedDeliveryGzip:
      report.find((row) => row.profile === "prepared")!.gzip +
      gzipSync(bytes, { level: 9 }).length +
      gzipSync(json, { level: 9 }).length,
    fontkiteDeliveryGzip: report.find((row) => row.profile === "fontkite")!.gzip + gzipSync(bytes, { level: 9 }).length,
    fontkitMedianMs: timing(kit, bytes),
    fontkiteMedianMs: timing(kite, bytes),
  });
}
await writeFile(
  "artifacts/fontkite/report.json",
  `${JSON.stringify({ node: process.version, report, fonts }, null, 2)}\n`,
);
console.table(report.map(({ modules: _modules, ...cost }) => cost));
console.table(fonts);
