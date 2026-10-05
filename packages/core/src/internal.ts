/**
 * `@updf/core/internal`: unstable coordination bridge for sibling packages.
 * Not a supported consumer extension API; exports may change without a new compatibility guarantee.
 * @module
 */
export type { ContentHandle } from "./core/content-ownership.js";
export { isContentData, ownContentData } from "./core/content-ownership.js";
export { snapshot as snapshotData } from "./core/data.js";
export { DocumentError, fail } from "./core/error.js";
export type { LayoutOperation } from "./core/layout-operation.js";
export { contextLayoutOperation, createLayoutOperation } from "./core/layout-operation.js";
export type { Policy } from "./core/policy.js";
export { checkLimit, codePoints } from "./core/policy.js";
export { array, finite, number, validateDataObject } from "./core/schema.js";
export { byteLength } from "./fonts/checks.js";
export { isPreparedFont } from "./fonts/prepare.js";
export { scalar } from "./fonts/profile.js";
export { exceeds, MetricSum, sum } from "./measurement/arithmetic.js";
export type { InlineLine, InlineMetric } from "./measurement/inline.js";
export { paintInlineText } from "./measurement/inline-paint.js";
export type { InlineLineHeights, LineHeight } from "./measurement/line-height.js";
export { validateLineHeight } from "./measurement/line-height.js";
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
