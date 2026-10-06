import type { DocumentDefinition } from "@updf/core";
import { render } from "./text-options.js";

const document: DocumentDefinition = {
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
          width: 200,
          height: 24,
          paragraphs: [
            {
              runs: [{ text: "Hello PDF" }],
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
};
export const bytes: Uint8Array = render(document);
