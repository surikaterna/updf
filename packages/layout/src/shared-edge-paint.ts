import type { NodeDefinition } from "@updf/core";
import { checkLimit, type LayoutOperation, number, sum } from "@updf/core/internal";
import { edgeKey, sharedIntervals, touches } from "./shared-edge-touch.js";
import type { LocalEdgeClaim, SharedEdgeGroup } from "./shared-edge-types.js";

interface Claim extends LocalEdgeClaim {
  readonly order: number;
}
function translated(group: SharedEdgeGroup): Claim[] {
  const claims: Claim[] = [];
  for (const { region, x, y } of group.regions) {
    for (const claim of region.claims) {
      const offset = claim.axis === "horizontal" ? x : y;
      claims.push({
        ...claim,
        interval: [sum([claim.interval[0], offset]), sum([claim.interval[1], offset])],
        coordinate: sum([claim.coordinate, claim.axis === "horizontal" ? y : x]),
        order: claims.length,
      });
    }
  }
  return claims;
}
function band(claim: Claim, start: number, end: number, group: SharedEdgeGroup, path: string): NodeDefinition {
  const horizontal = claim.axis === "horizontal";
  const limit = horizontal ? group.height : group.width;
  const low = claim.coordinate - Math.min(claim.coordinate, claim.width / 2);
  const high = sum([claim.coordinate, Math.min(limit - claim.coordinate, claim.width / 2)]);
  const thickness = number(high - low, path, true);
  return {
    type: "rect",
    x: horizontal ? start : low,
    y: horizontal ? low : start,
    width: horizontal ? end - start : thickness,
    height: horizontal ? thickness : end - start,
    paint: { fill: claim.color, stroke: null },
  };
}
const preferred = (a: Claim, b: Claim): boolean => a.width > b.width || (a.width === b.width && a.order < b.order);
class Winners {
  private readonly heap: Claim[] = [];
  add(claim: Claim): void {
    let index = this.heap.length;
    this.heap.push(claim);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2),
        value = this.heap[parent];
      if (!value || !preferred(claim, value)) break;
      this.heap[index] = value;
      index = parent;
    }
    this.heap[index] = claim;
  }
  at(start: number): Claim | undefined {
    while (this.heap[0] && this.heap[0].interval[1] <= start) this.remove();
    return this.heap[0];
  }
  private remove(): void {
    const last = this.heap.pop();
    if (!last || !this.heap.length) return;
    let index = 0;
    while (index * 2 + 1 < this.heap.length) {
      const left = index * 2 + 1,
        right = left + 1;
      const a = this.heap[left],
        b = this.heap[right];
      const next = a && b && preferred(b, a) ? right : left;
      const value = this.heap[next];
      if (!value || !preferred(value, last)) break;
      this.heap[index] = value;
      index = next;
    }
    this.heap[index] = last;
  }
}
function samePaint(a: Claim, b: Claim): boolean {
  return (
    a.coordinate === b.coordinate &&
    a.width === b.width &&
    a.color.every((component, index) => component === b.color[index])
  );
}
type TouchMap = ReadonlyMap<string, readonly (readonly [number, number])[]>;
function physical(
  claim: Claim,
  start: number,
  end: number,
  shared: TouchMap,
): { claim: Claim; start: number; end: number } | undefined {
  const perpendicular = claim.axis === "horizontal" ? "vertical" : "horizontal";
  const trim = (point: number, inset: number): number =>
    touches(shared.get(edgeKey(perpendicular, point)), claim.coordinate, true) ? 0 : inset;
  const left = Math.max(start, sum([claim.interval[0], trim(claim.interval[0], claim.startInset ?? 0)]));
  const right = Math.min(end, claim.interval[1] - trim(claim.interval[1], claim.endInset ?? 0));
  if (left >= right) return undefined;
  const inset = touches(shared.get(edgeKey(claim.axis, claim.coordinate)), start) ? 0 : (claim.unsharedInset ?? 0);
  const direction = claim.ownerSide === "top" || claim.ownerSide === "left" ? 1 : -1;
  return { claim: { ...claim, coordinate: sum([claim.coordinate, direction * inset]) }, start: left, end: right };
}
function intervals(
  claims: readonly Claim[],
  group: SharedEdgeGroup,
  operation: LayoutOperation,
  path: string,
  shared: TouchMap,
): NodeDefinition[] {
  const points = [...new Set(claims.flatMap((claim) => [...claim.interval]))].sort((a, b) => a - b);
  const nodes: NodeDefinition[] = [];
  const starts = [...claims].sort((a, b) => a.interval[0] - b.interval[0]);
  const winners = new Winners();
  let next = 0;
  let previous: { claim: Claim; start: number; end: number } | undefined;
  const flush = (): void => {
    if (previous) nodes.push(band(previous.claim, previous.start, previous.end, group, path));
    checkLimit(nodes.length, operation.policy.nodes, path, "Shared edge intervals");
  };
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1],
      end = points[i];
    if (start === undefined || end === undefined) continue;
    let entering = starts[next];
    while (entering && entering.interval[0] <= start) {
      winners.add(entering);
      entering = starts[++next];
    }
    const winner = winners.at(start);
    const current = winner ? physical(winner, start, end, shared) : undefined;
    if (current && previous && samePaint(previous.claim, current.claim) && previous.end === current.start)
      previous.end = current.end;
    else {
      flush();
      previous = current;
    }
  }
  flush();
  return nodes;
}
export function paintSharedEdges(
  group: SharedEdgeGroup,
  operation: LayoutOperation,
  path: string,
): readonly NodeDefinition[] {
  const lines = new Map<string, Claim[]>();
  for (const claim of translated(group)) {
    const key = edgeKey(claim.axis, claim.coordinate);
    const line = lines.get(key) ?? [];
    line.push(claim);
    lines.set(key, line);
  }
  const shared: TouchMap = new Map([...lines].map(([key, claims]) => [key, sharedIntervals(claims)]));
  // Logical identity is unchanged; only the winning band's physical geometry is adjusted.
  const nodes = [...lines.values()].flatMap((claims) => intervals(claims, group, operation, path, shared));
  checkLimit(nodes.length, operation.policy.nodes, path, "Shared edge output");
  if (nodes.length) operation.validateFixed(nodes, group.width, group.height, path);
  return nodes;
}
