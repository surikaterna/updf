/** @jsxImportSource @updf/svg */
import { createSVGComponent, prepareSVGTree } from "@updf/svg/authoring";

export const graphic = prepareSVGTree(
  <svg viewBox="0 0 20 10">
    <title>Logo</title>
    <rect x={2} y={3} width={5} height={4} fill="red" />
  </svg>,
);
export const Logo = createSVGComponent(graphic);

export function failures(): void {
  // @ts-expect-error Unsupported visual shapes are not intrinsic elements.
  const image = <image />;
  // @ts-expect-error Unsupported scripts are not attribute aliases.
  const script = <rect onclick="alert(1)" />;
  // @ts-expect-error Styles are SVG CSS strings, not React style objects.
  const style = <rect style={{ fill: "red" }} />;
  void [image, script, style];
}
