import { fail, sum } from "@updf/core/internal";
import { assertGeneratedPart, materializeGeneratedInterval } from "./generated-interval.js";
import type { FragmentChild } from "./protocol.js";
import type { Sizing } from "./sizing.js";
import type { StackPiece, StackSelection } from "./stack.js";

export type ContainerChildPlacement = FragmentChild;

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
  const y = allocation ? allocation.start : sum([box.inset.top, piece.top]);
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
      const x = sum([box.inset.left, piece.left ?? 0]);
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
