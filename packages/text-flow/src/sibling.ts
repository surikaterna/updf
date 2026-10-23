import { fail, sum, validateDataObject, number } from "@updf/core/internal";
import { useOperationCapability, type OperationCapability } from "@updf/core/resources";
import type { ContentBlockProps, BlockComponent } from "@updf/layout";
import {
  defineParticipation,
  participationComponent,
  sourceProvenance,
  fragmentSlot,
  chargeSourceWork,
  type ParticipationContext,
  type ParticipationSource,
  type PreparedBlock,
  type FragmentRequest,
  type FlowParticipation,
} from "@updf/layout/internal-participation";
import type { TextCompositionOperation, InlineSelectionOperation } from "@updf/text/composition";
import { siblingSources, type SiblingSources } from "./sibling-source.js";
import { selectSiblings } from "./sibling-selection.js";
import { pathShape, preparePathBand, type SideShape, type PathShape, type PathBand } from "./path-band.js";
import { capturePath, pathFacade, pathVisual, type PathCapture, type FloatingPathProps } from "./path.js";
import { selectPathSiblings } from "./path-selection.js";

export interface FloatingBlockProps extends Omit<ContentBlockProps, "style" | "children"> {
  readonly children?: ContentBlockProps["children"];
  readonly style: NonNullable<ContentBlockProps["style"]> & {
    readonly width: number;
    readonly height: number;
    readonly float: "left" | "right";
    readonly shapeOutside?: SideShape;
  };
}
interface Marker {
  readonly side: "left" | "right";
  readonly width: number;
  readonly height: number;
  readonly shape?: PathShape;
  readonly path?: PathCapture;
}
export function siblingParticipation(capability: OperationCapability<TextCompositionOperation>): {
  readonly Block: BlockComponent<FloatingBlockProps>;
  readonly Path: BlockComponent<FloatingPathProps>;
  readonly participation: FlowParticipation;
} {
  const participation = defineParticipation((sources, context) => compileSiblings(sources, context, capability));
  const Block = participationComponent<FloatingBlockProps>(participation, (input, path) => {
    const captured = "d" in input ? capturePath(input, path) : undefined;
    const props = input as unknown as FloatingBlockProps;
    if (!captured) validateDataObject(props, ["children", "style", "keepTogether", "decorations"], path);
    if (!props.style || typeof props.style !== "object")
      fail("TYPE", `${path}/style`, "Expected explicit dimensions and side");
    const { float, shapeOutside, ...style } = props.style;
    if ("shapeOutside" in props.style && shapeOutside === undefined)
      fail("VALUE", `${path}/style/shapeOutside`, "Omit optional shape instead of undefined");
    if (float !== "left" && float !== "right") fail("VALUE", `${path}/style/float`, "Expected left or right");
    const shape = captured?.shape ?? pathShape(shapeOutside, `${path}/style/shapeOutside`);
    number(style.width, `${path}/style/width`, true);
    number(style.height, `${path}/style/height`, true);
    if (Object.keys(style).some((key) => key.startsWith("margin")))
      fail("KEY", `${path}/style`, "Floating blocks do not support margins");
    return {
      props: { ...(captured ? {} : props), children: props.children ?? null, style },
      data: Object.freeze({
        side: float,
        width: style.width,
        height: style.height,
        ...(shape ? { shape } : {}),
        ...(captured ? { path: captured } : {}),
      }),
    };
  });
  return { Block, Path: pathFacade(Block), participation };
}
function compileSiblings(
  sources: readonly ParticipationSource[],
  context: ParticipationContext,
  capability: OperationCapability<TextCompositionOperation>,
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
      const selection = useOperationCapability(context.operation, capability);
      if (!("prepareInline" in selection))
        fail("MEASUREMENT_CONTEXT", source.path, "Capability does not support inline selection");
      owned = siblingSources(following, context, selection as TextCompositionOperation & InlineSelectionOperation);
      blocks.push(producer(source, owned, context));
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
function producer(source: ParticipationSource, sources: SiblingSources, context: ParticipationContext): PreparedBlock {
  const marker = source.data as Marker;
  if (marker.width > context.width || marker.height > context.freshHeight)
    fail("GEOMETRY", source.path, "Float dimensions exceed the body");
  let visual = context.prepare(source, marker.width);
  validateVisual(visual, source.path, context);
  const shape =
    marker.shape &&
    preparePathBand(
      marker.shape,
      visual.naturalSize.width,
      visual.naturalSize.height,
      marker.side,
      (amount) => chargeSourceWork(amount, context.operation, source.path),
      source.path,
    );
  if (marker.path) {
    const block = pathVisual(
      shape!,
      marker.path,
      visual.naturalSize.width,
      visual.naturalSize.height,
      (amount) => chargeSourceWork(amount, context.operation, source.path),
      source.path,
    );
    visual = context.prepare({ ...source, block }, visual.naturalSize.width);
  }
  return preparedSiblings(source, sources, context, visual, shape);
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
  shape?: PathBand,
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
        ? selectPathSiblings(sources, visual, shape, (source.data as Marker).side, request)
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
