import { name } from "../core/pdf-values.js";
import { type PageResources, type Resource, type ResourceProvider, resourceSlot } from "../core/resource-types.js";
import type { ResolvedDrawing } from "./types.js";

const alphaSlot = resourceSlot<string>();
export function alphaAt(resources: PageResources, drawing: ResolvedDrawing): string | undefined {
  const paint = drawing.paint;
  if ((!paint.fill || paint.fillOpacity === 1) && (!paint.stroke || !paint.width || paint.strokeOpacity === 1))
    return undefined;
  return resources.resolve(drawing, alphaSlot).payload;
}
export function alphaProvider(): ResourceProvider {
  let next = 1;
  return {
    slot: alphaSlot,
    collect(node, collection) {
      if (node.type === "paintGroup" || node.type === "text" || node.type === "richText" || !node.painting) return;
      const drawing = node.painting;
      const paint = drawing.paint;
      const fill = paint.fill ? paint.fillOpacity : 1;
      const stroke = paint.stroke && paint.width ? paint.strokeOpacity : 1;
      const identity = `${fill}|${stroke}`;
      if (identity === "1|1") return;
      const resource = collection.intern(alphaSlot, identity, () => alpha(`GS${next++}`, fill, stroke));
      collection.bind(drawing, alphaSlot, resource);
    },
  };
}
function alpha(key: string, fill: number, stroke: number): Resource<string> {
  return {
    category: "ExtGState",
    key,
    payload: key,
    phase: "content",
    reserve(writer) {
      const ref = writer.reserve();
      return { ref, define: () => writer.define(ref, { Type: name("ExtGState"), ca: fill, CA: stroke }) };
    },
  };
}
