export interface BoxStyle {
  readonly flexDirection?: "row" | "column";
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly flexGrow?: number;
  readonly flexBasis?: 0;
  readonly height?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly gap?: number;
  readonly alignItems?: "start" | "center" | "end" | "stretch";
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
}
export interface BoxView<N, C> {
  readonly id: (node: N) => string;
  readonly path: (node: N) => string;
  readonly style: (node: N) => BoxStyle;
  readonly childCount: (node: N) => number;
  readonly childAt: (node: N, index: number) => N;
  readonly content: (node: N) => C | undefined;
}
export interface BoxAllocation {
  readonly width: number;
  /** Exact binary64 sums in units of 2^-1075; optional terminal projection metadata. */
  readonly exactStart?: bigint;
  readonly exactEnd?: bigint;
}
export interface BoxLimits {
  readonly nodes?: number;
  readonly depth?: number;
  readonly childCalls?: number;
  readonly measurements?: number;
}
export interface LayoutBoxesInput<N, C> {
  readonly root: N;
  readonly view: BoxView<N, C>;
  readonly width: number;
  readonly limits?: BoxLimits;
  readonly exactInlineEdges?: boolean;
  readonly measure?: (
    content: C,
    context: { readonly path: string; readonly allocation: BoxAllocation },
  ) => { readonly height: number };
}
export interface BoxRecord<C> {
  readonly id: string;
  readonly path: string;
  readonly parentIndex: number | null;
  readonly childStart: number;
  readonly childCount: number;
  /** Offsets relative to the parent's content origin; root is (0, 0). */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly content?: C;
  readonly allocation: BoxAllocation;
}
export interface BoxLayout<C> {
  readonly boxes: readonly BoxRecord<C>[];
  readonly childIndices: readonly number[];
  readonly counts: { readonly nodes: number; readonly childCalls: number; readonly measurements: number };
}
