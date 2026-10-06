import { render } from "@updf/core";
import { jsxDEV } from "@updf/core/jsx-dev-runtime";
import { jsx } from "@updf/core/jsx-runtime";
import { lower, type VNode } from "@updf/core/vdom";
import type { Resource, ResourceDefinition } from "@updf/core/resources";
import { isNativeNodeData, isNativeNodeDataArray, nativeNodeToVdom } from "@updf/core/internal-drawing";

export function internalNativeBridge(input: unknown): VNode | undefined {
  if (isNativeNodeDataArray(input)) return input[0] && nativeNodeToVdom(input[0]);
  if (isNativeNodeData(input)) return nativeNodeToVdom(input);
  return undefined;
}

export const resourceDefinition: ResourceDefinition<null> = {
  category: "Custom",
  phase: "content",
  payload: null,
  reserve(writer) {
    const ref = writer.reserve();
    return { ref, define: () => writer.define(ref, {}) };
  },
};
export const invalidDefinition: ResourceDefinition<null> = {
  ...resourceDefinition,
  // @ts-expect-error ResourceDefinition deliberately has no provider-assigned key.
  key: "UserKey",
};
export function readonlyResource(resource: Resource<null>, invalid = false): string {
  if (invalid) {
    // @ts-expect-error Only core can assign the readonly resource key.
    resource.key = "Override";
  }
  return resource.key;
}

const page: VNode = jsx("page", { width: 100, height: 100 });
const tree: VNode = jsxDEV("document", { version: 1, children: page });
export const bytes: Uint8Array = render(lower(tree));
