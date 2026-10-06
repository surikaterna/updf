import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { absent, execute, root } from "./install.js";

export async function jpegProof(directory: string, mixed: boolean): Promise<void> {
  await writeFile(join(directory, "fixture.jpg"), await readFile(join(root, "tests/fixtures/jpeg/color-1x1.jpg")));
  await absent(directory, ["@updf/fontkit", "@updf/png", "jpeg-js", "sharp", "pngjs"]);
  if (!mixed) await absent(directory, ["@updf/fonts", "@updf/text"]);
  await execute(directory, jpegRuntime + (mixed ? mixedRuntime : ""));
  execFileSync("qpdf", ["--check", "jpeg.pdf"], { cwd: directory, stdio: "pipe" });
  if (!mixed)
    assert.match(
      execFileSync("pdffonts", ["jpeg.pdf"], { cwd: directory, encoding: "utf8" }),
      /^name[^\n]*\n-+[^\n]*\n$/u,
    );
  if (mixed) {
    execFileSync("qpdf", ["--check", "mixed.pdf"], { cwd: directory, stdio: "pipe" });
    assert.match(execFileSync("pdftotext", ["mixed.pdf", "-"], { cwd: directory, encoding: "utf8" }), /JPEG caption/u);
  }
}

const jpegRuntime = String.raw`
  import assert from 'node:assert/strict';
  import {readFileSync,writeFileSync} from 'node:fs';
  import {render,DocumentError} from '@updf/core';
  import {createOwnedResource} from '@updf/core/resources';
  import * as jpeg from '@updf/jpeg';
  assert.deepEqual(Object.keys(jpeg).sort(),['jpeg','jpegProvider','prepareJpeg']);
  const original = readFileSync('fixture.jpg');
  const source = new Uint8Array(original);
  const photo = jpeg.prepareJpeg(source); source.fill(0);
  const leaf = jpeg.jpeg('photo',{x:10,y:20,width:60,height:40});
  const page = {width:100,height:100,children:[leaf]};
  const document = {version:1,pages:[page,{...page,children:[{...leaf,resource:'alias'}]}]};
  const options = {resources:{photo,alias:photo},providers:[jpeg.jpegProvider()]};
  const bytes = render(document,options), pdf = Buffer.from(bytes).toString('latin1');
  assert.equal((pdf.match(/\/Subtype \/Image/g)||[]).length,1);
  assert.equal((pdf.match(/\/Im1 Do/g)||[]).length,2);
  assert.ok(!pdf.includes('/Type /Font'));
  assert.ok(Buffer.from(bytes).includes(original));
  assert.deepEqual(render(document,options),bytes);
  const distinct = render(document,{...options,resources:{photo,alias:jpeg.prepareJpeg(new Uint8Array(original))}});
  assert.equal((Buffer.from(distinct).toString('latin1').match(/\/Subtype \/Image/g)||[]).length,2);
  assert.throws(()=>render(document,{...options,resources:{photo:createOwnedResource(photo.metadata),alias:photo}}),e=>e instanceof DocumentError&&e.diagnostics[0]?.code==='RESOURCE');
  writeFileSync('jpeg.pdf',bytes);
`;

const mixedRuntime = String.raw`
  const {createHelvetica,fontRuntime,fontProvider} = await import('@updf/fonts');
  const {createTextService} = await import('@updf/text');
  const runtime = fontRuntime();
  const caption = {type:'richText',x:10,y:70,width:80,height:12,paragraphs:[{runs:[{text:'JPEG caption'}],defaultStyle:{font:'Helvetica',fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'}]};
  const mixedOptions = {...options,resources:{...options.resources,Helvetica:createHelvetica()},text:createTextService({runtime}),providers:[...options.providers,fontProvider(runtime)]};
  const mixed = render({version:1,pages:[{...page,children:[leaf,caption]}]},mixedOptions);
  assert.ok(Buffer.from(mixed).includes(original));
  writeFileSync('mixed.pdf',mixed);
`;

export const jpegDualRuntime = String.raw`
  const cjpe = require('@updf/jpeg'), ejpe = await import('@updf/jpeg');
  const jpegSource = new Uint8Array(require('node:fs').readFileSync('fixture.jpg'));
  for (const [prepare,other] of [[cjpe.prepareJpeg,ejpe],[ejpe.prepareJpeg,cjpe]]) {
    const photo = prepare(jpegSource);
    assert.equal(require('@updf/core/resources').isOwnedResource(photo),true);
    const definition = {version:1,pages:[{width:100,height:100,children:[other.jpeg('photo',{x:10,y:20,width:60,height:40})]}]};
    const options = {resources:{photo},providers:[other.jpegProvider()]};
    assert.deepEqual(c.render(definition,options),e.render(definition,options));
  }
`;
