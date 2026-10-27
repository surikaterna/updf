import type { CompositionInput, EdgeProfileExclusion } from "@updf/text/composition";
import { rectangular } from "./rectangular.js";

/** Concave silhouette, deliberately independent of existing rectangle cases. */
export function silhouette(
  side: EdgeProfileExclusion["side"] = "left",
  text = "AB CD EF GH IJ KL MN OP QR ST",
): CompositionInput {
  return {
    ...rectangular(text, {}, 60),
    maxHeight: 1000,
    exclusion: {
      shape: "edge-profile",
      side,
      top: 4,
      points: [
        { x: 30, y: 0 },
        { x: 12, y: 24 },
        { x: 24, y: 40 },
        { x: 4, y: 64 },
      ],
    },
  };
}
