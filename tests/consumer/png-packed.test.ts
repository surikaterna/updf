import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { test } from "node:test";
import { absent, execute, install, pack } from "../../scripts/consumer/install.js";
import { fixture } from "../../packages/png/test/helpers.js";

test("clean packed PNG consumers share ESM/CommonJS ownership and need only core/kernel/fflate", async () => {
  const destination = await mkdtemp("/tmp/opencode/updf-png-packs-");
  let directory: string | undefined;
  try {
    const tarballs = await Promise.all(
      ["layout-boxes", "core", "png"].map((name) => pack(`packages/${name}`, destination)),
    );
    directory = await install(tarballs);
    await absent(directory, ["@updf/jpeg", "@updf/fonts", "@updf/text", "fontkit"]);
    const result = await execute(
      directory,
      `
      import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
      import { render } from '@updf/core'; import { preparePng, png, pngProvider } from '@updf/png';
      const require = createRequire(import.meta.url); const cjs = require('@updf/png');
      assert.equal(cjs.preparePng, preparePng); assert.equal(cjs.pngProvider, pngProvider);
      const image = cjs.preparePng(new Uint8Array(${JSON.stringify([...fixture()])}));
      const doc = {version:1,pages:[{width:100,height:100,children:[png('image',{x:10,y:20,width:60,height:40})]}]};
      const options = {resources:{image},providers:[pngProvider()]};
      const pdf = render(doc, options); assert.deepEqual(require('@updf/core').render(doc, options), pdf);
      assert.ok(Buffer.from(pdf).toString('latin1').includes('/SMask ')); console.log('packed PNG passed');
    `,
    );
    assert.match(result, /packed PNG passed/u);
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});
