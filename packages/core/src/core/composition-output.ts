import { fail } from "./error.js";
import { array, finite, validateDataObject } from "./schema.js";
import { validateMeasurement } from "./text-measurement-output.js";
import { fragments } from "./text-output-shapes.js";
import { ownDataValue } from "./data.js";
import { compositionCaptureVisitor, ownTextOutput } from "./text-capture.js";
import type { TextServiceContext } from "./text-service.js";
import type { CompositionInput } from "./composition-types.js";

export function captureComposition(value: Record<string, unknown>, path: string) {
  const callback = ownDataValue(value, "compose", `${path}/compose`);
  if (typeof callback !== "function") fail("FONT_RESOURCE", `${path}/compose`, "Missing composition capability");
  return (input: CompositionInput, context: TextServiceContext, at: string) => {
    const result = ownTextOutput(
      callback.call(value, input, context, at),
      at,
      compositionCaptureVisitor(context.budget, at),
    );
    validateComposition(result, at);
    return result;
  };
}

export function validateComposition(value: unknown, path: string): void {
  validateDataObject(value, ["measurement", "bands", "fragments"], path);
  validateMeasurement(value.measurement, `${path}/measurement`);
  fragments(value.fragments, `${path}/fragments`, true);
  array(value.bands, Number.MAX_SAFE_INTEGER, `${path}/bands`);
  value.bands.forEach((band, i) => {
    const at = `${path}/bands/${i}`;
    validateDataObject(band, ["top", "bottom", "baseline"], at);
    const top = finite(band.top, `${at}/top`);
    const bottom = finite(band.bottom, `${at}/bottom`);
    finite(band.baseline, `${at}/baseline`);
    if (top > bottom) fail("GEOMETRY", at, "Inverted occupied text band");
  });
}
