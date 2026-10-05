import type { RenderOptions } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import type { TextMeasurement, TextMeasurementInput } from "./types.js";

export { paintInlineText } from "./inline-paint.js";
export { validateLineHeight } from "./line-height.js";
export type { TextServiceOptions } from "./service.js";
export { createTextService } from "./service.js";
export type * from "./types.js";

export function measureText(input: TextMeasurementInput, options: RenderOptions): TextMeasurement {
  return measureTextUnknown(input, options);
}
export function measureTextUnknown(input: unknown, options: RenderOptions): TextMeasurement {
  const operation = createLayoutOperation(options);
  try {
    return operation.measureText(input as TextMeasurementInput, "");
  } finally {
    operation.close();
  }
}
