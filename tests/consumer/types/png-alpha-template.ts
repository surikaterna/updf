import { pngAlphaShapes, type PngAlphaShapesOptions } from "@updf/text-flow/png-alpha";
import { textFlow } from "@updf/text-flow";
const limits: PngAlphaShapesOptions = { maxPixels: 16000000, maxCommands: 4096 };
export const selected = textFlow({ handlers: [pngAlphaShapes(limits)] });
// @ts-expect-error Numeric limits only.
pngAlphaShapes({ maxCommands: "4096" });
// @ts-expect-error No parallel resource-service option.
pngAlphaShapes({ loader: {} });
