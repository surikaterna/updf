import { DocumentError, fail, ownDataValue, useOperationExtension } from "@updf/core/internal";
import { bits, value } from "@updf/layout-boxes/numeric";
import {
  chargeSourceWork,
  defineParticipation,
  type ParticipationContext,
  type ParticipationSource,
} from "@updf/layout/internal-participation";
import type { InlineSelectionOperation } from "@updf/text/selection";
import { initializeMarker, type ManualMarker } from "./component-owner.js";
import type { HandlerConfig } from "./handlers.js";
import type { PathBand } from "./path-band.js";
import { rectangleQuery } from "./rectangle-policy.js";
import { compileSiblings } from "./sibling.js";
import type { ShapeSource } from "./sources.js";

export const textFlowFeature = Object.freeze({});
export interface ManualBinding {
  readonly config: HandlerConfig;
  readonly selection: () => InlineSelectionOperation;
  readonly assertBoundResource: (
    resource: import("@updf/core/resources").OwnedResource,
    path: string,
    charge: (count: number) => void,
  ) => void;
}
export const manualParticipation = defineParticipation((sources, context) => {
  const binding = useOperationExtension<ManualBinding>(context.operation, textFlowFeature);
  const prepared = sources.map((source) => prepareSource(source, context, binding));
  return compileSiblings(prepared, context, () => selectionFor(binding, prepared), {
    capture: () => fail("TYPE", "", "Capture belongs to the shared marker"),
    marker: () => fail("TYPE", "", "Capture belongs to the shared marker"),
    prepare: (marker, visual) => ({
      visual,
      query:
        (marker.detail as ReturnType<typeof rectangleQuery> | undefined) ??
        rectangleQuery(visual.naturalSize.width, visual.naturalSize.height),
    }),
  });
});
initializeMarker(manualParticipation);
function selectionFor(binding: ManualBinding, sources: readonly ParticipationSource[]) {
  try {
    return binding.selection();
  } catch (error) {
    const diagnostic = error instanceof DocumentError ? error.diagnostics[0] : undefined;
    if (diagnostic?.code === "FONT_RESOURCE" && diagnostic.path === "")
      throw new DocumentError(
        diagnostic.code,
        sources.find((source) => source.data)!.path,
        diagnostic.message,
        diagnostic,
      );
    throw error;
  }
}
function prepareSource(
  source: ParticipationSource,
  context: ParticipationContext,
  binding: ManualBinding,
): ParticipationSource {
  if (!source.data) return source;
  const marker = source.data as ManualMarker;
  const { config } = binding;
  const resource = ownDataValue(marker, "preparedShapeResource", source.path);
  if (!marker.visual && marker.shape === undefined && !resource)
    return { ...source, data: Object.freeze({ side: marker.side, width: marker.width, height: marker.height }) };
  const charge = (count: number) => chargeSourceWork(count, context.operation, source.path);
  const probe = context.prepare(source, marker.floating ? marker.width : undefined);
  const { width, height } = probe.naturalSize;
  const visual = marker.visual as { readonly shape: ShapeSource } | undefined;
  const paintGeometry =
    visual &&
    resolveShape(visual.shape, marker.floating ? marker.side : undefined, width, height, config, charge, source.path);
  let block = source.block;
  if (visual) {
    if (block.type !== "block") fail("TYPE", source.path, "Expected retained Path Block");
    const child = config.visual!(paintGeometry!, visual, width, height, charge, source.path);
    block = { ...block, children: [child] };
  }
  if (!marker.floating) {
    const { data: _data, ...ordinary } = source;
    return { ...ordinary, block };
  }
  const shape = resource
    ? resolveResource(resource, source, probe, context, binding, charge)
    : marker.shape === undefined
      ? paintGeometry
      : resolveShape(marker.shape, marker.side, width, height, config, charge, `${source.path}/style/shapeOutside`);
  const query = shape ? pathQuery(shape) : rectangleQuery(width, height);
  return {
    ...source,
    block,
    data: Object.freeze({ side: marker.side, width: marker.width, height: marker.height, detail: query }),
  };
}
function resolveResource(
  resource: import("@updf/core/resources").OwnedResource,
  source: ParticipationSource,
  probe: import("@updf/layout/internal-participation").PreparedBlock,
  context: ParticipationContext,
  binding: ManualBinding,
  charge: (count: number) => void,
): PathBand {
  const path = `${source.path}/style/shapeOutside`;
  binding.assertBoundResource(resource, path, charge);
  if (!binding.config.resource) fail("MEASUREMENT_CONTEXT", path, "URL shapes require pngAlphaShapes()");
  return binding.config.resource.query(resource, source, probe, context, charge, path);
}
function resolveShape(
  input: ShapeSource | string,
  side: "left" | "right" | undefined,
  width: number,
  height: number,
  config: HandlerConfig,
  charge: (count: number) => void,
  path: string,
): PathBand {
  if (typeof input === "string") {
    if (!config.syntax) fail("MEASUREMENT_CONTEXT", path, "String shapes require shapeSyntax()");
    input = config.syntax(input, charge, path);
  }
  if (input.kind === "url") fail("VALUE", path, "URL shape resolution/extraction is not implemented");
  if (!config.geometry) fail("MEASUREMENT_CONTEXT", path, "Manual shapes require pathShapes()");
  return config.geometry(input, width, height, side, charge, path);
}
function pathQuery(shape: PathBand) {
  return {
    clears: (top: number, bottom: number) => top > bottom,
    depth: shape.depth,
    available(width: number, depth: number) {
      if (depth === 0) return width;
      const n = width - depth;
      return n <= 0 ? 0 : value(bits(n) - 1n);
    },
    retry: (_top: number, _bottom: number, nextTop: number) => nextTop,
  };
}
