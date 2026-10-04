import type { NodeDefinition, RGB } from "@updf/core";
import { fail, type InlineLine, type LayoutOperation, snapshotData } from "@updf/core/internal";
import type { AuthorParagraph } from "./content-normalize.js";
import type { PreparedVisual } from "./inline-adapters.js";

export function backgroundCount(measured: InlineLine, author: AuthorParagraph): number {
  return measured.line.fragments.reduce(
    (count, fragment) => count + Number(fragment.advance > 0 && author.backgrounds.has(fragment.runIndex)),
    0,
  );
}

export function backgroundColor(value: unknown, path: string): RGB {
  if (!Array.isArray(value) || value.length !== 3) fail("TYPE", path, "Expected RGB triple");
  const color = snapshotData(value, path);
  for (const [index, channel] of color.entries()) {
    if (typeof channel !== "number" || !Number.isFinite(channel) || channel < 0 || channel > 1)
      fail("VALUE", `${path}/${index}`, "RGB must be finite and in [0,1]");
  }
  return color as unknown as RGB;
}

export function inlineBackgrounds(
  measured: InlineLine,
  author: AuthorParagraph,
  operation: LayoutOperation,
  visuals: ReadonlyMap<number, PreparedVisual>,
): readonly NodeDefinition[] {
  const { line } = measured;
  return line.fragments.flatMap((fragment): NodeDefinition[] => {
    const color = author.backgrounds.get(fragment.runIndex);
    if (!color || fragment.advance <= 0) return [];
    const visual = visuals.get(fragment.runIndex);
    const box = visual
      ? { above: visual.measurement.ascent, height: visual.measurement.ascent + visual.measurement.descent }
      : operation.lineBox(
          fragment.style,
          author.lineHeights.runs?.[fragment.runIndex] ?? author.lineHeights.strut,
          author.sources[fragment.runIndex] ?? author.path,
        );
    return [
      {
        type: "rect",
        x: fragment.x,
        y: line.baseline - line.top - box.above,
        width: fragment.advance,
        height: box.height,
        paint: { fill: color, stroke: null },
      },
    ];
  });
}
