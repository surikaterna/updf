/** @jsxImportSource @updf/core */
import { Logo } from "./graphic.js";

// @ts-expect-error All target coordinates and dimensions are required.
export const missingTarget = <Logo x={0} y={0} w={10} />;
// @ts-expect-error The bound native component does not accept graphic data.
export const graphicProp = <Logo x={0} y={0} w={10} h={10} graphic={{}} />;
