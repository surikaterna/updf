/** @jsxImportSource @updf/svg */
// @ts-expect-error Visual text is outside the supported SVG subset.
export const unsupportedTag = <text />;
// @ts-expect-error React aliases are not SVG attribute names.
export const unsupportedAttribute = <rect strokeWidth={2} />;
// @ts-expect-error Style objects are not the supported CSS-string grammar.
export const styleObject = <rect style={{ fill: "red" }} />;
// @ts-expect-error SVG color arrays are not supported.
export const colorArray = <rect fill={[1, 0, 0]} />;
// @ts-expect-error Numeric children are not supported.
export const numericChild = <title>{42}</title>;
// @ts-expect-error Images are not supported SVG shapes.
export const image = <image />;
// @ts-expect-error Script attributes are forbidden.
export const scriptAttribute = <rect onclick="alert(1)" />;
