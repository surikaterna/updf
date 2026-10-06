import type { XObjectNode } from "../types.js";
import { fail } from "./error.js";
import type { OwnedResource } from "./owned-resource.js";
import type { MeasuredXObject } from "./plan.js";

export function measureXObject(
  node: XObjectNode,
  path: string,
  bindings: ReadonlyMap<string, OwnedResource>,
): MeasuredXObject {
  const owned = bindings.get(node.resource);
  if (!owned) fail("RESOURCE", `${path}/resource`, "Missing named XObject resource");
  return { ...node, owned, path: `${path}/resource` };
}
