import {
  array,
  fail,
  finite,
  type LayoutOperation,
  number,
  ownContentData,
  type RunMetrics,
  validateDataObject as record,
  snapshotData,
  sum,
} from "@updf/core/internal";
import type { TextStyle } from "@updf/text";
import { adapterCall } from "./adapter-call.js";
import { registerAdapter } from "./adapter-ownership.js";
import { type BudgetTotals, OutputBudget } from "./budget.js";
import type {
  InlineAdapter,
  InlineAdapterDefinition,
  InlineMeasurement,
  InlineVisual,
  NativeInlineInput,
} from "./content-types.js";
import { isEmissionNode } from "./emission-nodes.js";
import { isSharedEdgeNode } from "./shared-edge-emission.js";
import type { Extensions } from "./extension-types.js";
import { requireInstalled } from "./extensions.js";

const definitions = new WeakMap<object, InlineAdapterDefinition<unknown>>();
type VisualSource =
  | { readonly kind: "adapter"; readonly adapter: object }
  | { readonly kind: "native"; readonly input: Readonly<Required<NativeInlineInput>> };
const descriptors = new WeakMap<object, VisualSource>();
const caches = new WeakMap<LayoutOperation, WeakMap<object, Map<string, PreparedVisual>>>();
const captures = new WeakMap<LayoutOperation, OutputBudget>();
/** Define a frozen inline identity with trusted synchronous callbacks; install it in the local Extensions set. */
export function defineInlineAdapter<P>(definition: InlineAdapterDefinition<P>): InlineAdapter<P> {
  record(definition, ["name", "validate", "measure"], "/adapter");
  if (typeof definition.name !== "string" || !/^[A-Za-z][A-Za-z0-9.-]*$/u.test(definition.name))
    fail("TYPE", "/adapter/name", "Expected a nonempty adapter identifier");
  if (typeof definition.validate !== "function" || typeof definition.measure !== "function")
    fail("TYPE", "/adapter", "Expected synchronous adapter callbacks");
  const adapter = Object.freeze({ name: definition.name }) as InlineAdapter<P>;
  definitions.set(adapter, Object.freeze({ ...definition }) as InlineAdapterDefinition<unknown>);
  registerAdapter(adapter, definition.name);
  return adapter;
}
/** Snapshot plain props into a frozen inline descriptor; foreign adapters throw TYPE, uninstalled ones later throw KEY. */
export function inline<P>(adapter: InlineAdapter<P>, props: P): InlineVisual {
  if (!definitions.has(adapter)) fail("TYPE", "/adapter", "Expected an owned inline adapter");
  const descriptor = ownContentData(
    Object.freeze({ type: "inlineVisual" as const, props: snapshotData(props, "/props") }),
  );
  descriptors.set(descriptor, { kind: "adapter", adapter });
  return descriptor;
}
/** Snapshot an owned native visual without an adapter or local extension installation. */
export function nativeInline(input: NativeInlineInput): InlineVisual {
  record(input, ["advance", "ascent", "descent", "nodes"], "/nativeInline");
  const advance = number(input.advance, "/nativeInline/advance", true);
  const ascent = number(input.ascent, "/nativeInline/ascent");
  const descent = "descent" in input ? number(input.descent, "/nativeInline/descent") : 0;
  number(sum([ascent, descent]), "/nativeInline/height", true);
  array(input.nodes, Number.MAX_SAFE_INTEGER, "/nativeInline/nodes");
  const props = snapshotData({ advance, ascent, descent, nodes: input.nodes }, "/nativeInline", (node) => {
    // Inline painting has no deferred block-recipe occurrence lifecycle.
    if (isEmissionNode(node) || isSharedEdgeNode(node))
      fail("TYPE", "/nativeInline/nodes", "Native inline nodes cannot contain deferred block emissions");
    return false;
  });
  const descriptor = ownContentData(Object.freeze({ type: "inlineVisual" as const, props }));
  descriptors.set(descriptor, { kind: "native", input: props });
  return descriptor;
}
export interface PreparedVisual {
  readonly measurement: InlineMeasurement;
  readonly metrics: RunMetrics;
  readonly path: string;
  readonly emissionCounts: BudgetTotals;
}
export function prepareVisual(
  descriptor: object,
  width: number,
  style: TextStyle,
  operation: LayoutOperation,
  extensions: Extensions | undefined,
  path: string,
): PreparedVisual {
  const source = descriptors.get(descriptor);
  if (!source) fail("TYPE", path, "Expected an owned inline descriptor");
  if (source.kind === "adapter") requireInstalled(source.adapter, extensions, path);
  const cache = caches.get(operation) ?? new WeakMap<object, Map<string, PreparedVisual>>();
  caches.set(operation, cache);
  const values = cache.get(descriptor) ?? new Map<string, PreparedVisual>();
  cache.set(descriptor, values);
  const key = JSON.stringify([width, style]);
  const previous = values.get(key);
  if (previous) return { ...previous, path };
  const visual = measureVisual(source, descriptor, width, style, operation, path);
  values.set(key, visual);
  return visual;
}
function adapterMeasurement(
  adapter: object,
  descriptor: object,
  width: number,
  style: TextStyle,
  operation: LayoutOperation,
  path: string,
): InlineMeasurement {
  const definition = definitions.get(adapter);
  if (!definition) fail("TYPE", path, "Expected an inline adapter");
  const origin = { path };
  const props = adapterCall("validate", path, () => definition.validate((descriptor as InlineVisual).props), origin);
  const owned = snapshotData(props, `${path}/props`);
  const context = Object.freeze({
    width,
    style,
    measureNative: (nodes: InlineMeasurement["nodes"], size: { readonly width: number; readonly height: number }) => {
      new OutputBudget(operation.policy).charge(nodes, path);
      operation.validateFixed(nodes, size.width, size.height, path);
      return operation.nativeInk(nodes);
    },
  });
  return adapterCall("measure", path, () => definition.measure(owned, context), origin);
}
function measureVisual(
  source: VisualSource,
  descriptor: object,
  width: number,
  style: TextStyle,
  operation: LayoutOperation,
  path: string,
): PreparedVisual {
  const value =
    source.kind === "native"
      ? source.input
      : adapterMeasurement(source.adapter, descriptor, width, style, operation, path);
  const capture = captures.get(operation) ?? new OutputBudget(operation.policy);
  captures.set(operation, capture);
  const trial = capture.fork();
  validateVisual(value, operation, trial, path, source.kind === "adapter");
  const actual = operation.nativeInk(value.nodes);
  const inkBounds = actual.empty
    ? actual
    : { ...actual, top: actual.top - value.ascent, bottom: actual.bottom - value.ascent };
  if ("inkBounds" in value) checkInk(value, inkBounds, path);
  const measurement = snapshotData({ ...value, inkBounds }, path);
  const bounds = measurement.inkBounds;
  const metrics: RunMetrics = {
    advance: measurement.advance,
    ascent: measurement.ascent,
    descent: measurement.descent,
    left: bounds.empty ? 0 : bounds.left,
    right: bounds.empty ? 0 : bounds.right,
    top: bounds.empty ? 0 : bounds.top,
    bottom: bounds.empty ? 0 : bounds.bottom,
    empty: bounds.empty,
  };
  const emission = new OutputBudget(operation.policy);
  emission.charge(measurement.nodes, path);
  capture.adopt(trial);
  return { measurement, metrics, path, emissionCounts: emission.totals() };
}
function checkInk(value: InlineMeasurement, actual: InlineMeasurement["inkBounds"], path: string): void {
  if (actual.empty) return;
  const declared = value.inkBounds;
  if (
    declared.empty ||
    actual.left < declared.left ||
    actual.right > declared.right ||
    actual.top < declared.top ||
    actual.bottom > declared.bottom
  )
    fail("GEOMETRY", `${path}/inkBounds`, "Native visual ink exceeds its declaration");
}
function validateVisual(
  value: unknown,
  operation: LayoutOperation,
  budget: OutputBudget,
  path: string,
  declared: boolean,
): asserts value is InlineMeasurement | Required<NativeInlineInput> {
  record(
    value,
    declared ? ["advance", "ascent", "descent", "inkBounds", "nodes"] : ["advance", "ascent", "descent", "nodes"],
    path,
  );
  const advance = number(value.advance, `${path}/advance`, true);
  const ascent = number(value.ascent, `${path}/ascent`);
  const descent = number(value.descent, `${path}/descent`);
  const height = sum([ascent, descent]);
  if (height <= 0) fail("GEOMETRY", path, "An inline visual needs positive box height");
  if (declared) validateInk(value.inkBounds, advance, ascent, descent, path);
  budget.charge(value.nodes as InlineMeasurement["nodes"], path);
  operation.validateFixed(value.nodes as InlineMeasurement["nodes"], advance, height, path);
}
function validateInk(value: unknown, advance: number, ascent: number, descent: number, path: string): void {
  record(value, ["empty", "left", "right", "top", "bottom"], `${path}/inkBounds`);
  const bounds = value;
  if (bounds.empty === false) {
    const left = number(bounds.left, path),
      right = number(bounds.right, path);
    const top = finite(bounds.top as number, path),
      bottom = finite(bounds.bottom as number, path);
    if (left > right || right > advance || top > bottom || top < -ascent || bottom > descent)
      fail("GEOMETRY", path, "Inline ink must fit its declared box");
  } else if (bounds.empty !== true || Object.keys(bounds).length !== 1) fail("TYPE", path, "Expected ink bounds");
}
