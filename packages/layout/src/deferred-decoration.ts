import type { NodeDefinition } from "@updf/core";
import {
  fail,
  type LayoutOperation,
  type NormalizedContent,
  number,
  semanticComponent,
  validateDataObject,
} from "@updf/core/internal";
import type { OutputBudget } from "./budget.js";
import type { BlockComponent } from "./content-types.js";
import type { DecorationPlan, StaticDecoration } from "./decoration-types.js";
import { ownDecorationPlan } from "./decorations.js";
import {
  type DecorationEmission,
  type DecorationOwner,
  type DecorationRecipe,
  emission,
  emissionPath,
  instantiateEmissionNodes,
  ownEmission,
  ownEmissionWrapper,
  snapshotEmissionData,
  withEmissionOrigin,
  wrapperPath,
} from "./emission-nodes.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import { type FragmentInfo, fragmentBinding, type PageInfo, pageBinding } from "./page-context.js";
import { validateRegion } from "./region-overflow.js";
import { renderRegion } from "./region-render.js";
import { finishLooseSharedEdges, finishSharedEdgeNode } from "./shared-edge-finalize.js";

/** Final-context Block.Header/Footer reservation; children must fit without repaginating the body. */
export interface BlockRegionProps {
  /** Positive finite height in points. */
  readonly height: number;
  /** Default header first/footer last; true repeats on every block fragment. */
  readonly repeat?: boolean;
  readonly children?:
    | import("@updf/core/vdom").VDOMChild
    | import("./content-types.js").BlockContent
    | readonly NodeDefinition[];
}
export const blockHeaderIdentity = Object.freeze({});
export const blockBodyIdentity = Object.freeze({});
export const blockFooterIdentity = Object.freeze({});
/** Block.Header JSX slot finalized with sealed PageContext and FragmentContext. */
export const BlockHeader = semanticComponent<Record<string, unknown>>(
  blockHeaderIdentity,
  true,
) as unknown as BlockComponent<BlockRegionProps>;
/** Block.Footer JSX slot finalized with sealed PageContext and FragmentContext. */
export const BlockFooter = semanticComponent<Record<string, unknown>>(
  blockFooterIdentity,
  true,
) as unknown as BlockComponent<BlockRegionProps>;
/** Block.Body JSX slot; use it rather than mixing direct body siblings with reserved slots. */
export const BlockBody = semanticComponent<Record<string, unknown>>(
  blockBodyIdentity,
  true,
) as unknown as BlockComponent<{ readonly children?: import("./content-types.js").BlockContent }>;
const entries = new WeakMap<object, DecorationRecipe>();
const plans = new WeakMap<object, DecorationOwner>();
export function deferredPlan(nodes: readonly NormalizedContent[]): DecorationPlan | undefined {
  if (!nodes.length) return undefined;
  const owner: DecorationOwner = { count: 0, extensions: undefined, lifetime: undefined };
  const values: StaticDecoration[] = nodes.map((node) => {
    if (typeof node.value === "string") fail("TYPE", node.path, "Expected decoration slot");
    validateDataObject(node.value.props, ["height", "repeat", "children"], node.path);
    number(node.value.props.height, `${node.path}/height`, true);
    if ("repeat" in node.value.props && typeof node.value.props.repeat !== "boolean")
      fail("TYPE", node.path, "Expected repeat boolean");
    const header = node.value.identity === blockHeaderIdentity;
    const entry: StaticDecoration = Object.freeze({
      edge: header ? "before" : "after",
      repeat: node.value.props.repeat === true ? "all" : header ? "first" : "last",
      height: node.value.props.height as number,
      nodes: Object.freeze([]),
    });
    entries.set(entry, { node, owner });
    return entry;
  });
  const plan = ownDecorationPlan(values);
  plans.set(plan, owner);
  return plan;
}
export function bindDeferredScope(plan: DecorationPlan, extensions?: Extensions, lifetime?: ExtensionLifetime): void {
  const owner = plans.get(plan);
  if (!owner) return;
  owner.extensions = extensions;
  owner.lifetime = lifetime;
}
export function occurrenceDecorationPlan(
  plan: DecorationPlan,
  origin?: import("./emission-nodes.js").EmissionOrigin,
): DecorationPlan {
  const deferred = plans.has(plan);
  if (!deferred && !origin) return plan;
  const owner: DecorationOwner = {
    count: 0,
    extensions: undefined,
    lifetime: undefined,
    ...(origin ? { origin } : {}),
  };
  const values = plan.entries.map((entry) => {
    const recipe = entries.get(entry);
    if (!recipe)
      return origin && entry.nodes.length
        ? Object.freeze({
            ...entry,
            nodes: snapshotEmissionData(instantiateEmissionNodes(entry.nodes, origin), origin.to),
          })
        : entry;
    const copy = Object.freeze({ ...entry });
    entries.set(copy, { node: recipe.node, owner });
    return copy;
  });
  const copy = ownDecorationPlan(values);
  if (deferred) plans.set(copy, owner);
  return copy;
}
export function fragmentIndex(plan: DecorationPlan): number | undefined {
  const owner = plans.get(plan);
  return owner ? owner.count++ : undefined;
}
export function deferredNode(
  entry: StaticDecoration,
  index: number | undefined,
  width: number,
): NodeDefinition | undefined {
  const recipe = entries.get(entry);
  if (!recipe || index === undefined) return undefined;
  return ownEmission({ type: "paintGroup", children: [] }, { ...recipe, index, width, height: entry.height });
}
export function deferredGroup(
  marker: NodeDefinition,
  transform: readonly [number, number, number, number, number, number],
): NodeDefinition {
  const value = emission(marker);
  if (!value) fail("TYPE", "", "Expected an owned deferred emission");
  const group: NodeDefinition = { type: "paintGroup", transform, children: [marker] };
  return ownEmissionWrapper(group, value.node.path);
}
export function finalizeDecorations(
  nodes: readonly NodeDefinition[],
  info: PageInfo,
  operation: LayoutOperation,
  budget: OutputBudget,
  rootReportPath?: string,
): readonly NodeDefinition[] {
  const output: NodeDefinition[] = [];
  const tasks: (() => void)[] = [];
  const visit = (node: NodeDefinition, into: NodeDefinition[]): void => {
    const value = emission(node);
    if (value) {
      for (const child of withEmissionOrigin(operation, value.owner.origin, () =>
        resolveEmission(value, info, operation, budget),
      ))
        into.push(child);
      return;
    }
    if (node.type !== "paintGroup") {
      into.push(node);
      return;
    }
    const children: NodeDefinition[] = [];
    tasks.push(() => {
      const path = wrapperPath(node);
      if (path && !children.length) return;
      if (path) budget.generated(1, 0, 0, 0, path);
      into.push(finishSharedEdgeNode(node, children, operation, budget, rootReportPath));
    });
    schedule(node.children, children);
  };
  const schedule = (values: readonly NodeDefinition[], into: NodeDefinition[]): void => {
    for (let i = values.length - 1; i >= 0; i--) {
      const node = values[i];
      if (node) tasks.push(() => visit(node, into));
    }
  };
  schedule(nodes, output);
  while (tasks.length) tasks.pop()?.();
  return finishLooseSharedEdges(output, operation, budget, rootReportPath);
}
function resolveEmission(
  emission: DecorationEmission,
  page: PageInfo,
  operation: LayoutOperation,
  budget: OutputBudget,
): readonly NodeDefinition[] {
  const { owner, index, width, height } = emission;
  const node = { ...emission.node, path: emissionPath(emission.node.path, owner.origin) };
  if (!node.scope || typeof node.value === "string")
    fail("MEASUREMENT_CONTEXT", node.path, "Invalid decoration recipe");
  const input = node.value.props.children;
  const fragment: FragmentInfo = { index, count: owner.count, first: index === 0, last: index === owner.count - 1 };
  const result = operation.scoped(node.scope, () =>
    operation.finalContext(pageBinding, page, () =>
      operation.finalContext(fragmentBinding, fragment, () =>
        renderRegion(
          input,
          width,
          height,
          `${node.path}/children`,
          operation,
          page,
          budget,
          owner.extensions,
          owner.lifetime,
          true,
        ),
      ),
    ),
  );
  budget.charge(result, node.path);
  validateRegion(result, width, height, node.path, operation);
  return result;
}
