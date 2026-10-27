import { MetricSum } from "@updf/core/internal";
import type { SelectedRange } from "@updf/layout-boxes/fragmentation";
import {
  compositeFragment,
  frameFits,
  paragraphFragment,
  paragraphSequence,
  type FragmentChild,
  type FragmentRequest,
} from "@updf/layout/internal-participation";
import type { SiblingSource, SiblingSources } from "./sibling-source.js";

type Selected = NonNullable<ReturnType<SiblingSource["bridge"]["select"]>>;
export function selectSiblings(sources: SiblingSources, request: FragmentRequest) {
  const children: FragmentChild[] = [];
  const height = new MetricSum();
  let end = request.offset;
  for (const source of sources.paragraphs) {
    if (source.start + source.extent <= end) continue;
    const offset = Math.max(0, end - source.start);
    const selected = sources.kernel.select(
      source.token,
      request.mode === "complete"
        ? { mode: "complete", offset, width: request.width }
        : { offset, width: request.width, height: request.availableHeight, usedHeight: height.value },
    );
    if (!selected?.units.length) break;
    appendLines(children, selected, source, request, height);
    end = source.start + selected.end;
    if (selected.end < source.extent) break;
  }
  const resolvedHeight = height.value;
  if (end === request.offset || !frameFits({ ...request, offset: 0 }, resolvedHeight)) return undefined;
  return compositeFragment(children, resolvedHeight, end);
}
function appendLines(
  children: FragmentChild[],
  selected: SelectedRange<Selected>,
  source: SiblingSource,
  request: FragmentRequest,
  height: MetricSum,
) {
  const measured = paragraphSequence(selected.units.map((unit) => unit.content.measured));
  const fragment = paragraphFragment(
    measured,
    { ...request, offset: 0 },
    source.author.path,
    false,
    measured.lines.length,
  )!;
  children.push({ fragment, x: 0, y: height.value, frame: "relative" });
  height.add(selected.height);
}
