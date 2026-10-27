import { mkdtemp, writeFile, readdir, stat } from "node:fs/promises";
import { pack, install, absent, execute } from "./consumer/install.js";
import { typeConsumer } from "./consumer/types.js";
import { fixture } from "../packages/png/test/helpers.js";

const destination = await mkdtemp("/tmp/opencode/updf-image-cache-packs-");
const names = ["layout-boxes", "core", "text", "layout", "images", "assets", "png"];
const packs = [];
for (const name of names) packs.push(await pack(`packages/${name}`, destination));
const directory = await install(packs);
await absent(directory, [
  "@updf/jpeg",
  "@updf/fonts",
  "@updf/svg",
  "@updf/text-flow",
  "@updf/fontkit",
  "@updf/fontkite",
]);
for (const bundler of [false, true]) await typeConsumer(directory, ["images-cache-template.tsx"], bundler, false);
const result = await execute(
  directory,
  `
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const {images}=await import('@updf/images/load');
const {createImageCache}=await import('@updf/images/cache');
assert.equal(require('@updf/images/cache').createImageCache,createImageCache);
assert.equal(require('@updf/images/load').images,images);
const cache=require('@updf/images/cache').createImageCache({maxEntries:1,maxBytes:10000,maxConsumers:2});
const {createAssetLoader}=require('@updf/images/load');
const {pngImages}=await import('@updf/images/png');
const {Image}=await import('@updf/images');
const {h}=await import('@updf/core/vdom');const {Document,Flow}=await import('@updf/layout');
const {renderAsync}=await import('@updf/layout/async');
let fetches=0;
const loader=createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>{fetches++;return new Response(new Uint8Array(${JSON.stringify([...fixture()])}));}});
const handler=pngImages();
const doc=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},children:h(Image,{src:'logo',style:{width:20,height:20}})})});
const run=()=>renderAsync(doc,{extensions:[images({loader,cache,formatHandlers:[handler]})]});
const cold=await run(),warm=await run();assert.deepEqual(cold,warm);assert.equal(fetches,1);
assert.equal(cache.snapshot().entries,1);assert.ok(Object.isFrozen(cache.snapshot()));
assert.throws(()=>images({loader,formatHandlers:[handler],cache:{...cache}}));
cache.dispose();assert.equal(cache.snapshot().disposed,true);
console.log(JSON.stringify({fetches,pdfBytes:warm.length,modules:Object.keys(require.cache)}));
`,
);
await writeFile(
  `${process.env.IMAGE_CACHE_OUT ?? "artifacts/image-cache-after"}/consumer.json`,
  JSON.stringify(
    {
      destination,
      directory,
      names,
      result: JSON.parse(result),
      types: "NodeNext/Bundler no DOM: pass",
      identity: "ESM/CJS shared: pass",
      installedBytes: await treeBytes(`${directory}/node_modules`),
    },
    null,
    2,
  ),
);
console.log({ destination, directory, result: JSON.parse(result) });

async function treeBytes(directory: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    bytes += entry.isDirectory() ? await treeBytes(path) : (await stat(path)).size;
  }
  return bytes;
}
