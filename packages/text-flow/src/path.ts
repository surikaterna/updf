import { fail, paint, validateDataObject } from "@updf/core/internal";
import type { NodeDefinition } from "@updf/core";
import type { RGB } from "@updf/core/painting";
import { parseColor } from "@updf/geometry";
import type { BlockComponent, FixedBlock } from "@updf/layout";
import type { FloatingBlockProps } from "./path-policy.js";
import { authoredGeometry, pathShape, type PathShape, type PathBand, type Charge } from "./path-band.js";

export interface FloatingPathProps {
  readonly d: string;
  readonly fillRule?: "nonzero" | "evenodd";
  readonly fill: RGB | string;
  readonly style: Pick<
    FloatingBlockProps["style"],
    "width" | "height" | "float" | "minWidth" | "maxWidth" | "minHeight" | "maxHeight"
  >;
}
export interface PathCapture {
  readonly shape: PathShape;
  readonly fill: unknown;
}
/** Both typed facades retain the same semantic identity, including authored TSX keys. */
export function pathFacade(Block: BlockComponent<FloatingBlockProps>): BlockComponent<FloatingPathProps> {
  return Block as unknown as BlockComponent<FloatingPathProps>;
}
export function capturePath(input: Readonly<Record<string, unknown>>, path: string): PathCapture {
  validateDataObject(input, ["d", "fillRule", "fill", "style"], path);
  const shape = pathShape(
    { d: input.d, ...(Object.hasOwn(input, "fillRule") ? { fillRule: input.fillRule } : {}) },
    path,
  )!;
  validateDataObject(
    input.style,
    ["width", "height", "float", "minWidth", "maxWidth", "minHeight", "maxHeight"],
    `${path}/style`,
  );
  if (input.fill === undefined) fail("PAINT", path, "Path requires fill");
  return Object.freeze({ shape, fill: input.fill });
}
export function pathVisual(
  geometry: PathBand,
  capture: PathCapture,
  width: number,
  height: number,
  charge: Charge,
  path: string,
): FixedBlock {
  charge(typeof capture.fill === "string" ? capture.fill.length + 1 : 4);
  const input = capture.fill;
  const fill =
    typeof input === "string"
      ? authoredGeometry(() => parseColor(input), "/color", `${path}/fill`)
      : { rgb: input, opacity: 1 };
  const node: NodeDefinition = {
    type: "path",
    commands: geometry.commands,
    paint: paint({ fill: fill.rgb, fillOpacity: fill.opacity, fillRule: capture.shape.fillRule }, "path", path),
  };
  return { type: "fixed", width, height, children: [node] };
}
