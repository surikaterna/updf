export { mixedExample } from "./mixed.js";

import fixed from "./fixed-pages.tsx?raw";
import mixed from "./mixed.tsx?raw";
export const source = `${mixed}\n// Imported native fixed-position examples: fixed-pages.tsx\n${fixed}`;
