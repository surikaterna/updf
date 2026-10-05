/**
 * `@updf/core/internal`: unstable coordination bridge for sibling packages.
 * Not a supported consumer extension API; exports may change without a new compatibility guarantee.
 * @module
 */
export type { ContentHandle } from "./core/content-ownership.js";
export { isContentData, ownContentData } from "./core/content-ownership.js";
export { dataArray, dataRecord, ownDataValue, pointer, snapshot as snapshotData } from "./core/data.js";
export { DocumentError, fail } from "./core/error.js";
export type { LayoutOperation } from "./core/layout-operation.js";
export { contextLayoutOperation, createLayoutOperation } from "./core/layout-operation.js";
export type { Policy } from "./core/policy.js";
export { checkLimit, codePoints, policy } from "./core/policy.js";
export { array, finite, number, validateDataObject } from "./core/schema.js";
export { exceeds, MetricSum, sum } from "./measurement/arithmetic.js";
export type { InlineLine, InlineMetric } from "./measurement/inline.js";
export type { WorkLedger } from "./measurement/ledger.js";
export { inputNode, ledger, textOnce, work } from "./measurement/ledger.js";
export type { InlineLineHeights, LineHeight } from "./measurement/line-height.js";
export type { RunMetrics } from "./measurement/metrics.js";
export { matrix } from "./painting/affine.js";
export { commands } from "./painting/commands.js";
export { paint } from "./painting/style.js";
export type { ResolvedPaint } from "./painting/types.js";
export type { RendererBinding } from "./vdom/context.js";
export { createRendererContext } from "./vdom/context.js";
export type { NormalizedContent } from "./vdom/normalize.js";
export { isVNode } from "./vdom/ownership.js";
export type { SemanticRecipe } from "./vdom/recipes.js";
export { semanticComponent } from "./vdom/recipes.js";
