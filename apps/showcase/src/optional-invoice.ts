export { invoiceExample } from "../../../examples/business/invoice.js";

import components from "../../../examples/business/components.tsx?raw";
import invoice from "../../../examples/business/invoice.tsx?raw";
import calculations from "../../../examples/business/invoice-calculations.ts?raw";
import data from "../../../examples/business/invoice-data.ts?raw";

export const source = [
  "// Multi-file example: save these modules together in examples/business; imports are intentional.",
  "// examples/business/invoice.tsx",
  invoice,
  "// examples/business/components.tsx",
  components,
  "// examples/business/invoice-calculations.ts",
  calculations,
  "// examples/business/invoice-data.ts",
  data,
].join("\n");
