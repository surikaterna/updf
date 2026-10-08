import { fail } from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-boxes";
import { type DerivedAxis, derivedAxis as derive, materializedStart as materialize } from "@updf/layout-boxes/geometry";

export type { DerivedAxis };
export function derivedAxis(start: number, end: number, path: string): DerivedAxis {
  try {
    return derive(start, end, path);
  } catch (error) {
    if (error instanceof LayoutInputError) fail(error.code, error.path, error.message);
    throw error;
  }
}
export function materializedStart(axis: DerivedAxis, offset: number, extent: number, path: string): number {
  try {
    return materialize(axis, offset, extent, path);
  } catch (error) {
    if (error instanceof LayoutInputError) fail(error.code, error.path, error.message);
    throw error;
  }
}
