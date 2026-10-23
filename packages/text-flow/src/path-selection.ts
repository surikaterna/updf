import { fail, MetricSum, sum } from "@updf/core/internal";
import { bits, value } from "@updf/layout-boxes/numeric";
import {
  compositeFragment,
  frameFits,
  paragraphFragment,
  positionedParagraphSequence,
  resolveFragment,
  type FragmentChild,
  type FragmentRequest,
  type PreparedBlock,
  type MeasuredParagraph,
} from "@updf/layout/internal-participation";
import type { PathBand } from "./path-band.js";
import type { SiblingSource, SiblingSources } from "./sibling-source.js";

interface PositionedLine {
  readonly measured: MeasuredParagraph;
  readonly x: number;
  readonly y: number;
}
interface State {
  readonly lines: PositionedLine[];
  readonly height: MetricSum;
  end: number;
}
export function selectPathSiblings(
  sources: SiblingSources,
  visual: PreparedBlock,
  shape: PathBand | undefined,
  side: "left" | "right",
  request: FragmentRequest,
) {
  const fragment = resolveFragment(visual, {
    ...request,
    mode: "complete",
    offset: 0,
    width: visual.naturalSize.width,
  });
  if (!fragment) return undefined;
  const state: State = { lines: [], height: new MetricSum(), end: 1 };
  for (const [index, source] of sources.paragraphs.entries()) {
    if (!selectParagraph(sources, source, index + 1, shape, side, visual.naturalSize, request.width, state)) break;
  }
  const last = state.lines.at(-1);
  const height = Math.max(
    visual.naturalSize.height,
    state.height.value,
    last ? sum([last.y, last.measured.height]) : 0,
  );
  if (!frameFits({ ...request, offset: 0 }, height)) return undefined;
  const children: FragmentChild[] = [
    { fragment, x: side === "left" ? 0 : request.width - visual.naturalSize.width, y: 0, frame: "relative" },
  ];
  if (state.lines.length) {
    const measured = positionedParagraphSequence(state.lines);
    const text = paragraphFragment(
      measured,
      { ...request, offset: 0 },
      sources.paragraphs[0]!.author.path,
      false,
      measured.lines.length,
    )!;
    children.push({ fragment: text, x: 0, y: 0, frame: "relative" });
  }
  return compositeFragment(children, height, state.end);
}
function selectParagraph(
  sources: SiblingSources,
  source: SiblingSource,
  nextSource: number,
  shape: PathBand | undefined,
  side: "left" | "right",
  visual: { readonly width: number; readonly height: number },
  width: number,
  state: State,
): boolean {
  let offset = 0;
  const bottom = visual.height;
  while (offset < source.extent) {
    const top = state.height.value;
    const continuation = source.bridge.resume(offset);
    const band = source.bridge.band(continuation, top);
    if (clears(band.top, bottom, shape) && tailClears(sources, nextSource, top, bottom, shape)) return false;
    const depth = shape ? shape.depth(band.top, band.bottom) : clears(band.top, bottom, shape) ? 0 : visual.width;
    const available = shape ? remaining(width, depth) : width - depth;
    if (available <= 0 || !source.bridge.canSelect(continuation, available)) {
      const nextTop = !shape && top < bottom ? Math.min(bottom, band.nextTop) : band.nextTop;
      state.height.add(nextTop - top);
      if (!(state.height.value > top)) fail("GEOMETRY", source.author.path, "Path retry did not progress");
      continue;
    }
    // A fresh cursor uses exactly this width and immutable source offset. A cursor
    // opened at an earlier y/width cannot be reused for variable contour selection.
    const result = sources.kernel.nextCandidate(sources.kernel.candidates(source.token, { offset, width: available }));
    if (result.done) fail("MEASUREMENT_CONTEXT", source.author.path, "Expected a progressing path line");
    const selected = sources.kernel.materializeCandidate(result.endpoint);
    const measured = selected.units[0]!.content.measured;
    validateLine(measured, top, available, band, source.author.path);
    state.lines.push({ measured, x: side === "left" ? depth : 0, y: top });
    state.height.add(selected.height);
    offset = selected.end;
    state.end = source.start + offset;
  }
  return offset === source.extent;
}
function tailClears(
  sources: SiblingSources,
  nextSource: number,
  top: number,
  bottom: number,
  shape: PathBand | undefined,
): boolean {
  // The owned certificate covers every remaining subset. Certify later sources too:
  // a later paragraph can have more backwards ink than the current full-width line.
  for (let i = nextSource; i < sources.paragraphs.length; i++) {
    const source = sources.paragraphs[i]!;
    if (!clears(source.bridge.band(source.bridge.resume(0), top).top, bottom, shape)) return false;
  }
  return true;
}
function clears(top: number, bottom: number, shape: PathBand | undefined): boolean {
  // Rectangles permit certified boundary contact; path edge queries include endpoints.
  return shape ? top > bottom : top >= bottom;
}
function remaining(width: number, depth: number): number {
  if (depth === 0) return width;
  const n = width - depth;
  return n <= 0 ? 0 : value(bits(n) - 1n);
}
function validateLine(
  measured: MeasuredParagraph,
  top: number,
  width: number,
  band: { readonly top: number; readonly bottom: number },
  path: string,
) {
  if (measured.lines.length !== 1) fail("MEASUREMENT_CONTEXT", path, "Expected one selected rich line");
  const line = measured.lines[0]!;
  const ink = line.inkBounds;
  if (
    top < band.top ||
    sum([top, line.height]) > band.bottom ||
    (!ink.empty &&
      (sum([top, ink.top]) < band.top || sum([top, ink.bottom]) > band.bottom || ink.left < 0 || ink.right > width))
  )
    fail("GEOMETRY", path, "Selected line violates its conservative path band or side interval");
}
