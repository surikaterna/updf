import type { PreparedTextNode } from "../types.js";
import { preparedTextData } from "../core/prepared-text.js";
import type { ResolvedTextResources } from "../core/text-resources.js";
import type { ValidationContext } from "./context.js";
import { box } from "./geometry.js";
import { nativeFields } from "./native-fields.js";
import { codePoints } from "../core/policy.js";
import { textOnce } from "../measurement/ledger.js";

export const preparedTextKeys = ["type", "x", "y", "width", "height", "payload"] as const;
export function measurePreparedText(node: PreparedTextNode, path: string, fonts: ResolvedTextResources) {
  return { ...node, fragments: preparedTextData(node, fonts, path).plan.fragments };
}
export function validatePreparedText(node: Record<string, unknown>, context: ValidationContext): void {
  box(node, context.view, context.path, false, true);
  const data = preparedTextData(
    { payload: node.payload as object, width: node.width as number, height: node.height as number },
    context.fonts,
    context.path,
  );
  let points = 0;
  for (const fragment of data.plan.fragments) points += codePoints(fragment.text);
  textOnce(context.budget, node.payload as object, points, context.path);
}
export function lowerPreparedText(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "preparedText", ...nativeFields(props, x, y, path, "position") };
}
