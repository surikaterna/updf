/**
 * `@updf/core/measurement`: portable plain/rich text fitting, without PDF serialization.
 * Inputs and results use top-left points and the same font resources as rendering.
 * @module
 */
import { operation } from "../core/operation.js";
import type { RenderOptions } from "../fonts/types.js";
import { measureInput } from "./measure.js";
import type { TextMeasurement, TextMeasurementInput } from "./types.js";

export type {
  InkBounds,
  ParagraphDefinition,
  PlainTextInput,
  RichTextInput,
  TextFragmentMeasurement,
  TextLineMeasurement,
  TextMeasurement,
  TextMeasurementInput,
  TextRun,
  TextStyle,
} from "./types.js";

/**
 * Return deeply frozen metrics with a fresh budget per call; omitted height measures natural height.
 * No pagination, font fallback, shaping, bidi or kerning is performed.
 * @throws {DocumentError} For invalid input/fonts, token or vertical overflow, ink or budget failures.
 */
export function measureText(input: TextMeasurementInput, options: RenderOptions = {}): TextMeasurement {
  return measureTextUnknown(input, options);
}
/** Validate unknown data and measure with the same contract as {@link measureText}. */
export function measureTextUnknown(input: unknown, options: RenderOptions = {}): TextMeasurement {
  const { fonts, budget } = operation(options);
  return measureInput(input, fonts, budget, "");
}
