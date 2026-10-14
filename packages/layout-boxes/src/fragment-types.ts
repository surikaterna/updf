/** Stable unique ID/descriptor pairing; extent is nonnegative safe integer source units, not physical height. */
export interface FragmentSource<D> {
  readonly id: string;
  readonly path: string;
  /** Host-owned payload retained by identity; must remain semantically stable for the operation. */
  readonly descriptor: D;
  readonly extent: number;
  readonly mode: "atomic" | "splittable";
  /** Fixed width must equal request width exactly; reflow measures at each requested host width. */
  readonly width: { readonly mode: "fixed"; readonly value: number } | { readonly mode: "reflow" };
}
/** Lazy indexed source view; count is a nonnegative safe integer and each indexed source identity is unique. */
export interface FragmentView<D> {
  readonly count: number;
  readonly at: (index: number) => FragmentSource<D>;
}
/** Callback-lifetime work lease; consume nonnegative safe integer units before host work. Retention poisons on use. */
export interface ProviderWork {
  readonly consume: (units: number) => void;
}
/** Trusted synchronous next-unit reader: end must progress within extent; atomic sources return the entire remainder. */
export interface FragmentProvider<D, C> {
  readonly next: (
    descriptor: D,
    request: { readonly offset: number; readonly extent: number; readonly width: number },
    work: ProviderWork,
  ) => { readonly end: number; readonly height: number; readonly content: C };
}
/** Nonnegative safe integer cumulative work caps; omitted fields use fragmentDefaults. */
export interface FragmentLimits {
  readonly attempts?: number;
  readonly sourceVisits?: number;
  readonly sourceReads?: number;
  readonly measurements?: number;
  readonly unitsExamined?: number;
  readonly outputFragments?: number;
  readonly providerUnits?: number;
}
/** Frozen cumulative accounting snapshot; available even after close. */
export type FragmentCounts = Readonly<Required<FragmentLimits>>;
/** Half-open source unit with nonnegative finite host height; content remains host-owned. */
export interface FragmentUnit<C> {
  readonly start: number;
  readonly end: number;
  readonly height: number;
  readonly content: C;
}
/** Frozen maximal fitting sequence of whole provider units; height uses compensated accumulation. */
export interface SelectedRange<C> {
  readonly start: number;
  readonly end: number;
  readonly height: number;
  readonly units: readonly FragmentUnit<C>[];
}
/**
 * Safe integer source offset; nonnegative finite host width/height/usedHeight.
 * Occupied usedHeight fits height under the shared two-relative-epsilon metric policy,
 * including previously computed metrics supplied by callers. Values are never clamped.
 */
export interface RangeRequest {
  readonly offset: number;
  readonly width: number;
  readonly height: number;
  readonly usedHeight: number;
}
declare const preparedBrand: unique symbol;
/** Opaque operation-owned source token from prepare, not serializable or transferable. */
export interface PreparedSource {
  readonly [preparedBrand]: true;
}
declare const cursorBrand: unique symbol;
/** Opaque single-use operation cursor; use the new cursor returned by fragment, not the consumed input. */
export interface FragmentCursor {
  readonly [cursorBrand]: true;
}
/**
 * Host region with nonempty ID and nonnegative finite lengths; usedHeight fits height
 * under the RangeRequest metric policy. Kernel does not create pages or retry blocked regions.
 */
export interface FragmentRegion {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly usedHeight: number;
}
/** Frozen range placement at left zero/top usedHeight plus preceding heights, in host region coordinates. */
export interface FragmentPlacement<C> extends SelectedRange<C> {
  readonly sourceId: string;
  readonly path: string;
  readonly regionId: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}
/** done: source view exhausted; region-full: progress with remainder; blocked: no progress with remainder. */
export interface RegionResult<C> {
  readonly status: "done" | "region-full" | "blocked";
  readonly placements: readonly FragmentPlacement<C>[];
  readonly cursor: FragmentCursor;
}
/** Owned lifecycle; prepare/select/start/fragment failures close the operation, close is idempotent. */
export interface FragmentOperation<D, C> {
  /** Snapshot source metadata without cloning descriptor; repeat ID must have identical metadata/descriptor. */
  readonly prepare: (source: FragmentSource<D>) => PreparedSource;
  /** Undefined when the next unit cannot fit; exhausted sources return an empty range, not undefined. */
  readonly select: (source: PreparedSource, request: RangeRequest) => SelectedRange<C> | undefined;
  /** Begin an indexed view; actual sources are read lazily during fragment. */
  readonly start: (view: FragmentView<D>) => FragmentCursor;
  /** Consume the cursor and return progress/status with a fresh cursor; host decides subsequent regions. */
  readonly fragment: (cursor: FragmentCursor, region: FragmentRegion) => RegionResult<C>;
  readonly counts: () => FragmentCounts;
  readonly close: () => void;
}
