/** Trusted optional package seam; not a runtime plugin protocol. */
export { defineParticipation, participationComponent } from "./participation.js";
export type { ParticipationSource, ParticipationContext, FlowParticipation } from "./participation.js";
export { paragraphContinuation } from "./content-inline-selection.js";
export { paragraphFragment } from "./content-producer.js";
export type { MeasuredParagraph } from "./content-paragraph-output.js";
export { paragraphSequence, positionedParagraphSequence } from "./content-paragraph-output.js";
export { chargeSourceWork } from "./data.js";
export type RichParagraphSource = ReturnType<typeof import("./content-inline-selection.js").paragraphContinuation>;
export type RichParagraphSelection = NonNullable<ReturnType<RichParagraphSource["select"]>>;
export { fragmentSlot } from "./fragment-slot.js";
export { resolveFragment } from "./protocol-runtime.js";
export { frameFits } from "./selection-request.js";
export { sourceProvenance } from "./source-provenance.js";
export { compositeFragment } from "./composite-paint.js";
export type {
  FragmentRequest,
  PlacedFragment,
  PreparedBlock,
  FragmentChild,
  PaintCall,
  FragmentPaintContext,
} from "./protocol.js";
