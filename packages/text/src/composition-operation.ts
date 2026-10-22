import { createOperationCapability, fail, sealSelectedText } from "@updf/core/internal";
import type { NodeDefinition } from "@updf/core";
import type { TextServiceContext } from "@updf/core/resources";
import type { CompositionInput, CompositionPlan, ComposedTextFrame } from "./composition-types.js";
import { compositionCapture } from "./composition-output.js";

export interface TextCompositionOperation {
  readonly composeText: (input: CompositionInput, path?: string) => ComposedTextFrame;
  readonly composedText: (frame: ComposedTextFrame, path?: string) => NodeDefinition;
}
/** Internal callback boundary also used by adversarial contract tests; no service-identity lookup. */
export function compositionCapability(
  compose: (input: CompositionInput, context: TextServiceContext, path: string) => CompositionPlan,
) {
  return createOperationCapability<TextCompositionOperation>((scope) => {
    const capture = compositionCapture(scope);
    const frames = new WeakMap<object, NodeDefinition>();
    return (origin, check) => {
      return Object.freeze({
        composeText(input: CompositionInput, at?: string): ComposedTextFrame {
          const path = origin.path || at || "";
          check();
          const captured = capture.input(input, path);
          const plan = capture.output(compose(captured, scope, path), captured, path);
          const node = sealSelectedText(scope, captured.width, plan.measurement.consumedHeight, plan, path);
          const frame = Object.freeze({
            width: captured.width,
            height: plan.measurement.consumedHeight,
            measurement: plan.measurement,
            bands: plan.bands,
          }) as ComposedTextFrame;
          frames.set(frame, node);
          return frame;
        },
        composedText(frame: ComposedTextFrame, at?: string): NodeDefinition {
          const path = origin.path || at || "";
          check();
          const node = frame && frames.get(frame);
          if (!node) fail("MEASUREMENT_CONTEXT", path, "Expected a frame owned by this active operation");
          return node;
        },
      });
    };
  });
}
