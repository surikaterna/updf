export type { OwnedResource } from "./core/owned-resource.js";
export { createOwnedResource, isOwnedResource, ownedResourceBytes } from "./core/owned-resource.js";
export type { MeasuredRichText, MeasuredText } from "./core/plan.js";
export type {
  PageResources,
  PaintingBinding,
  PaintingSlot,
  Resource,
  ResourceCollection,
  ResourcePhase,
  ResourceProvider,
  ResourceSlot,
  TextSite,
} from "./core/resource-types.js";
export { paintingSlot, resourceSlot } from "./core/resource-types.js";
export { textSlot } from "./core/text-paint.js";
export type { TextMetrics, TextMode, TextRun, TextRuntime } from "./core/text-runtime.js";
export type { TextService, TextServiceContext } from "./core/text-service.js";
export type { InlineLine, InlineMetric } from "./measurement/inline.js";
export type { InlineLineHeights, LineEnvelope, LineHeight } from "./measurement/line-height.js";
export type { PrivateFragment } from "./measurement/lines.js";
export type {
  InkBounds,
  ParagraphDefinition,
  PlainTextInput,
  RichTextInput,
  TextFragmentMeasurement,
  TextLineMeasurement,
  TextMeasurement,
  TextMeasurementInput,
  TextRun as SourceTextRun,
  TextStyle,
} from "./measurement/types.js";
