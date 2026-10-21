import { render } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { layout } from "../../packages/layout/dist/cjs/layout.js";

export function fixedAdmissionProof() {
  const results = [];
  for (const [heights, height, top] of [
    [[4.9, 0.1], 5, 0],
    [[1.2, 1.1], 2.3, 0],
    [[0.1, 0.2], 0.3, 0],
    [[10.3, 10.3, 10.3], 30.9, 0],
    [[0.1, 0.2], 0.3, 10],
    [[10.3, 10.3, 10.3], 30.9, 700],
    [[1.2, 1.1, 0.1], 10, 1],
  ] as const) {
    const operation = createDrawingLayoutOperation({});
    try {
      const result = layout(
        {
          pageTemplate: { width: 100, height: top + height, margins: { top, right: 0, bottom: 0, left: 0 } },
          body: heights.map((height) => ({
            type: "fixed",
            height,
            children: [{ type: "rect", x: 0, y: 0, width: 10, height, paint: { fill: [0, 0, 0], stroke: null } }],
          })),
        },
        operation,
      );
      results.push({ result, bytes: Array.from(render(result.document)) });
    } finally {
      operation.close();
    }
  }
  return results;
}
