import { h, type VNode } from "@updf/core/vdom";
import { Document, Flow } from "@updf/layout";
import type { NodeDefinition } from "@updf/core";

export const document = (children: VNode | readonly VNode[]) =>
  h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 200 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children,
    }),
  });
export const binary = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");
export function withoutIdentityGroups(nodes: readonly NodeDefinition[]): readonly NodeDefinition[] {
  return nodes.flatMap((node) => {
    if (node.type !== "paintGroup") return [node];
    const children = withoutIdentityGroups(node.children);
    if (!node.clip && JSON.stringify(node.transform) === "[1,0,0,1,0,0]") return children;
    return [{ ...node, children }];
  });
}
export function withoutImages(nodes: readonly NodeDefinition[]): readonly NodeDefinition[] {
  return withoutIdentityGroups(
    nodes.flatMap<NodeDefinition>((node) => {
      if (node.type === "xObject") return [];
      if (node.type === "paintGroup") return [{ ...node, children: withoutImages(node.children) }];
      return [node];
    }),
  );
}
