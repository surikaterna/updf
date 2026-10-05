import { exceeds, fail, MetricSum, sum } from "@updf/core/internal";
import type { TextMeasurement } from "@updf/text";
import { reserveAncestors } from "./container-reservation.js";
import { paragraphLine } from "./fragments.js";
import type { FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import type { ParagraphBlock } from "./types.js";

function fragment(
  block: ParagraphBlock,
  measurement: TextMeasurement,
  request: FragmentRequest,
  path: string,
): PlacedFragment | undefined {
  const height = new MetricSum();
  let end = request.offset;
  while (end < measurement.lines.length) {
    const line = measurement.lines[end];
    if (!line) fail("TYPE", path, "Missing measured line");
    if (exceeds(sum([request.usedHeight, height.value, line.height]), request.freshHeight)) break;
    reserveAncestors(request.reserve, request.budget, request.state, sum([height.value, line.height]));
    request.budget?.line(line, path);
    height.add(line.height);
    end++;
  }
  if (end === request.offset) return undefined;
  return {
    nextOffset: end,
    height: height.value,
    lines: { start: request.offset, end },
    paint(context) {
      const nodes = [];
      const offset = new MetricSum();
      for (let i = request.offset; i < end; i++) {
        const line = measurement.lines[i];
        if (!line) fail("TYPE", path, "Missing measured line");
        context.budget.line(line, path);
        nodes.push(
          paragraphLine(block.paragraph, line, context.x, context.start(offset.value, line.height), request.width),
        );
        offset.add(line.height);
      }
      return nodes;
    },
  };
}

export function paragraphProducer(
  block: ParagraphBlock,
  measurement: TextMeasurement,
  width: number,
  path: string,
): PreparedBlock {
  if (block.keepTogether) {
    return {
      fragmentation: "atomic",
      naturalSize: { width, height: measurement.consumedHeight },
      extent: 1,
      fragment(request) {
        if (exceeds(sum([request.usedHeight, measurement.consumedHeight]), request.freshHeight)) return undefined;
        const placed = fragment(block, measurement, { ...request, offset: 0 }, path);
        return placed ? { ...placed, nextOffset: 1 } : { nextOffset: 1, height: 0, paint: () => [] };
      },
    };
  }
  return {
    fragmentation: "splittable",
    naturalSize: { width, height: measurement.consumedHeight },
    extent: Math.max(1, measurement.lines.length),
    fragment: (request) =>
      measurement.lines.length
        ? fragment(block, measurement, request, path)
        : { nextOffset: 1, height: 0, paint: () => [] },
  };
}
