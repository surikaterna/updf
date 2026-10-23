import { fail, finite } from "@updf/core/internal";
import { exceeds, type MetricSum } from "./arithmetic.js";
import type { CompositionInput } from "./composition-types.js";
import type { SelectionBand } from "./exclusion.js";
import { profileInterval, type ProfileCharge, type ProfileExclusion } from "./profile-exclusion.js";
import type { lineSelector } from "./wrap-selector.js";

/** Candidate-grid retry, not a search for the earliest continuous fit. Blocked selection does not consume source. */
export function selectProfileLine(
  selector: ReturnType<typeof lineSelector>,
  height: MetricSum,
  lineHeight: number,
  input: CompositionInput,
  profile: ProfileExclusion,
  band: SelectionBand,
  path: string,
  charge: ProfileCharge,
) {
  for (;;) {
    const top = height.value;
    const region = profileInterval(profile, input.width, top, band, path, charge);
    charge(1, path);
    const selected = region.width > 0 ? selector.next(region.width) : null;
    if (selected && !("blocked" in selected)) return { selected, region, top };
    if (!region.active) {
      if (selected && "blocked" in selected) throw selected.blocked;
      fail("GEOMETRY", path, "Expected an unconsumed line");
    }
    charge(1, path);
    const next = finite(height.add(lineHeight), path);
    if (next <= top) fail("GEOMETRY", path, "Profile retry cannot make strict progress");
    if (exceeds(next, input.maxHeight)) fail("VERTICAL_OVERFLOW", path, "Profile retry exceeds height");
  }
}
