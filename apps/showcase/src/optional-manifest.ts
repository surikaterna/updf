export { manifestExample } from "../../../examples/business/manifest.js";

import components from "../../../examples/business/components.tsx?raw";
import addressTypes from "../../../examples/business/invoice-data.ts?raw";
import manifest from "../../../examples/business/manifest.tsx?raw";
import calculations from "../../../examples/business/manifest-calculations.ts?raw";
import data from "../../../examples/business/manifest-data.ts?raw";

export const source = [
  "// Multi-file example: save these modules together in examples/business; imports are intentional.",
  "// examples/business/manifest.tsx",
  manifest,
  "// examples/business/components.tsx",
  components,
  "// examples/business/manifest-calculations.ts",
  calculations,
  "// examples/business/manifest-data.ts",
  data,
  "// examples/business/invoice-data.ts (shared Address type; invoice fixture not executed)",
  addressTypes,
].join("\n");
