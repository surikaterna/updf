import { fail, type LayoutOperation, number, validateDataObject as record } from "@updf/core/internal";
import { compile } from "./block-compiler.js";
import { normalizeBlocks } from "./content-normalize.js";
import { geometryNodes, snapshotEmissionData } from "./emission-nodes.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { BlockContent } from "./content-types.js";
import type { AdapterContentConstraints, Extensions, MeasuredContent, MeasureContext } from "./extension-types.js";
import { paintNatural, prepareNatural } from "./natural-paint.js";
import { forwardVisualReference } from "./visual-reference.js";

let actualRequests: WeakSet<object> | undefined;
let actualSizes:
  | WeakMap<
      MeasuredContent,
      {
        readonly size: MeasuredContent["size"];
        readonly lifetime: ExtensionLifetime;
        readonly path: string;
      }
    >
  | undefined;

/** Request-local opt-in: nested ordinary measurements cannot inherit actual-size authority. */
export function measureActualBlockContent(
  context: MeasureContext,
  content: BlockContent,
  constraints: AdapterContentConstraints,
): MeasuredContent {
  if (!constraints || typeof constraints !== "object") fail("TYPE", context.sourcePath, "Expected constraints");
  const request = Object.defineProperties(
    Array.isArray(constraints) ? [] : Object.create(Object.getPrototypeOf(constraints)),
    Object.getOwnPropertyDescriptors(constraints),
  ) as AdapterContentConstraints;
  actualRequests ??= new WeakSet();
  actualRequests.add(request);
  try {
    return context.measureContent(content, request);
  } finally {
    actualRequests.delete(request);
  }
}

export function contentActualSize(measured: MeasuredContent): MeasuredContent["size"] {
  const owned = actualSizes?.get(measured);
  if (!owned) fail("MEASUREMENT_CONTEXT", "/measurement", "Expected owned actual-size measurement");
  if (!owned.lifetime.active) fail("MEASUREMENT_CONTEXT", owned.path, "Layout operation has closed");
  return owned.size;
}

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
  const actual = actualRequests?.has(constraints);
  if (actual && (constraints.style !== undefined || body.length !== 1 || body[0]!.type !== "block"))
    fail("TYPE", `${path}/content`, "Actual size requires one canonical Block without a constraints style wrapper");
  const prepared = compile(values, width, `${path}/content`, {
    operation,
    lifetime,
    freshHeight: 1,
    unpaginated: true,
    ...(extensions ? { extensions } : {}),
  });
  const { height, roots } = prepareNatural(prepared, width, operation.policy, `${path}/content`);
  if (limit !== undefined && height > limit)
    fail("VERTICAL_OVERFLOW", `${path}/constraints/height`, "Content exceeds height");
  const nodes = paintNatural(roots);
  // Measurement trials do not commit generated occurrences; selected owner fragments do.
  operation.nativeInk(geometryNodes(nodes));
  const measured = snapshotEmissionData({ size: { width, height }, nodes }, `${path}/measurement`);
  if (actual) ownActualSize(measured, prepared[0]!.naturalSize.width, height, lifetime, path);
  if (actual) forwardVisualReference(prepared[0]!, measured);
  return measured;
}
function ownActualSize(
  measured: MeasuredContent,
  width: number,
  height: number,
  lifetime: ExtensionLifetime,
  path: string,
): void {
  actualSizes ??= new WeakMap();
  actualSizes.set(measured, { size: Object.freeze({ width, height }), lifetime, path });
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
    record(constraints.defaults, ["style", "whiteSpace", "breakLongWords"], `${path}/defaults`);
    for (const key of Object.keys(constraints.defaults))
      if (constraints.defaults[key] === undefined) fail("TYPE", `${path}/defaults/${key}`, "Omit undefined fields");
  }
  if ("implicitParagraph" in constraints && typeof constraints.implicitParagraph !== "boolean")
    fail("TYPE", path, "Expected implicitParagraph boolean");
  return path;
}
