/** @jsxImportSource @updf/svg */
import { createSVGComponent, prepareSVGTree } from "@updf/svg/authoring";

function Mark({ size }: { readonly size: number }) {
  return <rect x={2} y={3} width={size} height={4} fill="red" stroke-width={0.5} />;
}
export const graphicData = (
  <svg viewBox="0 0 20 10" transform="rotate(15)">
    <title>Structured graphic</title>
    <g>
      <Mark size={5} />
      {false as const}
      {null}
      {[<circle cx={12} cy={5} r={2} fill="blue" />]}
    </g>
  </svg>
);
export const graphic = prepareSVGTree(graphicData);
export const Logo = createSVGComponent(graphic);
