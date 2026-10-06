import type { DocumentDefinition, NodeDefinition, PaintingGroupNode } from "@updf/core";
import { fail } from "@updf/core/internal";
import { h, type VNode } from "@updf/core/vdom";

function props<T extends NodeDefinition>(node: T): Omit<T, "type"> {
  const result = { ...node };
  Reflect.deleteProperty(result, "type");
  return result;
}
function leaf(node: Exclude<NodeDefinition, PaintingGroupNode>): VNode {
  if (node.type === "richText") return h("richText", props(node));
  if (node.type === "rect") return h("rect", props(node));
  if (node.type === "line") return h("line", props(node));
  if (node.type === "xObject") return h("xObject", props(node));
  return h("path", props(node));
}
interface Frame {
  readonly nodes: readonly NodeDefinition[];
  readonly output: VNode[];
  readonly group?: PaintingGroupNode;
  index: number;
}
/** Postorder conversion uses ordinary owned factories without recursive children.map calls. */
function nativeNodes(nodes: readonly NodeDefinition[]): VNode[] {
  const output: VNode[] = [];
  const frames: Frame[] = [{ nodes, output, index: 0 }];
  while (frames.length) {
    const frame = frames.at(-1);
    if (!frame) break;
    if (frame.index === frame.nodes.length) {
      frames.pop();
      if (frame.group) frames.at(-1)?.output.push(h("paintGroup", { ...props(frame.group), children: frame.output }));
      continue;
    }
    const node = frame.nodes[frame.index++];
    if (!node) fail("TYPE", "", "Expected a validated native node");
    if (node.type === "paintGroup") frames.push({ nodes: node.children, output: [], index: 0, group: node });
    else frame.output.push(leaf(node));
  }
  return output;
}
export function nativeDocument(document: DocumentDefinition): VNode {
  return h("document", {
    version: 1,
    children: document.pages.map((page) =>
      h("page", {
        width: page.width,
        height: page.height,
        children: nativeNodes(page.children),
      }),
    ),
  });
}
