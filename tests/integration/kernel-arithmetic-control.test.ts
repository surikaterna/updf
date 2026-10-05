import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { arithmeticControl, arithmeticSource, certifyArithmetic } from "../../scripts/layout-kernel-control.js";

async function probe(source: string, entry = "@updf/core/measurement") {
  const control = arithmeticControl(source);
  const result = await build({
    stdin: { contents: `export * from '${entry}';`, resolveDir: process.cwd() },
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

test("historical arithmetic certificate rejects source bytes and hook requires the real core input", async () => {
  const source = await arithmeticSource();
  assert.throws(() => certifyArithmetic(`${source} `), /pre-kernel source certificate/);
  await probe(source);
  await probe(source, "./packages/core/src/measurement/index.ts");
  await assert.rejects(probe(source, "@updf/layout-kernel/arithmetic"), /exactly one core arithmetic input/);
  await assert.rejects(probe("export const = ;"), /arithmetic\.js.*Expected/s);
});

test("public core measurement executes the replaced arithmetic body", async () => {
  const source = await arithmeticSource();
  const needle = "add(value: number): number {";
  assert.equal(source.split(needle).length, 2);
  const runtime = await probe(source.replace(needle, `${needle} throw new Error('PRE_KERNEL_ARITHMETIC_EXECUTED');`));
  const input = {
    kind: "rich",
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
  assert.equal((await probe(source)).measureText(input).lineCount, 1);
  assert.throws(() => runtime.measureText(input), { message: "PRE_KERNEL_ARITHMETIC_EXECUTED" });
});
