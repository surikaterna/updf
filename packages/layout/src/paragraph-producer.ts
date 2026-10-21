import { fail, MetricSum, sum } from "@updf/core/internal";
import type { TextMeasurement } from "@updf/text";
import { reserveAncestors } from "./container-reservation.js";
import { paragraphLine } from "./fragments.js";
import { emptyGeometry, fragmentGeometry } from "./fragment-paint-preparation.js";
import { type ParagraphFragments, selectParagraph } from "./paragraph-fragments.js";
import type { FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import type { ParagraphBlock } from "./types.js";
import { unitSelectionRequest } from "./selection-request.js";

function fragment(
  block: ParagraphBlock,
  measurement: TextMeasurement,
  request: FragmentRequest,
  path: string,
  end: number,
  nextOffset: number,
): PlacedFragment | undefined {
  const height = new MetricSum();
  const parts = [];
  for (let index = request.offset; index < end; index++) {
    const line = measurement.lines[index];
    if (!line) fail("TYPE", path, "Missing measured line");
    reserveAncestors(request.reserve, request.budget, request.state, sum([height.value, line.height]));
    request.budget?.line(line, path);
    parts.push({
      offset: height.value,
      height: line.height,
      reservation: "slot" as const,
      association: "positioned-box" as const,
    });
    height.add(line.height);
  }
  if (end === request.offset) return undefined;
  return {
    geometry: fragmentGeometry(parts, [], undefined, "positioned-box"),
    nextOffset,
    height: height.value,
    lines: { start: request.offset, end },
    paint(context) {
      const nodes = [];
      for (let i = request.offset; i < end; i++) {
        const line = measurement.lines[i];
        if (!line) fail("TYPE", path, "Missing measured line");
        context.budget.line(line, path);
        nodes.push(
          paragraphLine(block.paragraph, line, context.x, context.partPositions[i - request.offset]!, request.width),
        );
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
  fragments: ParagraphFragments,
): PreparedBlock {
  const keep = block.keepTogether === true;
  const extent = keep ? 1 : Math.max(1, measurement.lines.length);
  const source = fragments.operation.prepare({
    id: String(fragments.nextId++),
    path,
    descriptor: Object.freeze({ measured: { lines: measurement.lines, height: measurement.consumedHeight }, keep }),
    extent,
    mode: keep ? "atomic" : "splittable",
    width: { mode: "fixed", value: width },
  });
  return {
    fragmentation: keep ? "atomic" : "splittable",
    naturalSize: { width, height: measurement.consumedHeight },
    extent,
    fragment(request) {
      const selected = selectParagraph(fragments, source, unitSelectionRequest(request));
      if (!selected?.units.length) return undefined;
      if (!measurement.lines.length) return { geometry: emptyGeometry, nextOffset: 1, height: 0, paint: () => [] };
      return fragment(
        block,
        measurement,
        keep ? { ...request, offset: 0 } : request,
        path,
        keep ? measurement.lines.length : selected.end,
        selected.end,
      );
    },
  };
}
