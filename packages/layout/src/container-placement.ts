import { fail, sum } from "@updf/core/internal";
import { assertGeneratedPart, materializeGeneratedInterval } from "./generated-interval.js";
import type { FragmentChild } from "./protocol.js";
import type { Sizing } from "./sizing.js";
import type { StackPiece, StackSelection } from "./stack.js";

export type ContainerChildPlacement = FragmentChild;

/** Shared canonical child-to-border-box translation, independent of native capacity certificates. */
export function containerChildOrigin(box: Sizing, left = 0, top = 0) {
  return Object.freeze({ x: childX(box, left), y: childTop(box, top) });
}
const childX = (box: Sizing, left: number) => sum([box.inset.left, left]);
const childTop = (box: Sizing, top: number) => sum([box.inset.top, top]);

function childY(
  piece: StackPiece,
  box: Sizing,
  sourceEnd: number,
  height: number,
  hidden: boolean,
  path: string,
): number {
  if (piece.interval) assertGeneratedPart(piece, piece.interval, piece.top, piece.fragment.height, path);
  if (hidden) {
    return sum([box.inset.top, piece.top]);
  }
  const allocation = piece.interval
    ? materializeGeneratedInterval(piece.interval, box.inset.top, { sourceStart: 0, sourceEnd }, path)
    : undefined;
  const y = allocation ? allocation.start : childTop(box, piece.top);
  const nativeEnd = y + (allocation ? allocation.allocationExtent : piece.fragment.height);
  if (nativeEnd > height - box.inset.bottom)
    fail("GEOMETRY", path, "Materialized child exceeds its reserved content region");
  return y;
}

export function prepareContainerPlacements(
  box: Sizing,
  selection: StackSelection,
  height: number,
  hidden: boolean,
  path: string,
): readonly ContainerChildPlacement[] {
  if (height === 0) return Object.freeze([]);
  return Object.freeze(
    selection.pieces.map((piece) => {
      const fragment = piece.fragment;
      const y = childY(piece, box, selection.height, height, hidden, path);
      const x = childX(box, piece.left ?? 0);
      return Object.freeze({
        fragment,
        x,
        y,
        frame: "local" as const,
        hidden,
        bounds: Object.freeze({ start: box.inset.top, end: height - box.inset.bottom }),
      });
    }),
  );
}
