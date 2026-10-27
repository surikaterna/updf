import { createOperationCapability, defineOperationExtension, requestTextService, fail } from "@updf/core/internal";
import type { OperationExtension } from "@updf/core/resources";
import type { Block, BlockComponent } from "@updf/layout";
import type { OwnedVisualComponent } from "@updf/layout/internal-visual-owner";
import { inlineSelectionRequest, type InlineSelectionOperation } from "@updf/text/selection";
import type { SiblingBlockProps } from "./sibling.js";
import type { PathProps, FloatingPathProps } from "./path-entry.js";
import type { ShapeSource } from "./sources.js";
import { captureHandlers, type TextFlowOptions } from "./handlers.js";
import { floatingComponent } from "./component-owner.js";
import { manualParticipation, textFlowFeature } from "./manual-participation.js";
export type { TextFlowOptions, ShapeHandler } from "./handlers.js";
export interface FloatingBlockProps extends SiblingBlockProps<ShapeSource | string> {}

/** Install rectangle participation once, over the operation's existing text service. */
export function textFlow(options?: TextFlowOptions): OperationExtension {
  const config = captureHandlers(options, arguments.length !== 0);
  const contribution = config.resource?.contribution(manualParticipation, config.syntax) ?? manualParticipation;
  const capability = createOperationCapability((scope) => {
    let selection: ReturnType<typeof requestTextService<InlineSelectionOperation>> | undefined;
    let bound: ReadonlySet<import("@updf/core/resources").OwnedResource> | undefined;
    return (origin, check) => ({
      config,
      assertBoundResource(
        resource: import("@updf/core/resources").OwnedResource,
        path: string,
        charge: (count: number) => void,
      ) {
        check();
        charge(1 + (bound ? 0 : scope.bindings.size));
        bound ??= new Set(scope.bindings.values());
        if (!bound.has(resource)) fail("MEASUREMENT_CONTEXT", path, "Shape resource is not bound to this operation");
      },
      selection: () => {
        check();
        selection ??= requestTextService(scope, inlineSelectionRequest);
        return selection(origin, check);
      },
    });
  });
  return defineOperationExtension(textFlowFeature, capability, contribution);
}
export type FloatingVisualProps<P extends { readonly style?: object }> = Omit<P, "style"> & {
  readonly style: NonNullable<P["style"]> & FloatingBlockProps["style"];
};
/** Reuse the visual's canonical Block; floating introduces no extra container or painter. */
export function floatable(component: typeof Block): BlockComponent<FloatingBlockProps>;
export function floatable<P extends { readonly style?: object }>(
  component: OwnedVisualComponent<P>,
): BlockComponent<FloatingVisualProps<P>>;
export function floatable(component: BlockComponent<PathProps>): BlockComponent<FloatingPathProps>;
export function floatable(component: object): BlockComponent<never> {
  return floatingComponent(component);
}
