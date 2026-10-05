import type { NodeDefinition } from "@updf/core";

declare const planBrand: unique symbol;
/** Local native nodes in a point-height reservation; first/all/last applies to block fragments. */
export interface StaticDecoration {
  readonly edge: "before" | "after";
  readonly repeat: "all" | "first" | "last";
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
}
/** Owned capability, not a serialized plan or final page-context recipe. */
export interface DecorationPlan {
  readonly entries: readonly StaticDecoration[];
  readonly [planBrand]: true;
}
