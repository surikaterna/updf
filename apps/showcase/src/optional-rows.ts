export { rowExample } from "./rows.js";

import chart from "./chart.ts?raw";
import inlineSVG from "./optional-inline-svg.ts?raw";
import svg from "./optional-table-svg.ts?raw";
import rows from "./rows.tsx?raw";
export const source = `${rows}\n// Imported external producer: chart.ts\n${chart}\n// Imported SVG adapters: optional-table-svg.ts, optional-inline-svg.ts\n${svg}\n${inlineSVG}`;
