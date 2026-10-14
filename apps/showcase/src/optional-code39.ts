import template from "./code39.tsx?raw";
import controls from "./barcode-controls.ts?raw";
import page from "./barcode-page.tsx?raw";
import text from "./text-options.ts?raw";

export { code39Demo } from "./code39.js";
export const source = [
  "// code39.tsx",
  template,
  "// barcode-controls.ts",
  controls,
  "// barcode-page.tsx",
  page,
  "// text-options.ts",
  text,
].join("\n\n");
