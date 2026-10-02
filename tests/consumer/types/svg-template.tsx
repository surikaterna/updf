/** @jsxImportSource @updf/core */

import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { compileSVG, renderSVG, type SVGTarget } from "@updf/svg";
import { Svg } from "@updf/svg/tree";

const source = '<svg width="100" height="100"><circle cx="50" cy="50" r="20" fill="red"/></svg>';
const target = { x: 0, y: 0, w: 100, h: 100 } satisfies SVGTarget;
export const bytes = render({
  version: 1,
  pages: [{ width: 100, height: 100, children: [renderSVG(source, target)] }],
});
export const tree = (
  <document version={1}>
    <page width={100} height={100}>
      <Svg source={source} {...target} />
    </page>
  </document>
);
export const treeBytes = render(lower(tree));
export const warnings = compileSVG(source, target).diagnostics;

export function failures(): void {
  // @ts-expect-error Source is textual input, not a DOM/Fontkit object or callback.
  const callback = <Svg source={() => source} {...target} />;
  // @ts-expect-error Required target dimensions are inferred from component props.
  const missing = <Svg source={source} x={0} y={0} w={100} />;
  // @ts-expect-error Geometry fields are numbers, not unit strings/coercion.
  const string = renderSVG(source, { ...target, h: "100px" });
  const children = (
    // @ts-expect-error Svg has no universally injected children/editor callback props.
    <Svg source={source} {...target}>
      unknown
    </Svg>
  );
  // @ts-expect-error Warning diagnostics remain readonly.
  warnings.push({ code: "SVG_STYLE", path: "/svg", message: "x", severity: "warning", span: { start: 0, end: 1 } });
  void [callback, missing, string, children];
}
