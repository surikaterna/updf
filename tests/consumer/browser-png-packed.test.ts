import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import { absent, execute, install, pack } from "../../scripts/consumer/install.js";
import { typeConsumer } from "../../scripts/consumer/types.js";

test("packed browser PNG leaf is Node ESM/CJS safe with PNG-only peers and no ambient DOM types", async () => {
  const destination = await mkdtemp("/tmp/opencode/browser-png-packs-");
  let directory: string | undefined;
  try {
    const names = ["assets", "layout-boxes", "core", "text", "layout", "png", "images"];
    const tarballs = await Promise.all(names.map((name) => pack(`packages/${name}`, destination)));
    directory = await install(tarballs);
    await absent(directory, ["@updf/jpeg", "@updf/fonts", "@updf/svg", "fflate", "pako"]);
    await typeConsumer(directory, ["browser-png-template.ts"], false, false);
    await typeConsumer(directory, ["browser-png-template.ts"], true, false);
    await execute(
      directory,
      `
      import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import {browserPngImages} from '@updf/images/browser-png';
      const require=createRequire(import.meta.url);
      assert.equal(require('@updf/images/browser-png').browserPngImages,browserPngImages);
      assert.ok(Object.isFrozen(browserPngImages()));
      assert.equal(globalThis.document,undefined);assert.equal(globalThis.createImageBitmap,undefined);
      const root=require('@updf/images');assert.deepEqual(Object.keys(root).sort(),['Image','images']);
    `,
    );
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});
