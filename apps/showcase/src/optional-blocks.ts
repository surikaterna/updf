export { blockExample } from "./blocks.js";

import blocks from "./blocks.ts?raw";
import chart from "./chart.ts?raw";
export const source = `${blocks}\n// Imported external producer: chart.ts\n${chart}`;
