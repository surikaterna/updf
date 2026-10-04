import type { NodeDefinition } from "@updf/core";
import { fail, type LayoutOperation, ownContentData } from "@updf/core/internal";
import { snapshotEmissionData } from "./emission-nodes.js";
import { ownEdgeRegion, requireEdgeRegion } from "./shared-edge-regions.js";
import type { EdgeRegion } from "./shared-edge-types.js";

interface RegionEmission {
  readonly kind: "region";
  readonly operation: LayoutOperation;
  readonly region: EdgeRegion;
  readonly path: string;
}
interface GroupEmission {
  readonly kind: "group";
  readonly operation: LayoutOperation;
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
type EdgeEmission = RegionEmission | GroupEmission;
const emissions = new WeakMap<object, EdgeEmission>();
export const sharedEdgeEmission = (node: object): EdgeEmission | undefined => emissions.get(node);
export const isSharedEdgeNode = (node: unknown): boolean => !!node && typeof node === "object" && emissions.has(node);

function own(node: NodeDefinition, value: EdgeEmission): NodeDefinition {
  const owned = ownContentData(snapshotEmissionData(node, value.path));
  emissions.set(owned, value);
  return owned;
}
export function edgeRegionNode(region: EdgeRegion, operation: LayoutOperation, path: string): NodeDefinition {
  requireEdgeRegion(region, operation, path);
  return own({ type: "paintGroup", children: region.nodes }, { kind: "region", region, operation, path });
}
export function sharedEdgeGroupNode(
  children: readonly NodeDefinition[],
  allocation: Omit<GroupEmission, "kind">,
): NodeDefinition {
  const node = ownContentData(
    snapshotEmissionData(
      { type: "paintGroup" as const, transform: [1, 0, 0, 1, allocation.x, allocation.y] as const, children },
      allocation.path,
    ),
  );
  emissions.set(node, { kind: "group", ...allocation, x: 0, y: 0 });
  return node;
}
export function copySharedEdgeNode(
  previous: NodeDefinition,
  copy: NodeDefinition,
  rebase: (path: string) => string = (path) => path,
): NodeDefinition {
  const value = emissions.get(previous);
  if (!value) return copy;
  const owned = ownContentData(snapshotEmissionData(copy, value.path));
  const path = rebase(value.path);
  const region =
    value.kind === "region" && path !== value.path
      ? ownEdgeRegion(
          {
            ...value.region,
            claims: value.region.claims.map((claim) => ({
              ...claim,
              sourcePath: rebase(claim.sourcePath),
            })),
          },
          value.operation,
          path,
        )
      : undefined;
  emissions.set(owned, { ...value, path, ...(region ? { region } : {}) });
  return owned;
}
export function checkSharedEdgeOperation(node: object, operation: LayoutOperation): void {
  const value = emissions.get(node);
  if (value && value.operation !== operation) fail("TYPE", value.path, "Shared edges belong to another operation");
}
export function sharedEdgeGeometry(previous: NodeDefinition, copy: NodeDefinition): NodeDefinition {
  const value = emissions.get(previous);
  if (!value || copy.type !== "paintGroup") return copy;
  const allocation = value.kind === "region" ? { ...value.region, x: 0, y: 0 } : value;
  if (!allocation.height) return copy;
  // Reports reserve real geometry even when their content is empty or entirely clipped.
  const bounds: NodeDefinition = {
    type: "rect",
    x: allocation.x,
    y: allocation.y,
    width: allocation.width,
    height: allocation.height,
    paint: { fill: [0, 0, 0], stroke: null },
  };
  return { ...copy, children: [...copy.children, bounds] };
}
