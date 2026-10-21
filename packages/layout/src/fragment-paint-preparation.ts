import type { Matrix } from "@updf/core";
import { fail, multiply, rectangle, sum } from "@updf/core/internal";
import { materializedStart } from "./axis.js";
import type { OutputBudget } from "./budget.js";
import { assertGeneratedPart, materializeGeneratedInterval } from "./generated-interval.js";
import type {
  BoxAssociation,
  FragmentChild,
  FragmentGeometry,
  FragmentPaintContext,
  FragmentPart,
  PlacedFragment,
  PreparedFragmentPaint,
} from "./protocol.js";

const empty = Object.freeze([]);
export const emptyGeometry: FragmentGeometry = Object.freeze({ parts: empty, children: empty, order: empty });
const associations = new WeakMap<FragmentPaintContext, PlacedFragment>();
const parents = new WeakMap<PreparedFragmentPaint, FragmentPaintContext>();

export function fragmentGeometry(
  parts: readonly FragmentPart[] = empty,
  children: readonly FragmentChild[] = empty,
  order = [...parts.map((_, part) => ({ part })), ...children.map((_, child) => ({ child }))],
  association: BoxAssociation = "translated-box",
): FragmentGeometry {
  return Object.freeze({
    association: boxAssociation(association, ""),
    parts: Object.freeze(
      parts.map((part) => Object.freeze({ ...part, association: boxAssociation(part.association, "") })),
    ),
    children: Object.freeze(
      children.map((child) =>
        Object.freeze({
          ...child,
          ...(child.bounds ? { bounds: Object.freeze({ ...child.bounds }) } : {}),
        }),
      ),
    ),
    order: Object.freeze(order.map((step) => Object.freeze({ ...step }))),
  });
}
export function wholeBoxGeometry(height: number): FragmentGeometry {
  return fragmentGeometry([{ offset: 0, height, reservation: "whole-box" }]);
}
export interface PaintPreparationFrame {
  readonly x: number;
  readonly y: number;
  readonly page?: {
    readonly axis: Parameters<typeof materializedStart>[0];
    readonly origin: number;
    readonly bottom: number;
  };
}
interface Pending {
  readonly fragment: PlacedFragment;
  readonly x: number;
  readonly y: number;
  readonly hidden: boolean;
  readonly end: number;
  readonly incomingMatrix: Matrix;
  readonly projectedSpan: Span | undefined;
  effectiveSpan?: Span | undefined;
  readonly relation: FragmentChild | undefined;
  readonly parent: Pending | undefined;
  readonly positions: number[];
  readonly children: PreparedFragmentPaint[];
  readonly seenParts: Set<number>;
  readonly seenChildren: Set<number>;
  index: number;
}
interface Span {
  readonly start: number;
  readonly end: number;
}
function boxAssociation(value: BoxAssociation | undefined, path: string): BoxAssociation {
  if (value === undefined) return "translated-box";
  if (value !== "translated-box" && value !== "positioned-box") fail("GEOMETRY", path, "Unknown box association");
  return value;
}
function projectedSpan(
  m: Matrix,
  x: number,
  y: number,
  height: number,
  association: BoxAssociation | undefined,
  path: string,
): Span {
  const bounds =
    boxAssociation(association, path) === "positioned-box"
      ? rectangle(x, y, 0, height, m)
      : rectangle(0, 0, 0, height, multiply(m, [1, 0, 0, 1, x, y]));
  for (const value of bounds) scalar(value, path);
  return { start: bounds[1], end: bounds[3] };
}
function contains(limit: Span | undefined, span: Span, path: string): void {
  if (limit && (span.start < limit.start || span.end > limit.end))
    fail("GEOMETRY", path, "Materialized whole box exceeds its enclosing wrapper reservation");
}
function intersection(a: Span | undefined, b: Span | undefined): Span | undefined {
  if (!a) return b;
  if (!b) return a;
  return { start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) };
}
function relationSpan(node: Pending, relation: FragmentChild, incoming: Matrix, path: string): Span | undefined {
  if (!relation.bounds) return undefined;
  const relative = relation.frame === "relative";
  const shift = relative ? node.y : 0;
  const x = relative ? node.x : relation.x;
  // Preserve each authored endpoint; subtracting then re-adding can lose the end.
  const start = rectangle(x, sum([shift, relation.bounds.start]), 0, 0, incoming)[1];
  const end = rectangle(x, sum([shift, relation.bounds.end]), 0, 0, incoming)[3];
  scalar(start, path);
  scalar(end, path);
  if (end < start) fail("GEOMETRY", path, "Invalid projected child reservation");
  return { start, end };
}
export function assertPreparedPaint(fragment: PlacedFragment, context: FragmentPaintContext, path = ""): void {
  if (associations.get(context) !== fragment) fail("GEOMETRY", path, "Paint context is not prepared for this fragment");
}
export function assertPreparedChild(parent: FragmentPaintContext, child: PreparedFragmentPaint): void {
  if (parents.get(child) !== parent) fail("GEOMETRY", "", "Paint yielded an undeclared prepared child");
}
function scalar(value: number, path: string): number {
  if (!Number.isFinite(value) || value < 0) fail("GEOMETRY", path, "Expected finite nonnegative paint geometry");
  return value;
}
function pending(
  fragment: PlacedFragment,
  x: number,
  y: number,
  hidden: boolean,
  budget: OutputBudget,
  path: string,
  parent?: Pending,
  relation?: FragmentChild,
  incomingMatrix: Matrix = [1, 0, 0, 1, 0, 0],
  bounded = true,
): Pending {
  budget.reserveWork(1, path);
  scalar(x, path);
  scalar(y, path);
  scalar(fragment.height, path);
  boxAssociation(fragment.geometry.association, path);
  return {
    fragment,
    x,
    y,
    hidden,
    end: scalar(y + fragment.height, path),
    incomingMatrix,
    projectedSpan: bounded
      ? projectedSpan(incomingMatrix, x, y, fragment.height, fragment.geometry.association, path)
      : undefined,
    parent,
    relation,
    positions: [],
    children: [],
    seenParts: new Set(),
    seenChildren: new Set(),
    index: 0,
  };
}
function certificate(node: Pending, part: FragmentPart, path: string): void {
  if (!part.certificate) return;
  assertGeneratedPart(node.fragment, part.certificate, part.offset, part.height, path);
}
function partPosition(node: Pending, part: FragmentPart, path: string, finalY?: number): number {
  scalar(part.offset, path);
  scalar(part.height, path);
  boxAssociation(part.association, path);
  certificate(node, part, path);
  const allocation =
    node.parent && !node.hidden && part.certificate
      ? materializeGeneratedInterval(
          part.certificate,
          node.y,
          { sourceStart: 0, sourceEnd: node.fragment.height },
          path,
        )
      : undefined;
  const y = finalY ?? allocation?.start ?? (node.parent ? sum([node.y, part.offset]) : node.y + part.offset);
  scalar(y, path);
  const extent = part.reservation === "whole-box" ? part.height : (allocation?.allocationExtent ?? part.height);
  const end = scalar(y + extent, path);
  if (!node.hidden && node.parent && (y < node.y || end > node.y + node.fragment.height))
    fail("GEOMETRY", path, "Materialized child part exceeds its fragment reservation");
  const relation = node.relation;
  const shift = relation?.frame === "relative" ? node.parent!.y : 0;
  if (
    !node.hidden &&
    relation?.bounds &&
    part.reservation === "whole-box" &&
    (y < sum([shift, relation.bounds.start]) || end > sum([shift, relation.bounds.end]))
  )
    fail("GEOMETRY", path, "Materialized whole box exceeds its reserved content region");
  if (!node.hidden) {
    const span = projectedSpan(node.incomingMatrix, node.x, y, extent, part.association, path);
    contains(node.projectedSpan, span, path);
    contains(node.effectiveSpan, span, path);
  }
  return y;
}
function descend(node: Pending, relation: FragmentChild, budget: OutputBudget, path: string): Pending {
  scalar(relation.x, path);
  scalar(relation.y, path);
  if (relation.bounds) {
    scalar(relation.bounds.start, path);
    scalar(relation.bounds.end, path);
    if (relation.bounds.end < relation.bounds.start) fail("GEOMETRY", path, "Invalid child reservation");
  }
  if (relation.frame !== "relative" && relation.frame !== "local" && relation.frame !== "zero")
    fail("GEOMETRY", path, "Unknown child coordinate frame");
  const x = relation.frame === "relative" ? sum([node.x, relation.x]) : relation.x;
  const y = relation.frame === "relative" ? sum([node.y, relation.y]) : relation.y;
  const hidden = relation.hidden === true || (relation.frame !== "local" && node.hidden);
  childReservation(node, relation, y, hidden, path);
  const incoming =
    relation.frame === "relative" ? node.incomingMatrix : multiply(node.incomingMatrix, [1, 0, 0, 1, node.x, node.y]);
  const child = pending(relation.fragment, x, y, hidden, budget, path, node, relation, incoming);
  const inherited = node.hidden ? undefined : intersection(node.effectiveSpan, node.projectedSpan);
  const active = intersection(inherited, relationSpan(node, relation, incoming, path));
  if (!hidden) contains(active, child.projectedSpan!, path);
  child.effectiveSpan = intersection(active, child.projectedSpan);
  return child;
}
function childReservation(node: Pending, relation: FragmentChild, y: number, hidden: boolean, path: string): void {
  const end = scalar(y + scalar(relation.fragment.height, path), path);
  if (hidden) return;
  // Local/zero children paint inside a new transform; relative children share the stored origin.
  const start = relation.frame === "relative" ? node.y : 0;
  const limit = relation.frame === "relative" ? node.end : node.fragment.height;
  if (!node.hidden && (y < start || end > limit))
    fail("GEOMETRY", path, "Materialized child whole box exceeds its fragment reservation");
  if (relation.bounds && (y < sum([start, relation.bounds.start]) || end > sum([start, relation.bounds.end])))
    fail("GEOMETRY", path, "Materialized whole box exceeds its reserved content region");
}
function finish(node: Pending, budget: OutputBudget, path: string): PreparedFragmentPaint {
  const geometry = node.fragment.geometry;
  if (node.seenParts.size !== geometry.parts.length || node.seenChildren.size !== geometry.children.length)
    fail("GEOMETRY", path, "Paint order must declare every part and child exactly once");
  const context = Object.freeze({
    incomingMatrix: Object.freeze(node.incomingMatrix),
    x: node.x,
    y: node.y,
    budget,
    partPositions: Object.freeze(node.positions),
    children: Object.freeze(node.children),
  });
  associations.set(context, node.fragment);
  for (const child of context.children) parents.set(child, context);
  return Object.freeze({ fragment: node.fragment, context });
}
function index(value: number, length: number, seen: Set<number>, path: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value >= length || seen.has(value))
    fail("GEOMETRY", path, "Invalid or repeated paint order index");
  seen.add(value);
  return value;
}

function pagePartPosition(frame: PaintPreparationFrame, part: FragmentPart, bottom: number, path: string): number {
  const page = frame.page!;
  const y = materializedStart(page.axis, sum([page.origin, part.offset]), part.height, path);
  if (y < bottom) fail("GEOMETRY", path, "Materialized body blocks overlap under native coordinate association.");
  return y;
}
function rootPending(
  fragment: PlacedFragment,
  frame: PaintPreparationFrame,
  budget: OutputBudget,
  path: string,
): Pending {
  const root = pending(fragment, frame.x, frame.y, false, budget, path, undefined, undefined, undefined, !!frame.page);
  if (frame.page)
    root.effectiveSpan = {
      start: Math.max(root.projectedSpan!.start, frame.page.axis.start),
      end: Math.min(root.projectedSpan!.end, frame.page.axis.end),
    };
  return root;
}

/** Selected-only heap traversal: no painter, generator, emission or provider callback is executed. */
export function prepareFragmentPaint(
  fragment: PlacedFragment,
  frame: PaintPreparationFrame,
  liveBudget: OutputBudget,
  path: string,
): { readonly root: PreparedFragmentPaint; readonly plannedBottom: number; readonly work: number } {
  const budget = liveBudget.fork();
  const root = rootPending(fragment, frame, budget, path);
  const stack = [root],
    ancestors = new Set([fragment]);
  let bottom = frame.page?.bottom ?? frame.y;
  while (stack.length) {
    const node = stack[stack.length - 1]!;
    const geometry = node.fragment.geometry;
    const step = geometry.order[node.index++];
    if (!step) {
      const record = finish(node, liveBudget, path);
      stack.pop();
      ancestors.delete(node.fragment);
      if (!node.parent)
        return Object.freeze({
          root: record,
          plannedBottom: bottom,
          work: budget.totals().work - liveBudget.totals().work,
        });
      const parentStep = node.parent.fragment.geometry.order[node.parent.index - 1]!;
      if ("child" in parentStep) node.parent.children[parentStep.child] = record;
      continue;
    }
    budget.reserveWork(1, path);
    if ("part" in step) {
      const part = geometry.parts[index(step.part, geometry.parts.length, node.seenParts, path)]!;
      const finalY = node === root && frame.page ? pagePartPosition(frame, part, bottom, path) : undefined;
      const y = partPosition(node, part, path, finalY);
      if (node === root && frame.page) {
        bottom = y + part.height;
      }
      node.positions[step.part] = y;
      continue;
    }
    const relation = geometry.children[index(step.child, geometry.children.length, node.seenChildren, path)]!;
    if (ancestors.has(relation.fragment)) fail("GEOMETRY", path, "Cyclic fragment paint geometry");
    ancestors.add(relation.fragment);
    stack.push(descend(node, relation, budget, path));
  }
  return fail("GEOMETRY", path, "Missing prepared paint root");
}
