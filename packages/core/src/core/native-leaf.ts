import type { NativeLeafNode } from "../types.js";
import type { MeasuredRichText } from "./plan.js";
import type { OwnedResource } from "./owned-resource.js";
import { fail } from "./error.js";
import { authorizeNativeLeaf, isNativeLeafPayload } from "./native-leaf-ownership.js";
import type { CapabilityScope } from "./operation-capability.js";
import { checkCapabilityScope } from "./operation-capability.js";
import { number } from "./schema.js";
import { isOwnedTextOutput } from "./text-capture.js";
import { fragments } from "./text-output-shapes.js";
import type { PrivateFragment } from "../measurement/lines.js";
import type { ResolvedTextResources } from "./text-resources.js";

/** Closed native representation, not user callbacks, commands or child recipes. */
export type SelectedNativeLeaf = Omit<MeasuredRichText, "x" | "y">;
interface SealedLeaf {
  readonly selected: SelectedNativeLeaf;
  readonly resources: ReadonlyMap<string, OwnedResource>;
}
const payloads = new WeakMap<object, SealedLeaf>();

/** Only the checked capability boundary can seal an already captured native text selection. */
export function sealSelectedText(
  scope: CapabilityScope,
  width: number,
  height: number,
  output: { readonly fragments: readonly PrivateFragment[] },
  path: string,
): NativeLeafNode {
  checkCapabilityScope(scope);
  number(width, `${path}/width`, true);
  number(height, `${path}/height`);
  if (!isOwnedTextOutput(output)) fail("MEASUREMENT_CONTEXT", path, "Expected owned selected text output");
  fragments(output.fragments, `${path}/fragments`, true);
  const resources = new Map<string, OwnedResource>();
  for (const fragment of output.fragments) {
    const id = fragment.style.font;
    const resource = scope.bindings.get(id);
    if (!resource) fail("FONT_RESOURCE", path, "Missing selected font binding");
    resources.set(id, resource);
  }
  const selected = Object.freeze({
    type: "richText",
    width,
    height,
    paragraphs: Object.freeze([]),
    fragments: output.fragments,
  } as const);
  const payload = Object.freeze(Object.create(null)) as object;
  payloads.set(payload, { selected, resources });
  authorizeNativeLeaf(payload);
  return Object.freeze({ type: "nativeLeaf", x: 0, y: 0, width, height, payload });
}
function sealed(payload: unknown, path: string): SealedLeaf {
  const data = isNativeLeafPayload(payload) ? payloads.get(payload) : undefined;
  if (!data) fail("MEASUREMENT_CONTEXT", path, "Expected authorized native leaf payload");
  return data;
}
export function nativeLeafData(
  node: Pick<NativeLeafNode, "payload" | "width" | "height">,
  fonts: ResolvedTextResources,
  path: string,
): SelectedNativeLeaf {
  const data = sealed(node.payload, `${path}/payload`);
  if (node.width !== data.selected.width || node.height !== data.selected.height)
    fail("GEOMETRY", path, "Native leaf dimensions must match exactly");
  for (const [id, resource] of data.resources)
    if (fonts.bindings.get(id) !== resource) fail("FONT_RESOURCE", path, "Native leaf resource identity mismatch");
  return data.selected;
}
export function visitNativeLeaf(payload: unknown, path: string, visit: (text: string) => void): void {
  for (const fragment of sealed(payload, path).selected.fragments) visit(fragment.text);
}
