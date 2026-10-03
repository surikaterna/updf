import {
  array,
  exceeds,
  fail,
  type LayoutOperation,
  number,
  validateDataObject as record,
  snapshotData,
  sum,
} from "@updf/core/internal";
import type { TextMeasurementInput } from "@updf/core/measurement";
import { ancestors, withAdapter } from "./adapter-ancestors.js";
import { type AdapterOrigin, adapterCall } from "./adapter-call.js";
import { measureAdapterContent } from "./adapter-content.js";
import { reserveContentDecorations } from "./adapter-decorations.js";
import { adapterSnapshot, readParts, scopedAdapter } from "./author-parts.js";
import { reserveAncestors } from "./container-reservation.js";
import { preflight, preflightSource } from "./data.js";
import { decorate } from "./decorated-producer.js";
import { isDecorationPlan } from "./decorations.js";
import { geometryNodes, instantiateEmissionNodes, snapshotEmissionData } from "./emission-nodes.js";
import type { BlockFragmentRequest, Extensions, MeasureContext, MeasuredBlock } from "./extension-types.js";
import { resolveExtension } from "./extensions.js";
import type { ExtensionMeasurement, LeafCache } from "./leaf-cache.js";
import type { FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";

export interface ExtensionLifetime {
  active: boolean;
}

function progress(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= min || value > max)
    fail("TYPE", path, "Expected safe integer progress within measured extent");
  return value;
}
function context(
  width: number,
  operation: LayoutOperation,
  lifetime: ExtensionLifetime,
  origin: AdapterOrigin,
  extensions?: Extensions,
): MeasureContext {
  return Object.freeze<MeasureContext>({
    width,
    get sourcePath() {
      return origin.path;
    },
    ancestors: ancestors(operation),
    reserveDecorations: (entries) => {
      if (!lifetime.active) fail("MEASUREMENT_CONTEXT", origin.path, "Layout operation has closed");
      return reserveContentDecorations(entries, operation, origin.path);
    },
    readParts: (content, allowed) => {
      if (!lifetime.active) fail("MEASUREMENT_CONTEXT", origin.path, "Layout operation has closed");
      return readParts(content, allowed, operation, origin.path);
    },
    measureContent: (content, constraints) =>
      measureAdapterContent(content, constraints, width, operation, lifetime, origin.path, extensions),
    measureText(input: TextMeasurementInput) {
      if (!lifetime.active) fail("MEASUREMENT_CONTEXT", origin.path, "Layout operation has closed");
      return operation.measureText(input, origin.path);
    },
  });
}

export function extensionProducer(
  value: Record<string, unknown>,
  width: number,
  path: string,
  operation: LayoutOperation,
  extensions: Extensions | undefined,
  lifetime: ExtensionLifetime,
  cache?: LeafCache,
): PreparedBlock {
  const definition = resolveExtension(value, extensions, path);
  const key = JSON.stringify([width, ancestors(operation)]);
  const previous = cache?.extensions.get(value)?.get(key);
  if (previous)
    return checkedMeasured(previous.measured, width, path, operation, previous.origin, extensions, lifetime);
  const origin = { path };
  const validated = adapterCall("validate", path, () => definition.validate(value.props), origin);
  preflightSource(validated, operation, `${path}/props`);
  const props = adapterSnapshot(validated, `${path}/props`);
  const measured = adapterCall(
    "measure",
    path,
    () =>
      scopedAdapter(value, () => {
        const measurement = context(width, operation, lifetime, origin, extensions);
        return withAdapter(operation, definition.name, () => definition.measure(props, measurement));
      }),
    origin,
  );
  const prepared = checkedMeasured(measured, width, path, operation, origin, extensions, lifetime);
  const semantic: ExtensionMeasurement = {
    origin,
    measured: Object.freeze({ ...measured, naturalSize: Object.freeze({ ...measured.naturalSize }) }),
  };
  const widths = cache?.extensions.get(value) ?? new Map<string, ExtensionMeasurement>();
  widths.set(key, semantic);
  cache?.extensions.set(value, widths);
  return prepared;
}
function checkedMeasured(
  measured: MeasuredBlock,
  width: number,
  path: string,
  operation: LayoutOperation,
  origin: AdapterOrigin,
  extensions?: Extensions,
  lifetime?: ExtensionLifetime,
): PreparedBlock {
  record(
    measured,
    ["fragmentation", "naturalSize", "extent", "fragment", "decorations", "sourcePaths", "sourceKeys", "sourceExtent"],
    path,
  );
  record(measured.naturalSize, ["width", "height"], `${path}/naturalSize`);
  const naturalSize = Object.freeze({
    width: number(measured.naturalSize.width, path, true),
    height: number(measured.naturalSize.height, path),
  });
  if (naturalSize.width > width) fail("GEOMETRY", path, "Measured border box width exceeds its measurement region");
  const extent = progress(measured.extent, 0, Number.MAX_SAFE_INTEGER, `${path}/extent`);
  const source = checkedSource(measured, extent, operation, path);
  const fragmentation = measured.fragmentation;
  if (fragmentation !== "atomic" && fragmentation !== "splittable") fail("TYPE", path, "Expected fragmentation mode");
  if (fragmentation === "atomic" && extent !== 1) fail("TYPE", path, "Atomic extent must be one");
  const callback = measured.fragment;
  const decorations = measured.decorations;
  if ("decorations" in measured && !isDecorationPlan(decorations))
    fail("TYPE", path, "Expected owned decoration capability");
  if (typeof callback !== "function") fail("TYPE", path, "Expected synchronous fragment callback");
  return decorate(
    {
      naturalSize,
      extent,
      ...source,
      fragmentation,
      fragment: (request) => checkedFragment(callback, request, extent, width, path, operation, origin, decorations),
    },
    decorations,
    operation,
    path,
    extensions,
    lifetime,
    { from: origin.path, to: path },
  );
}
function checkedSource(measured: MeasuredBlock, extent: number, operation: LayoutOperation, path: string) {
  for (const key of ["sourceExtent", "sourcePaths", "sourceKeys"] as const)
    if (key in measured && measured[key] === undefined) fail("TYPE", path, "Omit undefined source metadata");
  const sourceExtent = "sourceExtent" in measured ? measured.sourceExtent : extent;
  if (sourceExtent !== 0 && sourceExtent !== extent)
    fail("TYPE", path, "Source extent must be zero or match logical extent");
  const sourcePaths = checkedSources(measured.sourcePaths, extent, operation, path);
  const sourceKeys = checkedKeys(measured.sourceKeys, sourceExtent, operation, path);
  return { sourceExtent, ...(sourcePaths ? { sourcePaths } : {}), ...(sourceKeys ? { sourceKeys } : {}) };
}
function checkedSources(
  value: readonly string[] | undefined,
  extent: number,
  operation: LayoutOperation,
  path: string,
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  array(value, operation.policy.nodes, `${path}/sourcePaths`);
  if (value.length !== extent) fail("TYPE", path, "Source paths must match extent");
  for (const suffix of value)
    if (typeof suffix !== "string" || !suffix.startsWith("/")) fail("TYPE", path, "Expected relative source suffix");
  return snapshotData(value, path);
}
function checkedKeys(
  value: readonly (string | number | null)[] | undefined,
  extent: number,
  operation: LayoutOperation,
  path: string,
) {
  if (value === undefined) return undefined;
  array(value, operation.policy.nodes, `${path}/sourceKeys`);
  if (value.length !== extent) fail("TYPE", path, "Source keys must match extent");
  for (const key of value)
    if (key !== null && typeof key !== "string" && (typeof key !== "number" || !Number.isFinite(key)))
      fail("TYPE", path, "Expected finite source keys");
  return snapshotData(value, path);
}
function checkedFragment(
  callback: MeasuredBlock["fragment"],
  request: FragmentRequest,
  extent: number,
  width: number,
  path: string,
  operation: LayoutOperation,
  origin: AdapterOrigin,
  decorations?: MeasuredBlock["decorations"],
): PlacedFragment | undefined {
  const { offset, availableHeight, freshHeight, atFreshRegion } = request;
  const input: BlockFragmentRequest = Object.freeze({ offset, availableHeight, freshHeight, atFreshRegion, width });
  const output = adapterCall("fragment", path, () => callback(input), origin);
  record(output, ["status", "nextOffset", "height", "nodes", "decorations"], path);
  if (output.status === "defer") {
    record(output, ["status"], path);
    return undefined;
  }
  if (output.status !== "placed") fail("TYPE", path, "Expected defer or placed fragment");
  if ("decorations" in output && (!decorations || output.decorations !== decorations))
    fail("TYPE", path, "Fragment decorations must match the measured owned reservation plan");
  const nextOffset = progress(output.nextOffset, offset, extent, path);
  const height = number(output.height, path);
  if (exceeds(sum([request.usedHeight, height]), freshHeight))
    fail("GEOMETRY", path, "Fragment exceeds available height");
  reserveAncestors(request.reserve, request.budget, request.state, height);
  if (!Array.isArray(output.nodes)) fail("TYPE", path, "Expected native output array");
  if (output.nodes.length) request.budget?.charge([{ type: "paintGroup", children: output.nodes }], path);
  array(output.nodes, operation.policy.nodes, `${path}/nodes`);
  preflight(output.nodes, operation.policy);
  if (output.nodes.length) operation.validateFixed(geometryNodes(output.nodes), width, height, path);
  const nodes = snapshotEmissionData(output.nodes, path);
  return {
    nextOffset,
    height,
    paint(paintContext) {
      if (!nodes.length) return [];
      paintContext.budget.charge([{ type: "paintGroup", children: nodes }], path);
      return [
        {
          type: "paintGroup",
          transform: [1, 0, 0, 1, paintContext.x, paintContext.y],
          children: instantiateEmissionNodes(nodes, { from: origin.path, to: path }),
        },
      ];
    },
  };
}
