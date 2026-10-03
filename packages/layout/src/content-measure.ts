import type { RenderOptions } from "@updf/core";
import {
  createLayoutOperation,
  fail,
  number,
  validateDataObject as record,
  snapshotData,
  sum,
} from "@updf/core/internal";
import { compile } from "./block-compiler.js";
import { authorParagraph, normalizeBlocks } from "./content-normalize.js";
import { measureParagraph } from "./content-paragraph.js";
import type { Content, ContentConstraints, ContentLine, ContentMeasurement, ContentOptions } from "./content-types.js";
import type { Extensions } from "./extension-types.js";
import { validateExtensions } from "./extensions.js";
import { paintNatural } from "./natural-paint.js";
import type { PreparedBlock } from "./protocol.js";
import { sizing } from "./sizing.js";
import type { FlowBlock } from "./types.js";

/** Natural, unpaginated border-box measurement; no painting plan is returned. */
export function measure(
  content: Content,
  constraints: ContentConstraints,
  options: ContentOptions = {},
): ContentMeasurement {
  record(options, ["resources", "profile", "limits", "extensions"], "/options");
  const { extensions: extensionValue, ...renderOptions } = options;
  const extensions = extensionValue as Extensions | undefined;
  const operation = createLayoutOperation(renderOptions as RenderOptions);
  validateExtensions(extensions);
  record(constraints, ["width", "height"], "/constraints");
  const width = number(constraints.width, "/constraints/width", true);
  const limit = "height" in constraints ? number(constraints.height, "/constraints/height") : undefined;
  const sizes = new WeakMap<object, { block: PreparedBlock; width: number }>();
  const lifetime = { active: true };
  try {
    const body = normalizeBlocks(content, operation, "/content");
    const prepared = compile(body, width, "/content", {
      operation,
      lifetime,
      freshHeight: 1,
      unpaginated: true,
      ...(extensions ? { extensions } : {}),
      onPrepared: (value, block, width) => {
        sizes.set(value, { block, width });
      },
    });
    const height = sum(prepared.map((block) => block.naturalSize.height));
    if (limit !== undefined && height > limit)
      fail("VERTICAL_OVERFLOW", "/constraints/height", "Content exceeds height");
    const nodes = paintNatural(prepared, width, operation.policy, "/content");
    const lines: ContentLine[] = [];
    collectLines(body, sizes, 0, 0, lines, (value, atWidth) => {
      const author = authorParagraph(value);
      return author ? measureParagraph(author, atWidth, operation, extensions, "/content").lines : [];
    });
    const naturalWidth = prepared.reduce((maximum, block) => Math.max(maximum, block.naturalSize.width), 0);
    return snapshotData(
      { size: { width: naturalWidth, height }, lines, inkBounds: operation.nativeInk(nodes) },
      "/measurement",
    );
  } finally {
    lifetime.active = false;
    operation.close();
  }
}
function collectLines(
  body: readonly FlowBlock[],
  sizes: WeakMap<object, { block: PreparedBlock; width: number }>,
  x: number,
  y: number,
  output: ContentLine[],
  getLines: (value: object, width: number) => readonly ContentLine[],
): void {
  const tasks: (() => void)[] = [];
  const schedule = (body: readonly FlowBlock[], x: number, y: number, gap: number): void => {
    for (const value of body) {
      const size = sizes.get(value);
      if (!size) continue;
      const top = y + beforeHeight(value);
      tasks.push(() => {
        for (const line of getLines(value, size.width)) output.push(translateLine(line, x, top));
        if ("type" in value && value.type === "block") {
          const box = sizing(value.style, size.width, "/content/style");
          schedule(value.children, x + box.inset.left, top + box.inset.top, box.gap);
        }
      });
      y = sum([y, size.block.naturalSize.height, gap]);
    }
  };
  schedule(body, x, y, 0);
  while (tasks.length) tasks.pop()?.();
  output.sort((a, b) => a.top - b.top);
}
function beforeHeight(value: FlowBlock): number {
  if (value.type !== "block" || !value.decorations) return 0;
  // Measurement accepts only a complete unpaginated fragment, so first/all/last
  // reservations are all selected, just as in the decoration producer's paint path.
  return sum(value.decorations.entries.filter((entry) => entry.edge === "before").map((entry) => entry.height));
}
function translateLine(line: ContentLine, x: number, y: number): ContentLine {
  const bounds = (ink: ContentLine["inkBounds"]) =>
    ink.empty
      ? ink
      : { empty: false as const, left: ink.left + x, right: ink.right + x, top: ink.top + y, bottom: ink.bottom + y };
  return {
    ...line,
    top: line.top + y,
    baseline: line.baseline + y,
    inkBounds: bounds(line.inkBounds),
    fragments: line.fragments.map((fragment) => ({
      ...fragment,
      x: fragment.x + x,
      inkBounds: bounds(fragment.inkBounds),
    })),
  };
}
