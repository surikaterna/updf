import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { pack, install, absent, execute } from "./consumer/install.js";
import { typeConsumer } from "./consumer/types.js";
import { fixture } from "../packages/png/test/helpers.js";

const destination = await mkdtemp("/tmp/opencode/updf-url-image-packs-");
const base = ["layout-boxes", "core", "text", "layout", "images"];
const packs = new Map<string, string>();
for (const name of [...base, "assets", "png", "jpeg"]) packs.set(name, await pack(`packages/${name}`, destination));
const reports = [];
for (const codec of [undefined, "png", "jpeg"]) {
  const names = [...base, ...(codec ? ["assets", codec] : [])];
  const directory = await install(names.map((name) => packs.get(name)!));
  await absent(directory, [
    "@updf/fonts",
    "@updf/text-flow",
    "@updf/fontkit",
    "@updf/fontkite",
    ...["assets", "png", "jpeg"].filter((name) => !names.includes(name)).map((name) => `@updf/${name}`),
  ]);
  for (const bundler of [false, true]) await typeConsumer(directory, ["images-template.tsx"], bundler, false);
  if (codec === "png")
    for (const bundler of [false, true]) await typeConsumer(directory, ["images-load-template.tsx"], bundler, false);
  const source = codec === "png" ? fixture() : codec ? await readFile("tests/fixtures/jpeg/color-2x2.jpg") : [];
  const output = await execute(
    directory,
    `
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
    const {Image,images}=require('@updf/images');
    assert.equal((await import('@updf/images')).Image,Image);
    const rootModules=Object.keys(require.cache);
    assert.ok(!rootModules.some(p=>/\\/(assets|png|jpeg)\\/|load-session|internal-preparation/.test(p)));
    ${
      codec
        ? `
    const {images:loading,createAssetLoader}=await import('@updf/images/load');
    const {${codec}Images}=await import('@updf/images/${codec}');
    const {renderAsync}=await import('@updf/layout/async');
    const {h}=await import('@updf/core/vdom');const {Document,Flow}=await import('@updf/layout');
    const loader=createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>new Response(new Uint8Array(${JSON.stringify([...source])}))});
    const doc=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},
      children:h(Image,{src:'logo',style:{width:20,height:20}})})});
    const extension=loading({loader,formatHandlers:[${codec}Images()]});
    const bytes=await renderAsync(doc,{extensions:[extension]});assert.ok(Buffer.from(bytes).includes(Buffer.from('/Subtype /Image')));
    await assert.rejects(renderAsync(doc,{extensions:[images(),extension]}));
    assert.ok(!Object.keys(require.cache).some(p=>p.includes('/${codec === "png" ? "jpeg" : "png"}/')));
    `
        : ""
    }
    console.log(JSON.stringify(Object.keys(require.cache)));
  `,
  );
  reports.push({
    codec: codec ?? "prepared root",
    directory,
    names,
    modules: JSON.parse(output),
    types: "NodeNext/Bundler pass",
    runtime: "pass",
  });
}
const out = process.env.URL_IMAGES_OUT ?? "artifacts/url-images-runtime-after";
await writeFile(`${out}/consumers.json`, JSON.stringify({ destination, reports }, null, 2));
console.log({ destination, closures: reports.map(({ codec, names }) => ({ codec, names })) });
