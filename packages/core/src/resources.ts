export type { OwnedResource } from "./core/owned-resource.js";
export { createOwnedResource, isOwnedResource, ownedResourceBytes } from "./core/owned-resource.js";
export type { MeasuredRichText } from "./core/plan.js";
export type {
  PageResources,
  PaintingBinding,
  PaintingSlot,
  Resource,
  ResourceCollection,
  ResourceDefinition,
  ResourcePhase,
  ResourceProvider,
  ResourceSlot,
  TextSite,
  XObjectSite,
} from "./core/resource-types.js";
export { paintingSlot, resourceSlot, xObjectSlot } from "./core/resource-types.js";
export { textSlot } from "./core/text-paint.js";
export type { TextMetrics, TextRun, TextRuntime } from "./core/text-runtime.js";
export type { TextService, TextServiceContext } from "./core/text-service.js";
export type { MeasureOptions, TextMeasurer } from "./core/text-measurer.js";
export type { InlineLine, InlineMetric } from "./measurement/inline.js";
export type { InlineLineHeights, LineEnvelope, LineHeight } from "./measurement/line-height.js";
export type { PrivateFragment } from "./measurement/lines.js";
export type {
  InkBounds,
  ParagraphDefinition,
  RichTextInput,
  TextFragmentMeasurement,
  TextLineMeasurement,
  TextMeasurement,
  TextMeasurementInput,
  TextRun as SourceTextRun,
  TextStyle,
} from "./measurement/types.js";
