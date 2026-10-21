import type { NodeDefinition } from "@updf/core";
import {
  array,
  fail,
  type LayoutOperation,
  MetricSum,
  number,
  validateDataObject as record,
} from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-boxes";
import type { PreparedSource, RangeOperation } from "@updf/layout-boxes/fragmentation";
import { sharedRangeOperations } from "@updf/layout-boxes/internal-fragmentation";
import { type AdapterOrigin, adapterCall } from "./adapter-call.js";
import type { OutputBudget } from "./budget.js";
import { reserveAncestors } from "./container-reservation.js";
import { chargeSourceWork, preflight } from "./data.js";
import { geometryNodes, instantiateEmissionNodes, snapshotEmissionData } from "./emission-nodes.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { MeasuredBlock } from "./extension-types.js";
import type { FragmentState } from "./fragment-state.js";
import { certifyGeneratedFragment, generatedIntervals } from "./generated-interval.js";
import { fragmentGeometry } from "./fragment-paint-preparation.js";
import type { FragmentRequest, PlacedFragment } from "./protocol.js";
import { unitSelectionRequest } from "./selection-request.js";

interface UnitContent {
  readonly nodes: readonly NodeDefinition[];
  readonly budget: OutputBudget | undefined;
  readonly state: FragmentState | undefined;
}
interface Attempt {
  readonly request: FragmentRequest;
  readonly height: MetricSum;
  previous: UnitContent;
}
interface Descriptor {
  readonly callback: MeasuredBlock["next"];
  readonly width: number;
  readonly path: string;
  readonly origin: AdapterOrigin;
  readonly operation: LayoutOperation;
  readonly lifetime: ExtensionLifetime;
  readonly atomic: boolean;
  attempt?: Attempt;
}
export interface MeasuredSources {
  readonly operation: RangeOperation<Descriptor, UnitContent>;
  readonly operations: RangeOperation<Descriptor, UnitContent>[];
  readonly create: () => RangeOperation<Descriptor, UnitContent>;
  depth: number;
  nextId: number;
}
export function closeMeasuredSources(lifetime: ExtensionLifetime): void {
  lifetime.measuredSources?.operation.close();
  delete lifetime.measuredSources;
}
function sources(lifetime: ExtensionLifetime): MeasuredSources {
  if (lifetime.measuredSources) return lifetime.measuredSources;
  const create = sharedRangeOperations<Descriptor, UnitContent>({
    next(descriptor, request, work) {
      if (!descriptor.lifetime.active) fail("MEASUREMENT_CONTEXT", descriptor.path, "Layout operation has closed");
      const attempt = descriptor.attempt;
      if (!attempt) fail("MEASUREMENT_CONTEXT", descriptor.path, "Missing unit selection attempt");
      work.consume(1);
      chargeSourceWork(1, descriptor.operation, descriptor.path);
      const callback = descriptor.callback;
      let output: ReturnType<MeasuredBlock["next"]>;
      result.depth++;
      try {
        output = adapterCall("next", descriptor.path, () => callback(request), descriptor.origin);
      } finally {
        result.depth--;
      }
      const content = captureUnit(output, request.offset, request.extent, descriptor, attempt);
      return { end: output.end, height: output.height, content };
    },
  });
  const operation = create();
  const result: MeasuredSources = { operation, operations: [operation], create, depth: 0, nextId: 0 };
  lifetime.measuredSources = result;
  return result;
}
function captureUnit(
  output: ReturnType<MeasuredBlock["next"]>,
  offset: number,
  extent: number,
  descriptor: Descriptor,
  attempt: Attempt,
): UnitContent {
  const { path, operation } = descriptor;
  record(output, ["end", "height", "nodes"], path);
  if (!Number.isSafeInteger(output.end) || output.end <= offset || output.end > extent)
    fail("TYPE", path, "Expected safe integer progress within measured extent");
  if (descriptor.atomic && output.end !== extent) fail("TYPE", path, "Atomic unit must consume the whole source");
  const height = number(output.height, path);
  if (!Array.isArray(output.nodes)) fail("TYPE", path, "Expected native output array");
  const budget = attempt.previous.budget?.fork();
  const state = attempt.previous.state?.fork();
  const cumulativeHeight = number(attempt.height.add(height), path);
  reserveAncestors(attempt.request.reserve, budget, state, cumulativeHeight);
  // Lookahead is eagerly quota-checked, even when the kernel subsequently rejects its height.
  if (output.nodes.length) budget?.charge([{ type: "paintGroup", children: output.nodes }], path);
  array(output.nodes, operation.policy.nodes, `${path}/nodes`);
  preflight(output.nodes, operation.policy);
  if (output.nodes.length)
    operation.validateFixed(geometryNodes(output.nodes, operation), descriptor.width, height, path);
  const content = Object.freeze({ nodes: snapshotEmissionData(output.nodes, path), budget, state });
  attempt.previous = content;
  return content;
}
export function measuredSource(
  measured: MeasuredBlock,
  width: number,
  path: string,
  operation: LayoutOperation,
  origin: AdapterOrigin,
  lifetime: ExtensionLifetime,
): (request: FragmentRequest) => PlacedFragment | undefined {
  if (!lifetime.active) fail("MEASUREMENT_CONTEXT", path, "Layout operation has closed");
  const fragments = sources(lifetime);
  // Nested measurement owns a different guard, never a fresh quota ledger.
  fragments.operations[fragments.depth] ??= fragments.create();
  const selection = fragments.operations[fragments.depth]!;
  const descriptor: Descriptor = {
    callback: measured.next,
    width,
    path,
    operation,
    origin,
    lifetime,
    atomic: measured.fragmentation === "atomic",
  };
  const prepared = selection.prepare({
    id: String(fragments.nextId++),
    path,
    descriptor,
    extent: measured.extent,
    mode: measured.fragmentation,
    width: { mode: "fixed", value: width },
  });
  return (request) => select(selection, prepared, descriptor, request);
}
function select(
  operation: RangeOperation<Descriptor, UnitContent>,
  source: PreparedSource,
  descriptor: Descriptor,
  request: FragmentRequest,
): PlacedFragment | undefined {
  if (!descriptor.lifetime.active) fail("MEASUREMENT_CONTEXT", descriptor.path, "Layout operation has closed");
  // A reentrant invocation must enter the kernel guard without replacing the outer binding.
  const outer = descriptor.attempt;
  if (!outer)
    descriptor.attempt = {
      request,
      height: new MetricSum(),
      previous: { nodes: [], budget: request.budget?.fork(), state: request.state?.fork() },
    };
  try {
    const selected = operation.select(source, unitSelectionRequest(request));
    if (!selected?.units.length) return undefined;
    const last = selected.units.at(-1)!.content;
    if (last.budget) request.budget?.adopt(last.budget);
    if (last.state) request.state?.adopt(last.state);
    return placement(selected, descriptor);
  } catch (error) {
    if (!(error instanceof LayoutInputError)) throw error;
    fail(error.code, error.path, error.message);
  } finally {
    if (!outer) delete descriptor.attempt;
  }
}
function placement(
  selected: NonNullable<ReturnType<MeasuredSources["operation"]["select"]>>,
  descriptor: Descriptor,
): PlacedFragment {
  const sequence = generatedIntervals();
  const top = new MetricSum();
  const units = selected.units.map((unit) => {
    const offset = top.value;
    top.add(unit.height);
    return { unit, offset, certificate: unit.height > 0 ? sequence.append(unit.height, descriptor.path) : undefined };
  });
  return certifyGeneratedFragment<PlacedFragment>(
    {
      geometry: fragmentGeometry(
        units.map(({ unit, offset, certificate }) => ({
          offset,
          height: unit.height,
          ...(certificate ? { certificate } : {}),
          reservation: "whole-box",
        })),
      ),
      nextOffset: selected.end,
      height: selected.height,
      paint(context) {
        const output: NodeDefinition[] = [];
        for (let index = 0; index < units.length; index++) {
          const { unit } = units[index]!;
          if (!unit.content.nodes.length) continue;
          const y = context.partPositions[index]!;
          context.budget.charge([{ type: "paintGroup", children: unit.content.nodes }], descriptor.path);
          output.push({
            type: "paintGroup",
            transform: [1, 0, 0, 1, context.x, y],
            children: instantiateEmissionNodes(unit.content.nodes, {
              from: descriptor.origin.path,
              to: descriptor.path,
            }),
          });
        }
        return output;
      },
    },
    units.flatMap(({ certificate }) => (certificate ? [certificate] : [])),
  );
}
