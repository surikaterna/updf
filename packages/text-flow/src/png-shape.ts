import type { PathCommand } from "@updf/core/painting";
import { readPngAlpha, type PngResource } from "@updf/png/alpha";
import { pixelCellCommands } from "./png-shape-cells.js";
import { checkShapeAbort, shapeOptions, type PreparePngShapeOptions } from "./png-shape-options.js";

export type { PreparePngShapeOptions } from "./png-shape-options.js";
type ShapeMetadata = Readonly<{ width: number; height: number; shapeImageThreshold: number }>;
export type PngShape = ShapeMetadata &
  (Readonly<{ kind: "empty" }> | Readonly<{ kind: "contours"; fillRule: "nonzero"; commands: readonly PathCommand[] }>);

/** Exact union of occupied intrinsic pixel cells. No URL resolution, placement or shape-handler registration. */
export async function preparePngShape(resource: PngResource, options?: PreparePngShapeOptions): Promise<PngShape> {
  const selected = shapeOptions(arguments.length < 2 ? {} : options);
  // The inspector owns signal validation, authentication and the pre-inflation pixel limit.
  const plane = await readPngAlpha(resource, {
    maxPixels: selected.maxPixels,
    ...(Object.hasOwn(selected, "signal") ? { signal: selected.signal! } : {}),
  });
  checkShapeAbort(selected.signal);
  const commands = pixelCellCommands(plane, selected);
  const metadata = { width: plane.width, height: plane.height, shapeImageThreshold: selected.shapeImageThreshold };
  checkShapeAbort(selected.signal);
  return commands.length === 0
    ? Object.freeze({ kind: "empty", ...metadata })
    : Object.freeze({ kind: "contours", ...metadata, fillRule: "nonzero", commands });
}
