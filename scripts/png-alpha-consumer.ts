import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { pack, install, absent, execute } from "./consumer/install.js";
import { typeConsumer } from "./consumer/types.js";
import { pngAlphaProofInput } from "./png-alpha-proof-input.js";
import { fixture } from "../packages/png/test/helpers.js";

const out = process.argv[2];
if (!out) throw new Error("Supply a new receipt path");
const destination = await mkdtemp("/tmp/opencode/updf-png-alpha-packs-");
const names = ["layout-boxes", "core", "text", "layout", "images", "assets", "png", "fonts", "geometry", "text-flow"];
const packs = [];
for (const name of names) packs.push(await pack(`packages/${name}`, destination));
const directory = await install(packs);
await absent(directory, ["@updf/jpeg", "@updf/fontkit", "@updf/fontkite"]);
for (const bundler of [false, true]) await typeConsumer(directory, ["png-alpha-template.ts"], bundler, false);
const result = JSON.parse(
  await execute(
    directory,
    `${pngAlphaProofInput()}
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pngAlphaShapes as selected} from '@updf/text-flow/png-alpha';
const require=createRequire(import.meta.url);
assert.equal(require('@updf/text-flow/png-alpha').pngAlphaShapes,selected);
const result=await proof(${JSON.stringify([...fixture()])});
assert.equal(result.fetches,1);
assert.ok(result.results.every(x=>x.sameResource&&x.rects.length===2&&x.pdf.length>0));
console.log(JSON.stringify({...result,results:result.results.map(({pdf,...row})=>({...row,pdfBytes:pdf.length}))}));`,
  ),
);
assert.equal(result.snapshot.entries, 1);
await writeFile(
  out,
  JSON.stringify(
    { destination, directory, names, result, types: "NodeNext/Bundler, no DOM", identity: "ESM/CJS shared" },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log(result);
