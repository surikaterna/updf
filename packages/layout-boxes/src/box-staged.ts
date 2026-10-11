import { allocateBoxes, completeBoxes } from "./box-layout.js";
import { boxInput } from "./box-operation.js";
import type {
  AllocateBoxLayoutInput,
  BoxLayout,
  BoxLayoutPlan,
  BoxMeasurementRequest,
  BoxMeasurementResult,
  LayoutBoxesInput,
} from "./box-types.js";
import { fail } from "./error.js";
import { array, number, record } from "./width-validation.js";

interface PlanState<C> {
  readonly allocation: ReturnType<typeof allocateBoxes<unknown, C>>;
  readonly indices: ReadonlyMap<BoxMeasurementRequest<C>, number>;
}
const plans = new WeakMap<object, PlanState<unknown>>();

function createPlan<N, C>(options: ReturnType<typeof boxInput<N, C>>): BoxLayoutPlan<C> {
  const allocation = allocateBoxes(options);
  const indices = new Map<BoxMeasurementRequest<C>, number>();
  const requests: BoxMeasurementRequest<C>[] = [];
  allocation.nodes.forEach((node, index) => {
    if (node.content === undefined) return;
    const request = Object.freeze({
      content: node.content,
      path: node.path,
      allocation: allocation.sizes[index]!.allocation,
    }) as BoxMeasurementRequest<C>;
    indices.set(request, index);
    requests.push(request);
  });
  const plan = Object.freeze({ requests: Object.freeze(requests) }) as BoxLayoutPlan<C>;
  plans.set(plan, { allocation, indices } as PlanState<unknown>);
  return plan;
}
/** Snapshot and preflight all allocations and quotas without measuring content. */
export function allocateBoxLayout<N, C>(input: AllocateBoxLayoutInput<N, C>): BoxLayoutPlan<C> {
  return createPlan(boxInput(input, true));
}
/** Validate a complete identity-keyed result set before sizing fresh working geometry. */
export function finishBoxLayout<C>(plan: BoxLayoutPlan<C>, results: readonly BoxMeasurementResult<C>[]): BoxLayout<C> {
  const state = plans.get(plan) as PlanState<C> | undefined;
  if (!state) fail("VALUE", "/boxes/plan", "Expected an issued plan");
  const snapshot = snapshotResults(results);
  const heights = new Map<number, number>();
  snapshot.forEach((result, index) => {
    const path = `/boxes/results/${index}`;
    const data = record(result, ["request", "height"], path);
    if (!("request" in data) || !("height" in data)) fail("TYPE", path, "Expected request and height");
    if (typeof data.height !== "number") fail("TYPE", `${path}/height`, "Expected numeric height");
    if (!data.request || typeof data.request !== "object") fail("TYPE", `${path}/request`, "Expected request token");
    const node = state.indices.get(data.request as BoxMeasurementRequest<C>);
    if (node === undefined || heights.has(node)) fail("VALUE", `${path}/request`, "Foreign or duplicate request");
    heights.set(node, number(data.height, `${path}/height`));
  });
  if (heights.size !== state.indices.size) fail("VALUE", "/boxes/results", "Missing measurement results");
  return completeBoxes(state.allocation, heights);
}
function snapshotResults(results: unknown): unknown[] {
  const path = "/boxes/results";
  array(results, Number.MAX_SAFE_INTEGER, path);
  const length: unknown = Object.getOwnPropertyDescriptor(results, "length")?.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0)
    fail("TYPE", path, "Expected an array length");
  const snapshot: unknown[] = [];
  // Record proxy traps may mutate later entries; retain all data values before inspecting records.
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(results, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable)
      fail("TYPE", `${path}/${i}`, "Dense enumerable data arrays only");
    snapshot.push(descriptor.value);
  }
  return snapshot;
}
/**
 * All allocation preflight precedes the first synchronous measurement callback.
 * Returns frozen records/arrays/counts; generic content payloads are retained,
 * not cloned or frozen. Caller tree data is not frozen.
 */
export function layoutBoxes<N, C>(input: LayoutBoxesInput<N, C>): BoxLayout<C> {
  const options = boxInput(input);
  const plan = createPlan(options);
  const results = plan.requests.map((request) => {
    if (!options.measure) fail("TYPE", request.path, "Content requires a measure callback");
    const context = Object.freeze({ path: request.path, allocation: request.allocation });
    const measured = record(options.measure(request.content, context), ["height"], request.path);
    return { request, height: number(measured.height, `${request.path}/height`) };
  });
  return finishBoxLayout(plan, results);
}
