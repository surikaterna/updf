# @updf/geometry

## Public API inventory

Import from `@updf/geometry` for optional helpers, not a renderer. Defining
declarations carry JSDoc; this inventory groups contracts, not every field.

| Exports | Declaration owner | Contract |
| --- | --- | --- |
| `parsePathData` | `src/normalize.ts` | SVG path commands normalized to native move/line/cubic/close; source units, strict grammar and budgets |
| `arc` | `src/arc.ts` | Endpoint arc conversion; degrees, binary flags, no leading move |
| `ellipse`, `polygon` | `src/shapes.ts` | Painting-unit shape construction; zero radii/empty points yield empty paths |
| `parseColor`, `ParsedColor` | `src/color.ts` | Restricted CSS-like colors, normalized RGB/alpha; no paint is null RGB |
| `PathCommand` | `@updf/core/painting` | Reexported core command type, not a separate geometry model |

Geometry validation throws core `DocumentError`. Readonly types alone do not
promise frozen values: notably `arc` and `parseColor` return unfrozen objects.
`/internal` is scanner transport for the SVG adapter, not an application API.

```ts
import { parseColor, parsePathData } from "@updf/geometry";
const commands = parsePathData("M0 0h10v10z");
const color = parseColor("#ff000080"); // opacity is 128/255, not 128
```

Private, unreleased `2.0.0-poc.0`. Optional strict path/color/shape helpers;
depends only on the exact matching core version. `/internal` shares the existing
numeric scanner with the SVG adapter only. `REUSE.md` records adapted algorithms;
`LICENSE.svgpath` retains the authoritative Fontello upstream MIT notice.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB, separate from the retained Fontello notice.
No font assets are included. No publication is authorized.
