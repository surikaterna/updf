import { fail, type LayoutOperation, number, validateDataObject as record, sum } from "@updf/core/internal";
import { compile } from "./block-compiler.js";
import { normalizeBlocks } from "./content-normalize.js";
import { geometryNodes, snapshotEmissionData } from "./emission-nodes.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { AdapterContentConstraints, Extensions, MeasuredContent } from "./extension-types.js";
import { paintNatural } from "./natural-paint.js";

export function measureAdapterContent(
  content: unknown,
  constraints: AdapterContentConstraints,
  widthLimit: number,
  operation: LayoutOperation,
  lifetime: ExtensionLifetime,
  path: string,
  extensions?: Extensions,
): MeasuredContent {
  if (!lifetime.active) fail("MEASUREMENT_CONTEXT", path, "Layout operation has closed");
  path = checkConstraints(constraints, path);
  const width = number(constraints.width, `${path}/constraints/width`, true);
  if (width > widthLimit) fail("GEOMETRY", `${path}/constraints/width`, "Content exceeds adapter measurement width");
  const limit = "height" in constraints ? number(constraints.height, `${path}/constraints/height`) : undefined;
  const body = normalizeBlocks(
    content,
    operation,
    `${path}/content`,
    constraints.defaults,
    constraints.implicitParagraph,
  );
  const values = constraints.style === undefined ? body : [{ type: "block", children: body, style: constraints.style }];
  const prepared = compile(values, width, `${path}/content`, {
    operation,
    lifetime,
    freshHeight: 1,
    unpaginated: true,
    ...(extensions ? { extensions } : {}),
  });
  const height = sum(prepared.map((block) => block.naturalSize.height));
  if (limit !== undefined && height > limit)
    fail("VERTICAL_OVERFLOW", `${path}/constraints/height`, "Content exceeds height");
  const nodes = paintNatural(prepared, width, operation.policy, `${path}/content`);
  // Measurement trials do not commit generated occurrences; selected owner fragments do.
  operation.nativeInk(geometryNodes(nodes));
  return snapshotEmissionData({ size: { width, height }, nodes }, `${path}/measurement`);
}
function checkConstraints(constraints: AdapterContentConstraints, path: string): string {
  record(
    constraints,
    ["width", "height", "defaults", "implicitParagraph", "sourcePath", "style"],
    `${path}/constraints`,
  );
  if ("style" in constraints && constraints.style === undefined) fail("TYPE", path, "Omit undefined style");
  if ("sourcePath" in constraints) {
    if (typeof constraints.sourcePath !== "string" || !constraints.sourcePath.startsWith("/"))
      fail("TYPE", path, "Expected relative diagnostic suffix");
    path += constraints.sourcePath;
  }
  if ("defaults" in constraints) {
    record(
      constraints.defaults,
      ["defaultStyle", "lineHeight", "align", "whiteSpace", "breakLongWords"],
      `${path}/defaults`,
    );
    if ("defaultStyle" in constraints.defaults)
      record(constraints.defaults.defaultStyle, ["font", "fontSize", "color"], `${path}/defaults/defaultStyle`);
  }
  if ("implicitParagraph" in constraints && typeof constraints.implicitParagraph !== "boolean")
    fail("TYPE", path, "Expected implicitParagraph boolean");
  return path;
}
