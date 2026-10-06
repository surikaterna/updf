import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { costInputs } from "../../scripts/consumer/cost-inputs.js";

const forbidden =
  /packages\/(?:core\/dist\/(?:core\/(?:layout-operation|validate|text-service|text-output)|vdom\/normalize)|text\/dist\/(?:service|inline|inline-paint))\.js$/u;
async function retained(contents: string) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    metafile: true,
    write: false,
  });
  return Object.values(result.metafile.outputs).flatMap((output) =>
    Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0),
  );
}

test("standalone measurement excludes full service and layout validators; full service is a negative control", async () => {
  const host = await readFile(new URL("./types/host-metrics-template.ts", import.meta.url), "utf8");
  for (const contents of [costInputs(false).measurementFonts!, host]) {
    const modules = await retained(contents);
    assert.deepEqual(
      modules.filter(([path]) => forbidden.test(path)),
      [],
    );
    assert.ok(modules.some(([path]) => path.endsWith("core/text-measurement.js")));
    const style = modules.find(([path]) => path.endsWith("painting/style.js"));
    // The internal barrel still evaluates the frozen black constant, not painting validation.
    assert.ok((style?.[1].bytesInOutput ?? 0) <= 30);
  }
  const control = await retained(
    'import { createLayoutOperation } from "@updf/core/internal"; console.log(createLayoutOperation({}));',
  );
  assert.ok(
    control.some(([path]) => forbidden.test(path)),
    "Negative control must retain layout-only code",
  );
  const service = await retained(`
    import {createTextService} from '@updf/text';
    import {fontRuntime} from '@updf/fonts';
    console.log(createTextService({runtime:fontRuntime()}));
  `);
  assert.ok(
    service.some(([path]) => forbidden.test(path)),
    "A used full service must fail the narrow graph guard",
  );
});

test("source measurement entry delegates only through the narrow internal seam", async () => {
  const source = await readFile(new URL("../../packages/text/src/index.ts", import.meta.url), "utf8");
  assert.ok(!source.includes("createLayoutOperation"));
  const seam = await readFile(new URL("../../packages/core/src/core/text-measurement.ts", import.meta.url), "utf8");
  assert.ok(!/layout-operation|vdom\/normalize|painting\/style|\.\/validate/u.test(seam));
});
