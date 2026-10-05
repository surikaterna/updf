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
import { dataRecord, ownDataValue, snapshot } from "./data.js";
import { fail } from "./error.js";
import type { OwnedResource } from "./owned-resource.js";
import type { MeasuredText } from "./plan.js";
import { validateTextOutput } from "./text-output.js";

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
const keys = [
  "measure",
  "validate",
  "fixed",
  "rich",
  "inline",
  "validateStyle",
  "resolveStyle",
  "lineBox",
  "fixedInk",
] as const;

export function ownTextService(value: unknown): TextService {
  const path = "/options/text";
  dataRecord(value, path);
  const callbacks = Object.create(null) as TextService;
  for (const key of keys) {
    const callback = ownDataValue(value, key, `${path}/${key}`);
    if (typeof callback !== "function") fail("FONT_RESOURCE", `${path}/${key}`, "Missing text service capability");
    Object.defineProperty(callbacks, key, {
      value: (...args: unknown[]) => {
        const path = args.at(-1) as string;
        const result = ownTextOutput(callback.apply(value, args), path);
        validateTextOutput(key, result, path);
        return result;
      },
      enumerable: true,
    });
  }
  return Object.freeze(callbacks);
}

/** Clone returned data but retain opaque run identities for the resource provider. */
export function ownTextOutput<T>(value: T, path: string): T {
  return snapshot(value, path, (item, at) => {
    if (typeof item === "number" && !Number.isFinite(item)) fail("GEOMETRY", at, "Text output must be finite");
    if (!at.endsWith("/run")) return false;
    if (!item || typeof item !== "object") fail("FONT_RESOURCE", at, "Expected opaque text run");
    return true;
  });
}
