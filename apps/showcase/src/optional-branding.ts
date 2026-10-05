import renderer from "./branding.ts?raw";
import logo from "./branding-logo.ts?raw";
import controls from "./branding-controls.ts?raw";

export { brandingDemo } from "./branding.js";
export const source = `// branding.ts\n${renderer}\n// branding-logo.ts\n${logo}\n// branding-controls.ts\n${controls}`;
