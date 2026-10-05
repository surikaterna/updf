import type { NodeDefinition } from "@updf/core";
import { MetricSum, sum } from "@updf/core/internal";
import type { OutputBudget } from "./budget.js";
import { reserveAncestors } from "./container-reservation.js";
import type { MeasuredParagraph } from "./content-paragraph.js";
import { certifyGeneratedFragment, type GeneratedInterval, generatedIntervals } from "./generated-interval.js";
import { chargeParagraphEmission } from "./paragraph-emission.js";
import { type ParagraphFragments, paragraphFragments, selectParagraph } from "./paragraph-fragments.js";
import type { FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";

export function contentProducer(
  measured: MeasuredParagraph,
  width: number,
  keep: boolean,
  path: string,
  fragments: ParagraphFragments = paragraphFragments(),
): PreparedBlock {
  const source = fragments.operation.prepare({
    id: String(fragments.nextId++),
    path,
    descriptor: Object.freeze({ measured, keep }),
    extent: keep ? 1 : measured.lines.length,
    mode: keep ? "atomic" : "splittable",
    width: { mode: "fixed", value: width },
  });
  return {
    naturalSize: { width, height: measured.height },
    fragmentation: keep ? "atomic" : "splittable",
    extent: keep ? 1 : measured.lines.length,
    fragment(request) {
      const selected = selectParagraph(fragments, source, {
        offset: request.offset,
        width: request.width,
        usedHeight: request.usedHeight,
        height: request.freshHeight,
      });
      if (!selected || !selected.units.length) return undefined;
      return fragment(
        measured,
        keep ? { ...request, offset: 0 } : request,
        path,
        keep,
        keep ? measured.lines.length : selected.end,
      );
    },
  };
}
function fragment(
  measured: MeasuredParagraph,
  request: FragmentRequest,
  path: string,
  keep: boolean,
  end: number,
): PlacedFragment | undefined {
  const height = new MetricSum();
  const sequence = generatedIntervals();
  const intervals: GeneratedInterval[] = [];
  for (let index = request.offset; index < end; index++) {
    const line = measured.lines[index]!;
    reserveAncestors(request.reserve, request.budget, request.state, sum([height.value, line.height]));
    chargeBackground(measured, index, request.budget, path);
    if (request.budget) request.budget.apply(measured.emissionCounts(index), path);
    height.add(line.height);
    intervals.push(sequence.append(line.height, path));
  }
  if (end === request.offset) return undefined;
  return certifyGeneratedFragment<PlacedFragment>(
    {
      nextOffset: keep ? 1 : end,
      height: height.value,
      lines: { start: request.offset, end },
      paint(context) {
        const nodes: NodeDefinition[] = [],
          backgrounds: NodeDefinition[] = [];
        // All line backgrounds precede all glyphs/visuals, including tight overlapping lines.
        const offset = new MetricSum();
        for (let index = request.offset; index < end; index++) {
          const line = measured.lines[index];
          if (!line) continue;
          const y = context.start(offset.value, line.height, intervals[index - request.offset]);
          chargeBackground(measured, index, context.budget, path);
          for (const node of measured.paintLine(index, context.x, y, true)) backgrounds.push(node);
          const output = measured.paintLine(index, context.x, y);
          chargeParagraphEmission(output, measured.emissionCounts(index), context.budget, path);
          for (const node of output) nodes.push(node);
          offset.add(line.height);
        }
        return [...backgrounds, ...nodes];
      },
    },
    intervals,
  );
}
function chargeBackground(
  measured: MeasuredParagraph,
  index: number,
  budget: OutputBudget | undefined,
  path: string,
): void {
  const count = measured.backgroundCount(index);
  if (count) budget?.generated(count + 1, 0, count * 5, count, path);
}
