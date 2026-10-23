export { textFlowExample } from "./text-flow.js";
import example from "./text-flow.tsx?raw";
import image from "./text-flow-image.ts?raw";
import asset from "./text-flow-asset.ts?raw";
export const source = [
  "// text-flow.tsx",
  example,
  "// text-flow-image.ts",
  image,
  "// text-flow-asset.ts",
  asset,
].join("\n");
