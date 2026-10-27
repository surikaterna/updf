import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { fixture } from "../packages/png/test/helpers.js";
import { pngShapeSelectedInput } from "./png-shape-selected-input.js";

const out = "artifacts/png-shape-s7a";
const profiles = [];
for (const extract of [false, true]) {
  const contents = pngShapeSelectedInput(extract);
  for (const minify of [false, true]) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "esm",
      target: "es2022",
      minify,
      write: false,
      metafile: true,
    });
    const bytes = result.outputFiles[0]!.contents;
    profiles.push({
      extract,
      minify,
      bytes: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      inputs: Object.keys(result.metafile!.inputs),
    });
  }
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2022",
    write: false,
  });
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.contents).toString("base64")}`
  );
  const proof = await api.proof(fixture());
  assert.equal(proof.before, proof.after);
  assert.equal(proof.commands, extract ? 10 : 0);
  const path = `${out}/selected-${extract ? "shape" : "plain"}.pdf`;
  await writeFile(path, Buffer.from(proof.pdf), { flag: "wx" });
  execFileSync("qpdf", ["--check", path]);
  const pdf = Buffer.from(proof.pdf).toString("latin1");
  assert.equal(pdf.includes("1 0 0 rg"), extract);
  profiles.push({
    extract,
    sourceBytes: fixture().length,
    pixels: 4,
    temporaryAlphaBytes: extract ? 4 : 0,
    resourceBytesBefore: proof.before,
    resourceBytesAfter: proof.after,
    commands: proof.commands,
    pdfBytes: proof.pdf.length,
  });
}
const loads = [];
for (const entry of ["@updf/png/alpha", "@updf/text-flow/png-shape"]) {
  const modules: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
      { encoding: "utf8" },
    ),
  );
  const sizes = await Promise.all(modules.map(async (path) => (await readFile(path)).length));
  loads.push({ entry, modules, bytes: sizes.reduce((a, b) => a + b, 0) });
}
await writeFile(`${out}/selected.json`, JSON.stringify({ profiles, loads }, null, 2), { flag: "wx" });
console.log(profiles.map(({ inputs: _inputs, ...record }) => record));
