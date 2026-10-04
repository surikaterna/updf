import { sum } from "./arithmetic.js";
import { bits, dyadic } from "./binary64.js";
import { type BoxNode, boxInput, collectBoxes } from "./box-operation.js";
import { naturalHeight, type PlacementStyle, placeResolved } from "./box-placement.js";
import { clampSize } from "./box-style.js";
import type { BoxAllocation, BoxLayout, BoxRecord, LayoutBoxesInput } from "./box-types.js";
import { fail } from "./error.js";
import { derivedAxis } from "./geometry.js";
import { resolveWidths } from "./width-resolver.js";
import type { WidthTrack } from "./width-types.js";
import { number, record } from "./width-validation.js";

interface Sized {
  width: number;
  contentWidth: number;
  height: number;
  measuredHeight?: number;
  left: number;
  top: number;
  allocation: BoxAllocation;
  placementStyle: PlacementStyle;
}
export function layoutBoxes<N, C>(input: LayoutBoxesInput<N, C>): BoxLayout<C> {
  const options = boxInput(input);
  const { nodes, childCalls } = collectBoxes(options.root, options.view, options.limits);
  const sizes: Sized[] = [];
  const allocations: BoxAllocation[] = [];
  let measurements = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    const assigned = allocations[i];
    const width = assigned?.width ?? columnWidth(node, options.width);
    const size = sizeBox(node, width, assigned ?? allocation(width, 0n, options.exactInlineEdges === true));
    sizes[i] = size;
    assignChildren(node, size, nodes, allocations, options.exactInlineEdges === true);
    if (node.content === undefined) continue;
    if (++measurements > options.limits.measurements) fail("LIMIT", node.path, "Measurement budget exceeded");
    if (!options.measure) fail("TYPE", node.path, "Content requires a measure callback");
    const measured = record(
      options.measure(node.content, Object.freeze({ path: node.path, allocation: size.allocation })),
      ["height"],
      node.path,
    );
    size.measuredHeight = size.height = number(measured.height, `${node.path}/height`);
  }
  for (let i = nodes.length - 1; i >= 0; i--) finishBox(i, nodes, sizes);
  for (let i = 0; i < nodes.length; i++) positionBox(i, nodes, sizes);
  return result(nodes, sizes, childCalls, measurements);
}
function allocation(width: number, start: bigint, exact: boolean): BoxAllocation {
  return Object.freeze(
    Object.assign(
      Object.create(null),
      exact ? { width, exactStart: start, exactEnd: start + dyadic(bits(width)) } : { width },
    ),
  );
}
function columnWidth<C>(node: BoxNode<C>, available: number): number {
  const style = node.style;
  if (style.flexGrow !== undefined || style.flexBasis !== undefined)
    fail("VALUE", node.path, "Column children and root cannot use flex sizing");
  const width = clampSize(style.width ?? available, style.minWidth, style.maxWidth);
  if (width <= 0 || width > available) fail("GEOMETRY", node.path, "Border box width must fit without shrinking");
  return width;
}
function sizeBox<C>(node: BoxNode<C>, width: number, assigned: BoxAllocation): Sized {
  const style = node.style;
  const left = style.paddingLeft ?? 0,
    right = style.paddingRight ?? 0;
  const top = style.paddingTop ?? 0,
    bottom = style.paddingBottom ?? 0;
  const contentWidth = derivedAxis(left, width - right, node.path).capacity;
  const inline =
    assigned.exactStart === undefined
      ? allocation(contentWidth, 0n, false)
      : allocation(contentWidth, assigned.exactStart + dyadic(bits(left)), true);
  return {
    width,
    contentWidth,
    height: 0,
    left: 0,
    top: 0,
    allocation: inline,
    placementStyle: {
      flexDirection: style.flexDirection ?? "column",
      alignItems: style.alignItems ?? "start",
      top,
      bottom,
      vertical: sum([top, bottom]),
      gap: style.gap ?? 0,
    },
  };
}
function rowTrack<C>(node: BoxNode<C>): WidthTrack {
  const style = node.style;
  if (style.width !== undefined) {
    if (clampSize(style.width, style.minWidth, style.maxWidth) !== style.width)
      fail("GEOMETRY", node.path, "Fixed width conflicts with bounds");
    return style.width;
  }
  return {
    weight: style.flexGrow ?? 1,
    ...(style.minWidth === undefined ? {} : { min: style.minWidth }),
    ...(style.maxWidth === undefined ? {} : { max: style.maxWidth }),
  };
}
function assignChildren<C>(
  node: BoxNode<C>,
  size: Sized,
  nodes: readonly BoxNode<C>[],
  allocations: BoxAllocation[],
  exact: boolean,
): void {
  if (!node.children.length) return;
  const children = node.children.map((index) => nodes[index] as BoxNode<C>);
  const row = size.placementStyle.flexDirection === "row";
  const widths = row
    ? resolveWidths(
        {
          availableWidth: size.contentWidth,
          tracks: children.map(rowTrack),
          gap: size.placementStyle.gap,
          maxTracks: children.length,
        },
        node.path,
      ).widths
    : children.map((child) => columnWidth(child, size.contentWidth));
  let edge = size.allocation.exactStart ?? 0n;
  children.forEach((child, i) => {
    const width = widths[i] as number;
    allocations[node.children[i] as number] = allocation(width, edge, exact);
    if (exact && row) edge += dyadic(bits(width)) + dyadic(bits(size.placementStyle.gap));
    if (
      row &&
      size.placementStyle.alignItems === "stretch" &&
      [child.style.height, child.style.minHeight, child.style.maxHeight].some((value) => value !== undefined)
    )
      fail("VALUE", child.path, "Stretch conflicts with child height constraints");
  });
}
function finishBox<C>(index: number, nodes: readonly BoxNode<C>[], sizes: Sized[]): void {
  const node = nodes[index] as BoxNode<C>,
    size = sizes[index] as Sized;
  const children = node.children.map((child) => sizes[child] as Sized);
  const natural =
    node.content === undefined
      ? naturalHeight(size.placementStyle, children)
      : sum([size.placementStyle.vertical, size.height]);
  const height = clampSize(node.style.height ?? natural, node.style.minHeight, node.style.maxHeight);
  number(height, node.path);
  if (natural > height) fail("GEOMETRY", node.path, "Box height cannot truncate content");
  size.height = height;
}
function positionBox<C>(index: number, nodes: readonly BoxNode<C>[], sizes: Sized[]): void {
  const node = nodes[index] as BoxNode<C>,
    size = sizes[index] as Sized;
  // Certify the retained measured extent against the final (possibly stretched) allocation.
  if (
    size.measuredHeight !== undefined &&
    sum([size.placementStyle.top, 0]) + size.measuredHeight > size.height - size.placementStyle.bottom
  )
    fail("GEOMETRY", node.path, "Measured content exceeds box content region");
  const children = node.children.map((child) => sizes[child] as Sized);
  const placed = placeResolved(size.placementStyle, size.height, children, node.path);
  placed.children.forEach((child, i) => {
    if (
      sum([node.style.paddingLeft ?? 0, child.left]) + child.width > size.width - (node.style.paddingRight ?? 0) ||
      sum([size.placementStyle.top, child.top]) + child.height > size.height - size.placementStyle.bottom
    )
      fail("GEOMETRY", node.path, "Materialized child exceeds box content region");
    Object.assign(children[i] as Sized, child);
  });
}
function result<C>(
  nodes: readonly BoxNode<C>[],
  sizes: readonly Sized[],
  childCalls: number,
  measurements: number,
): BoxLayout<C> {
  const childIndices: number[] = [];
  const boxes: BoxRecord<C>[] = nodes.map((node, index) => {
    const size = sizes[index] as Sized;
    const childStart = childIndices.length;
    for (const child of node.children) childIndices.push(child);
    return Object.freeze({
      id: node.id,
      path: node.path,
      parentIndex: node.parentIndex,
      childStart,
      childCount: node.children.length,
      left: size.left,
      top: size.top,
      width: size.width,
      height: size.height,
      ...(node.content === undefined ? {} : { content: node.content }),
      allocation: size.allocation,
    });
  });
  return Object.freeze({
    boxes: Object.freeze(boxes),
    childIndices: Object.freeze(childIndices),
    counts: Object.freeze({ nodes: nodes.length, childCalls, measurements }),
  });
}
