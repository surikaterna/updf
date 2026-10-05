import { resolveWidths, type WidthTrack } from "@updf/layout-kernel";
import { bits, dyadic } from "@updf/layout-kernel/numeric";

export function intervals(width: number, tracks: readonly WidthTrack[], gap = 1) {
  if (!Number.isInteger(gap) || gap < 0) throw new Error("Integer nonnegative cell gutter required");
  const resolved = resolveWidths({ availableWidth: width, tracks, gap, maxTracks: 64 });
  const cell = dyadic(bits(1));
  const gutter = dyadic(bits(resolved.gap));
  let edge = 0n;
  // Floor exact sums of canonical binary64 widths, not rounded native additions.
  const boxes = resolved.widths.map((size) => {
    const start = Number(edge / cell);
    edge += dyadic(bits(size));
    const end = Number(edge / cell);
    edge += gutter;
    return Object.freeze({ start, end, width: end - start });
  });
  return Object.freeze({ boxes: Object.freeze(boxes), unused: width - (boxes.at(-1)?.end ?? 0), resolved });
}
