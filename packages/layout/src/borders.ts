import type { RGB } from "@updf/core";
import { array, fail, number, validateDataObject as record, snapshotData } from "@updf/core/internal";

export interface BorderEdge {
  readonly width: number;
  readonly color: RGB;
}
export interface BorderPolicy {
  readonly border?: BorderEdge | null;
  readonly borderTop?: BorderEdge | null;
  readonly borderRight?: BorderEdge | null;
  readonly borderBottom?: BorderEdge | null;
  readonly borderLeft?: BorderEdge | null;
}
export type ExpandedBorders = Omit<BorderPolicy, "border">;
export const borderKeys = ["border", "borderTop", "borderRight", "borderBottom", "borderLeft"] as const;

function validateEdge(value: unknown, path: string): asserts value is BorderEdge | null {
  if (value === null) return;
  record(value, ["width", "color"], path);
  number(value.width, `${path}/width`);
  const color = value.color;
  if (!Array.isArray(color) || color.length !== 3) fail("GEOMETRY", `${path}/color`, "Expected RGB tuple");
  array(color, 3, `${path}/color`);
  for (const [index, component] of color.entries())
    if (number(component, `${path}/color/${index}`) > 1)
      fail("GEOMETRY", `${path}/color/${index}`, "RGB must be in [0,1]");
}

/** Expand a validated layer before merging; omission and explicit null remain distinct. */
export function expandBorders(input: BorderPolicy, path = "/style"): ExpandedBorders {
  record(input, borderKeys, path);
  for (const key of borderKeys) if (key in input) validateEdge(input[key], `${path}/${key}`);
  const result: Record<string, BorderEdge | null> = {};
  for (const key of borderKeys.slice(1)) {
    const source: string = key in input ? key : "border";
    if (!(source in input)) continue;
    const edge = input[source];
    validateEdge(edge, `${path}/${source}`);
    result[key] = edge;
  }
  return snapshotData(result, path);
}

export interface BorderLayer {
  readonly style: BorderPolicy;
  readonly path: string;
}
/** Each layer is checked even when a later layer replaces its values. */
export function mergeBorders(layers: readonly BorderLayer[]): ExpandedBorders {
  const result: ExpandedBorders = {};
  for (const { style, path } of layers) Object.assign(result, expandBorders(style, path));
  return result;
}
