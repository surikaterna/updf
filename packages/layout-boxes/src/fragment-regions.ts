import { MetricSum, sum } from "./arithmetic.js";
import { placeResolved } from "./box-placement.js";
import type {
  FragmentCursor,
  FragmentPlacement,
  FragmentRegion,
  FragmentView,
  PreparedSource,
  RegionResult,
  SelectedRange,
} from "./fragment-types.js";

export interface CursorState<D> {
  readonly view: FragmentView<D>;
  readonly index: number;
  readonly offset: number;
}
export interface RegionHost<D, C> {
  readonly read: (
    view: FragmentView<D>,
    index: number,
  ) => { readonly prepared: PreparedSource; readonly id: string; readonly path: string; readonly extent: number };
  readonly select: (source: PreparedSource, offset: number, usedHeight: number) => SelectedRange<C> | undefined;
  readonly cursor: (state: CursorState<D>) => FragmentCursor;
  readonly output: () => void;
}
export function flowRegion<D, C>(
  state: CursorState<D>,
  region: FragmentRegion,
  host: RegionHost<D, C>,
): RegionResult<C> {
  let { index, offset } = state;
  const height = new MetricSum();
  const selected: { id: string; path: string; range: SelectedRange<C> }[] = [];
  while (index < state.view.count) {
    const source = host.read(state.view, index);
    if (offset === source.extent) {
      index++;
      offset = 0;
      continue;
    }
    const range = host.select(source.prepared, offset, sum([region.usedHeight, height.value]));
    if (!range) break;
    host.output();
    selected.push({ id: source.id, path: source.path, range });
    height.add(range.height);
    offset = range.end;
    if (offset !== source.extent) break;
    index++;
    offset = 0;
  }
  const geometry = placeResolved(
    { flexDirection: "column", alignItems: "start", top: 0, bottom: 0, vertical: 0, gap: 0 },
    height.value,
    selected.map(({ range }) => ({ width: region.width, height: range.height })),
    "/region",
  );
  const placements = selected.map(
    ({ id, path, range }, i): FragmentPlacement<C> =>
      Object.freeze({
        ...range,
        sourceId: id,
        path,
        regionId: region.id,
        left: geometry.children[i]!.left,
        top: sum([region.usedHeight, geometry.children[i]!.top]),
        width: region.width,
      }),
  );
  return Object.freeze({
    status: index === state.view.count ? "done" : placements.length ? "region-full" : "blocked",
    placements: Object.freeze(placements),
    cursor: host.cursor({ view: state.view, index, offset }),
  });
}
