import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pack, install, absent, execute } from "./consumer/install.js";
import { typeConsumer } from "./consumer/types.js";
import { fixture } from "../packages/png/test/helpers.js";

const destination = await mkdtemp("/tmp/opencode/updf-s5a2-packs-");
const base = ["layout-boxes", "core", "text", "layout", "images"];
const packs = new Map<string, string>();
for (const name of [...base, "png", "jpeg"]) packs.set(name, await pack(`packages/${name}`, destination));
const reports = [];
for (const codec of [undefined, "png", "jpeg"]) {
  const names = [...base, ...(codec ? [codec] : [])];
  const directory = await install(names.map((name) => packs.get(name)!));
  await absent(directory, [
    "@updf/assets",
    "@updf/fonts",
    "@updf/text-flow",
    "@updf/fontkit",
    "@updf/fontkite",
    ...["png", "jpeg"].filter((name) => name !== codec).map((name) => `@updf/${name}`),
  ]);
  await typeConsumer(directory, ["images-template.tsx"], false, false);
  await typeConsumer(directory, ["images-template.tsx"], true, false);
  const source =
    codec === "png" ? fixture() : codec === "jpeg" ? await readFile("tests/fixtures/jpeg/color-2x2.jpg") : [];
  const output = await execute(
    directory,
    `import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
    import {Image,images} from '@updf/images';
    assert.equal(require('@updf/images').Image,Image);assert.equal(require('@updf/images').images,images);
    ${
      codec
        ? `import {prepare${codec === "png" ? "Png" : "Jpeg"},${codec}Provider} from '@updf/${codec}';
      import {h} from '@updf/core/vdom';import {Document,Flow} from '@updf/layout';
      import {render} from '@updf/layout/render';
      const src=await prepare${codec === "png" ? "Png" : "Jpeg"}(new Uint8Array(${JSON.stringify([...source])}));
      const input=h(Document,{children:h(Flow,{pageSize:{width:200,height:200},
        margins:{top:0,right:0,bottom:0,left:0},children:h(Image,{src,style:{width:120,height:80}})})});
      const bytes=render(input,{resources:{logo:src},providers:[${codec}Provider()],extensions:[images()]});
      assert.ok(Buffer.from(bytes).includes(Buffer.from('/Subtype /Image')));`
        : ""
    }
    console.log('passed');`,
  );
  assert.match(output, /passed/u);
  reports.push({
    codec: codec ?? "root without codecs",
    directory,
    names,
    NodeNext: "pass",
    Bundler: "pass",
    dual: "pass",
  });
}
await writeFile(join(destination, "report.json"), JSON.stringify(reports, null, 2));
console.log({ destination, reports });
