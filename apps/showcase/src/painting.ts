import type { DocumentDefinition, PathCommand } from "@updf/core";
import { render } from "./text-options.js";

const triangle: readonly PathCommand[] = Object.freeze([
  { type: "move", x: 0, y: 0 },
  { type: "line", x: 140, y: 0 },
  { type: "line", x: 70, y: 130 },
  { type: "close" },
]);

export function paintingDemo(title: string): Uint8Array {
  const document: DocumentDefinition = {
    version: 1,
    pages: [
      {
        width: 420,
        height: 300,
        children: [
          {
            type: "text",
            x: 24,
            y: 24,
            width: 372,
            height: 32,
            text: title,
            fontSize: 16,
            lineHeight: 20,
            align: "left",
          },
          {
            type: "path",
            commands: triangle,
            transform: [1, 0, 0, 1, 30, 90],
            paint: { fill: [0.1, 0.5, 0.8], stroke: [0, 0.2, 0.4], width: 3 },
          },
          {
            type: "paintGroup",
            transform: [1, 0.1, 0.2, 1, 210, 90],
            clip: { x: 0, y: 0, width: 140, height: 100 },
            children: [
              { type: "path", commands: triangle, paint: { fill: [0.9, 0.4, 0.1], fillOpacity: 0.6 } },
              {
                type: "rect",
                x: 20,
                y: 20,
                width: 100,
                height: 60,
                paint: { fill: null, stroke: [0.2, 0.2, 0.2], width: 2, dash: [5, 3] },
              },
            ],
          },
        ],
      },
    ],
  };
  return render(document);
}
