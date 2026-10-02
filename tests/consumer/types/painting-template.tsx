/** @jsxImportSource @updf/core */

import { type DocumentDefinition, type Matrix, type Paint, type PathCommand, render } from "@updf/core";
import { point } from "@updf/core/painting";
import { h, lower } from "@updf/core/vdom";
import { parsePathData } from "@updf/geometry";

const commands = [
  { type: "move", x: 10, y: 10 },
  { type: "line", x: 40, y: 10 },
  { type: "line", x: 40, y: 40 },
  { type: "close" },
] as const satisfies readonly PathCommand[];
const paint = { fill: [1, 0, 0], stroke: null, fillOpacity: 0.5 } as const satisfies Paint;
const transform = [1, 0, 0.25, 1, 10, 10] as const satisfies Matrix;
export const tree = (
  <document version={1}>
    <page width={100} height={100}>
      <paintGroup clip={{ x: 0, y: 0, width: 100, height: 100 }}>
        <path commands={commands} paint={paint} transform={transform} />
        <rect x={60} y={60} width={20} height={20} paint={{ fill: [0, 1, 0], stroke: null }} />
      </paintGroup>
    </page>
  </document>
);
export const bytes = render(lower(tree));
export const parsed = parsePathData("M1 1Q5 10 10 1Z");
export const mapped = point(transform, 10, 20);

export function typeFailures(document: DocumentDefinition): void {
  // @ts-expect-error Raw PDF command strings are not a native typed path.
  const raw = <path commands="10 20 m" />;
  // @ts-expect-error Unsupported command type, not an arbitrary interpreter.
  const invalid = <path commands={[{ type: "arc", x: 0, y: 0 }]} />;
  // @ts-expect-error Six affine coefficients are required.
  const matrix = <paintGroup transform={[1, 0, 0, 1]}>{null}</paintGroup>;
  // @ts-expect-error RGB has exactly three numeric normalized components.
  const color = <path commands={commands} paint={{ fill: "red" }} />;
  // @ts-expect-error Unsupported dash/line-cap string shape.
  const cap = h("line", { x: 0, y: 0, x2: 20, y2: 20, paint: { lineCap: "triangle" } });
  // @ts-expect-error No callback-valued painting hooks.
  const callback = <path commands={commands} paint={() => {}} />;
  // @ts-expect-error Native definitions remain readonly.
  document.pages.push({ width: 100, height: 100, children: [] });
  void [raw, invalid, matrix, color, cap, callback];
}
