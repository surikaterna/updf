import { type DocumentDefinition, render } from "@updf/core";

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
            type: "text",
            x: 36,
            y: 40,
            width: 340,
            height: 32,
            text: title,
            fontSize: 18,
            lineHeight: 22,
            align: "left",
          },
          {
            type: "text",
            x: 36,
            y: 120,
            width: 340,
            height: 80,
            text: "Explicit points. Explicit pages.\nThe same bytes in Node and browsers.",
            fontSize: 12,
            lineHeight: 18,
            align: "left",
          },
        ],
      },
    ],
  };
  return render(document);
}
