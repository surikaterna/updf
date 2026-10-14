import { render } from "@updf/core";
import { block, createExtensions, document, flow, layout } from "@updf/layout";
import { prepareSVG } from "@updf/svg";
import { svgAdapters, svgBlock } from "@updf/svg/layout";

export function fractionalSVG(nested: boolean): { readonly bytes: Uint8Array; readonly pageCount: number } {
  const picture = (color: string, height: number) =>
    svgBlock(
      prepareSVG(
        `<svg width="1" height="1" preserveAspectRatio="none"><rect width="1" height="1" fill="${color}"/></svg>`,
      ),
      { width: 20, height },
    );
  const children = [picture("red", 78.4), picture("blue", 1.6)];
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 40, height: 80 },
        margins: { top: 0, left: 0, right: 0, bottom: 0 },
        extensions: createExtensions(svgAdapters),
        children: nested ? block({ children }) : children,
      }),
    }),
  );
  return { bytes: render(result.document), pageCount: result.pageCount };
}
