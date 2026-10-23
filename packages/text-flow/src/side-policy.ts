import type { ParticipationContext, ParticipationSource, PreparedBlock } from "@updf/layout/internal-participation";
import type { SiblingBlockProps } from "./sibling.js";

/** Private statically selected behavior, not a public feature registry. */
export interface SideQuery {
  readonly clears: (top: number, bottom: number) => boolean;
  readonly depth: (top: number, bottom: number) => number;
  readonly available: (width: number, depth: number) => number;
  readonly retry: (top: number, bottom: number, nextTop: number) => number;
}
export interface SideMarker {
  readonly side: "left" | "right";
  readonly width: number;
  readonly height: number;
  readonly detail?: unknown;
}
export interface SidePolicy<Shape> {
  readonly capture: (
    input: Readonly<Record<string, unknown>>,
    path: string,
  ) => {
    readonly props: SiblingBlockProps<Shape>;
    readonly detail?: unknown;
  };
  readonly marker: (shape: Shape | undefined, detail: unknown, path: string) => unknown;
  readonly prepare: (
    marker: SideMarker,
    visual: PreparedBlock,
    source: ParticipationSource,
    context: ParticipationContext,
  ) => { readonly visual: PreparedBlock; readonly query: SideQuery };
}
