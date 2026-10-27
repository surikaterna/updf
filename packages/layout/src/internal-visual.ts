import { h } from "@updf/core/vdom";
import { fail, ownDataValue } from "@updf/core/internal";
import { contentActualSize, measureActualBlockContent } from "./adapter-content.js";
import { blockComponent } from "./author-parts.js";
import { Block } from "./content-data.js";
import type { ContentBlockProps } from "./content-types.js";
import type { BlockAdapterDefinition, Extensions, ReadonlyProps, MeasureContext } from "./extension-types.js";
import { createExtensions, defineBlockAdapter, extension } from "./extensions.js";
import { ownVisual, type OwnedVisualComponent } from "./visual-owner.js";
import { visualPreparationOwner } from "./visual-owner.js";
import type { OwnedResource } from "@updf/core/resources";
import { visualPreparedContent } from "./visual-preparation-state.js";
import { relayVisualReference } from "./visual-reference.js";
export { publishVisualReference } from "./visual-reference.js";

export type { OwnedVisualComponent } from "./visual-owner.js";
export { visualContentHeight } from "./visual-content-height.js";
export { validateBlockStyle } from "./sizing.js";
export interface VisualDefinition<V> {
  readonly name: string;
  /** Validate raw author props at their original source path, and capture one canonical Block. */
  readonly capture: (
    input: Readonly<Record<string, unknown>>,
    path: string,
  ) => { readonly props: Omit<ContentBlockProps, "children">; readonly visual: V };
  /** Measure only the atomic child in the existing operation-bound context. */
  readonly measure: BlockAdapterDefinition<V>["measure"];
  readonly prepare?: (visual: V, resource: OwnedResource, id: string) => V;
}

/** Private synchronous visual seam. Install the paired set explicitly; no implicit registration. */
export function defineVisual<P extends object, V>(
  definition: VisualDefinition<V>,
): { readonly Component: OwnedVisualComponent<P>; readonly adapters: Extensions; readonly preparationOwner: object } {
  const capture = definition.capture;
  const prepare = definition.prepare;
  const child = defineBlockAdapter<V>({
    name: `${definition.name}.visual`,
    validate: (value) => value as V,
    measure: definition.measure,
  });
  const outer = defineBlockAdapter<ContentBlockProps>({
    name: definition.name,
    validate: (value) => value as ContentBlockProps,
    measure: measureVisual,
  });
  const Component = ownVisual(
    blockComponent<P>(outer as never),
    outer,
    (input, path) => {
      const captured = capture(input, path);
      if (captured.props.style && ownDataValue(captured.props.style, "marginTop", `${path}/style/marginTop`) === "auto")
        fail("VALUE", `${path}/style/marginTop`, "Owned visuals do not support automatic top margins");
      return { ...captured.props, children: extension(child, captured.visual) };
    },
    (source, resource, id) => {
      if (!prepare) fail("TYPE", "/preparation/visual", "Visual has no owned resource binding");
      const descriptor = (source.body ?? source.props.children) as import("./extension-types.js").ExtensionBlock;
      const body = extension(child, prepare(descriptor.props as V, resource, id));
      return { ...source, props: { ...source.props, children: body }, ...(source.body === undefined ? {} : { body }) };
    },
  );
  return Object.freeze({
    Component,
    adapters: createExtensions([outer, child]),
    preparationOwner: visualPreparationOwner(Component)!.identity,
  });
}

function measureVisual(props: ReadonlyProps<ContentBlockProps>, context: MeasureContext) {
  const measured = measureActualBlockContent(context, visualPreparedContent(props) ?? h(Block, props), {
    width: context.width,
  });
  const actual = contentActualSize(measured);
  const result = {
    fragmentation: "atomic" as const,
    extent: 1,
    naturalSize: actual,
    next: () => ({ end: 1, height: actual.height, nodes: measured.nodes }),
  };
  relayVisualReference(context, measured, result);
  return result;
}
