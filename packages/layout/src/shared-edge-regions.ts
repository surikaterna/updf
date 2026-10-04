import {
  array,
  checkLimit,
  exceeds,
  fail,
  type LayoutOperation,
  number,
  validateDataObject as record,
  snapshotData,
  sum,
} from "@updf/core/internal";
import { preflight } from "./data.js";
import { geometryNodes, snapshotEmissionData } from "./emission-nodes.js";
import type {
  EdgeRegion,
  EdgeRegionInput,
  EdgeRegionPlacement,
  LocalEdgeClaim,
  SharedEdgeGroup,
  SharedEdgeGroupInput,
} from "./shared-edge-types.js";

const regions = new WeakMap<object, LayoutOperation>();
const groups = new WeakMap<object, LayoutOperation>();

function dimensions(input: { readonly width: number; readonly height: number }, path: string): void {
  number(input.width, `${path}/width`, true);
  number(input.height, `${path}/height`);
}

function sourcePath(value: unknown, path: string): void {
  if (typeof value !== "string" || (value !== "" && !value.startsWith("/")) || /~(?![01])/u.test(value))
    fail("TYPE", path, "Expected escaped absolute source pointer");
}

function claim(input: LocalEdgeClaim, width: number, height: number, path: string): LocalEdgeClaim {
  record(
    input,
    [
      "axis",
      "interval",
      "coordinate",
      "ownerSide",
      "provenance",
      "width",
      "color",
      "sourcePath",
      "unsharedInset",
      "startInset",
      "endInset",
    ],
    path,
  );
  if (input.axis !== "horizontal" && input.axis !== "vertical") fail("TYPE", `${path}/axis`, "Expected edge axis");
  const horizontal = input.axis === "horizontal";
  const sides = horizontal ? ["top", "bottom"] : ["left", "right"];
  if (!sides.includes(input.ownerSide)) fail("TYPE", `${path}/ownerSide`, "Owner side must match edge axis");
  if (input.provenance !== "grid" && input.provenance !== "explicit")
    fail("TYPE", `${path}/provenance`, "Expected grid or explicit provenance");
  array(input.interval, 2, `${path}/interval`);
  if (input.interval.length !== 2) fail("TYPE", `${path}/interval`, "Expected edge interval pair");
  const start = number(input.interval[0], `${path}/interval/0`);
  const end = number(input.interval[1], `${path}/interval/1`);
  if (start >= end || end > (horizontal ? width : height))
    fail("GEOMETRY", `${path}/interval`, "Expected positive interval within region");
  if (number(input.coordinate, `${path}/coordinate`) > (horizontal ? height : width))
    fail("GEOMETRY", `${path}/coordinate`, "Edge coordinate exceeds region");
  number(input.width, `${path}/width`);
  paintInsets(input, horizontal ? height : width, start, end, path);
  array(input.color, 3, `${path}/color`);
  if (input.color.length !== 3) fail("GEOMETRY", `${path}/color`, "Expected RGB tuple");
  for (const [index, component] of input.color.entries())
    if (number(component, `${path}/color/${index}`) > 1)
      fail("GEOMETRY", `${path}/color/${index}`, "RGB must be in [0,1]");
  sourcePath(input.sourcePath, `${path}/sourcePath`);
  return snapshotData(input, path);
}

function paintInsets(input: LocalEdgeClaim, limit: number, start: number, end: number, path: string): void {
  for (const key of ["unsharedInset", "startInset", "endInset"] as const)
    if (key in input) number(input[key], `${path}/${key}`);
  const inset = input.unsharedInset ?? 0;
  const low = input.ownerSide === "top" || input.ownerSide === "left";
  if (inset > (low ? limit - input.coordinate : input.coordinate))
    fail("GEOMETRY", `${path}/unsharedInset`, "Inward displacement must fit the allocation");
  if (sum([input.startInset ?? 0, input.endInset ?? 0]) >= end - start)
    fail("GEOMETRY", `${path}/interval`, "Endpoint insets must retain a positive interval");
}

/** Claims describe local centerlines; final painting must enforce the parent allocation and clip. */
export function ownEdgeRegion(input: EdgeRegionInput, operation: LayoutOperation, path: string): EdgeRegion {
  record(input, ["width", "height", "nodes", "claims"], path);
  dimensions(input, path);
  array(input.claims, operation.policy.nodes, `${path}/claims`);
  if (input.height === 0 && input.claims.length) fail("GEOMETRY", `${path}/claims`, "Empty regions have no edges");
  const claims = Object.freeze(
    input.claims.map((value, index) => claim(value, input.width, input.height, `${path}/claims/${index}`)),
  );
  array(input.nodes, operation.policy.nodes, `${path}/nodes`);
  preflight(input.nodes, operation.policy);
  if (input.height === 0 && input.nodes.length) fail("GEOMETRY", `${path}/nodes`, "Empty regions have no content");
  if (input.nodes.length)
    operation.validateFixed(geometryNodes(input.nodes), input.width, input.height, `${path}/nodes`);
  const region = Object.freeze({
    width: input.width,
    height: input.height,
    nodes: snapshotEmissionData(input.nodes, `${path}/nodes`),
    claims,
  }) as EdgeRegion;
  regions.set(region, operation);
  return region;
}

export function requireEdgeRegion(value: unknown, operation: LayoutOperation, path: string): EdgeRegion {
  if (!value || typeof value !== "object" || regions.get(value) !== operation)
    fail("TYPE", path, "Expected edge region owned by this layout operation");
  return value as EdgeRegion;
}

function placement(
  input: EdgeRegionPlacement,
  operation: LayoutOperation,
  width: number,
  height: number,
  path: string,
): EdgeRegionPlacement {
  record(input, ["region", "x", "y"], path);
  const region = requireEdgeRegion(input.region, operation, `${path}/region`);
  const x = number(input.x, `${path}/x`);
  const y = number(input.y, `${path}/y`);
  if (exceeds(sum([x, region.width]), width) || exceeds(sum([y, region.height]), height))
    fail("GEOMETRY", path, "Edge region exceeds group allocation");
  return Object.freeze({ region, x, y });
}

export function ownSharedEdgeGroup(
  input: SharedEdgeGroupInput,
  operation: LayoutOperation,
  path: string,
): SharedEdgeGroup {
  record(input, ["width", "height", "regions"], path);
  dimensions(input, path);
  array(input.regions, operation.policy.nodes, `${path}/regions`);
  let count = 0;
  const children = input.regions.map((value, index) => {
    const child = placement(value, operation, input.width, input.height, `${path}/regions/${index}`);
    count = checkLimit(count + child.region.claims.length, operation.policy.nodes, path, "Shared edge claims");
    return child;
  });
  const group = Object.freeze({
    width: input.width,
    height: input.height,
    regions: Object.freeze(children),
  }) as SharedEdgeGroup;
  groups.set(group, operation);
  return group;
}

export function requireSharedEdgeGroup(value: unknown, operation: LayoutOperation, path: string): SharedEdgeGroup {
  if (!value || typeof value !== "object" || groups.get(value) !== operation)
    fail("TYPE", path, "Expected shared edge group owned by this layout operation");
  return value as SharedEdgeGroup;
}
