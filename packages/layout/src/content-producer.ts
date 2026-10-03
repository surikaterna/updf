import { exceeds, MetricSum, sum } from "@updf/core/internal";
import { reserveAncestors } from "./container-reservation.js";
import type { MeasuredParagraph } from "./content-paragraph.js";
import type { FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";

export function contentProducer(
  measured: MeasuredParagraph,
  width: number,
  keep: boolean,
  path: string,
): PreparedBlock {
  return {
    naturalSize: { width, height: measured.height },
    fragmentation: keep ? "atomic" : "splittable",
    extent: keep ? 1 : measured.lines.length,
    fragment(request) {
      if (keep && exceeds(sum([request.usedHeight, measured.height]), request.freshHeight)) return undefined;
      const result = fragment(measured, keep ? { ...request, offset: 0 } : request, path);
      return keep && result ? { ...result, nextOffset: 1 } : result;
    },
  };
}
function fragment(measured: MeasuredParagraph, request: FragmentRequest, path: string): PlacedFragment | undefined {
  const height = new MetricSum();
  let end = request.offset;
  while (end < measured.lines.length) {
    const line = measured.lines[end];
    if (!line || exceeds(sum([request.usedHeight, height.value, line.height]), request.freshHeight)) break;
    reserveAncestors(request.reserve, request.budget, request.state, sum([height.value, line.height]));
    request.budget?.charge(measured.paintLine(end, 0, 0), path);
    height.add(line.height);
    end++;
  }
  if (end === request.offset) return undefined;
  return {
    nextOffset: end,
    height: height.value,
    lines: { start: request.offset, end },
    paint(context) {
      const nodes = [],
        offset = new MetricSum();
      for (let index = request.offset; index < end; index++) {
        const line = measured.lines[index];
        if (!line) continue;
        const output = measured.paintLine(index, context.x, context.start(offset.value, line.height));
        context.budget.charge(output, path);
        for (const node of output) nodes.push(node);
        offset.add(line.height);
      }
      return nodes;
    },
  };
}
