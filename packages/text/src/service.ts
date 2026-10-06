import { dataRecord, fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import type { TextService } from "@updf/core/resources";
import { measureInline } from "./inline.js";
import { participant } from "./line-height.js";
import { rich } from "./measure.js";
import { measurementClosure, type TextMeasurerOptions } from "./measurer.js";
import { fontId } from "./text-resources.js";
import { effectiveStyle, validateInput, validateStyle } from "./validate.js";

export interface TextServiceOptions extends TextMeasurerOptions {
  readonly defaultFont?: string;
}
export function createTextService(options: TextServiceOptions): TextService {
  validateDataObject(options, ["runtime", "defaultFont"], "/text");
  const defaultFont = ownDataValue(options, "defaultFont", "/text/defaultFont");
  if (Object.hasOwn(options, "defaultFont") && typeof defaultFont !== "string")
    fail("TYPE", "/text/defaultFont", "Expected font id");
  const { fonts, measure } = measurementClosure(ownDataValue(options, "runtime", "/text/runtime"), defaultFont);
  return Object.freeze({
    measure,
    validate(input, context, path) {
      validateInput(input, fonts(context), context.budget, path);
    },
    rich: (input, context, path) => rich(input, fonts(context), context.budget, path),
    inline: (paragraph, visuals, width, height, context, path) =>
      measureInline(paragraph, visuals, width, height, fonts(context), context.budget, path),
    validateStyle: (style, context, path) => validateStyle(style, fonts(context), path),
    resolveStyle(style, context, path) {
      dataRecord(style, path);
      const resources = fonts(context);
      const font = ownDataValue(style, "font", `${path}/font`);
      if (Object.hasOwn(style, "font") && typeof font !== "string") fail("TYPE", `${path}/font`, "Expected font id");
      const result = { ...style, font: fontId(font, resources, `${path}/font`) };
      validateStyle(result, resources, path);
      return effectiveStyle(result);
    },
    lineBox: (style, height, context, path) => participant(style, height, fonts(context), path),
  } satisfies TextService);
}
