/** Host border-box lengths; default column/start, zero gap/padding, natural height. No implicit units. */
export interface BoxStyle {
  readonly flexDirection?: "row" | "column";
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  /** Positive finite row-child weight; default 1 for row children without fixed width. */
  readonly flexGrow?: number;
  /** Only zero basis is supported; flex sizing is forbidden on root/column children. */
  readonly flexBasis?: 0;
  readonly height?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  /** Default error; clip is only valid on measured content leaves. Rendering remains host-owned. */
  readonly overflow?: "error" | "clip";
  readonly gap?: number;
  readonly alignItems?: "start" | "center" | "end" | "stretch";
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
}
/** Trusted synchronous indexed tree reader; unique nonempty IDs, no repeated nodes, content only on leaves. */
export interface BoxView<N, C> {
  readonly id: (node: N) => string;
  readonly path: (node: N) => string;
  readonly style: (node: N) => BoxStyle;
  readonly childCount: (node: N) => number;
  readonly childAt: (node: N, index: number) => N;
  readonly content: (node: N) => C | undefined;
}
/** Frozen leaf content-width allocation, excluding padding; exact edges are opt-in metadata, not coordinates. */
export interface BoxAllocation {
  readonly width: number;
  /** Exact binary64 sums in units of 2^-1075; optional terminal projection metadata. */
  readonly exactStart?: bigint;
  readonly exactEnd?: bigint;
}
/** Safe integer budgets: nodes/depth ≥1, childCalls/measurements ≥0; defaults 100000/1024/99999/100000. */
export interface BoxLimits {
  readonly nodes?: number;
  readonly depth?: number;
  readonly childCalls?: number;
  readonly measurements?: number;
}
/** Native endpoint containment or bounded approximate metric containment; neither repairs geometry. */
export type BoxContainment = "native" | "metric";
/** Host tree and positive finite available width; measure is required only for leaves with content. */
export interface LayoutBoxesInput<N, C> {
  readonly root: N;
  readonly view: BoxView<N, C>;
  readonly width: number;
  readonly limits?: BoxLimits;
  /** Default native; metric permits bounded roundoff in natural fit and local endpoint containment. */
  readonly containment?: BoxContainment;
  /** Default false; include exact dyadic inline edges in allocations for host projection. */
  readonly exactInlineEdges?: boolean;
  readonly measure?: (
    content: C,
    context: { readonly path: string; readonly allocation: BoxAllocation },
  ) => { readonly height: number };
}
export type AllocateBoxLayoutInput<N, C> = Omit<LayoutBoxesInput<N, C>, "measure">;
declare const measurementIdentity: unique symbol;
declare const planIdentity: unique symbol;
/** Opaque frozen token; content remains host-owned. */
export interface BoxMeasurementRequest<C> {
  readonly [measurementIdentity]: true;
  readonly content: C;
  readonly path: string;
  readonly allocation: BoxAllocation;
}
/** Reusable frozen plan; only tokens issued by this plan can complete it. */
export interface BoxLayoutPlan<C> {
  readonly [planIdentity]: true;
  readonly requests: readonly BoxMeasurementRequest<C>[];
}
export interface BoxMeasurementResult<C> {
  readonly request: BoxMeasurementRequest<C>;
  /** Full natural content height excluding own insets, never a clipped allocation. */
  readonly height: number;
}
/** Frozen preorder box report; childStart/count index childIndices, not a contiguous slice of boxes. */
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
/** Frozen structural result; generic C payloads remain host-owned and are not deep-frozen. */
export interface BoxLayout<C> {
  readonly containment: BoxContainment;
  readonly boxes: readonly BoxRecord<C>[];
  readonly childIndices: readonly number[];
  readonly counts: { readonly nodes: number; readonly childCalls: number; readonly measurements: number };
}
