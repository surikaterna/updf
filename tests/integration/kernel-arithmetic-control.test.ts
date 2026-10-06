import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { arithmeticControl, arithmeticSource, certifyArithmetic } from "../../scripts/layout-kernel-control.js";

async function probe(source: string, entry = "@updf/text") {
  const control = arithmeticControl(source);
  const result = await build({
    stdin: {
      contents: `export * from '${entry}';${
        entry === "@updf/layout-kernel/arithmetic"
          ? ""
          : `
       import {createHelvetica,fontRuntime} from '@updf/fonts';
       import {createTextMeasurer} from '${entry}';
      const runtime=fontRuntime();
       export const options={resources:{Helvetica:createHelvetica()},measurer:createTextMeasurer({runtime})};`
      }`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    metafile: true,
    platform: "neutral",
    format: "esm",
    plugins: [control.plugin],
  });
  control.assertApplied(result.metafile);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.contents).toString("base64")}`);
}

test("historical arithmetic certificate rejects source bytes and hook requires the real text input", async () => {
  const source = await arithmeticSource();
  assert.throws(() => certifyArithmetic(`${source} `), /pre-kernel source certificate/);
  await probe(source);
  await probe(source, "./packages/text/src/index.ts");
  await assert.rejects(probe(source, "@updf/layout-kernel/arithmetic"), /exactly one text arithmetic input/);
  await assert.rejects(probe("export const = ;"), /arithmetic\.js.*Expected/s);
});

test("public text measurement executes the replaced arithmetic body", async () => {
  const source = await arithmeticSource();
  const needle = "add(value: number): number {";
  assert.equal(source.split(needle).length, 2);
  const runtime = await probe(source.replace(needle, `${needle} throw new Error('PRE_KERNEL_ARITHMETIC_EXECUTED');`));
  const input = {
    width: 100,
    paragraphs: [
      {
        runs: [{ text: "abc" }],
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
        lineHeight: 12,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ],
  };
  const current = await probe(source);
  assert.equal(current.measureText(input, current.options).lineCount, 1);
  assert.throws(() => runtime.measureText(input, runtime.options), { message: "PRE_KERNEL_ARITHMETIC_EXECUTED" });
});
