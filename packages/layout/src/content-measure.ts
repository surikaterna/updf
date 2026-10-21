import type { RenderOptions } from "@updf/core";
import { createLayoutOperation, fail, number, validateDataObject as record, snapshotData } from "@updf/core/internal";
import { compile } from "./block-compiler.js";
import { normalizeBlocks } from "./content-normalize.js";
import type { Content, ContentConstraints, ContentLine, ContentMeasurement, ContentOptions } from "./content-types.js";
import type { Extensions } from "./extension-types.js";
import { validateExtensions } from "./extensions.js";
import { paintNatural, prepareNatural } from "./natural-paint.js";
import { closeParagraphFragments } from "./paragraph-fragments.js";
import { closeMeasuredSources } from "./measured-source.js";
import { collectPreparedLines } from "./prepared-line-reports.js";

/**
 * Natural, unpaginated border-box measurement in points; no painting plan is returned.
 * Width must be positive finite; optional nonnegative finite height is a ceiling,
 * not a requested size (excess throws VERTICAL_OVERFLOW). Options select resources,
 * policy and installed extensions. Returns a deeply frozen report and closes all
 * operation-owned measurement handles, including on failure. Does not paginate.
 */
export function measure(
  content: Content,
  constraints: ContentConstraints,
  options: ContentOptions = {},
): ContentMeasurement {
  record(options, ["resources", "text", "providers", "profile", "limits", "extensions"], "/options");
  const { extensions: extensionValue, ...renderOptions } = options;
  const extensions = extensionValue as Extensions | undefined;
  const operation = createLayoutOperation(renderOptions as RenderOptions);
  validateExtensions(extensions);
  record(constraints, ["width", "height"], "/constraints");
  const width = number(constraints.width, "/constraints/width", true);
  const limit = "height" in constraints ? number(constraints.height, "/constraints/height") : undefined;
  const lifetime = { active: true };
  try {
    const body = normalizeBlocks(content, operation, "/content");
    const prepared = compile(body, width, "/content", {
      operation,
      lifetime,
      freshHeight: 1,
      unpaginated: true,
      ...(extensions ? { extensions } : {}),
    });
    const { height, roots } = prepareNatural(prepared, width, operation.policy, "/content");
    if (limit !== undefined && height > limit)
      fail("VERTICAL_OVERFLOW", "/constraints/height", "Content exceeds height");
    const lines: ContentLine[] = [];
    const nodes = paintNatural(roots, (root) => collectPreparedLines(root, lines));
    lines.sort((a, b) => a.top - b.top);
    const naturalWidth = prepared.reduce((maximum, block) => Math.max(maximum, block.naturalSize.width), 0);
    return snapshotData(
      { size: { width: naturalWidth, height }, lines, inkBounds: operation.nativeInk(nodes) },
      "/measurement",
    );
  } finally {
    lifetime.active = false;
    closeParagraphFragments(lifetime);
    closeMeasuredSources(lifetime);
    operation.close();
  }
}
