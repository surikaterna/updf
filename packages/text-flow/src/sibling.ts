import { DocumentError, fail, sum, number } from "@updf/core/internal";
import { useOperationCapability, type OperationCapability } from "@updf/core/resources";
import type { ContentBlockProps, BlockComponent } from "@updf/layout";
import {
  defineParticipation,
  participationComponent,
  sourceProvenance,
  fragmentSlot,
  type ParticipationContext,
  type ParticipationSource,
  type PreparedBlock,
  type FragmentRequest,
  type FlowParticipation,
} from "@updf/layout/internal-participation";
import type { InlineSelectionOperation } from "@updf/text/selection";
import { siblingSources, type SiblingSources } from "./sibling-source.js";
import { selectSiblings } from "./sibling-selection.js";
import { selectSideSiblings } from "./side-selection.js";
import type { SideMarker, SidePolicy, SideQuery } from "./side-policy.js";

export interface SiblingBlockProps<Shape> extends Omit<ContentBlockProps, "style" | "children"> {
  readonly children?: ContentBlockProps["children"];
  readonly style: NonNullable<ContentBlockProps["style"]> & {
    readonly width: number;
    readonly height: number;
    readonly float: "left" | "right";
    readonly shapeOutside?: Shape;
    readonly shapeImageThreshold?: number;
  };
}
export function siblingParticipation<Shape>(
  capability: OperationCapability<InlineSelectionOperation>,
  policy: SidePolicy<Shape>,
): {
  readonly Block: BlockComponent<SiblingBlockProps<Shape>>;
  readonly participation: FlowParticipation;
} {
  const participation = defineParticipation((sources, context) =>
    compileSiblings(
      sources,
      context,
      () => selectionFor(context, capability, sources.find((s) => s.data)!.path),
      policy,
    ),
  );
  const Block = participationComponent<SiblingBlockProps<Shape>>(participation, (input, path) => {
    const { props, detail } = policy.capture(input, path);
    if (!props.style || typeof props.style !== "object")
      fail("TYPE", `${path}/style`, "Expected explicit dimensions and side");
    const { float, shapeOutside, ...style } = props.style;
    if ("shapeOutside" in props.style && shapeOutside === undefined)
      fail("VALUE", `${path}/style/shapeOutside`, "Omit optional shape instead of undefined");
    if (float !== "left" && float !== "right") fail("VALUE", `${path}/style/float`, "Expected left or right");
    const marker = policy.marker(shapeOutside, detail, `${path}/style/shapeOutside`);
    number(style.width, `${path}/style/width`, true);
    number(style.height, `${path}/style/height`, true);
    if (Object.keys(style).some((key) => key.startsWith("margin")))
      fail("KEY", `${path}/style`, "Floating blocks do not support margins");
    return {
      props: { ...props, children: props.children ?? null, style },
      data: Object.freeze({
        side: float,
        width: style.width,
        height: style.height,
        ...(marker ? { detail: marker } : {}),
      }),
    };
  });
  return { Block, participation };
}
export function compileSiblings<Shape>(
  sources: readonly ParticipationSource[],
  context: ParticipationContext,
  select: () => InlineSelectionOperation,
  policy: SidePolicy<Shape>,
) {
  const marked = sources.filter((source) => source.data);
  if (marked.length > 1) fail("VALUE", marked[1]!.path, "Only one floating block is supported per Flow");
  const blocks: PreparedBlock[] = [];
  let owned: SiblingSources | undefined;
  try {
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index]!;
      if (!source.data) {
        blocks.push(ordinary(source, context));
        continue;
      }
      const following = [];
      while (
        sources[index + 1]?.author &&
        sources[index + 1]!.block.type === "paragraph" &&
        !(sources[index + 1]!.block as { keepTogether?: boolean }).keepTogether
      )
        following.push(sources[++index]!);
      const selection = following.length ? select() : undefined;
      if (selection && !("prepareInline" in selection))
        fail("MEASUREMENT_CONTEXT", source.path, "Capability does not support inline selection");
      owned = siblingSources(following, context, selection);
      blocks.push(producer(source, owned, context, policy));
      // Preserve authored body indices, including controls handled outside fragment reporting.
      for (const _paragraph of following)
        blocks.push({
          fragmentation: "atomic",
          extent: 0,
          naturalSize: { width: context.width, height: 0 },
          fragment: () => undefined,
        });
    }
    return { blocks, close: () => owned?.kernel.close() };
  } catch (error) {
    owned?.kernel.close();
    throw error;
  }
}
function selectionFor(
  context: ParticipationContext,
  capability: OperationCapability<InlineSelectionOperation>,
  path: string,
): InlineSelectionOperation {
  try {
    return useOperationCapability(context.operation, capability);
  } catch (error) {
    const diagnostic = error instanceof DocumentError ? error.diagnostics[0] : undefined;
    if (diagnostic?.code === "FONT_RESOURCE" && diagnostic.path === "")
      throw new DocumentError(diagnostic.code, path, diagnostic.message, diagnostic);
    throw error;
  }
}
function ordinary(source: ParticipationSource, context: ParticipationContext): PreparedBlock {
  const block = context.prepare(source);
  if (block.extent === 0) return block;
  return {
    ...block,
    provenance: sourceProvenance(
      [{ start: 0, end: block.extent, index: source.index, path: source.path, key: source.key }],
      block.extent,
    ),
  };
}
function producer<Shape>(
  source: ParticipationSource,
  sources: SiblingSources,
  context: ParticipationContext,
  policy: SidePolicy<Shape>,
): PreparedBlock {
  const marker = source.data as SideMarker;
  if (marker.width > context.width || marker.height > context.freshHeight)
    fail("GEOMETRY", source.path, "Float dimensions exceed the body");
  const visual = context.prepare(source, marker.width);
  validateVisual(visual, source.path, context);
  const prepared = policy.prepare(marker, visual, source, context);
  return preparedSiblings(source, sources, context, prepared.visual, prepared.query);
}
function validateVisual(visual: PreparedBlock, path: string, context: ParticipationContext) {
  if (
    visual.naturalSize.width <= 0 ||
    visual.naturalSize.height <= 0 ||
    visual.naturalSize.width > context.width ||
    visual.naturalSize.height > context.freshHeight ||
    visual.containsAutoAlignment
  )
    fail("GEOMETRY", path, "Float geometry must fit the body without auto alignment");
}
function preparedSiblings(
  source: ParticipationSource,
  sources: SiblingSources,
  context: ParticipationContext,
  visual: PreparedBlock,
  query: SideQuery,
): PreparedBlock {
  const slot = fragmentSlot<Readonly<{ offset: number }>>();
  const select = (request: FragmentRequest) => {
    if (!context.lifetime.active) fail("MEASUREMENT_CONTEXT", source.path, "Sibling operation has closed");
    if (request.width !== context.width) fail("GEOMETRY", source.path, "Sibling source has a fixed authored width");
    const previous = request.state?.read(slot);
    if (previous && previous.offset !== request.offset)
      fail("MEASUREMENT_CONTEXT", source.path, "Mismatched sibling checkpoint");
    const selected =
      request.offset === 0
        ? selectSideSiblings(sources, visual, query, (source.data as SideMarker).side, request)
        : selectSiblings(sources, request);
    if (selected) request.state?.write(slot, Object.freeze({ offset: selected.nextOffset }));
    return selected;
  };
  const initial = select({ mode: "complete", offset: 0, width: context.width })!;
  const tail =
    initial.nextOffset < sources.extent
      ? select({ mode: "complete", offset: initial.nextOffset, width: context.width })
      : undefined;
  return {
    fragmentation: "splittable",
    extent: sources.extent,
    naturalSize: { width: context.width, height: sum([initial.height, tail?.height ?? 0]) },
    provenance: sourceProvenance(
      [
        { start: 0, end: 1, index: source.index, path: source.path, key: source.key },
        ...sources.paragraphs.map((p) => ({
          start: p.start,
          end: p.start + p.extent,
          index: p.author.index,
          path: p.author.path,
          key: p.author.key,
        })),
      ],
      sources.extent,
    ),
    fragment: select,
  };
}
