import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DocumentError } from "@updf/core";
import { fontRuntime } from "@updf/fonts";
import { compositionCapability } from "../packages/text/src/composition-operation.js";
import { composeRectangular } from "../packages/text/src/composition-plan.js";
import { serviceClosure } from "../packages/text/src/service.js";
import { compositionOptions, createLayoutOperation } from "../tests/fixtures/text-flow/options.js";
import { rectangular } from "../tests/fixtures/text-flow/rectangular.js";

function capture(text: string, side: "left" | "right" | undefined, width: number, height: number) {
  const charges: [number, string][] = [];
  const base = compositionOptions();
  const { service, fonts } = serviceClosure({ runtime: fontRuntime(), defaultFont: "Helvetica" });
  const capability = compositionCapability((input, context, path, charge) =>
    composeRectangular(input, fonts(context), context, path, (amount, at) => {
      charges.push([amount, at]);
      charge(amount, at);
    }),
  );
  const operation = createLayoutOperation({
    ...base,
    text: service,
    capability: capability as unknown as typeof base.capability,
  });
  try {
    const frame = operation.composeText({
      ...rectangular(text, {}, width),
      maxHeight: height,
      ...(side ? { exclusion: { shape: "rect" as const, side, width: Math.min(20, width), height: 32, top: 1 } } : {}),
    });
    return { frame, charges };
  } catch (error) {
    if (!(error instanceof DocumentError)) throw error;
    return { diagnostics: error.diagnostics, charges };
  } finally {
    operation.close();
  }
}
const cases = [];
for (const text of ["", "\n", "AB CD EF GH", " AB  CD\n\n", "😀A", "abcdefghijk"])
  for (const side of [undefined, "left", "right"] as const)
    for (const width of [1, 30, 60]) cases.push(...[0, 16, 128].map((height) => capture(text, side, width, height)));
const output = process.argv[2];
assert.ok(output, "Supply output artifact path");
if (process.argv[3])
  assert.deepEqual(JSON.parse(JSON.stringify(cases)), JSON.parse(await readFile(process.argv[3], "utf8")));
await writeFile(output, JSON.stringify(cases));
console.log({ output, cases: cases.length, compared: Boolean(process.argv[3]) });
