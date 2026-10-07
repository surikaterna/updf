/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { compilePreparedSVG } from "@updf/svg/authoring";
import { graphic, Logo } from "./svg-graphic-template.js";

export const document = (
  <document version={1}>
    <page width={200} height={100}>
      <Logo x={10} y={15} w={60} h={40} />
      <Logo x={90} y={10} w={100} h={70} />
    </page>
  </document>
);
export const bytes = render(lower(document));
export const compiled = compilePreparedSVG(graphic, { x: 10, y: 15, w: 60, h: 40 });

export function failures(): void {
  // @ts-expect-error Every actual target dimension is required.
  const missing = <Logo x={0} y={0} w={10} />;
  // @ts-expect-error Graphic data is captured privately, not a component prop.
  const extra = <Logo x={0} y={0} w={10} h={10} graphic={graphic} />;
  const children = (
    // @ts-expect-error Target data does not have universally injected children.
    <Logo x={0} y={0} w={10} h={10}>
      ignored
    </Logo>
  );
  void [missing, extra, children];
}
