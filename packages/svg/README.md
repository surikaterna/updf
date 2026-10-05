# @updf/svg

## Public API inventory

| Entry / exports | Declaration owner | Contract |
| --- | --- | --- |
| root: `compileSVG`, `renderSVG` | `src/index.ts` | Strict shape subset; explicit warning review versus warning rejection |
| root: `SVGTarget`, `SVGCompilation`, `SVGDiagnostic` | `src/types.ts` | Point viewport, frozen result, original-source UTF-16 warning spans |
| root: `SVGError` | `src/error.ts` | Core DocumentError subclass with source-span diagnostics |
| `/tree`: `Svg`, `createSVGTree`, `SvgProps` | `src/tree.ts` | Native VDOM equivalents using renderSVG's warning-free contract |

This grouped inventory is not comprehensive field documentation. Import the root
for native painting and `/tree` for native VDOM; neither uses DOM or loads resources.
Supported shapes are path, rect, line, circle, ellipse, polygon and polyline,
with svg/g containers, transforms, viewBox and restricted paint CSS. `defs` is
styles-only; without viewBox the root requires positive intrinsic width/height.
Title/desc are inert. Text, images, references, gradients, filters
and scripts reject rather than degrade silently. Legacy CSS warnings are only
accepted through explicit `compileSVG` use; inspect every diagnostic first.

The target is in PDF points. Viewport clipping is **not redaction**: it changes
visible painting, not the presence of underlying path data in the PDF.
Limits include 1 MiB UTF-8 input, 10000 elements, depth 64 and per-path budgets.

```ts
import { compileSVG } from "@updf/svg";
const result = compileSVG('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
  { x: 20, y: 20, w: 100, h: 100 });
if (result.diagnostics.length) throw new Error("Review SVG warnings before painting");
const painting = result.node;
```

Private, unreleased `2.0.0-poc.0`. Strict optional SVG subset adapting to native
painting, with `/tree` for immutable native VDOM. Exact core/geometry dependencies.
Unsupported SVG fails explicitly; this is not full SVG interoperability.
See repository `docs/native-api.md` and `REUSE.md`. Geometry's own tarball retains
its known Fontello MIT notice; algorithms are not copied into this package.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB.
No font assets are included. No publication is authorized.
