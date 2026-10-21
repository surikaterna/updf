import type { Matrix } from "@updf/core";
import { multiply, point } from "@updf/core/internal";
import type { ContentLine } from "./content-types.js";
import type { PreparedFragmentPaint } from "./protocol.js";

function translatedLine(line: ContentLine, transform: Matrix): ContentLine {
  const bounds = (ink: ContentLine["inkBounds"]): ContentLine["inkBounds"] => {
    if (ink.empty) return ink;
    const [left, top] = point(transform, ink.left, ink.top - line.top);
    const [right, bottom] = point(transform, ink.right, ink.bottom - line.top);
    return { empty: false, left, top, right, bottom };
  };
  return {
    ...line,
    top: point(transform, 0, 0)[1],
    baseline: point(transform, 0, line.baseline - line.top)[1],
    inkBounds: bounds(line.inkBounds),
    fragments: line.fragments.map((fragment) => ({
      ...fragment,
      x: point(transform, fragment.x, 0)[0],
      inkBounds: bounds(fragment.inkBounds),
    })),
  };
}

/** Consume selected geometry, not a second reconstruction of container layout. */
export function collectPreparedLines(root: PreparedFragmentPaint, output: ContentLine[]): void {
  const pending = [root];
  while (pending.length) {
    const { fragment, context } = pending.pop()!;
    for (const [index, part] of fragment.geometry.parts.entries()) {
      if (!part.line) continue;
      const transform = multiply(context.incomingMatrix, [1, 0, 0, 1, context.x, context.partPositions[index]!]);
      output.push(translatedLine(part.line, transform));
    }
    for (let index = context.children.length - 1; index >= 0; index--) pending.push(context.children[index]!);
  }
}
