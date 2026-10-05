import { fail } from "@updf/core/internal";
import { resolveWidths as allocate, LayoutInputError } from "@updf/layout-kernel";
import type { WidthResolution, WidthResolutionInput } from "./width-types.js";

/**
 * Allocate fixed/bounded weighted point tracks without content scanning or shrinking.
 * Defaults and exact rounding follow `@updf/layout-kernel`; returns frozen widths/result.
 * Recognized kernel errors become core DocumentError with code/path; host exceptions
 * propagate unchanged. Diagnostic path defaults to /widths. Does not paginate or clip.
 */
export function resolveWidths(input: WidthResolutionInput, path?: string): WidthResolution;
/** Runtime-validation overload for unknown data; same allocation and error contract. */
export function resolveWidths(input: unknown, path?: string): WidthResolution;
export function resolveWidths(input: unknown, path = "/widths"): WidthResolution {
  try {
    return allocate(input, path);
  } catch (error) {
    if (error instanceof LayoutInputError) fail(error.code, error.path, error.message);
    throw error;
  }
}
