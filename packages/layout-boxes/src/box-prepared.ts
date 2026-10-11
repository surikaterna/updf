import { exceeds, sum } from "./arithmetic.js";
import { type BoxPlacement, placeResolved, type ResolvedBoxSize } from "./box-placement.js";
import { fail } from "./error.js";
import { number, record } from "./width-validation.js";

/** Explicit prepared row lengths/alignment with up to 100000 indexed children; no option defaults. */
export interface PreparedBoxView {
  readonly width: number;
  readonly height: number;
  readonly paddingTop: number;
  readonly paddingRight: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
  readonly gap: number;
  readonly alignItems: "start" | "center" | "end" | "stretch";
  readonly childCount: number;
  readonly childAt: (index: number) => ResolvedBoxSize;
  readonly path: string;
}
/**
 * Place already-certified host sizes in a row; does not allocate tracks or measure.
 * Nonnegative finite lengths and horizontal/vertical fit are checked; violations
 * throw LayoutInputError. Returns frozen offsets relative to the content origin,
 * not including padding. The host remains responsible for native materialization.
 */
export function viewBox(input: PreparedBoxView): BoxPlacement {
  const data = preparedInput(input);
  const sizes: ResolvedBoxSize[] = [];
  for (let i = 0; i < data.childCount; i++) {
    const child = record(data.childAt(i), ["width", "height"], `${data.path}/children/${i}`);
    sizes.push({ width: number(child.width, data.path), height: number(child.height, data.path) });
  }
  const contentWidth = sum([data.width, -data.paddingLeft, -data.paddingRight]);
  const occupiedWidth = sum([...sizes.map((size) => size.width), Math.max(0, sizes.length - 1) * data.gap]);
  if (exceeds(occupiedWidth, contentWidth))
    fail("GEOMETRY", data.path, "Prepared box children and gaps must fit within horizontal insets");
  const vertical = sum([data.paddingTop, data.paddingBottom]);
  const tallest = sizes.reduce((max, size) => Math.max(max, size.height), 0);
  if (exceeds(sum([vertical, tallest]), data.height))
    fail("GEOMETRY", data.path, "Prepared box cannot truncate children");
  return placeResolved(
    {
      flexDirection: "row",
      alignItems: data.alignItems,
      top: data.paddingTop,
      bottom: data.paddingBottom,
      vertical,
      gap: data.gap,
    },
    data.height,
    sizes,
    data.path,
  );
}
const preparedKeys = [
  "width",
  "height",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "alignItems",
  "childCount",
  "childAt",
  "path",
];
function preparedInput(input: PreparedBoxView): PreparedBoxView {
  const data = record(input, preparedKeys, "/prepared");
  for (const key of ["width", "height", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "gap"])
    number(data[key], `/prepared/${key}`);
  if (typeof data.path !== "string" || typeof data.childAt !== "function")
    fail("TYPE", "/prepared", "Expected path and child callback");
  if (!Number.isSafeInteger(data.childCount) || (data.childCount as number) < 0 || (data.childCount as number) > 100000)
    fail("LIMIT", data.path, "Prepared child count limit exceeded");
  if (!["start", "center", "end", "stretch"].includes(data.alignItems as string))
    fail("TYPE", data.path, "Invalid box alignment");
  return data as unknown as PreparedBoxView;
}
