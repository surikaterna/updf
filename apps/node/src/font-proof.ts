import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { DocumentDefinition } from "@updf/core";
import { createPreparedFont } from "@updf/fonts";
import { render } from "./text-options.js";

// Node demonstration of host-provided prepared data, not runtime font parsing.
const fixtures = new URL("../../../tests/fixtures/fonts/", import.meta.url);
const input: unknown = JSON.parse(await readFile(new URL("liberation-sans.json", fixtures), "utf8"));
if (typeof input !== "object" || input === null || Array.isArray(input)) throw new Error("Invalid font fixture");
const bytes = new Uint8Array(await readFile(new URL("LiberationSans-Regular.ttf", fixtures)));
const font = createPreparedFont({ ...input, bytes });
const document = {
  version: 1,
  pages: [
    {
      width: 595,
      height: 842,
      children: [
        {
          type: "richText",
          x: 40,
          y: 40,
          width: 515,
          height: 24,
          paragraphs: [
            {
              runs: [{ text: "Prepared TrueType font proof" }],
              defaultStyle: { font: "Helvetica", fontSize: 16, color: [0, 0, 0] },
              lineHeight: 20,
              align: "left",
              whiteSpace: "preserve",
              breakLongWords: "error",
            },
          ],
        },
        {
          type: "richText",
          x: 40,
          y: 100,
          width: 515,
          height: 100,
          paragraphs: [
            {
              runs: [{ text: "Привет, мир!\nМосква - Latin ABC 123" }],
              defaultStyle: { font: "Demo", fontSize: 20, color: [0, 0, 0] },
              lineHeight: 28,
              align: "left",
              whiteSpace: "preserve",
              breakLongWords: "error",
            },
          ],
        },
        {
          type: "richText",
          x: 40,
          y: 240,
          width: 515,
          height: 24,
          paragraphs: [
            {
              runs: [{ text: "Full embedded Liberation Sans - not a Fontkit/browser parser proof" }],
              defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
              lineHeight: 12,
              align: "left",
              whiteSpace: "preserve",
              breakLongWords: "error",
            },
          ],
        },
      ],
    },
  ],
} satisfies DocumentDefinition;
const output = new URL("../../../artifacts/", import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL("font-proof.pdf", output), render(document, { resources: { Demo: font } }));
