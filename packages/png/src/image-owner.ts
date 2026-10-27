import type { OwnedResource } from "@updf/core/resources";
import type { Image } from "./decode.js";

// One exact-handle owner shared by preparation, painting and opt-in inspection.
export const images = new WeakMap<OwnedResource, Image>();
