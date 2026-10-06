import { dataRecord, fail, ownDataValue } from "@updf/core/internal";
import type { TextService } from "@updf/core/resources";
import { measureFixedText } from "./fixed-text.js";
import { measureInline } from "./inline.js";
import { participant } from "./line-height.js";
import { rich } from "./measure.js";
import { measurementClosure, type TextMeasurerOptions } from "./measurer.js";
import { ink, metrics } from "./metrics.js";
import { fontId } from "./text-resources.js";
import { effectiveStyle, validateInput, validateStyle } from "./validate.js";

export interface TextServiceOptions extends TextMeasurerOptions {}
export function createTextService(options: TextServiceOptions): TextService {
  const { fonts, measure } = measurementClosure(options);
  return Object.freeze({
    measure,
    validate: (input, context, path) => validateInput(input, fonts(context), context.budget, path),
    fixed: (node, context, path) => measureFixedText(node, path, fonts(context), context.budget),
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
    fixedInk(node, context, path) {
      const resources = fonts(context);
      const style = effectiveStyle({
        font: fontId(node.font, resources, path),
        fontSize: node.fontSize,
        color: [0, 0, 0],
      });
      return node.lines.map((line) => ink(metrics(line.text, style, resources, path), line.x, line.y));
    },
  } satisfies TextService);
}
