import template from "./qr.tsx?raw";
import controls from "./barcode-controls.ts?raw";
import page from "./barcode-page.tsx?raw";
import text from "./text-options.ts?raw";

export { qrDemo } from "./qr.js";
export const source = [
  "// qr.tsx",
  template,
  "// barcode-controls.ts",
  controls,
  "// barcode-page.tsx",
  page,
  "// text-options.ts",
  text,
].join("\n\n");
