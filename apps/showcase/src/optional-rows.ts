export { rowExample } from "./rows.js";

import chart from "./chart.ts?raw";
import svg from "./optional-table-svg.ts?raw";
import rows from "./rows.tsx?raw";
export const source = `${rows}\n// Imported external producer: chart.ts\n${chart}\n// Imported SVG placement: optional-table-svg.ts (@updf/svg/layout)\n${svg}`;
