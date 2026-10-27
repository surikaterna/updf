import { fail, number, ownDataValue, validateDataObject } from "@updf/core/internal";
import { validateBlockStyle } from "@updf/layout/internal-visual";
import type { ImageCapture, ImageProps } from "./types.js";
import { declaredSource } from "./source.js";

export function captureImage(input: Readonly<Record<string, unknown>>, path: string) {
  validateDataObject(input, ["src", "fit", "style"], path);
  const src = declaredSource(ownDataValue(input, "src", `${path}/src`), `${path}/src`);
  const fit = Object.hasOwn(input, "fit") ? ownDataValue(input, "fit", `${path}/fit`) : "contain";
  if (fit !== "contain" && fit !== "fill") fail("VALUE", `${path}/fit`, "Expected contain or fill; omit the default");
  const style = ownDataValue(input, "style", `${path}/style`);
  if (!style || typeof style !== "object") fail("TYPE", `${path}/style`, "Image requires explicit point dimensions");
  validateBlockStyle(style, `${path}/style`);
  for (const axis of ["width", "height"])
    number(
      ownDataValue(style as Readonly<Record<string, unknown>>, axis, `${path}/style/${axis}`),
      `${path}/style/${axis}`,
      true,
    );
  return {
    props: { style: style as ImageProps["style"] },
    visual: Object.freeze<ImageCapture>({ src, fit }),
  };
}
