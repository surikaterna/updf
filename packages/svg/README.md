# @updf/svg

## Public API inventory

| Entry / exports | Declaration owner | Contract |
| --- | --- | --- |
| root: `compileSVG`, `renderSVG`, `prepareSVG` | `src/index.ts` | XML shape subset; explicit warning review versus warning rejection; reusable preparation |
| root: `SVGTarget`, `SVGCompilation`, `SVGDiagnostic` | `src/types.ts` | Point viewport, frozen result, original-source UTF-16 warning spans |
| root, `/authoring`: `SVGError` | `src/error.ts` | Core DocumentError subclass; XML spans when available, structured paths otherwise |
| `/tree`: `Svg`, `createSVGTree`, `SvgProps` | `src/tree.ts` | Native VDOM equivalents using renderSVG's warning-free contract |
| `/authoring`: `prepareSVGTree`, `compilePreparedSVG`, `createSVGComponent` | `src/authoring.ts` | Parser-free structured preparation, explicit diagnostic review, target-only bound native component |
| root, `/authoring`: `PreparedSvg` | `src/prepared.ts` | Private-owned immutable reusable painting handle, frozen diagnostics and intrinsic size |
| `/authoring`: `SvgElement`, `SvgNode` | `src/authoring-types.ts` | Structured SVG data, not core VDOM or XML strings |
| `/authoring`: `SVGCompilation`, `SVGDiagnostic`, `SVGTarget` | `src/types.ts` | Native compilation, optional source spans, required x/y/w/h in points |
| `/jsx-runtime`: `jsx`, `jsxs`, `Fragment`, `JSX` (type namespace) | `src/jsx-runtime.ts` | Module-scoped automatic SVG JSX runtime; synchronous trusted components |
| `/jsx-dev-runtime`: `jsxDEV`, `Fragment`, `JSX` (type namespace) | `src/jsx-dev-runtime.ts` | Development runtime; source bookkeeping does not invent XML spans |
| `/layout`: `svgBlock`, `svgInline`, `svgAdapters` | `src/layout.ts` | Warning-free prepared painting to owned fixed block/inline descriptors; frozen tuple of exact adapter identities |
| `/layout`: `SvgSize` | `src/layout-size.ts` | Optional positive finite point width/height; viewBox ratio for one dimension, positive intrinsic pair for neither |

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
Limits include 1 MiB UTF-8 XML source (or aggregate structured attribute/text payload),
10000 elements, depth 64 and per-path budgets.

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
For typed SVG TSX, reusable target-only components and diagnostic guidance, see
[`docs/svg-authoring.md`](../../docs/svg-authoring.md). `/tree` remains the XML-string API.

## Optional flow placement

```ts
import { prepareSVG } from "@updf/svg";
import { svgAdapters, svgBlock, svgInline } from "@updf/svg/layout";
import { createExtensions, paragraph } from "@updf/layout";
const graphic = prepareSVG('<svg width="20" height="10"><rect width="20" height="10"/></svg>');
const extensions = createExtensions(svgAdapters);
const children = [svgBlock(graphic, {}), paragraph({ children: svgInline(graphic, { width: 10 }) })];
// Supply extensions to Flow or layout/measure options; text uses the host's explicit text service.
```

Only `/layout` requires the exact-version optional `@updf/layout` peer. Root XML,
`/tree`, `/authoring` and both JSX runtimes install and run without layout, text or
fonts. npm does not auto-install the absent optional peer. Importing `/layout`
without it throws Node's ordinary `ERR_MODULE_NOT_FOUND` (`MODULE_NOT_FOUND` for
require), like the optional Fontkit provider; the library does not swallow it.
Helpers never parse XML, import the SVG JSX runtime, or store a private handle in
descriptor props. Each descriptor owns placed native nodes; normal layout validation,
resources and source/output quotas still apply. No available-width scaling occurs.
Both dimensions mean the exact viewport, preserving source meet/slice/none semantics.
Missing/overflowing inferred dimensions fail `SVG_GEOMETRY` at `/SVG_VIEWPORT`;
invalid fields retain core `TYPE`, `KEY` or `GEOMETRY` under that path.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB.
No font assets are included. No publication is authorized.
