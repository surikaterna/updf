import { mkdir, writeFile } from "node:fs/promises";
import { render } from "@updf/core";
import { renderSVG } from "@updf/svg";
import { logoLikeSVG, signatureLikeSVG } from "./svg-fixtures.js";

const artifacts = new URL("../../../artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const document = {
  version: 1,
  pages: [
    {
      width: 400,
      height: 460,
      children: [
        renderSVG(logoLikeSVG, { x: 40, y: 20, w: 320, h: 200 }),
        renderSVG(signatureLikeSVG, { x: 40, y: 240, w: 320, h: 200 }),
      ],
    },
  ],
} as const;
await writeFile(new URL("svg-proof.pdf", artifacts), render(document));
