import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { absent, execute, install, pack } from "../../scripts/consumer/install.js";
import { typeConsumer } from "../../scripts/consumer/types.js";

test("Fontkite tarballs install without Fontkit and expose portable shared ESM/CJS APIs", async () => {
  const destination = await mkdtemp("/tmp/opencode/updf-fontkite-packs-");
  let directory: string | undefined;
  try {
    directory = await install(
      await Promise.all(
        ["assets", "layout-boxes", "core", "fonts", "fontkite"].map((name) => pack(`packages/${name}`, destination)),
      ),
    );
    await absent(directory, ["fontkit", "@updf/fontkit", "brotli", "restructure", "react", "@updf/text"]);
    await typeConsumer(directory, ["fontkite-template.ts"], false, false);
    await typeConsumer(directory, ["fontkite-template.ts"], true, false);
    await writeFile(
      join(directory, "font.ttf"),
      await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)),
    );
    const result = await execute(
      directory,
      `
      import assert from 'node:assert/strict'; import {createRequire} from 'node:module'; import {readFileSync} from 'node:fs';
      import {prepareFont} from '@updf/fontkite'; import {loadFont} from '@updf/fontkite/load'; import {isPreparedFont} from '@updf/fonts';
      const require=createRequire(import.meta.url); assert.equal(require('@updf/fontkite').prepareFont,prepareFont);
      assert.equal(require('@updf/fontkite/load').loadFont,loadFont);
      const bytes=new Uint8Array(readFileSync('font.ttf')); const prepared=prepareFont(bytes);
      assert.ok(isPreparedFont(prepared)); assert.deepEqual((await loadFont(bytes)).metadata,prepared.metadata);
      console.log('packed fontkite passed');
    `,
    );
    assert.match(result, /packed fontkite passed/u);
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});
