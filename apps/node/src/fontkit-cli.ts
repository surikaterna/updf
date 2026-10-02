import { readFile, writeFile } from "node:fs/promises";
import { render } from "@updf/core";
import { createUnicodeCmrDocument } from "@updf/example-cmr/cmr-unicode";
import { prepareFont } from "@updf/fontkit";

const output = process.argv[2];
if (!output || process.argv.length !== 3) throw new Error("Usage: node apps/node/dist/fontkit-cli.js OUTPUT.pdf");
const bytes = new Uint8Array(
  await readFile(new URL("../../../tests/fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)),
);
const font = prepareFont(bytes);
await writeFile(output, render(createUnicodeCmrDocument(font), { resources: { CmrFont: font } }));
