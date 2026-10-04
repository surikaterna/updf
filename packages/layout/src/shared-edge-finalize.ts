import type { NodeDefinition } from "@updf/core";
import { fail, type LayoutOperation, sum } from "@updf/core/internal";
import type { OutputBudget } from "./budget.js";
import {
  checkSharedEdgeOperation,
  copySharedEdgeNode,
  edgeRegionNode,
  sharedEdgeEmission,
} from "./shared-edge-emission.js";
import { paintSharedEdges } from "./shared-edge-paint.js";
import { ownEdgeRegion, ownSharedEdgeGroup, requireEdgeRegion } from "./shared-edge-regions.js";
import type { EdgeRegionPlacement, SharedEdgeGroup } from "./shared-edge-types.js";

function reports(
  nodes: readonly NodeDefinition[],
  operation: LayoutOperation,
  x: number,
  y: number,
): EdgeRegionPlacement[] {
  const regions: EdgeRegionPlacement[] = [];
  const pending = [...nodes].reverse().map((node) => ({ node, x, y, translated: true }));
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    const { node } = entry;
    if (node.type !== "paintGroup") continue;
    const matrix = node.transform ?? [1, 0, 0, 1, 0, 0];
    const translated = entry.translated && matrix[0] === 1 && matrix[1] === 0 && matrix[2] === 0 && matrix[3] === 1;
    const left = sum([entry.x, matrix[4]]),
      top = sum([entry.y, matrix[5]]);
    const value = sharedEdgeEmission(node);
    checkSharedEdgeOperation(node, operation);
    if (value?.kind === "region") {
      if (!translated) fail("GEOMETRY", value.path, "Shared edge reports require translation-only placement");
      regions.push({ region: requireEdgeRegion(value.region, operation, value.path), x: left, y: top });
      continue;
    }
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child) pending.push({ node: child, x: left, y: top, translated });
    }
  }
  return regions;
}
function eraseReports(nodes: readonly NodeDefinition[]): readonly NodeDefinition[] {
  return mapGroups(nodes, (node, children) => ({ ...node, children }));
}
export function finishSharedEdgeNode(
  node: NodeDefinition,
  children: readonly NodeDefinition[],
  operation: LayoutOperation,
  budget: OutputBudget,
  rootPath?: string,
): NodeDefinition {
  const value = sharedEdgeEmission(node);
  checkSharedEdgeOperation(node, operation);
  if (node.type !== "paintGroup") return node;
  if (!value) return { ...node, children };
  if (value.kind === "region")
    return copySharedEdgeNode(node, { ...node, children: finishLooseSharedEdges(children, operation, budget) });
  const group = ownSharedEdgeGroup(
    {
      width: value.width,
      height: value.height,
      regions: reports(children, operation, -value.x, -value.y),
    },
    operation,
    value.path,
  );
  if (value.path === rootPath) {
    const report = rootReport(group, children, value, operation, budget);
    return node.transform && report.type === "paintGroup"
      ? copySharedEdgeNode(report, { ...report, transform: node.transform })
      : report;
  }
  const paint = paintSharedEdges(group, operation, value.path);
  const output: NodeDefinition[] = [...eraseReports(children)];
  if (paint.length) {
    const layer: NodeDefinition = { type: "paintGroup", transform: [1, 0, 0, 1, value.x, value.y], children: paint };
    budget.charge([layer], value.path);
    output.push(layer);
  }
  return { ...node, children: output };
}
function rootReport(
  group: SharedEdgeGroup,
  children: readonly NodeDefinition[],
  placement: { readonly x: number; readonly y: number; readonly path: string },
  operation: LayoutOperation,
  budget: OutputBudget,
): NodeDefinition {
  let content = eraseReports(children);
  if (placement.x || placement.y) {
    content = [{ type: "paintGroup", transform: [1, 0, 0, 1, -placement.x, -placement.y], children: content }];
    budget.generated(1, 0, 0, 0, placement.path);
  }
  const claims = group.regions.flatMap(({ region, x, y }) =>
    region.claims.map((claim) => {
      const horizontal = claim.axis === "horizontal",
        along = horizontal ? x : y;
      return {
        ...claim,
        coordinate: sum([claim.coordinate, horizontal ? y : x]),
        interval: [sum([claim.interval[0], along]), sum([claim.interval[1], along])] as const,
      };
    }),
  );
  const region = ownEdgeRegion(
    { width: group.width, height: group.height, nodes: content, claims },
    operation,
    placement.path,
  );
  const marker = edgeRegionNode(region, operation, placement.path);
  if (!placement.x && !placement.y) return marker;
  budget.generated(1, 0, 0, 0, placement.path);
  return { type: "paintGroup", transform: [1, 0, 0, 1, placement.x, placement.y], children: [marker] };
}
export function finishLooseSharedEdges(
  nodes: readonly NodeDefinition[],
  operation: LayoutOperation,
  budget: OutputBudget,
  rootPath?: string,
): readonly NodeDefinition[] {
  return mapGroups(nodes, (node, children) => {
    const value = sharedEdgeEmission(node);
    checkSharedEdgeOperation(node, operation);
    if (value?.kind !== "region") return { ...node, children };
    if (value.path === rootPath) return copySharedEdgeNode(node, { ...node, children });
    const region = requireEdgeRegion(value.region, operation, value.path);
    const group = ownSharedEdgeGroup(
      { width: region.width, height: region.height, regions: [{ region, x: 0, y: 0 }] },
      operation,
      value.path,
    );
    const paint = paintSharedEdges(group, operation, value.path);
    budget.charge(paint, value.path);
    return { ...node, children: [...children, ...paint] };
  });
}
function mapGroups(
  nodes: readonly NodeDefinition[],
  finish: (
    node: Extract<NodeDefinition, { type: "paintGroup" }>,
    children: readonly NodeDefinition[],
  ) => NodeDefinition,
): readonly NodeDefinition[] {
  const output: NodeDefinition[] = [],
    tasks: (() => void)[] = [];
  const schedule = (values: readonly NodeDefinition[], into: NodeDefinition[]): void => {
    for (let i = values.length - 1; i >= 0; i--) {
      const node = values[i];
      if (!node) continue;
      tasks.push(() => {
        if (node.type !== "paintGroup") {
          into.push(node);
          return;
        }
        const children: NodeDefinition[] = [];
        tasks.push(() => into.push(finish(node, children)));
        schedule(node.children, children);
      });
    }
  };
  schedule(nodes, output);
  while (tasks.length) tasks.pop()?.();
  return output;
}
