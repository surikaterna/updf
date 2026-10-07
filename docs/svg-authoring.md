# Typed SVG authoring and reusable native components

SVG authoring is a separate, optional module-scoped JSX language. It is neither
React/HTML DOM nor core document VDOM. Keep SVG and native document TSX in separate
modules, selecting each runtime with `jsxImportSource`. The checked examples live
in `tests/consumer/types/svg-graphic-template.tsx` and `svg-authoring-template.tsx`;
`npm run test:consumer` typechecks and executes them in clean external tarballs.

```tsx
/** @jsxImportSource @updf/svg */
// graphic.tsx
import { createSVGComponent, prepareSVGTree } from "@updf/svg/authoring";

const graphic = prepareSVGTree(
  <svg viewBox="0 0 20 10">
    <title>Logo</title>
    <rect x={2} y={3} width={5} height={4} fill="red" />
  </svg>,
);
export const Logo = createSVGComponent(graphic);
```

```tsx
/** @jsxImportSource @updf/core */
// native.tsx
import { Logo } from "./graphic.js";

export const document = (
  <document version={1}>
    <page width={200} height={100}>
      <Logo x={10} y={15} w={60} h={40} />
      <Logo x={90} y={10} w={100} h={70} />
    </page>
  </document>
);
```

All four target props are required and measured in PDF points. The factory captures
the authentic private handle once; props contain only the actual target, never
`graphic` data. Unknown props, accessors, nonfinite coordinates and nonpositive
dimensions reject. It produces a trusted synchronous core function component;
`lower` and `render` use ordinary native paths/groups, without registering an SVG
resource or attaching document references. Reuse needs no global cache.

## Preparation, sizing and diagnostics

`prepareSVGTree` snapshots plain structural SVG data, validates styles and geometry,
and freezes owned native command arrays once. It does not generate or parse XML.
JSX arrays/fragments flatten during bounded preparation, not recursive JSX factory
execution. Synchronous function components are trusted user code and run during
JSX construction; promise-valued output is rejected, never awaited. Input mutation
after preparation cannot change the painting. Spread/cloned/foreign handles reject
before any metadata getter is read.

`PreparedSvg.width`/`height` describe the intrinsic viewBox size (or positive root
width/height if no viewBox), not a placed viewport. Preparation does not compile at
a dummy viewport. Nested SVG viewport semantics are prepared once; the root's
transform operates around the **actual target center**, outside viewBox scaling
and inside placement/clipping. Placement only performs target-dependent matrix
arithmetic. Clipping is not redaction: hidden path data still exists in the PDF.

`compilePreparedSVG(graphic, { x, y, w, h })` returns frozen native painting plus
frozen diagnostics. Review every warning before intentionally accepting it.
`createSVGComponent` authenticates first and rejects warnings at binding with
`SVG_STYLE`, retaining the diagnostic path and optional span, and directs callers
to `compilePreparedSVG`. Structured diagnostics have paths and **no fabricated XML
source spans**. XML preparation preserves original UTF-16 source spans, including
entity-decoded attribute/CSS offsets.

## Supported language and XML compatibility

The typed intrinsics are exactly `svg`, `g`, `path`, `rect`, `line`, `circle`,
`ellipse`, `polygon`, `polyline`, `defs`, `style`, `title`, `desc`. `defs` is
styles-only and title/desc are inert. SVG attribute spellings such as `stroke-width`
are used, not React aliases. Style is the existing restricted CSS string grammar,
not a style object. Text painting, images, references, gradients, filters, scripts
and unsupported attributes fail rather than silently degrading. Numeric attributes
must be finite; numeric children are not accepted. The existing limits apply,
including aggregate 1 MiB UTF-8 structured attribute/text payload, 10000 elements,
bounded depth/arrays, 64 attributes and geometry command budgets.

Existing XML callers still use root `compileSVG` (reviewable warnings), `renderSVG`
(warning rejection), or `/tree` `Svg`/`createSVGTree` with string input. Root
`prepareSVG(xml)` prepares a reusable handle for `/authoring` compilation/binding;
it preserves the XML warning contract. `/authoring` has no `Svg`/`SvgProps` alias or
prepared `createSVGTree` overload. The SVG/core JSX namespaces are module-scoped,
not a new global ambient framework.

## Optional block and inline placement

The separate `@updf/svg/layout` entry exports `svgBlock(graphic, size)`,
`svgInline(graphic, size)` and the frozen tuple `svgAdapters` (block, then inline).
Both XML `prepareSVG` and structured `prepareSVGTree` produce the same authentic
handle type. Install the actual identities with `createExtensions(svgAdapters)`;
when using tables or other adapters, compose them with
`createExtensions([...svgAdapters, tableExtension, ...otherAdapters])`. Installation
is local to the Flow/measurement operation, not global. Missing/wrong identities
fail `KEY`; duplicate names/identities also fail `KEY`.

```ts
import { prepareSVG } from "@updf/svg";
import { svgAdapters, svgBlock, svgInline } from "@updf/svg/layout";
import { createExtensions, paragraph } from "@updf/layout";
const graphic = prepareSVG('<svg width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20"/></svg>');
const extensions = createExtensions(svgAdapters);
const children = [
  svgBlock(graphic, {}),
  paragraph({ children: ["Badge ", svgInline(graphic, { width: 20 })] }),
];
```

Pass `extensions` to the Flow or layout/measure options. The host still provides
its explicit text service/resources for paragraphs, including inline-only line
metrics. SVG adds no font implementation/provider. `svgBlock` is the default named
block role; no generic role prop or extra `<SvgBlock>` wrapper is required. Existing
`Block`, `Table.Cell` and `Paragraph` accept the corresponding descriptors. The
runnable, typechecked separate-runtime example is
`tests/consumer/types/svg-graphic-template.tsx` plus `svg-layout-template.tsx`; it
covers all three placements without requiring the fonts package. The showcase's
table and browser inline proof use these same public helpers alongside their other
installed adapters.

`SvgSize` contains only optional **positive finite** numeric `width`/`height`:

| Supplied size | Viewport selection |
| --- | --- |
| Both | Exactly the supplied width and height |
| Width only | Height from validated viewBox ratio, otherwise intrinsic pair |
| Height only | Width from validated viewBox ratio, otherwise intrinsic pair |
| Neither | Positive root width/height pair, not the viewBox size |

A viewBox alone therefore requires at least one size field. A partial intrinsic
pair does not supply an automatic viewport. Arithmetic must remain positive and
finite; missing automatic size or overflow/underflow fails `SVG_GEOMETRY` at the
stable `/SVG_VIEWPORT` path. Unknown keys fail `KEY`, present `undefined` and
accessors fail `TYPE`, invalid numeric dimensions fail `GEOMETRY`, under
`/SVG_VIEWPORT/size/...`. No implicit available-content-width, shrink-to-fit or
zero-size policy exists. Oversized blocks follow ordinary `LAYOUT_OVERSIZED`/
width `GEOMETRY` policy. Root numeric/unitless or `px` intrinsic values use the
existing coordinate interpretation; no DPI conversion is introduced. Public
`PreparedSvg.width`/`height` remain source viewBox dimensions, not this automatic
viewport metadata, which is private and cannot be forged.

Both explicit dimensions select a viewport, **not unconditional stretch**:
`preserveAspectRatio` meet/slice/none, root transform center and outer clipping use
the shared compiler unchanged. Inline advance is width, ascent is height, descent
is zero, baseline at the box bottom. Native ink is measured under the current
operation, then translated from local top-left to baseline coordinates; block
native output is validated by the existing host fragment protocol. Callbacks do
not retain operation services. Ordinary resources and native/source/output budgets
apply per occurrence. Final serialization enforces output byte caps.

Helpers authenticate before reading metadata and reject preparation warnings as
`SVG_STYLE`, preserving paths and XML spans like `createSVGComponent`. Placement
happens **before** descriptor creation. Props contain only an owned snapshot of
width/height and immutable native nodes, never the WeakMap handle (generic layout
snapshotting would lose its identity). Reusing a prepared graphic performs only
placement arithmetic, not source parsing, style resolution or geometry compilation.

`@updf/layout` is an exact-version **optional peer**, plus a workspace development
dependency for checked package builds. Root XML, native `/tree`, authoring and JSX
entries install/run without it and npm does not auto-install it. Importing `/layout`
when absent throws normal `ERR_MODULE_NOT_FOUND` (require: `MODULE_NOT_FOUND`);
there is no catch-and-ignore or dynamic global provider. `npm run test:consumer`
proves 14 clean tarball closures, including missing/present peer, no-font placement,
NodeNext/Bundler declarations without DOM/Node/React ambient types, separate SVG/core
TSX modules, and canonical ESM/CJS prepared-handle/adapter identities in both loader
orders. Core/layout/tables alone never import SVG.

## Parser-free consumer proof

Run `npm run build` and
`npx tsx --test tests/consumer/svg-authoring-graph.test.ts`. The proof bundles the
actual separate SVG/native TSX fixture through public browser package exports and
records esbuild parsed/retained module lists and minified byte counts. It asserts
no XML scanner/lexer is even reachable from authoring, one common SVG compiler,
no package source aliases or Node artifacts, an XML-only positive control without
the JSX runtime, and a non-SVG core control. Geometry's path-data parser is required
and is not an XML parser. Shared source-coordinate helpers contain no XML lexer.

## Reproducible cost comparison (#47)

Run `npx tsx --test tests/consumer/svg-cost-profiles.test.ts
tests/consumer/svg-string-cost.test.ts` after building. The profiles bundle public
**browser ESM** exports, not Node facades or source aliases, with esbuild minification
and ES2022. Gzip is measured for the entire bundle, not summed module gzip sizes.
XML and TSX fixtures author the same graphic (root transform, group stroke, rect,
path and title), accept a dynamic fill parameter, then both prepare, place and
render the same native document. Tests compare exact native nodes and PDF bytes
for red and blue; neither input is a static precompiled-document shortcut.

| Profile | Minified JS bytes | Gzip bytes | Parsed / retained modules |
| --- | ---: | ---: | ---: |
| No SVG: core render | 35,558 | 12,272 | 49 / 46 |
| XML only: prepare/place/render | 63,546 | 21,990 | 103 / 71 |
| TSX only: prepare/place/render | 61,962 | 21,407 | 101 / 71 |
| Both authoring inputs | 67,348 | 23,083 | 105 / 75 |
| Layout helpers export closure, no frontend | 115,908 | 37,582 | 214 / 121 |

TSX avoids XML scanning, not SVG geometry's numeric/path parsing. XML scanner/lexer
contribute 4,920 retained source-module bytes; structured preparation/runtime
contribute 3,311. Shared `comments.ts` is CSS comment processing, not XML scanning.
The combined profile retains one compiler and one prepared registry. The tests
report each retained module's bytes and enforce live negative controls: deliberately
exporting the XML compiler from the TSX entry must fail the parser-free guard.
The helper closure contains neither XML modules nor SVG JSX/structured frontend;
its larger absolute size includes the existing layout protocol, not an extra SVG
parser. A separate layout/tables-without-SVG control excludes SVG entirely.

The historical XML regression uses frozen SVG source from
`21dcd483dcd84961a24f5823e95a586ea25dd534`, emitted to browser ESM in memory with the
same TypeScript and unchanged dependencies. The exact exported `compileSVG` operation
is 31,880 → 32,657 bytes (gzip 11,416 → 11,734; parsed 93 → 94, retained 35 → 36).
An identical dynamic graphic plus `compileSVG`/render API is 62,769 → 63,546 bytes
(gzip 21,650 → 21,980), with exact PDF-byte parity for both colors. This is the
old-string baseline, not a fabricated historical TSX API. The new XML prepare/place
profile has the same minified size but a slightly different gzip due to the exported
consumer function/input arrangement. The +777-byte old-string cost includes reusable
preparation/private metadata. No-SVG core remains unchanged. These are measured
fixture-specific bundle costs, not timing benchmarks or universal package weights.
