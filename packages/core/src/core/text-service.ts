import type { InlineLine, InlineMetric } from "../measurement/inline.js";
import type { WorkLedger } from "../measurement/ledger.js";
import type { InlineLineHeights, LineEnvelope, LineHeight } from "../measurement/line-height.js";
import type { PrivateFragment } from "../measurement/lines.js";
import type {
  InkBounds,
  ParagraphDefinition,
  RichTextInput,
  TextMeasurement,
  TextMeasurementInput,
  TextStyle,
} from "../measurement/types.js";
import type { TextNode } from "../types.js";
import { dataRecord } from "./data.js";
import type { OwnedResource } from "./owned-resource.js";
import type { MeasuredText } from "./plan.js";
import { captureTextCallback } from "./text-capture.js";
import { validateMeasurement } from "./text-measurement-output.js";
import { validateFixed, validateFixedInk, validateInline, validateLineBox, validateRich } from "./text-output.js";
import { style } from "./text-output-shapes.js";

export interface TextServiceContext {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly budget: WorkLedger;
}
/** Structural capability contract; core neither selects fonts nor computes text metrics. */
export interface TextService {
  measure(input: TextMeasurementInput, context: TextServiceContext, path: string): TextMeasurement;
  validate(input: unknown, context: TextServiceContext, path: string): void;
  fixed(node: TextNode, context: TextServiceContext, path: string): MeasuredText;
  rich(
    input: RichTextInput,
    context: TextServiceContext,
    path: string,
  ): { readonly fragments: readonly PrivateFragment[] };
  inline(
    paragraph: ParagraphDefinition,
    visuals: () => readonly InlineMetric[],
    width: number,
    height: boolean | InlineLineHeights,
    context: TextServiceContext,
    path: string,
  ): readonly InlineLine[];
  validateStyle(style: TextStyle, context: TextServiceContext, path: string): void;
  resolveStyle(
    style: Omit<TextStyle, "font"> & { readonly font?: string },
    context: TextServiceContext,
    path: string,
  ): TextStyle;
  lineBox(style: TextStyle, height: LineHeight, context: TextServiceContext, path: string): LineEnvelope;
  fixedInk(node: MeasuredText, context: TextServiceContext, path: string): readonly InkBounds[];
}
export function ownTextService(value: unknown): TextService {
  const path = "/options/text";
  dataRecord(value, path);
  const unchanged = () => {};
  const callbacks = Object.assign(Object.create(null), {
    measure: captureTextCallback(value, "measure", path, validateMeasurement),
    validate: captureTextCallback(value, "validate", path, unchanged),
    fixed: captureTextCallback(value, "fixed", path, validateFixed),
    rich: captureTextCallback(value, "rich", path, validateRich),
    inline: captureTextCallback(value, "inline", path, validateInline),
    validateStyle: captureTextCallback(value, "validateStyle", path, unchanged),
    resolveStyle: captureTextCallback(value, "resolveStyle", path, style),
    lineBox: captureTextCallback(value, "lineBox", path, validateLineBox),
    fixedInk: captureTextCallback(value, "fixedInk", path, validateFixedInk),
  });
  return Object.freeze(callbacks) as TextService;
}
