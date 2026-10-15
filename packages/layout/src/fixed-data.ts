import { array, number, validateDataObject as record } from "@updf/core/internal";
import { snapshotEmissionData } from "./emission-nodes.js";
import type { FixedBlock, FixedInput } from "./types.js";

/** Snapshot native data and owned deferred recipes; host geometry/resources are validated during measurement. */
export function fixed(input: FixedInput): FixedBlock {
  record(input, ["width", "height", "children"], "/fixed");
  number(input.height, "/fixed/height", true);
  if ("width" in input) number(input.width, "/fixed/width", true);
  array(input.children, Number.MAX_SAFE_INTEGER, "/fixed/children");
  return snapshotEmissionData({ ...input, type: "fixed" as const }, "/fixed");
}
