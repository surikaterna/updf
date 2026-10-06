import type { DocumentDefinition } from "@updf/core";
import { render } from "./text-options.js";

export function textDemo(title: string): Uint8Array {
  const document: DocumentDefinition = {
    version: 1,
    pages: [
      {
        width: 420,
        height: 300,
        children: [
          { type: "rect", x: 24, y: 24, width: 372, height: 70, paint: { fill: [0.9, 0.96, 1] } },
          {
            type: "richText",
            x: 36,
            y: 40,
            width: 340,
            height: 32,
            paragraphs: [
              {
                runs: [{ text: title }],
                defaultStyle: { font: "Helvetica", fontSize: 18, color: [0, 0, 0] },
                lineHeight: 22,
                align: "left",
                whiteSpace: "preserve",
                breakLongWords: "error",
              },
            ],
          },
          {
            type: "richText",
            x: 36,
            y: 120,
            width: 340,
            height: 80,
            paragraphs: [
              {
                runs: [{ text: "Explicit points. Explicit pages.\nThe same bytes in Node and browsers." }],
                defaultStyle: { font: "Helvetica", fontSize: 12, color: [0, 0, 0] },
                lineHeight: 18,
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
  return render(document);
}
