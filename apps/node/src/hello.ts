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
          type: "text",
          x: 40,
          y: 40,
          width: 200,
          height: 24,
          text: "Hello PDF",
          fontSize: 10,
          lineHeight: 12,
          align: "left",
        },
      ],
    },
  ],
};
export const bytes: Uint8Array = render(document);
