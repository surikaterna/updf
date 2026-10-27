import { fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import { parsePathData, polygon } from "@updf/geometry";
import type { ContentBlockProps } from "@updf/layout";
import { visualComponent } from "./component-owner.js";
import { defineHandler, type GeometryHandler, type ShapeHandler } from "./handlers.js";
import { authoredGeometry, prepareCommands } from "./path-band.js";
import { pathVisual, type PathCapture } from "./path.js";
import { Source, type FillRule, type ShapeSource } from "./sources.js";
import "./manual-participation.js";

type Dimensions = Pick<NonNullable<ContentBlockProps["style"]>, "minWidth" | "maxWidth" | "minHeight" | "maxHeight"> & {
  readonly width: number;
  readonly height: number;
};
export interface PathProps {
  readonly d: string;
  readonly fill: import("@updf/core/painting").RGB | string;
  readonly fillRule?: FillRule;
  readonly style: Dimensions;
}
export interface FloatingPathProps extends Omit<PathProps, "style"> {
  readonly style: Dimensions & {
    readonly float: "left" | "right";
    readonly shapeOutside?: ShapeSource | string;
    readonly shapeImageThreshold?: number;
  };
}
export const Path = visualComponent<PathProps>({
  capture(input, path, floating) {
    validateDataObject(input, ["d", "fill", "fillRule", "style"], path);
    const style = ownDataValue(input, "style", `${path}/style`);
    validateDataObject(
      style,
      [
        "width",
        "height",
        "minWidth",
        "maxWidth",
        "minHeight",
        "maxHeight",
        ...(floating ? ["float", "shapeOutside", "shapeImageThreshold"] : []),
      ],
      `${path}/style`,
    );
    const d = ownDataValue(input, "d", `${path}/d`);
    const fill = ownDataValue(input, "fill", `${path}/fill`);
    if (typeof d !== "string") fail("TYPE", `${path}/d`, "Expected path data");
    const fillRule = Object.hasOwn(input, "fillRule") ? ownDataValue(input, "fillRule", `${path}/fillRule`) : "nonzero";
    if (fillRule !== "nonzero" && fillRule !== "evenodd") fail("VALUE", `${path}/fillRule`, "Unknown fill rule");
    if (fill === undefined || fill === null) fail("PAINT", `${path}/fill`, "Path requires fill");
    return {
      props: { children: null, style: style as Dimensions },
      visual: Object.freeze({ shape: Source.path(d, { fillRule }), fill }),
    };
  },
});
/** Paths and polygons share the existing closed-edge validation; polygon input never becomes SVG text. */
export function pathShapes(): ShapeHandler {
  return defineHandler({
    kind: "geometry",
    resolve: geometry,
    visual: (band, capture, ...rest) => pathVisual(band, capture as PathCapture, ...rest),
  });
}
const geometry: GeometryHandler = (source, width, height, side, charge, path) => {
  if (source.kind === "url") return fail("VALUE", path, "URL shape resolution/extraction is not implemented");
  charge(source.kind === "path" ? source.d.length + 1 : source.points.length + 1);
  const commands =
    source.kind === "path"
      ? authoredGeometry(() => parsePathData(source.d), "/path", `${path}/d`)
      : authoredGeometry(() => polygon(source.points), "/points", `${path}/points`);
  return prepareCommands(commands, width, height, side, charge, path);
};
