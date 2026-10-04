export interface FragmentSource<D> {
  readonly id: string;
  readonly path: string;
  readonly descriptor: D;
  readonly extent: number;
  readonly mode: "atomic" | "splittable";
  readonly width: { readonly mode: "fixed"; readonly value: number } | { readonly mode: "reflow" };
}
export interface FragmentView<D> {
  readonly count: number;
  readonly at: (index: number) => FragmentSource<D>;
}
export interface ProviderWork {
  readonly consume: (units: number) => void;
}
export interface FragmentProvider<D, C> {
  readonly next: (
    descriptor: D,
    request: { readonly offset: number; readonly extent: number; readonly width: number },
    work: ProviderWork,
  ) => { readonly end: number; readonly height: number; readonly content: C };
}
export interface FragmentLimits {
  readonly attempts?: number;
  readonly sourceVisits?: number;
  readonly sourceReads?: number;
  readonly measurements?: number;
  readonly unitsExamined?: number;
  readonly outputFragments?: number;
  readonly providerUnits?: number;
}
export type FragmentCounts = Readonly<Required<FragmentLimits>>;
export interface FragmentUnit<C> {
  readonly start: number;
  readonly end: number;
  readonly height: number;
  readonly content: C;
}
export interface SelectedRange<C> {
  readonly start: number;
  readonly end: number;
  readonly height: number;
  readonly units: readonly FragmentUnit<C>[];
}
export interface RangeRequest {
  readonly offset: number;
  readonly width: number;
  readonly height: number;
  readonly usedHeight: number;
}
declare const preparedBrand: unique symbol;
export interface PreparedSource {
  readonly [preparedBrand]: true;
}
declare const cursorBrand: unique symbol;
export interface FragmentCursor {
  readonly [cursorBrand]: true;
}
export interface FragmentRegion {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly usedHeight: number;
}
export interface FragmentPlacement<C> extends SelectedRange<C> {
  readonly sourceId: string;
  readonly path: string;
  readonly regionId: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}
export interface RegionResult<C> {
  readonly status: "done" | "region-full" | "blocked";
  readonly placements: readonly FragmentPlacement<C>[];
  readonly cursor: FragmentCursor;
}
export interface FragmentOperation<D, C> {
  readonly prepare: (source: FragmentSource<D>) => PreparedSource;
  readonly select: (source: PreparedSource, request: RangeRequest) => SelectedRange<C> | undefined;
  readonly start: (view: FragmentView<D>) => FragmentCursor;
  readonly fragment: (cursor: FragmentCursor, region: FragmentRegion) => RegionResult<C>;
  readonly counts: () => FragmentCounts;
  readonly close: () => void;
}
