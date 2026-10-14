import { array, fail, type LayoutOperation, validateDataObject as record, sum } from "@updf/core/internal";
import { autoMarginInput, autoOrigin, checkAutoDataBody } from "./auto-margin.js";
import { prepareLeaf } from "./blocks.js";
import { columnBody } from "./column-content.js";
import { columnAllocation, columnGeometry } from "./column-boxes.js";
import { columnInput } from "./column-sizing.js";
import { containerProducer } from "./container-producer.js";
import { normalizeBlocks } from "./content-normalize.js";
import { decorate } from "./decorated-producer.js";
import type { DecorationPlan } from "./decoration-types.js";
import { isDecorationPlan } from "./decorations.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import { type LeafCache, lifetimeLeafCache } from "./leaf-cache.js";
import type { PreparedBlock } from "./protocol.js";
import { compileRow } from "./row-compiler.js";
import { type Sizing, sizing } from "./sizing.js";

export interface CompilerScope {
  readonly operation: LayoutOperation;
  readonly extensions?: Extensions;
  readonly lifetime: ExtensionLifetime;
  readonly freshHeight: number;
  readonly onPrepared?: (value: object, block: PreparedBlock, width: number) => void;
  readonly unpaginated?: boolean;
}
export function compile(
  values: readonly unknown[],
  width: number,
  root: string,
  scope: CompilerScope,
  single = false,
): readonly PreparedBlock[] {
  checkAutoDataBody(values, root, single);
  const result: PreparedBlock[] = [];
  const state: CompilerState = { scope, tasks: [], cache: lifetimeLeafCache(scope.lifetime) };
  const visit: Visit = (...args) => visitBlock(state, ...args);
  if (single)
    visit(values[0], width, scope.freshHeight, root, (block) => {
      result.push(block);
    });
  else schedule(values, width, scope.freshHeight, root, result, state.tasks, visit);
  while (state.tasks.length) state.tasks.pop()?.();
  return result;
}
type Visit = (
  value: unknown,
  width: number,
  freshHeight: number,
  path: string,
  assign: (block: PreparedBlock) => void,
) => void;
interface CompilerState {
  readonly scope: CompilerScope;
  readonly tasks: (() => void)[];
  readonly cache: LeafCache;
}
function visitBlock(
  state: CompilerState,
  value: unknown,
  width: number,
  freshHeight: number,
  path: string,
  assign: (block: PreparedBlock) => void,
): void {
  record(
    value,
    ["type", "paragraph", "keepTogether", "height", "children", "props", "style", "decorations", "width", "align"],
    path,
  );
  const { scope } = state;
  if (value.type === "contentParagraph") {
    const normalized = normalizeBlocks(value, scope.operation, path)[0];
    if (!normalized) fail("TYPE", path, "Expected one authored Paragraph");
    visitBlock(state, normalized, width, freshHeight, path, assign);
    return;
  }
  const finish = (block: PreparedBlock): void => {
    if (autoMarginInput(value, value.type === "block", autoOrigin(value, path))) block = { ...block, autoMargin: true };
    scope.onPrepared?.(value, block, width);
    assign(block);
  };
  if (value.type === "row") {
    compileRow(
      value,
      width,
      path,
      scope.operation,
      state.tasks,
      (values, allocated, root, target) =>
        schedule(values, allocated, freshHeight, root, target, state.tasks, (...args) => visitBlock(state, ...args)),
      finish,
      (value, block, allocated) => scope.onPrepared?.(value, block, allocated),
    );
    return;
  }
  if (value.type !== "block" && value.type !== "column") {
    finish(prepareLeaf(value, width, path, scope.operation, scope.extensions, scope.lifetime, state.cache));
    return;
  }
  visitContainer(state, value, width, freshHeight, path, finish);
}
function visitContainer(
  state: CompilerState,
  value: Record<string, unknown>,
  width: number,
  freshHeight: number,
  path: string,
  finish: (block: PreparedBlock) => void,
): void {
  const { box, keepTogether, plan, reserved, allocation } = containerInput(value, width, path);
  array(value.children, state.scope.operation.policy.nodes, `${path}/children`);
  const children: PreparedBlock[] = [];
  state.tasks.push(() =>
    finish(
      decorate(
        containerProducer(
          box,
          children,
          keepTogether,
          state.scope.unpaginated ? naturalCapacity(box, children) : Math.max(0, freshHeight - reserved),
          path,
          value.type === "block",
          allocation ? columnGeometry(box, children, allocation, path) : undefined,
        ),
        plan,
        state.scope.operation,
        path,
        state.scope.extensions,
        state.scope.lifetime,
      ),
    ),
  );
  schedule(
    value.type === "column" ? columnBody(value) : value.children,
    box.contentWidth,
    Math.max(0, freshHeight - reserved - box.vertical),
    `${path}/children`,
    children,
    state.tasks,
    (...args) => visitBlock(state, ...args),
  );
}
function containerInput(value: Record<string, unknown>, width: number, path: string) {
  if (value.type === "column") columnInput(value, path);
  else record(value, ["type", "children", "style", "keepTogether", "decorations"], path);
  if ("keepTogether" in value && typeof value.keepTogether !== "boolean")
    fail("TYPE", path, "Expected boolean keepTogether");
  const keepTogether = value.keepTogether === true;
  if ("style" in value && value.style === undefined) fail("TYPE", path, "Present style cannot be undefined");
  const allocated = value.type === "column" ? columnAllocation(value, width, path) : undefined;
  const box = allocated?.box ?? sizing(value.style, width, `${path}/style`);
  if ("decorations" in value && !isDecorationPlan(value.decorations))
    fail("TYPE", path, "Expected owned decoration plan");
  const plan = value.decorations as DecorationPlan | undefined;
  const reserved = plan ? sum(plan.entries.map((entry) => entry.height)) : 0;
  return { box, keepTogether, plan, reserved, allocation: allocated?.plan };
}
function naturalCapacity(box: Sizing, children: readonly PreparedBlock[]): number {
  const gapCount = Math.max(0, children.filter((child) => !child.control).length - 1);
  return Math.max(
    1,
    box.style.height ?? 0,
    box.style.minHeight ?? 0,
    sum([box.vertical, gapCount * box.gap, ...children.map((child) => child.naturalSize.height)]),
  );
}
function schedule(
  values: readonly unknown[],
  width: number,
  freshHeight: number,
  root: string,
  result: PreparedBlock[],
  tasks: (() => void)[],
  visit: (
    value: unknown,
    width: number,
    freshHeight: number,
    path: string,
    assign: (block: PreparedBlock) => void,
  ) => void,
): void {
  let index = 0;
  const next = (): void => {
    if (index === values.length) return;
    const at = index++;
    tasks.push(next);
    visit(values[at], width, freshHeight, `${root}/${at}`, (block) => {
      result.push(block);
    });
  };
  tasks.push(next);
}
