import type { NativeLeafNode } from "../types.js";
import { nativeLeafData, visitNativeLeaf } from "../core/native-leaf.js";
import type { ResolvedTextResources } from "../core/text-resources.js";
import type { ValidationContext } from "./context.js";
import { box } from "./geometry.js";
import { nativeFields } from "./native-fields.js";
import { codePoints } from "../core/policy.js";
import { textOnce } from "../measurement/ledger.js";

export const nativeLeafKeys = ["type", "x", "y", "width", "height", "payload"] as const;
export function measureNativeLeaf(node: NativeLeafNode, path: string, fonts: ResolvedTextResources) {
  return { ...node, selected: nativeLeafData(node, fonts, path) };
}
export function validateNativeLeaf(node: Record<string, unknown>, context: ValidationContext): void {
  box(node, context.view, context.path, false, true);
  nativeLeafData(
    { payload: node.payload as object, width: node.width as number, height: node.height as number },
    context.fonts,
    context.path,
  );
  let points = 0;
  visitNativeLeaf(node.payload, context.path, (text) => {
    points += codePoints(text);
  });
  textOnce(context.budget, node.payload as object, points, context.path);
}
export function lowerNativeLeaf(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "nativeLeaf", ...nativeFields(props, x, y, path, "position") };
}
