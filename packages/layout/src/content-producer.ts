import type { NodeDefinition } from "@updf/core";
import { fail, MetricSum, sum } from "@updf/core/internal";
import type { OutputBudget } from "./budget.js";
import { reserveAncestors } from "./container-reservation.js";
import type { MeasuredParagraph } from "./content-paragraph.js";
import { certifyGeneratedFragment, type GeneratedInterval, generatedIntervals } from "./generated-interval.js";
import { emptyGeometry, fragmentGeometry } from "./fragment-paint-preparation.js";
import { chargeParagraphEmission } from "./paragraph-emission.js";
import { type ParagraphFragments, selectParagraph } from "./paragraph-fragments.js";
import type { FragmentPaintContext, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import { unitSelectionRequest } from "./selection-request.js";

export function contentProducer(
  measured: MeasuredParagraph,
  width: number,
  keep: boolean,
  path: string,
  fragments: ParagraphFragments,
): PreparedBlock {
  const source = fragments.operation.prepare({
    id: String(fragments.nextId++),
    path,
    descriptor: Object.freeze({ measured, keep }),
    extent: keep ? 1 : Math.max(1, measured.lines.length),
    mode: keep ? "atomic" : "splittable",
    width: { mode: "fixed", value: width },
  });
  return {
    naturalSize: { width, height: measured.height },
    fragmentation: keep ? "atomic" : "splittable",
    extent: keep ? 1 : Math.max(1, measured.lines.length),
    fragment(request) {
      const selected = selectParagraph(fragments, source, unitSelectionRequest(request));
      if (!selected || !selected.units.length) return undefined;
      if (!measured.lines.length) return { geometry: emptyGeometry, nextOffset: 1, height: 0, paint: () => [] };
      return paragraphFragment(
        measured,
        keep ? { ...request, offset: 0 } : request,
        path,
        keep,
        keep ? measured.lines.length : selected.end,
      );
    },
  };
}
export function paragraphFragment(
  measured: MeasuredParagraph,
  request: FragmentRequest,
  path: string,
  keep: boolean,
  end: number,
): PlacedFragment | undefined {
  const height = new MetricSum();
  const sequence = generatedIntervals();
  const intervals: (GeneratedInterval | undefined)[] = [];
  const parts = [];
  for (let index = request.offset; index < end; index++) {
    if (measured.lineOffsets) appendGap(measured.lineOffsets[index]!, height, sequence, path);
    const line = measured.lines[index]!;
    reserveAncestors(request.reserve, request.budget, request.state, sum([height.value, line.height]));
    chargeBackground(measured, index, request.budget, path);
    if (request.budget) request.budget.apply(measured.emissionCounts(index), path);
    const certificate = line.height > 0 ? sequence.append(line.height, path) : undefined;
    parts.push({
      line,
      offset: height.value,
      height: line.height,
      ...(certificate ? { certificate } : {}),
      reservation: "slot" as const,
    });
    height.add(line.height);
    intervals.push(certificate);
  }
  if (end === request.offset) return undefined;
  return certifyGeneratedFragment<PlacedFragment>(
    {
      geometry: fragmentGeometry(parts, [], undefined, "positioned-box"),
      nextOffset: keep ? 1 : end,
      height: height.value,
      lines: { start: request.offset, end },
      paint: (context) => paintLines(measured, request.offset, end, context, path),
    },
    intervals.filter((interval): interval is GeneratedInterval => interval !== undefined),
  );
}
function appendGap(top: number, height: MetricSum, sequence: ReturnType<typeof generatedIntervals>, path: string) {
  if (top < height.value || !Number.isFinite(top)) fail("GEOMETRY", path, "Invalid positioned line offset");
  const gap = top - height.value;
  if (gap > 0) {
    sequence.append(gap, path);
    height.add(gap);
  }
  if (height.value !== top) fail("GEOMETRY", path, "Positioned line offset loses its exact certificate");
}
function paintLines(
  measured: MeasuredParagraph,
  start: number,
  end: number,
  context: FragmentPaintContext,
  path: string,
): readonly NodeDefinition[] {
  const nodes: NodeDefinition[] = [],
    backgrounds: NodeDefinition[] = [];
  // All line backgrounds precede all glyphs/visuals, including tight overlapping lines.
  for (let index = start; index < end; index++) {
    const line = measured.lines[index];
    if (!line) continue;
    const y = context.partPositions[index - start]!;
    chargeBackground(measured, index, context.budget, path);
    for (const node of measured.paintLine(index, context.x, y, true)) backgrounds.push(node);
    const output = measured.paintLine(index, context.x, y);
    chargeParagraphEmission(output, measured.emissionCounts(index), context.budget, path);
    for (const node of output) nodes.push(node);
  }
  return [...backgrounds, ...nodes];
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
