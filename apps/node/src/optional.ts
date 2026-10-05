import { readFile } from "node:fs/promises";
import { type DocumentDefinition, render } from "@updf/core";
import { prepareFont } from "@updf/fontkit";
import { renderSVG } from "@updf/svg";
import { textOptions } from "./text-options.js";

const painting = renderSVG('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>', {
  x: 10,
  y: 10,
  w: 80,
  h: 80,
});
export const svgBytes = render({ version: 1, pages: [{ width: 100, height: 100, children: [painting] }] });

const font = prepareFont(
  new Uint8Array(await readFile(new URL("../../../tests/fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
);
const document: DocumentDefinition = {
  version: 1,
  pages: [
    {
      width: 100,
      height: 100,
      children: [
        {
          type: "text",
          x: 10,
          y: 10,
          width: 80,
          height: 20,
          text: "Привет",
          font: "Demo",
          fontSize: 10,
          lineHeight: 12,
          align: "left",
        },
      ],
    },
  ],
};
export const fontBytes = render(document, textOptions({ resources: { Demo: font } }));
