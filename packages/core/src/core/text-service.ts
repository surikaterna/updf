import type { InlineLine, InlineMetric } from "../measurement/inline.js";
import type { WorkLedger } from "../measurement/ledger.js";
import type { InlineLineHeights, LineEnvelope, LineHeight } from "../measurement/line-height.js";
import type { PrivateFragment } from "../measurement/lines.js";
import type {
  ParagraphDefinition,
  RichTextInput,
  TextMeasurement,
  TextMeasurementInput,
  TextStyle,
} from "../measurement/types.js";
import { dataRecord } from "./data.js";
import { validateDataObject } from "./schema.js";
import type { OwnedResource } from "./owned-resource.js";
import { captureTextCallback } from "./text-capture.js";
import { validateMeasurement } from "./text-measurement-output.js";
import { validateInline, validateLineBox, validateRich } from "./text-output.js";
import { style } from "./text-output-shapes.js";
import { ownDataValue } from "./data.js";
import { fail } from "./error.js";
import { checkTextServiceRequest, type TextServiceProvider } from "./text-service-request.js";

export interface TextServiceContext {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly budget: WorkLedger;
}
/** Structural capability contract; core neither selects fonts nor computes text metrics. */
export interface TextService {
  readonly provide?: TextServiceProvider;
  measure(input: TextMeasurementInput, context: TextServiceContext, path: string): TextMeasurement;
  validate(input: unknown, context: TextServiceContext, path: string): void;
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
}
export function ownTextService(value: unknown): TextService {
  const path = "/options/text";
  dataRecord(value, path);
  validateDataObject(
    value,
    ["measure", "validate", "rich", "inline", "validateStyle", "resolveStyle", "lineBox", "provide"],
    path,
  );
  const unchanged = () => {};
  const callbacks = Object.assign(Object.create(null), {
    ...captureProvider(value, path),
    measure: captureTextCallback(value, "measure", path, validateMeasurement),
    validate: captureTextCallback(value, "validate", path, unchanged),
    rich: captureTextCallback(value, "rich", path, validateRich),
    inline: captureTextCallback(value, "inline", path, validateInline),
    validateStyle: captureTextCallback(value, "validateStyle", path, unchanged),
    resolveStyle: captureTextCallback(value, "resolveStyle", path, style),
    lineBox: captureTextCallback(value, "lineBox", path, validateLineBox),
  });
  return Object.freeze(callbacks) as TextService;
}
function captureProvider(value: Record<string, unknown>, path: string): Pick<TextService, "provide"> {
  if (!Object.hasOwn(value, "provide")) return {};
  const callback = ownDataValue(value, "provide", `${path}/provide`);
  if (typeof callback !== "function") fail("FONT_RESOURCE", `${path}/provide`, "Expected text service provider");
  const provide: TextServiceProvider = (request, scope) => {
    checkTextServiceRequest(request);
    const bind = callback.call(value, request, scope);
    if (typeof bind !== "function") fail("FONT_RESOURCE", `${path}/provide`, "Expected operation binding");
    return bind;
  };
  return { provide: Object.freeze(provide) };
}
