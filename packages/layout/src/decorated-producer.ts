import type { NodeDefinition } from "@updf/core";
import { fail, type LayoutOperation, sum } from "@updf/core/internal";
import type { OutputBudget } from "./budget.js";
import { offsetReservation, reserveAncestors } from "./container-reservation.js";
import type { DecorationPlan, StaticDecoration } from "./decoration-types.js";
import { isDecorationPlan } from "./decorations.js";
import {
  bindDeferredScope,
  deferredGroup,
  deferredNode,
  fragmentIndex,
  occurrenceDecorationPlan,
} from "./deferred-decoration.js";
import {
  currentEmissionOrigin,
  type EmissionOrigin,
  geometryNodes,
  instantiateEmissionNodes,
  snapshotEmissionData,
} from "./emission-nodes.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import type { FragmentState } from "./fragment-state.js";
import type { FragmentCall, FragmentPaintContext, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";

interface Candidate {
  readonly fragment: PlacedFragment;
  readonly entries: readonly StaticDecoration[];
  readonly budget?: OutputBudget;
  readonly state?: FragmentState;
}
function reserve(entries: readonly StaticDecoration[], budget: OutputBudget | undefined, path: string): void {
  for (const entry of entries) {
    if (entry.nodes.length) budget?.charge([{ type: "paintGroup", children: entry.nodes }], path);
  }
}

function selected(plan: DecorationPlan, first: boolean, last: boolean): readonly StaticDecoration[] {
  return plan.entries.filter(
    (entry) => entry.repeat === "all" || (entry.repeat === "first" && first) || (entry.repeat === "last" && last),
  );
}
function reserved(entries: readonly StaticDecoration[], edge: "before" | "after"): number {
  return sum(entries.filter((entry) => entry.edge === edge).map((entry) => entry.height));
}
function* candidate(
  base: PreparedBlock,
  request: FragmentRequest,
  entries: readonly StaticDecoration[],
  path: string,
): Generator<FragmentCall, Candidate | undefined, PlacedFragment | undefined> {
  const overhead = sum([reserved(entries, "before"), reserved(entries, "after")]);
  if (overhead > request.availableHeight || overhead > request.freshHeight) return undefined;
  const budget = request.budget?.fork(),
    state = request.state?.fork();
  reserveAncestors(request.reserve, budget, state, overhead);
  reserve(entries, budget, path);
  const fragment = yield {
    block: base,
    request: {
      ...request,
      availableHeight: request.availableHeight - overhead,
      freshHeight: request.freshHeight - overhead,
      ...(budget ? { budget } : {}),
      ...(state ? { state } : {}),
      ...(request.reserve ? { reserve: offsetReservation(request.reserve, overhead) } : {}),
    },
  };
  if (!fragment) return undefined;
  return {
    fragment,
    entries,
    ...(budget ? { budget } : {}),
    ...(state ? { state } : {}),
  };
}
function regions(
  entries: readonly StaticDecoration[],
  edge: "before" | "after",
  context: FragmentPaintContext,
  offset: number,
  path: string,
  index?: number,
  width = 0,
  origin?: EmissionOrigin,
): NodeDefinition[] {
  const nodes: NodeDefinition[] = [];
  for (const entry of entries) {
    if (entry.edge !== edge) continue;
    const deferred = deferredNode(entry, index, width);
    if (deferred) {
      nodes.push(deferredGroup(deferred, [1, 0, 0, 1, context.x, context.start(offset, entry.height)]));
    } else if (entry.nodes.length) {
      context.budget.charge([{ type: "paintGroup", children: entry.nodes }], path);
      nodes.push({
        type: "paintGroup",
        transform: [1, 0, 0, 1, context.x, context.start(offset, entry.height)],
        children: snapshotEmissionData(instantiateEmissionNodes(entry.nodes, origin), path),
      });
    }
    offset = sum([offset, entry.height]);
  }
  return nodes;
}
function* decorated(
  base: PreparedBlock,
  plan: DecorationPlan,
  request: FragmentRequest,
  path: string,
  operation: LayoutOperation,
): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
  const full = selected(plan, request.offset === 0, true);
  let chosen = yield* candidate(base, request, full, path);
  let entries = full;
  if (chosen?.fragment.nextOffset !== base.extent) {
    entries = selected(plan, request.offset === 0, false);
    const withoutLast = yield* candidate(base, request, entries, path);
    if (withoutLast && withoutLast.fragment.nextOffset < base.extent) chosen = withoutLast;
    if (!chosen) return undefined;
  }
  const before = reserved(entries, "before"),
    after = reserved(entries, "after");
  if (chosen.budget) request.budget?.adopt(chosen.budget);
  releaseDiscarded(chosen.entries, entries, request.budget, path);
  if (chosen.state) request.state?.adopt(chosen.state);
  const placed = chosen.fragment;
  reserveAncestors(request.reserve, request.budget, request.state, sum([before, placed.height, after]));
  const result: PlacedFragment = {
    ...placed,
    height: sum([before, placed.height, after]),
    paint: (context) => resolvePaint(result, context),
    *paintSteps(context) {
      const index = fragmentIndex(plan);
      const width = base.naturalSize.width;
      const origin = currentEmissionOrigin(operation);
      const nodes = regions(entries, "before", context, 0, path, index, width, origin);
      const content = yield {
        fragment: placed,
        context: {
          ...context,
          y: context.y + before,
          start: (offset, height) => context.start(sum([before, offset]), height),
        },
      };
      for (const node of content) nodes.push(node);
      const footer = regions(entries, "after", context, sum([before, placed.height]), path, index, width, origin);
      for (const node of footer) nodes.push(node);
      return nodes;
    },
  };
  return result;
}
function releaseDiscarded(
  previous: readonly StaticDecoration[],
  retained: readonly StaticDecoration[],
  budget: OutputBudget | undefined,
  path: string,
): void {
  const selected = new Set(retained);
  for (const entry of previous) {
    if (selected.has(entry)) continue;
    if (entry.nodes.length) budget?.release([{ type: "paintGroup", children: entry.nodes }], path);
  }
}
export function decorate(
  base: PreparedBlock,
  plan: DecorationPlan | undefined,
  operation: LayoutOperation,
  path: string,
  extensions?: Extensions,
  lifetime?: ExtensionLifetime,
  origin?: EmissionOrigin,
): PreparedBlock {
  if (!plan) return base;
  if (!isDecorationPlan(plan)) fail("TYPE", path, "Expected owned decoration plan");
  plan = occurrenceDecorationPlan(plan, origin);
  bindDeferredScope(plan, extensions, lifetime);
  for (const entry of plan.entries)
    if (entry.nodes.length)
      operation.validateFixed(geometryNodes(entry.nodes), base.naturalSize.width, entry.height, path);
  const naturalHeight = sum([base.naturalSize.height, ...plan.entries.map((entry) => entry.height)]);
  const prepared: PreparedBlock = {
    ...base,
    naturalSize: { ...base.naturalSize, height: naturalHeight },
    fragment: (request) => resolveFragment(prepared, request),
    fragmentSteps: (request) => decorated(base, plan, request, path, operation),
  };
  return prepared;
}
