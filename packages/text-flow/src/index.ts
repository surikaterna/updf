import type { ParagraphDefinition } from "@updf/core/resources";
import { useOperationCapability, type OperationCapability } from "@updf/core/resources";
import type { TextExclusion, TextCompositionOperation } from "@updf/text/composition";
export type {
  RectangularExclusion,
  EdgeProfilePoint,
  EdgeProfileExclusion,
  TextExclusion,
} from "@updf/text/composition";
import { array, fail, number, validateDataObject } from "@updf/core/internal";
import { blockComponent, defineBlockAdapter } from "@updf/layout";
import { siblingParticipation } from "./sibling.js";
export type { FloatingBlockProps } from "./sibling.js";
export type { FloatingPathProps } from "./path.js";
export type { SideShape } from "./path-band.js";

/** Numeric points, not browser CSS lengths. maxHeight is a ceiling, not reserved space. */
export interface TextFlowProps {
  readonly paragraphs: readonly ParagraphDefinition[];
  readonly style: { readonly width?: number; readonly maxHeight: number };
  readonly exclusion?: TextExclusion;
}
function validate(value: unknown): TextFlowProps {
  validateDataObject(value, ["paragraphs", "style", "exclusion"], "/textFlow");
  array(value.paragraphs, Number.MAX_SAFE_INTEGER, "/textFlow/paragraphs");
  validateDataObject(value.style, ["width", "maxHeight"], "/textFlow/style");
  number(value.style.maxHeight, "/textFlow/style/maxHeight");
  if ("width" in value.style) number(value.style.width, "/textFlow/style/width", true);
  // Text semantics are validated once by the owning text service, with operation bindings.
  return value as unknown as TextFlowProps;
}
/** Explicit atomic extension; edge reservations do not paint visuals. */
export function createTextFlow(capability: OperationCapability<TextCompositionOperation>) {
  const textFlowAdapter = defineBlockAdapter<TextFlowProps>({
    name: "updf.text-flow",
    validate,
    measure(props, context) {
      const width = props.style.width ?? context.width;
      if (width > context.width) fail("GEOMETRY", context.sourcePath, "TextFlow width exceeds available region");
      const composition = useOperationCapability(context, capability);
      const frame = composition.composeText({
        width,
        maxHeight: props.style.maxHeight,
        paragraphs: props.paragraphs,
        ...(props.exclusion === undefined ? {} : { exclusion: props.exclusion }),
      });
      const nodes = frame.height === 0 ? Object.freeze([]) : Object.freeze([composition.composedText(frame)]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: Object.freeze({ width, height: frame.height }),
        next: () => ({ end: 1, height: frame.height, nodes }),
      };
    },
  });
  /** Typed TSX facade over the same explicit adapter identity. */
  const TextFlow = blockComponent<TextFlowProps>(textFlowAdapter);
  return Object.freeze({ TextFlow, textFlowAdapter, ...siblingParticipation(capability) });
}
