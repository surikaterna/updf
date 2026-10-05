import { fail } from "@updf/core/internal";
import { resolveWidths as allocate, LayoutInputError } from "@updf/layout-kernel";
import type { WidthResolution, WidthResolutionInput } from "./width-types.js";

export function resolveWidths(input: WidthResolutionInput, path?: string): WidthResolution;
export function resolveWidths(input: unknown, path?: string): WidthResolution;
export function resolveWidths(input: unknown, path = "/widths"): WidthResolution {
  try {
    return allocate(input, path);
  } catch (error) {
    if (error instanceof LayoutInputError) fail(error.code, error.path, error.message);
    throw error;
  }
}
