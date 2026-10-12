import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { absent, execute, install, pack } from "../../scripts/consumer/install.js";
import { typeConsumer } from "../../scripts/consumer/types.js";

test("font loader packs have portable declarations and shared ESM/CommonJS ownership without image codecs", async () => {
  const destination = await mkdtemp("/tmp/opencode/updf-font-load-packs-");
  let directory: string | undefined;
  try {
    directory = await install(
      await Promise.all(
        ["assets", "layout-boxes", "core", "fonts", "fontkit"].map((name) => pack(`packages/${name}`, destination)),
      ),
    );
    await absent(directory, ["fontkit", "@updf/jpeg", "@updf/png", "@updf/image", "@updf/layout", "react"]);
    await typeConsumer(directory, ["font-load-template.ts"], false, false);
    await typeConsumer(directory, ["font-load-template.ts"], true, false);
    execFileSync("npm", ["install", "fontkit@2.0.4", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: directory,
      stdio: "pipe",
    });
    await writeFile(
      join(directory, "font.ttf"),
      await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)),
    );
    const result = await execute(
      directory,
      `
      import assert from 'node:assert/strict'; import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';
      import {createAssetLoader} from '@updf/assets';import {loadFont} from '@updf/fontkit/load';import {prepareFont} from '@updf/fontkit';
      const require=createRequire(import.meta.url);assert.equal(require('@updf/fontkit/load').loadFont,loadFont);
      assert.equal(require('@updf/assets').createAssetLoader,createAssetLoader);
      const bytes=new Uint8Array(readFileSync('font.ttf'));assert.deepEqual((await loadFont(bytes)).metadata,prepareFont(bytes).metadata);
      console.log('packed font loader passed');
    `,
    );
    assert.match(result, /packed font loader passed/u);
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});
