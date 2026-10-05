import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { ownEmissionWrapper } from "../dist/emission-nodes.js";
import {
  ownEdgeRegion,
  ownSharedEdgeGroup,
  requireEdgeRegion,
  requireSharedEdgeGroup,
} from "../dist/shared-edge-regions.js";
import type { EdgeRegionInput, LocalEdgeClaim, SharedEdgeGroupInput } from "../dist/shared-edge-types.js";

const path = "/table/edges";
const edge: LocalEdgeClaim = {
  axis: "horizontal",
  interval: [1, 19],
  coordinate: 0,
  ownerSide: "top",
  provenance: "grid",
  width: 1,
  color: [0, 0, 0],
  sourcePath: "/table/body/0",
};
const input = (claims: readonly LocalEdgeClaim[] = [edge]): EdgeRegionInput => ({
  width: 20,
  height: 10,
  nodes: [],
  claims,
});
test("B1 physical metadata is finite bounded scalar data and rejects unknown keys/getters", () => {
  const operation = createLayoutOperation({});
  for (const key of ["unsharedInset", "startInset", "endInset"] as const) {
    for (const value of [-1, NaN, Infinity, () => 1, undefined])
      assert.throws(
        () => ownEdgeRegion(input([{ ...edge, [key]: value } as LocalEdgeClaim]), operation, path),
        DocumentError,
      );
  }
  for (const patch of [
    { unsharedInset: 11 },
    { coordinate: 9, unsharedInset: 2 },
    { startInset: 9, endInset: 9 },
    { physicalOffset: 1 },
  ])
    assert.throws(() => ownEdgeRegion(input([{ ...edge, ...patch }]), operation, path), DocumentError);
  let reads = 0;
  const getter = Object.defineProperty({ ...edge }, "startInset", {
    enumerable: true,
    get() {
      reads++;
      return 1;
    },
  });
  assert.throws(() => ownEdgeRegion(input([getter]), operation, path), DocumentError);
  assert.equal(reads, 0);
  const claim = ownEdgeRegion(input([{ ...edge, unsharedInset: 1, startInset: 1, endInset: 1 }]), operation, path)
    .claims[0]!;
  assert.ok(Object.isFrozen(claim));
  assert.equal(claim.coordinate, 0);
  assert.deepEqual(claim.interval, [1, 19]);
});
function rejects(callback: () => unknown, code: string, at?: string): void {
  assert.throws(callback, (error: unknown) => {
    if (!(error instanceof DocumentError)) return false;
    assert.equal(error.diagnostics[0]?.code, code);
    if (at) assert.equal(error.diagnostics[0]?.path, at);
    return true;
  });
}

test("edge regions own immutable claims and ordinary region content", () => {
  const operation = createLayoutOperation({});
  const color: [number, number, number] = [0, 0, 0];
  const interval: [number, number] = [1, 19];
  const nodes: NodeDefinition[] = [
    { type: "rect", x: 2, y: 2, width: 4, height: 4, paint: { stroke: null, fill: [0, 0, 0] } },
  ];
  const region = ownEdgeRegion({ ...input([{ ...edge, interval, color }]), nodes }, operation, path);
  color[0] = 1;
  interval[1] = 100;
  nodes.length = 0;
  assert.deepEqual(region.claims[0]?.color, [0, 0, 0]);
  assert.deepEqual(region.claims[0]?.interval, [1, 19]);
  assert.equal(region.nodes.length, 1);
  for (const value of [
    region,
    region.claims,
    region.claims[0],
    region.claims[0]?.interval,
    region.claims[0]?.color,
    region.nodes,
  ])
    assert.ok(Object.isFrozen(value));
  assert.equal(requireEdgeRegion(region, operation, path), region);
});

test("copied, serialized and cross-operation region/group reports are not owned capabilities", () => {
  const operation = createLayoutOperation({});
  const region = ownEdgeRegion(input(), operation, path);
  const group = ownSharedEdgeGroup({ width: 20, height: 10, regions: [{ region, x: 0, y: 0 }] }, operation, path);
  assert.equal(requireSharedEdgeGroup(group, operation, path), group);
  for (const value of [{ ...region }, JSON.parse(JSON.stringify(region)), group, null])
    rejects(() => requireEdgeRegion(value, operation, path), "TYPE", path);
  for (const value of [{ ...group }, JSON.parse(JSON.stringify(group)), region, null])
    rejects(() => requireSharedEdgeGroup(value, operation, path), "TYPE", path);
  rejects(() => requireEdgeRegion(region, createLayoutOperation({}), path), "TYPE", path);
  rejects(() => requireSharedEdgeGroup(group, createLayoutOperation({}), path), "TYPE", path);
});

test("groups accept direct owned regions only and preserve their actual local offsets", () => {
  const operation = createLayoutOperation({});
  const region = ownEdgeRegion(input(), operation, path);
  const values = [{ region, x: 3, y: 7 }];
  const group = ownSharedEdgeGroup({ width: 30, height: 30, regions: values }, operation, path);
  values[0]!.y = 20;
  assert.equal(group.regions[0]?.y, 7);
  assert.equal(group.regions[0]?.region, region);
  assert.ok(Object.isFrozen(group.regions) && Object.isFrozen(group.regions[0]));
  rejects(
    () =>
      ownSharedEdgeGroup(
        { width: 30, height: 30, regions: [{ region: group, x: 0, y: 0 }] } as unknown as SharedEdgeGroupInput,
        operation,
        path,
      ),
    "TYPE",
  );
  rejects(
    () => ownSharedEdgeGroup({ width: 30, height: 30, regions: [{ region, x: 11, y: 0 }] }, operation, path),
    "GEOMETRY",
  );
  rejects(
    () => ownSharedEdgeGroup({ width: 30, height: 30, regions: [{ region, x: 0, y: 21 }] }, operation, path),
    "GEOMETRY",
  );
});

test("group containment admits native-scale roundoff but rejects real overflow at every scale", () => {
  const operation = createLayoutOperation({});
  for (const scale of [1e-100, 1, 1e100]) {
    const region = ownEdgeRegion({ width: 0.2 * scale, height: 0.2 * scale, nodes: [], claims: [] }, operation, path);
    const placement = { region, x: 0.1 * scale, y: 0.1 * scale };
    assert.doesNotThrow(() =>
      ownSharedEdgeGroup({ width: 0.3 * scale, height: 0.3 * scale, regions: [placement] }, operation, path),
    );
    for (const axis of ["x", "y"]) {
      rejects(
        () =>
          ownSharedEdgeGroup(
            {
              width: 0.3 * scale,
              height: 0.3 * scale,
              regions: [{ ...placement, [axis]: (0.1 + 8 * Number.EPSILON) * scale }],
            },
            operation,
            path,
          ),
        "GEOMETRY",
      );
    }
  }
});

test("claim geometry rejects nonfinite, reversed, zero and out-of-region intervals and coordinates", () => {
  const operation = createLayoutOperation({});
  const invalid = [
    { interval: [2, 1] },
    { interval: [1, 1] },
    { interval: [-1, 5] },
    { interval: [1, 21] },
    { interval: [0, Number.POSITIVE_INFINITY] },
    { coordinate: 11 },
    { coordinate: -1 },
    { coordinate: Number.NaN },
    { width: -1 },
    { width: Number.POSITIVE_INFINITY },
    { color: [0, 0, 2] },
  ];
  for (const fields of invalid)
    rejects(() => ownEdgeRegion(input([{ ...edge, ...fields } as LocalEdgeClaim]), operation, path), "GEOMETRY");
  const vertical: LocalEdgeClaim = { ...edge, axis: "vertical", ownerSide: "left", interval: [0, 10], coordinate: 20 };
  assert.equal(ownEdgeRegion(input([vertical]), operation, path).claims.length, 1);
  rejects(() => ownEdgeRegion(input([{ ...vertical, interval: [0, 11] }]), operation, path), "GEOMETRY");
  rejects(() => ownEdgeRegion(input([{ ...vertical, coordinate: 21 }]), operation, path), "GEOMETRY");
});

test("claims reject incompatible sides, foreign provenance and malformed source paths", () => {
  const operation = createLayoutOperation({});
  for (const fields of [
    { axis: "diagonal" },
    { ownerSide: "left" },
    { provenance: "foreign" },
    { sourcePath: "relative" },
    { sourcePath: "/bad~2" },
  ])
    rejects(() => ownEdgeRegion(input([{ ...edge, ...fields } as LocalEdgeClaim]), operation, path), "TYPE");
  assert.equal(ownEdgeRegion(input([{ ...edge, sourcePath: "/escaped~0/~1" }]), operation, path).claims.length, 1);
  assert.equal(
    ownEdgeRegion(input([{ ...edge, provenance: "explicit", width: 0 }]), operation, path).claims[0]?.width,
    0,
  );
  rejects(() => ownEdgeRegion(input([{ ...edge, sourcePath: `${"/".repeat(10000)}~2` }]), operation, path), "TYPE");
});

test("claim schemas and arrays reject getters without evaluating them", () => {
  const operation = createLayoutOperation({});
  let reads = 0;
  const getter = Object.defineProperty({ ...edge }, "coordinate", {
    enumerable: true,
    get() {
      reads++;
      return 0;
    },
  });
  const arrayGetter = Object.defineProperty([], "0", {
    enumerable: true,
    get() {
      reads++;
      return edge;
    },
  });
  for (const claims of [[getter], arrayGetter, Array(1), Object.assign([], { extra: true })])
    rejects(() => ownEdgeRegion(input(claims), operation, path), "TYPE");
  rejects(() => ownEdgeRegion(input([{ ...edge, foreign: true } as LocalEdgeClaim]), operation, path), "KEY");
  assert.equal(reads, 0);
});

test("empty regions have no edges and claim budgets include repeated direct regions", () => {
  const operation = createLayoutOperation({ limits: { nodes: 2 } });
  rejects(() => ownEdgeRegion(input([edge, edge, edge]), operation, path), "LIMIT");
  const region = ownEdgeRegion(input([edge, edge]), operation, path);
  rejects(
    () =>
      ownSharedEdgeGroup(
        {
          width: 20,
          height: 20,
          regions: [
            { region, x: 0, y: 0 },
            { region, x: 0, y: 10 },
          ],
        },
        operation,
        path,
      ),
    "LIMIT",
  );
  const empty = ownEdgeRegion({ ...input([]), height: 0 }, operation, path);
  assert.equal(empty.claims.length, 0);
  rejects(() => ownEdgeRegion({ ...input(), height: 0 }, operation, path), "GEOMETRY");
});

test("region input geometry is validated while existing owned deferred nodes retain identity", () => {
  const operation = createLayoutOperation({});
  const marker = ownEmissionWrapper({ type: "paintGroup", children: [] }, "/deferred");
  const region = ownEdgeRegion({ ...input(), nodes: [marker] }, operation, path);
  assert.equal(region.nodes[0], marker);
  rejects(
    () => ownEdgeRegion({ ...input(), nodes: [{ type: "rect", x: 19, y: 0, width: 2, height: 1 }] }, operation, path),
    "BOUNDS",
  );
  for (const width of [0, Number.NaN, Number.POSITIVE_INFINITY])
    rejects(() => ownEdgeRegion({ ...input(), width }, operation, path), "GEOMETRY");
  rejects(() => ownSharedEdgeGroup({ width: 20, height: -1, regions: [] }, operation, path), "GEOMETRY");
});
