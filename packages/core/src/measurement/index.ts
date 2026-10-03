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

export function measureText(input: TextMeasurementInput, options: RenderOptions = {}): TextMeasurement {
  return measureTextUnknown(input, options);
}
export function measureTextUnknown(input: unknown, options: RenderOptions = {}): TextMeasurement {
  const { fonts, budget } = operation(options);
  return measureInput(input, fonts, budget, "");
}
