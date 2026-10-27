import { preparePng, type PngResource } from "@updf/png";
import { readPngAlpha, type PngSignal } from "@updf/png/alpha";
import { preparePngShape, type PngShape } from "@updf/text-flow/png-shape";

export async function inspect(bytes: Uint8Array, signal: PngSignal): Promise<PngShape> {
  const resource: PngResource = await preparePng(bytes, { signal });
  const plane = await readPngAlpha(resource, { signal, maxPixels: 100 });
  if (plane.kind === "alpha") plane.bytes.fill(0);
  const shape = await preparePngShape(resource, { signal, shapeImageThreshold: 0.15, maxPixels: 100, maxCommands: 50 });
  if (shape.kind === "contours") {
    // @ts-expect-error Geometry arrays are immutable.
    shape.commands.push({ type: "close" });
    // @ts-expect-error Metadata is immutable.
    shape.width = 0;
  }
  return shape;
}
