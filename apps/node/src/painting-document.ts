import type { DocumentDefinition, PathCommand } from "@updf/core";

const rings: readonly PathCommand[] = Object.freeze([
  { type: "move", x: 140, y: 20 },
  { type: "line", x: 240, y: 20 },
  { type: "line", x: 240, y: 100 },
  { type: "line", x: 140, y: 100 },
  { type: "close" },
  { type: "move", x: 160, y: 40 },
  { type: "line", x: 220, y: 40 },
  { type: "line", x: 220, y: 80 },
  { type: "line", x: 160, y: 80 },
  { type: "close" },
]);
export const paintingDocument = {
  version: 1,
  pages: [
    {
      width: 300,
      height: 300,
      children: [
        {
          type: "rect",
          x: 20,
          y: 20,
          width: 40,
          height: 40,
          paint: { fill: [1, 0, 0], stroke: null, fillOpacity: 0.5 },
        },
        { type: "rect", x: 80, y: 20, width: 40, height: 40, paint: { fill: [0, 1, 0], stroke: null } },
        {
          type: "text",
          x: 20,
          y: 80,
          width: 100,
          height: 20,
          text: "TEXT",
          fontSize: 12,
          lineHeight: 14,
          align: "left",
        },
        { type: "path", commands: rings, paint: { fill: [0, 0, 1], fillRule: "evenodd" } },
        {
          type: "path",
          commands: rings,
          transform: [1, 0, 0, 1, 0, 100],
          paint: { fill: [1, 0.5, 0], fillRule: "nonzero" },
        },
        {
          type: "paintGroup",
          transform: [1, 0, 0.3, 1, 10, 120],
          clip: { x: 10, y: 10, width: 80, height: 80 },
          children: [
            { type: "rect", x: -100, y: -100, width: 300, height: 300, paint: { fill: [0, 0, 0], stroke: null } },
          ],
        },
        {
          type: "path",
          commands: [
            { type: "move", x: 0, y: 0 },
            { type: "line", x: 40, y: 0 },
            { type: "line", x: 40, y: 40 },
            { type: "close" },
          ],
          transform: [-1, 0, 0.2, 1, 260, 210],
          paint: { fill: [0.5, 0, 1] },
        },
        {
          type: "rect",
          x: 0,
          y: 0,
          width: 40,
          height: 40,
          transform: [1.5, 0.2, 0.3, 0.75, 20, 240],
          paint: {
            fill: [0, 1, 1],
            stroke: [1, 0, 0],
            width: 2,
            strokeOpacity: 0.25,
            lineJoin: "bevel",
            lineCap: "round",
            dash: [3, 2, 1],
            dashOffset: -1,
          },
        },
      ],
    },
  ],
} satisfies DocumentDefinition;
