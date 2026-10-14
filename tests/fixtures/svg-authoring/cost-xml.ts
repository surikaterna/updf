import { render } from "@updf/core";
import { prepareSVG } from "@updf/svg";
import { compilePreparedSVG } from "@updf/svg/authoring";

export function painting(fill: string) {
  const graphic = prepareSVG(
    `<svg width="40" height="20" viewBox="0 0 40 20" transform="rotate(5)"><title>Cost comparison badge</title><g stroke="black" stroke-width="1"><rect x="2" y="2" width="36" height="16" fill="${fill}"/><path d="M4 10L20 4L36 10Z" fill="none"/></g></svg>`,
  );
  return compilePreparedSVG(graphic, { x: 10, y: 10, w: 80, h: 40 }).node;
}
export function pdf(fill: string) {
  return render({ version: 1, pages: [{ width: 100, height: 60, children: [painting(fill)] }] });
}
