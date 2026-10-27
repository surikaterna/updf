import type { CompositionInput, RectangularExclusion } from "@updf/text/composition";
import { rectangular } from "./rectangular.js";

/** A reservation fixture, deliberately independent of the ordinary rectangle cases. */
export function excluded(
  side: RectangularExclusion["side"] = "left",
  text = "AB CD EF GH IJ KL MN OP QR ST",
): CompositionInput {
  return {
    ...rectangular(text, {}, 60),
    maxHeight: 1000,
    exclusion: { shape: "rect", side, width: 20, height: 32 },
  };
}
