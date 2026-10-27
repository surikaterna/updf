import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { pack, install, absent, execute } from "./consumer/install.js";
import { typeConsumer } from "./consumer/types.js";
import { bridgeCostInput } from "./png-shape-bridge-cost-input.js";
import { fixture } from "../packages/png/test/helpers.js";

const out = process.argv[2];
if (!out) throw new Error("Supply a new receipt path");
const destination = await mkdtemp("/tmp/opencode/updf-bridge-packs-");
const names = ["layout-boxes", "core", "text", "layout", "images", "assets", "png"];
const packs = [];
for (const name of names) packs.push(await pack(`packages/${name}`, destination));
const directory = await install(packs);
await absent(directory, ["@updf/jpeg", "@updf/fonts", "@updf/text-flow", "@updf/fontkit", "@updf/fontkite"]);
for (const bundler of [false, true]) await typeConsumer(directory, ["png-shape-bridge-template.ts"], bundler, false);
const result = await execute(
  directory,
  `${bridgeCostInput()}
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
assert.equal(require('@updf/layout/internal-preparation').replaceParticipationData,replaceParticipationData);
let fetches=0;
const loader=createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>{fetches++;return new Response(new Uint8Array(${JSON.stringify([...fixture()])}));}});
const proof=await inspect(loader,'visual.png','mask.png');
assert.equal(fetches,2);assert.deepEqual(proof.resources,['Prepared0','Prepared1']);
assert.deepEqual(proof.reports,[{x:5.625,y:0,width:20,height:20}]);
console.log(JSON.stringify({fetches,reports:proof.reports,resources:proof.resources,pdfBytes:proof.pdf.length}));
`,
);
assert.ok(JSON.parse(result).pdfBytes > 0);
await writeFile(
  out,
  JSON.stringify(
    {
      destination,
      directory,
      names,
      result: JSON.parse(result),
      types: "NodeNext/Bundler without DOM or Node ambient types: pass",
      identity: "ESM/CJS shared: pass",
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log(result);
