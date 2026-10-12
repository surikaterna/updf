import { openSync } from "fontkit";

if (!process.argv[2]) throw new Error("Usage: node fontkit-quadratic-repro.mjs font.ttf");
const Path = openSync(process.argv[2]).getGlyph(0).path.constructor;
const path = new Path();
path.moveTo(3, 0);
path.quadraticCurveTo(0, 1, 2, 2);

console.log({ actualMinX: path.bbox.minX, expectedMinX: 6 / 5 });
