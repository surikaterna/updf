import { paragraph } from "@updf/layout";
import { prepareSVG } from "@updf/svg";
import { svgAdapters, svgBlock, svgInline } from "@updf/svg/layout";
import type { TableVisual } from "./tables.js";

export const tableIconSource =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24" viewBox="0 0 40 24"><rect x="2" y="2" width="36" height="20" fill="#008000"/><circle cx="20" cy="12" r="6" fill="#ff0000"/></svg>';
const graphic = prepareSVG(tableIconSource);
export const tableVisual: TableVisual = {
  adapters: svgAdapters,
  content: () => [
    svgBlock(graphic, {}),
    paragraph({ style: { lineHeight: 1.8 }, children: ["Inline badge ", svgInline(graphic, { width: 20 })] }),
  ],
};
