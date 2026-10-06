import { fail } from "../core/error.js";
import { finite, number } from "../core/schema.js";
import { exceeds } from "../measurement/arithmetic.js";
import { type Bounds, intersection, rectangle } from "../painting/bounds.js";
import type { ValidationView } from "./context.js";

export function inPage(bounds: Bounds | undefined, view: ValidationView, path: string, richBox = false): void {
  if (!bounds) return;
  const visible = view.clip ? intersection(bounds, view.clip) : bounds;
  if (
    visible &&
    (visible[0] < 0 ||
      visible[1] < 0 ||
      (richBox ? exceeds(visible[2], view.width) : visible[2] > view.width) ||
      (richBox ? exceeds(visible[3], view.height) : visible[3] > view.height))
  )
    fail("BOUNDS", path, "Visible geometry/stroke must fit page or bounded clip");
}

export function box(
  node: Record<string, unknown>,
  view: ValidationView,
  path: string,
  positiveHeight: boolean,
  checkArithmetic = false,
): void {
  const x = view.local ? finite(node.x, `${path}/x`) : number(node.x, `${path}/x`);
  const y = view.local ? finite(node.y, `${path}/y`) : number(node.y, `${path}/y`);
  const width = number(node.width, `${path}/width`, true);
  const height = number(node.height, `${path}/height`, positiveHeight);
  if (checkArithmetic) {
    finite(x + width, `${path}/width`);
    finite(y + height, `${path}/height`);
  }
  inPage(rectangle(x, y, width, height, view.matrix), view, path, !positiveHeight);
}
