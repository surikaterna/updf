import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { absent, execute, install, pack } from "../../scripts/consumer/install.js";
import { typeConsumer } from "../../scripts/consumer/types.js";
import { fixture } from "../../packages/png/test/helpers.js";

test("PNG alpha and shape leaves isolate default entries in browser and unshaken CJS graphs", async () => {
  for (const entry of [
    "@updf/png",
    "@updf/png/alpha",
    "@updf/text-flow",
    "@updf/text-flow/path",
    "@updf/text-flow/png-shape",
  ]) {
    const output = await build({
      stdin: { contents: `export * from '${entry}'`, resolveDir: process.cwd() },
      bundle: true,
      platform: "browser",
      format: "esm",
      write: false,
      metafile: true,
    });
    const browser = Object.keys(output.metafile!.inputs);
    const cjs: string[] = JSON.parse(
      execFileSync(
        process.execPath,
        ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
        { encoding: "utf8" },
      ),
    );
    for (const modules of [browser, cjs]) {
      assert.equal(
        modules.some((p) => /png\/(?:dist\/)?(?:cjs\/)?alpha\.js$/u.test(p)),
        entry.endsWith("/alpha") || entry.endsWith("/png-shape"),
      );
      assert.equal(
        modules.some((p) => /png\/(?:dist\/)?(?:cjs\/)?decode\.js$/u.test(p)),
        entry === "@updf/png",
      );
      assert.ok(!modules.some((p) => /\/images\/|normalization|browser-png/u.test(p)));
      if (entry.startsWith("@updf/text-flow") && !entry.endsWith("png-shape"))
        assert.ok(!modules.some((p) => /\/png\//u.test(p)));
    }
  }
});

test("packed PNG shape explicit closure shares owners and types without DOM/Node ambient dependencies", async () => {
  const destination = await mkdtemp("/tmp/opencode/updf-png-shape-packs-");
  let directory: string | undefined;
  try {
    const tarballs = await Promise.all(
      ["layout-boxes", "core", "text", "layout", "geometry", "png", "text-flow"].map((name) =>
        pack(`packages/${name}`, destination),
      ),
    );
    directory = await install(tarballs);
    await absent(directory, ["@updf/images", "@updf/assets", "@updf/jpeg", "@updf/fonts", "pako", "fflate"]);
    await typeConsumer(directory, ["png-shape-template.ts"], false, false);
    await typeConsumer(directory, ["png-shape-template.ts"], true, false);
    await execute(
      directory,
      `
      import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import {preparePng} from '@updf/png';import {readPngAlpha} from '@updf/png/alpha';
      import {preparePngShape} from '@updf/text-flow/png-shape';
      const require=createRequire(import.meta.url);
      assert.equal(require('@updf/png/alpha').readPngAlpha,readPngAlpha);
      assert.equal(require('@updf/text-flow/png-shape').preparePngShape,preparePngShape);
      const resource=await preparePng(new Uint8Array(${JSON.stringify([...fixture()])}));
      assert.equal((await readPngAlpha(resource)).kind,'alpha');
      const shape=await preparePngShape(resource);assert.equal(shape.kind,'contours');
      assert.equal(shape.commands.length,10);assert.ok(Object.isFrozen(shape.commands));
    `,
    );
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});
