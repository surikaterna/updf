/**
 * `@updf/text`: portable plain/rich text fitting, without PDF serialization.
 * Inputs and results use top-left points and explicitly installed text/font capabilities.
 * @module
 */
import type { RenderOptions } from "@updf/core";
import { measureStandaloneText } from "@updf/core/internal";
import type { TextMeasurement, TextMeasurementInput } from "./types.js";

export { paintInlineText } from "./inline-paint.js";
export { validateLineHeight } from "./line-height.js";
export type { TextServiceOptions } from "./service.js";
export { createTextService } from "./service.js";
export type * from "./types.js";

/**
 * Return deeply frozen metrics with a fresh budget per call; omitted height measures natural height.
 * No pagination, font fallback, shaping, bidi or kerning is performed.
 * @throws {DocumentError} For invalid input/fonts, token or vertical overflow, ink or budget failures.
 */
export function measureText(input: TextMeasurementInput, options: RenderOptions): TextMeasurement {
  return measureTextUnknown(input, options);
}
/** Validate unknown data and measure with the same contract as {@link measureText}. */
export function measureTextUnknown(input: unknown, options: RenderOptions): TextMeasurement {
  return measureStandaloneText(input as TextMeasurementInput, options);
}
