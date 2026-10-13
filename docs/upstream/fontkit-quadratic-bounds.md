# Quadratic path bounds can miss an interior minimum

With fontkit 2.0.4 on Node 24.21.0/Linux, this returns `minX: 2` instead of `1.2`:

```js
import { openSync } from "fontkit";

const Path = openSync(process.argv[2]).getGlyph(0).path.constructor;
const path = new Path();
path.moveTo(3, 0);
path.quadraticCurveTo(0, 1, 2, 2);

console.log({ actualMinX: path.bbox.minX, expectedMinX: 6 / 5 });
```

Save as `repro.mjs`, install `fontkit@2.0.4`, and run `node repro.mjs font.ttf`.
An ordinary glyf TrueType font, such as Liberation Sans Regular, is enough.
The font is only used to obtain the Path
constructor; the curve is hardcoded.

The x coordinate is `3 - 6t + 5t²`, whose minimum is `6/5` at `t = 3/5`.
Crimson Text Regular's `j` has a segment with these x coordinates; its reported
left bound is also too far to the right.

The quadratic-to-cubic conversion in `Path.bbox` leaves the leading derivative
coefficient at `-8.881784197001252e-16` rather than zero. The quadratic formula
then produces roots `1` and `11258999068426240`, both rejected by the interior-root
check. Only the endpoints contribute to the bound.

Handling quadratic segments directly would avoid this degree-elevation problem.
The same calculation is present in
[Path.js at d55dc3e](https://github.com/foliojs/fontkit/blob/d55dc3eb7f0c54d518d3be979a01f29ce93d2fc5/src/glyph/Path.js).
