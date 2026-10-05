import { array, fail, number, ownContentData, validateDataObject as record } from "@updf/core/internal";
import type { DecorationPlan, StaticDecoration } from "./decoration-types.js";
import { snapshotEmissionData } from "./emission-nodes.js";

const plans = new WeakSet<object>();
export function ownDecorationPlan(entries: readonly StaticDecoration[]): DecorationPlan {
  const plan = ownContentData(Object.freeze({ entries: Object.freeze([...entries]) })) as unknown as DecorationPlan;
  plans.add(plan);
  return plan;
}
export function isDecorationPlan(value: unknown): value is DecorationPlan {
  return !!value && typeof value === "object" && plans.has(value);
}
/**
 * Snapshot static before/after reservations into an owned frozen plan.
 * Heights are nonnegative finite points; nonempty nodes require positive height.
 * first/all/last controls fragment repetition. Geometry is validated on emission;
 * this plan is not a final PageContext callback and cannot be forged by serialization.
 */
export function createDecorationPlan(entries: readonly StaticDecoration[]): DecorationPlan {
  array(entries, Number.MAX_SAFE_INTEGER, "/decorations");
  for (const [index, entry] of entries.entries()) {
    const path = `/decorations/${index}`;
    record(entry, ["edge", "repeat", "height", "nodes"], path);
    if (entry.edge !== "before" && entry.edge !== "after") fail("TYPE", path, "Expected decoration edge");
    if (!["all", "first", "last"].includes(entry.repeat)) fail("TYPE", path, "Expected decoration repetition");
    number(entry.height, `${path}/height`);
    array(entry.nodes, Number.MAX_SAFE_INTEGER, `${path}/nodes`);
    if (entry.height === 0 && entry.nodes.length) fail("GEOMETRY", path, "Nonempty decorations need positive height");
  }
  const plan = ownContentData(
    Object.freeze({ entries: snapshotEmissionData(entries, "/decorations") }),
  ) as unknown as DecorationPlan;
  plans.add(plan);
  return plan;
}
