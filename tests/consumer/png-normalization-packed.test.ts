import { mkdtemp, rm } from "node:fs/promises";
import { test } from "node:test";
import { absent, execute, install, pack } from "../../scripts/consumer/install.js";
import { typeConsumer } from "../../scripts/consumer/types.js";
import { png16 } from "../../packages/png/test/normalization-fixture.js";

test("isolated normalization exports share ESM/CJS identity and typecheck without DOM or Node ambient types", async () => {
  const destination = await mkdtemp("/tmp/opencode/updf-png-normalization-packs-");
  let directory: string | undefined;
  try {
    const tarballs = await Promise.all(
      ["layout-boxes", "core", "png"].map((name) => pack(`packages/${name}`, destination)),
    );
    directory = await install(tarballs);
    await absent(directory, ["@updf/assets", "@updf/images", "@updf/jpeg", "@updf/fonts", "fflate", "pako"]);
    await typeConsumer(directory, ["png-normalization-template.ts"], false, false);
    await typeConsumer(directory, ["png-normalization-template.ts"], true, false);
    await execute(
      directory,
      `
      import assert from 'node:assert/strict'; import {createRequire} from 'node:module';
      import * as eligibility from '@updf/png/normalization';
      import * as png from '@updf/png';
      import {isOwnedResource} from '@updf/core/resources';
      const require = createRequire(import.meta.url);
       assert.deepEqual(Object.keys(eligibility).sort(), ['PNG_SOURCE_LIMIT','preparePngNormalization']);
       assert.equal(eligibility.PNG_SOURCE_LIMIT, 8 * 1024 * 1024);
      assert.equal(require('@updf/png/normalization').preparePngNormalization, eligibility.preparePngNormalization);
      assert.deepEqual(Object.keys(png).sort(), ['png','pngProvider','preparePng']);
      const source = new Uint8Array(${JSON.stringify([...png16()])});
      const result = await eligibility.preparePngNormalization(source);
      assert.equal(result.metadata.bitDepth, 16); assert.equal(isOwnedResource(result), false);
      assert.notEqual(result.bytes.buffer,source.buffer);
      await assert.rejects(()=>png.preparePng(source), error=>error.diagnostics[0].code==='PNG_PROFILE');
    `,
    );
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});
