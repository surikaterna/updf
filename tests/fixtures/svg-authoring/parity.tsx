/** @jsxImportSource @updf/svg */
import { render } from "@updf/core";
import { prepareSVG } from "@updf/svg";
import { compilePreparedSVG, prepareSVGTree } from "@updf/svg/authoring";

export function source(fill: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20" transform="rotate(5)"><title>Parity badge</title><g><rect x="2" y="2" width="36" height="16" fill="${fill}"/></g></svg>`;
}
function pdf(fill: string, structured: boolean) {
  const graphic = structured
    ? prepareSVGTree(
        <svg width={40} height={20} viewBox="0 0 40 20" transform="rotate(5)">
          <title>Parity badge</title>
          <g>
            <rect x={2} y={2} width={36} height={16} fill={fill} />
          </g>
        </svg>,
      )
    : prepareSVG(source(fill));
  const { node } = compilePreparedSVG(graphic, { x: 10, y: 10, w: 80, h: 40 });
  return render({ version: 1, pages: [{ width: 100, height: 60, children: [node] }] });
}
export const xmlPDF = (fill: string) => pdf(fill, false);
export const tsxPDF = (fill: string) => pdf(fill, true);
