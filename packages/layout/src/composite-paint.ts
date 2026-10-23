import type { NodeDefinition } from "@updf/core";
import type { FragmentChild, FragmentPaintContext, PaintCall, PlacedFragment } from "./protocol.js";
import { fragmentGeometry } from "./fragment-paint-preparation.js";
import { resolvePaint } from "./protocol-runtime.js";

/** Child-only composition declares its complete graph before any painter executes. */
export function compositeFragment(
  children: readonly FragmentChild[],
  height: number,
  nextOffset: number,
): PlacedFragment {
  const fragment: PlacedFragment = {
    geometry: fragmentGeometry([], children),
    height,
    nextOffset,
    paint: (context) => resolvePaint({ fragment, context }),
    paintSteps: paintChildren,
  };
  return fragment;
}
function* paintChildren(
  context: FragmentPaintContext,
): Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]> {
  const output: NodeDefinition[] = [];
  for (const child of context.children) {
    const nodes = yield child;
    for (const node of nodes) output.push(node);
  }
  return output;
}
