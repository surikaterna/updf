import { exceeds, fail, type NormalizedContent, sum } from "@updf/core/internal";
import { offsetReservation } from "./container-reservation.js";
import { blockIdentity, legacyIdentity } from "./content-data.js";
import type { FragmentRequest, PreparedBlock } from "./protocol.js";

const origins = new WeakMap<object, string>();

export function autoMarginInput(value: unknown, block: boolean, path: string): boolean {
  if (!value || typeof value !== "object") return false;
  const style = Object.getOwnPropertyDescriptor(value, "style")?.value;
  if (!style || typeof style !== "object" || !("marginTop" in style)) return false;
  const source = `${path}/style/marginTop`;
  const margin = Object.getOwnPropertyDescriptor(style, "marginTop");
  if (!margin || !("value" in margin)) fail("TYPE", source, "Expected own margin data");
  if (!block || margin.value !== "auto" || Object.getOwnPropertyDescriptor(value, "keepTogether")?.value !== true)
    fail("VDOM_HIERARCHY", source, "Auto top margin requires a Block with explicit keepTogether: true");
  return true;
}

export function checkAutoBody(nodes: readonly NormalizedContent[]): void {
  nodes.forEach((node, index) => {
    if (typeof node.value === "string") return;
    const { identity, props } = node.value;
    const value = identity === legacyIdentity ? props.descriptor : props;
    const block = identity === blockIdentity;
    if (autoMarginInput(value, block, node.path) && index !== nodes.length - 1)
      fail("VDOM_HIERARCHY", `${node.path}/style/marginTop`, "Auto top margin requires the terminal body sibling");
  });
}

export function rememberAutoOrigin<T extends object>(value: T, path: string): T {
  origins.set(value, path);
  return value;
}

export function autoOrigin(value: object, fallback: string): string {
  return origins.get(value) ?? fallback;
}

export function checkAutoDataBody(values: readonly unknown[], root: string, single = false): void {
  const pending = values.map((value, index) => ({
    value,
    path: single ? root : `${root}/${index}`,
    terminal: index === values.length - 1,
  }));
  while (pending.length) {
    const item = pending.pop();
    if (!item?.value || typeof item.value !== "object") continue;
    const value = item.value as Record<string, unknown>;
    const path = autoOrigin(value, item.path);
    if (autoMarginInput(value, value.type === "block", path) && !item.terminal)
      fail("VDOM_HIERARCHY", `${path}/style/marginTop`, "Auto top margin requires the terminal body sibling");
    if (!Array.isArray(value.children)) continue;
    value.children.forEach((child, index, children) => {
      pending.push({ value: child, path: `${path}/children/${index}`, terminal: index === children.length - 1 });
    });
  }
}

export function autoSpace(available: number, height: number, definite: boolean): number {
  return definite ? Math.max(0, available - height) : 0;
}

/** Fit the full atomic border box before selecting any descendant callbacks. */
export function alignedRequest(block: PreparedBlock, request: FragmentRequest) {
  if (!block.autoMargin) return { margin: 0, request };
  const height = block.naturalSize.height;
  if (exceeds(sum([request.usedHeight, height]), request.freshHeight)) return undefined;
  const available =
    request.alignmentHeight === undefined
      ? request.availableHeight
      : Math.min(request.availableHeight, request.alignmentHeight - request.usedHeight);
  const margin = autoSpace(available, height, request.definiteAlignment === true);
  return {
    margin,
    request: {
      ...request,
      usedHeight: sum([request.usedHeight, margin]),
      availableHeight: request.availableHeight - margin,
      atFreshRegion: request.atFreshRegion && margin === 0,
      ...(request.reserve ? { reserve: offsetReservation(request.reserve, margin) } : {}),
    },
  };
}
