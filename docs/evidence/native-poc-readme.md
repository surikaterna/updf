# Declarative PDF / CMR TypeScript 2.0 architectural proof

**Step2 native painting + optional SVG subset implemented; new scope awaits audit.**
The seven SVG audit must-fixes are implemented with regressions; re-audit is pending.
The prior integrated87-file POC was independently audited. PASS1 primitives and
PASS2 optional SVG/XML/style adaptation are now integrated. Images remain deferred;
the Diplomat-owned roadmap directory and root/monorepo files are untouched.
Immutable VDOM/native TSX, parser-independent prepared fonts/full embedding and
isolated optional Fontkit preparation are integrated. Real Node/Chromium Unicode
parity is exercised. No-font Helvetica behavior and its reference digest remain
unchanged. This remains an experimental subset, not an operational CMR release.

## Optional SVG subset

```ts
import { renderSVG, compileSVG } from '@updf/declarative-poc/svg';
const node = renderSVG(source, { x: 40, y: 40, w: 200, h: 100 });
const bytes = render({ version: 1, pages: [{ width: 595, height: 842, children: [node] }] });
```

The optional `/svg` entry returns a new immutable native paintGroup AST, with
target-space clip outside source viewBox/transform. `/svg-tree` provides Svg
Component/source+x+y+w+h props and createSVGTree for native TSX/VDOM; no callbacks,
DOM/React/parser types in the public declarations. Only those entries import
XML/CSS/path-string scanners. Core/VDOM/ordinary app/Fontkit graphs exclude SVG.

Supported: svg/g/path/rect (rounded)/line/circle/ellipse/polygon/polyline,
defs containing style only, and inert text-only title/desc. Full path normalization
comes from PASS1. Transform attributes support matrix/translate/scale/rotate
(optional center)/skewX/skewY, exact arity and SVG postmultiplication order.
Outermost SVG transforms act outside viewBox scaling around the initial viewport
center (50%/50%); caller placement/clip stays outside that root transformation.
Unitless/px scalar geometry only; points/viewBox/transform lists are numeric.
No viewBox requires positive intrinsic width/height. Default xMidYMid meet,
all Min/Mid/Max meet/slice alignments and none are supported. Nested svg has its
own clipped viewport; it may extend only under a bounded ancestor clip.

CSS is deliberately limited: simple .class rules (comma alternatives), multiple
class tokens, equal-specificity document source order, presentation attrs then
class then inline overrides, inherited paint and visibility, display:none.
Supported fill/stroke/null RGB palette/rgba, opacity, fill rule, width/caps/joins/
miter/dash/offset match native painting. Overall element/group opacity other
than1 is rejected, **not** distributed across descendants. Unknown CSS/style/
visual attrs, pseudo/combinator/at/important rules fail; no external references.
The one legacy compatibility case is invalid CSS `stroke:'none'`: compileSVG
discards it (not normalizes it) and returns a frozen warning with original source
span/path, leaving inherited/presentation stroke intact. renderSVG throws on
warnings, directing callers to explicitly inspect/accept compileSVG diagnostics.

XML is fully consumed, with proper names/hyphens/colons, quoted duplicate-checked
attributes, predefined/numeric entities, comments, optional XML1.0 UTF8 header
and CDATA styles. A root without xmlns defaults to the adapter's SVG vocabulary;
Style text concatenates across comments/CDATA; decoded-to-original character
boundary maps retain exact entity-expanded source spans. Generic VDOM remapping
preserves those spans without importing SVG parsing into VDOM.
declared/prefixed namespaces must be SVG (xlink declaration may be inert, references
still fail). DTD/entity declarations, other processing instructions, scripts/events,
use/images/SVG text, gradients/filters/masks/clipPath and unknown features reject.
No filesystem/network/entity resolution. Errors are SVGError/DocumentError with
JSONPointer-like logical paths and original UTF16 source spans; mapped geometry
errors retain their source attribute/element range. Budgets:1MiB UTF8 source,
64 XML depth,10000 elements/emitted native nodes,64 attrs/node,1000 class selectors,
128 transform operations and100000 total commands, plus PASS1 per-path limits.

Unbranded original logo-like/signature-like fixtures reproduce only observed
legacy feature families, never customer artwork. Reuse/correctness ledger is
svg/REUSE.md. Native Chromium SVG image versus Poppler PDF comparisons run at
matching144dpi: bbox<=1px, 1px antialias edge band, interior threshold3/255 and
<=0.5% mismatch. All foreground pixels also participate in symmetric1px coverage/
color matching (white-composited contrast hue distance<=0.08), <=0.5% weighted
foreground mismatch and <=3% ink-mass delta. Thin wrong-color/missing/moved strokes
cannot hide in the excluded edge band or large white ROI. Negative controls also
reject opacity loss. Actual reports/pairs of PNGs are retained; this is not a blind
golden or a claim of full SVG interoperability. Images and monorepo migration are
not implemented by this slice.

## Native painting and optional reusable geometry

The AST/TSX vocabulary adds `path` and `paintGroup`. Path commands are readonly
move/line/cubic/close data (signed finite coordinates), never raw PDF strings.
Paths default black fill/no stroke. Rect/line gain optional `paint`/`transform`;
absent both, the exact prior black0.5-point stroke byte branch is retained.
`Paint` uses normalized RGB tuples or explicit null, independent fill/stroke
opacity, width, nonzero/evenodd rule, cap/join/miter, dash and offset. Width0
disables stroke (not a PDF hairline); odd dashes repeat, nonempty all-zero or
negative dashes fail, offsets normalize to their finite period.
Normalization adds the period only to a negative remainder, avoiding overflow
from large positive remainders; representability failures remain structured errors.

Six-coefficient affine uses x'=a*x+c*y+e,y'=b*x+d*y+f. Signed/reflected transforms
are valid; singular or nonrepresentable determinants/composition/coordinate
overflow fail. `paintGroup` is distinct from the existing translation-only VDOM
`group`: it keeps recursive drawing/text children, an optional affine and local
rectangular clip. Root clip must be page-bounded; nested clips stay bounded by
their ancestor clip even when a nested viewport extends beyond it;
outside child geometry is allowed under that bounded clip. There is no paint
inheritance or SVG group-opacity compositing. Per-node/group q/Q isolates alpha,
colors, widths/dashes, transforms and clips; text remains upright in top-left
coordinates. The page flip is applied once (Fpage*M), not to every child point.

Native bounds use actual transformed cubic derivative extrema, not control
polygons. Stroke bounds are deliberately conservative: half width times a
Frobenius stretch upper bound, cap extension and join/miter limit. This may
reject tight un-clipped stroke placement; choose adequate margins/bounded clip
or an appropriate join, never implicit shrink/clip. Paths cap4096 commands/node,
100000 commands/document; recursive containers share10000-node/128-depth limits.
ExtGState opacity pairs are local/deterministic and registered only when used,
after font objects, so unused painting cannot shift old font ids or CMR digests.

`/geometry` is a separate optional string/helper entry shared by the SVG adapter:
strict full-consuming M/L/H/V/C/S/Q/T/A/Z scanner/normalizer (both cases),
attributed Fontello arc math, immutable polygon/ellipse and limited strict
hex/rgb/rgba color parsing. Quadratics become actual cubics; reflection tracks
source-command families; close resets current point; negative/zero radii,
coincident endpoints and compact0/1 flags are explicit. No legacy hooks,
caller-array mutation, console-skip or permissive regex token omission.
The string scanner/normalizer is absent from core/VDOM/app graphs. `/painting`
exposes native types/affine helpers only. No new external dependencies.
Function-level reuse/licensing/correctness assessment is in geometry/REUSE.md,
with the full pinned upstream MIT notice in geometry/LICENSE.svgpath. No project
copyright holder/year was invented when a standalone notice could not be recovered.

Native proof: `node experimental/declarative/dist/examples/painting-proof.js`
writes the ignored painting-proof.pdf. Independent qpdf/Poppler pixel regressions
exercise holes, colors/alpha, clips, affine reflection/skew, dash and state isolation.
The optional SVG subset above adapts onto these primitives; images remain deferred.

## Optional Fontkit entry

```ts
import { prepareFont } from '@updf/declarative-poc/fontkit';
import { render } from '@updf/declarative-poc';
const font = prepareFont(ordinaryUint8ArrayTTFBytes);
const pdf = render(documentWithFontIdDemo, { resources: { Demo: font } });
```

Install `fontkit@2.0.4` only when using that entry. It is an **optional peer**,
with peerDependenciesMeta optional=true, and a pinned development dependency for
tests. It is neither a mandatory nor optionalDependencies runtime install. React
is also development-only fixture tooling. The packed production-only consumer
proves root/VDOM/fonts/TSX compile and execute with Fontkit and React absent.
Root/fonts/VDOM/JSX never import or reexport the adapter. The adapter's emitted
declaration refers only to project PreparedFont/Uint8Array types, not Fontkit or
Node Buffer types. Its private API declaration reflects the actual public create
API accepting Uint8Array; public results are checked as unknown, without casts.

Before parser invocation: ordinary non-shared byte storage and4MiB cap, owned
copies, single-face sfnt signature, bounded unique nonoverlapping table directory,
required head/hhea/maxp/hmtx/loca/glyf/cmap/name/post/OS2 tables, versions/magic,
glyph/metric/outline offsets and cmap lengths/ranges/inventory. Directory/cmap
encoding records are capped128; inventory65535 (BMP sentinel tolerated), mapping
and glyph budgets remain bounded. Supported cmap formats0/4/6/8/10/12/13/14;
other legacy encodings fail clearly. TTC/WOFF/WOFF2/OTTO-CFF, CFF/CFF2 tables,
variation tables and color/bitmap tables are rejected. OS2 restricted/bitmap-only/
unknown rights bits forbid embedding; preview-print/editable allowed, and
no-subsetting is honored by full embedding. Only static single-face glyf TrueType.

The adapter uses public Fontkit `create`, characterSet, glyphForCodePoint and
metrics/bbox APIs, **never layout/shaping** or private parser internals. It filters
unsupported inventory scalars/controls and skips unmapped GID0; selected text
still errors on missing glyphs. Outward-rounded actual bounds preserve ink.
Parser failures become DocumentError FONT_FORMAT; rights failures FONT_RIGHTS.
No locale/format-registration settings are mutated by the adapter. Parsing and
PDF viewing are **not a malicious-font sandbox** or a guarantee of universal font
compatibility; complex outlines/hints can consume parser work despite byte caps.
The supported text profile still excludes shaping, bidi and combining sequences.

The public Fontkit package export resolves Node's module entry in Node and its
browser-module entry in Vite/Chromium. Actual graphs check this selection. Stock
Fontkit's optional closure is substantial and includes unused shaping/format
machinery; we do **not** claim all internals tree-shake away. Isolation keeps
that closure out of core/VDOM/fonts/ordinary React app, with separate measured
adapter and font-browser bundles plus separate TTF asset sizes.

`createUnicodeCmrDocument(font)` in `/cmr-unicode` uses the existing VDOM CMR
components with an explicit font on **every text node**, English labels and
Cyrillic fixture addresses/instructions. Cell sizes/5-point labels/6-point body
are unchanged and fit under strict measured-box checks; no clipping/shrinking.
All previous source geometry/omissions and the non-operational footer remain.

## Prepared fonts (parser-independent)

```ts
import { createPreparedFont, type PreparedFontInput } from '@updf/declarative-poc/fonts';
// Host supplies trusted, statically prepared metrics and ordinary Uint8Array bytes.
const font = createPreparedFont(preparedData satisfies PreparedFontInput);
const resources = { Demo: font };
const bytes = render(documentWithTextFontDemo, { resources });
// For native TSX: render(lower(tree, { resources }), { resources }).
```

`TextNode.font?: string` is a case-sensitive resource reference. Omitted or
`Helvetica` uses the built-in ASCII font; that id cannot be overridden. Every
character, including ASCII, uses the selected font: unknown ids/missing glyphs
are explicit errors, never fallback/.notdef/transliteration. Documents contain
only ids, not programs; frozen JSON-roundtripped ASTs work with separate host
resources. Native text accepts the same optional font property. Lowering validates
with the provided resources and derives frozen component id/kind metadata only.

`createPreparedFont(input: unknown)` validates version1/static-truetype, byte/
mapping budgets, ordinary data descriptors/prototypes, finite integer ranges,
descriptor bounds/name/flags, glyph bounds, unique Unicode scalars and nonzero
GIDs below glyphCount. It returns an opaque branded handle with deeply frozen
metadata; WeakMap ownership rejects forged/copied handles. Private program bytes
are defensively copied only after budgets/metadata checks. They are never exposed;
serializer access also copies. Typed arrays are **not** frozen. Ordinary non-shared
Uint8Array backing bytes are read intrinsically (no shadowed getters/species);
Buffer/class byte views are not accepted. Byte-view side properties are ignored.

Prepared data is a **trusted preparation boundary, not a font-file sanitizer**:
the core neither parses TTF nor proves program/metrics/rights correspondence or
classifies an arbitrary binary. Format and embedding rights are checked prepared
metadata claims. Only prepare known static single-face glyf TrueType data; CFF,
WOFF/TTC, variable/color fonts are outside the contract. Raw binary format/table/
OS2 classification belongs to the isolated optional adapter, not this entry. Allowed
rights are installable/editable/preview-print; restrictions/bitmap-only claims
are rejected. The real fixture's installable fsType0 was independently prepared.

Selected-font text supports simple LTR Unicode Latin/Cyrillic plus common
punctuation, math/currency/number symbols and space separators. Only LF breaks
lines; wrapping still breaks at ASCII spaces, not NBSP or arbitrary separators.
Combining marks/sequences, bidi/format controls, variation selectors, joiners,
unsupported scripts and lone surrogates fail explicitly. Precomposed letters
are allowed if mapped. There is no normalization, shaping, kerning or ligature
substitution. Supplementary Latin scalars are supported with UTF16BE ToUnicode.

Measurement uses actual unkerned advances and glyph ink bounds, not Helvetica
metrics. The union of selected ascent/descent is centered within each full
lineHeight box; n lines still reserve n * lineHeight. Ink taller than lineHeight
or horizontal overhang outside the aligned box is FONT_INK, not clipping/shrink.
This is vector-ink containment; renderer hinting/pixel rounding is not a universal
font-sanitization guarantee. Extra line spacing leaves conservative leading;
real top-edge/multiline raster regressions validate the licensed fixture.

Limits:8 font ids,4MiB/program,8MiB aggregate by resource entry (aliases count),
65535 unique scalar mappings/font, CID0 reserved, final PDF10MiB. Glyph0 is never
mapped. Full programs are embedded, not subsetted. The writer emits Type0
Identity-H/CIDFontType2, FontDescriptor/FontFile2, CIDToGIDMap, /W and ToUnicode.
CIDs are assigned locally by first codepoint use, **not GID**, so aliases extract
distinct Unicode. Both mixed-font and multipage output are deterministic.
FONT_DATA/FONT_RESOURCE/FONT_PROFILE/FONT_INK/GLYPH_MISSING diagnostics include
data/font-reference/text paths; missing-glyph messages name the font and U+scalar.

The unmodified, pinned Liberation Sans2.1.5 fixture and matching SIL OFL1.1 are
in `fixtures/fonts/`; provenance/digests and FontTools4.61.0 developer-only
preparation are documented there. No MDS font or parser is copied. The real
Node proof embeds the complete source program, verified by its extracted hash.

## Immutable VDOM and native TSX

```tsx
/** @jsxImportSource @updf/declarative-poc */
import { lower, type Component } from '@updf/declarative-poc/vdom';
import { render } from '@updf/declarative-poc';

const Heading: Component<{ readonly title: string }> = ({ title }) =>
  <text x={0} y={0} width={200} height={24}
    fontSize={10} lineHeight={12} align="left">{title}</text>;
const tree = <document version={1}><page width={595} height={842}>
  <group x={40} y={40}><Heading title="Native TSX PDF" /></group>
</page></document>;
const bytes = render(lower(tree));
```

The `/vdom` entry exports typed `h`, `Fragment`, `Component<Props>`, `bind`,
`definePrimitive` and `lower(tree, options): DocumentDefinition`. `h` is the
explicit-construction alternative to TSX. A component is a synchronous pure
function of **deep-readonly declared props** and immutable `context.resources`
metadata (id/kind only, no bytes or serializer). Children are inferred from a
component's declared props, never universally injected. `bind` captures complete
data props and still expands afresh in the local lower context.

The `/jsx-runtime` and `/jsx-dev-runtime` entries provide jsx/jsxs/jsxDEV and
Fragment using the same constructors. Their type-only **module-local** JSX
namespace is closed to document/page/group/text/rect/line/path/paintGroup. It does not augment
global/React JSX. Both `<>` and explicit `<Fragment>` are supported. Keys are
optional string/finite-number metadata, not component props or serialized data;
there is no key-based reconciliation. Dev source/self metadata is discarded.
Source self-package JSX resolution is configured for TS/tsx and Vite to use the
same source ownership module; installed consumers use the built package exports.

Construction copies/freeze-owns ordinary props, nested objects and arrays;
it **never freezes caller objects**. Frozen library-created nodes can be reused
as DAGs. Accessors, nonenumerable fields/indices, sparse/custom-prototype arrays,
class instances, arbitrary callbacks/symbols/bigints in data props are rejected.
The sole generic snapshot type reassociation follows checked shape-preserving
copying; there are no `any` casts. Library-created nodes/definitions have private
ownership brands, not a global registry or render-result cache.

After expanding components/installed primitives, hierarchy is document -> pages
-> drawing/groups. Arrays and fragments are transparent; null/undefined/booleans
are ignored. Groups apply **translation only**, with optional signed finite x/y
(omitted means0). Both line endpoints translate. All final geometry is validated
by the flat backend. Text takes either `text` or children, not both.
Text children may be arrays/fragments/components resolving solely to strings;
drawing/styled rich-text children and numeric coercion are rejected. Text
concatenation is bounded to4096 characters before materializing larger strings.
Strings outside text are errors. TSX erases tag identity, so runtime hierarchy
checks remain essential even with typed intrinsic props.

`definePrimitive(name, predicate, expander)` returns an uppercase `.Type` wrapper
and immutable `.definition`. The predicate narrows unknown snapshot data; the
pure expander returns VDOM, not PDF commands. Install specific definitions in
`lower(tree, { registry: [definition] })`; uninstalled instances, duplicate names,
forged definitions and native overrides are errors. Registries/context/budgets
are freshly local per call; no global type augmentation or installation API.
Extension predicates/expanders and component functions are **trusted pure code**.

Lowering checks maximum depth128 and10000 visited/expansion units **before**
descending/invoking further components, and active-path cycles (DAG reuse is
allowed). Ignored values, arrays, fragments and text expansion consume units.
Snapshots have separate bounded safety caps:128 data depth,250000 copied values
and100000 string characters. A budget cannot interrupt an infinite loop *inside*
a trusted component; this is not a sandbox. Promises/unrecognized results fail
the data/node checks. Structured DocumentError paths begin at `/tree`, include
expansion/props locations, and remap final AST diagnostics to their VDOM origins.
`renderUnknown` remains exclusively a flat-data boundary: it never expands or
executes VDOM functions. Lowered output is a new deeply frozen JSON-safe AST.

`examples/cmr-tree.tsx` provides reusable Cell/MainGrid/GoodsGrid/CmrPage and
`createCmrTree(data)`. The original `createCmrDocument` stays an independent flat
reference. Tests require exact AST equality and the pinned Helvetica PDF hash.
The compiled CLI and React fixture now use the component tree; the HTTP/reference
bytes remain identical. CMR subset geometry/omissions below are unchanged.

Experimental, non-operational, independently auditable subtree. No legacy
runtime imports, mutation hooks, external PDF engine, editor, CodeMirror,
language tooling or Kalada dependency. Core/VDOM/prepared-font entries are
runtime-parser-free; the isolated optional Fontkit adapter parses supported TTFs.
Root packaging/source/tests are unchanged; this is not a replacement UPDF release.

## Public API

```ts
import { render, type DocumentDefinition } from './index.js';
const document = {
  version: 1,
  pages: [{ width: 595, height: 842, children: [
    { type: 'text', x: 40, y: 40, width: 200, height: 24,
      text: 'Hello PDF', fontSize: 10, lineHeight: 12, align: 'left' },
    { type: 'rect', x: 40, y: 70, width: 200, height: 50 },
    { type: 'line', x: 40, y: 130, x2: 240, y2: 130 },
  ] }],
} satisfies DocumentDefinition;
const bytes = render(document);
// bytes is a binary Uint8Array, synchronously, in Node and browsers.
```

Native templates are pure TypeScript functions returning readonly
`DocumentDefinition`, not a new DSL. `types.ts` exports readonly discriminated
DocumentDefinition/PageDefinition/TextNode/RectangleNode/LineNode/NodeDefinition,
TextAlign and closed diagnostic-code types from the public entry. The CMR entry
exports typed `createCmrDocument(data: CmrData)` and `cmrFixture satisfies CmrData`;
CmrData/CmrGoodsRow are also type exports of the root entry. Fields are required
except the explicit optional font id, enabling completion and typo/shape checks.
`satisfies` preserves discriminants but does not itself make a mutable literal
readonly; a DocumentDefinition annotation/return type provides that API view.

`render(document: DocumentDefinition, options?: RenderOptions): Uint8Array<ArrayBuffer>` is the typed
native API. `renderUnknown(input: unknown, options?: RenderOptions)` is the explicit JSON/untrusted-data
boundary, using exactly the same runtime validation and structured errors.
Types do **not** prove finite geometry, bounds, Unicode repertoire or resource
caps: both entry points always validate those at runtime. There are no branded
number tricks, unchecked JSON casts, implicit string coercions or mutation hooks.

Production emits `.js` ESM, `.d.ts`, declaration maps and source maps to ignored
`dist/`. Source imports explicitly end in `.js`: NodeNext resolves them to TS
while checking, and compiled Node ESM resolves them without a TS runtime loader.
After building, package exports expose `@updf/declarative-poc` and its `/cmr`
entry with declarations; this private POC package is not a published release.
No TypeScript compiler/tsx dependency exists in the emitted PDF runtime graph.

All keys shown are required. No extra keys or other node types are accepted.
Coordinates are top-left PDF points, not pixels. Dimensions/fontSize/lineHeight
are finite and positive; positions are finite and nonnegative. Boxes and line
endpoints must fit on the page; lines must have nonzero length. Stroke is fixed
black, 0.5 points for unstyled legacy rect/line; styled painting is described above.
Legacy stroke centers may touch page edges; new painting checks conservative ink.
Built-in regular Helvetica is the default; align is left/center/right.
lineHeight is an **absolute point distance**, at least fontSize, not a ratio.

Inputs are plain data objects with enumerable own data fields and dense ordinary
arrays with enumerable own indices (standard Array.prototype only). Array
subclasses/custom or null prototypes, nonenumerable fields/indices, accessors,
class instances, unsupported keys and cycles are rejected before traversal.
Frozen input, shared nodes, input reuse
and JSON roundtrips work. `render` treats caller data as immutable, never adds
layout fields, and allocates a new measured plan and output for every call.
The API is intended for JSON-like data, not executable/proxy objects.

Errors are `DocumentError` with `diagnostics: [{ code, path, message }]`; path
is an escaped JSONPointer, with `''` meaning document root. The first error is
reported deterministically; this is not an all-errors validator. Codes include
TYPE, KEY, VERSION, VALUE, GEOMETRY, BOUNDS, CHARACTER, LIMIT, TOKEN_OVERFLOW and
VERTICAL_OVERFLOW. Unsupported cycles fail schema/type checks without recursive
graph traversal. No rendering occurs before the entire schema is validated.

**Without a selected prepared font, only printable ASCII and LF are accepted.**
Cyrillic needs an explicit prepared resource. Tabs, CR, DEL and other controls
fail explicitly. There is no transliteration,
fallback font or silent replacement. Empty text emits no lines. Explicit LF
preserves empty lines; a trailing LF adds a line. Wrapping uses runs of spaces
and non-space tokens, preserving spaces, with no hyphenation or word splitting.
Even a space run must fit. A token that cannot fit or too many lines is an
error: no clipping, shrinking, ellipsis or automatic page creation.

Widths use standard Helvetica regular ASCII metrics at 1/1000 em, adapted
from the legacy `src/font/helvetica.js` repertoire with its rounded 1/100 em
values restored to full standard-font precision. The font dictionary explicitly
uses WinAnsiEncoding: ASCII apostrophe maps to quotesingle (191 units), and
backtick to grave (333 units), not StandardEncoding's curly quote glyphs.
No kerning is applied in either measurement or PDF `Tj`. Baseline is **0.775 em**
below each line top, reserving the supported repertoire's maximum ink ascent
775 units and descent225 units (bar spans both; dollar also reaches775).
These are glyph-bounds extrema, not the font's Ascender718/Descender207.
Each line reserves a full lineHeight; surplus above fontSize is bottom padding.
For n lines, height must contain n * lineHeight, including empty LF lines.
fontSize=lineHeight=height is valid for one line and contains the ASCII vertical
ink envelope exactly; lineHeight>=fontSize also prevents multiline ink overlap.
No automatic padding/shrink is added. Widths remain advance-width boxes (some
glyphs have horizontal ink overhang); this is not a horizontal ink-box API.
The audit fix intentionally moves all baselines down0.057 em; CMR geometry,
font sizes and line capacity are unchanged. This section describes built-in
Helvetica; prepared-font measurement/embedding is described above.

Limits: 20 pages, 10,000 total nodes, 4,096 characters per text node,
100,000 total text characters and 10 MiB output. Arrays/text are capped before
measurement; streams are budgeted while building; output allocation happens
once, after exact byte counting and the final size check. Limits bound memory,
but this synchronous API is not a time-isolated service for arbitrary workloads.

## Pipeline and portability

`validate -> measure (new plan) -> private serializer`. Core graph is only
`index.ts`, `types.ts`, `core/*.ts` and `fonts/*.ts`, with no runtime parser dependencies, Node built-ins,
Buffer, process, DOM, network or filesystem. Node built-ins occur only in
example adapters, tests and measurement tooling. The browser uses this same
graph, not a second PDF implementation or shim.

PDF 1.4 output uses private typed names versus escaped caller literals, plain
uncompressed streams, decimal numbers without exponent notation, a binary
header, exact stream byte lengths, xref offsets and startxref. There are no
timestamps or document IDs; identical documents produce identical bytes.
No fonts from MDS were copied (their licensing has not been established).
MDS's modern writer/external dependency is not required by this implementation.

A future Kalada compiler could target this versioned data contract. That is
an integration direction, not a dependency or a speculative shared package.
Async loading/images would require a separate contract; host-prepared font
resources are synchronous and contain no resource-loading callbacks/hooks.

## Named CMR V1 upper-form subset

`examples/cmr.ts` exports pure typed `createCmrDocument(data)` and frozen synthetic
`cmrFixture`. The factory returns fresh plain data and never draws or renders.
Its input is the fixture's named shape: sender, terminal, consignee, shipment,
trip, delivery, carrier, takingOver, successiveCarriers, attachedDocuments,
reservations, instructions, payment, liability, conditions, totalWeight, and
goods rows with marks/packages/packing/dimensions/nature/statistical/weight/volume.
Display values are ASCII strings supplied by the caller; the factory is not a
domain validator or translator. Unsupported display characters fail in render.
It displays supplied totals; it does not calculate or certify freight totals.

Reference: `/home/sprawl/projects/lynx3/packages/modules/cmr_dwb/src/document.ts`,
`getV1Document`, specifically main rows at lines 157–239, goods at 240–305,
instructions at 306–338. Helper context is the adjacent `utils.ts`, notably
font sizes 5/6 and address/infoBox/table helpers at lines 53–114.

Fixed requested geometry: A4 595x842, content width 515 at x40. Paired rows
start at y64, heights 64/63/63/63/83, split at x297.5. Goods at y400, height102,
widths 84.375/44.375 followed by six 64.375 columns. Instructions at y502,
height99; the right column has three 33-point sections. Fields 1–10 preserve
the paired sender/terminal, consignee/shipment-trip, delivery/carrier,
taking-over/successive-carriers, documents/reservations arrangement. Goods
fields11–18 display two synthetic rows and supplied weight total. Fields19–22
display instructions/payment/liability/conditions.

Intentional non-parity: the source combines margins, a 24-point legal-text
block and a table `top:5`; this proof fixes the user-specified y64 instead of
claiming the legacy composed offset is identical. Text inset/baselines are
explicit (3-point label inset; content at cell y+22), not legacy whitespace and
absolute-style mutation. Labels are explicit abbreviated English, not the
translation catalogue; packing-list/statistical/payment/liability/conditions
fixture values are demonstrative, including cells blank in the source.
Goods height is fixed102, not source-derived multipage packageRowHeight.

Omitted from the CMR subset: Code39 barcodes, logos, signatures/stamps, photos, legal text, lower
form (fields23 onward), domain mapping and carrier hardcoding, localization,
exchange/pallet reports, multipage CMR behavior and a general table/layout engine.
The independent Helvetica reference omits custom/embedded fonts; the integrated
prepared-font backend and optional Fontkit/Unicode CMR example support full TTF embedding.
Core supports multiple explicit pages; this CMR subset is deliberately one page.
Footer: **Experimental CMR subset - not operational**.

## Reproduce gates

From `/home/sprawl/projects/updf/trees/declarative-cmr-poc`:

```sh
npm ci --prefix experimental/declarative --ignore-scripts
npm run typecheck --prefix experimental/declarative
npm run lint --prefix experimental/declarative
npm run build --prefix experimental/declarative
npm test --prefix experimental/declarative
npm run build:browser --prefix experimental/declarative
npm run build:core --prefix experimental/declarative
npm run build:vdom --prefix experimental/declarative
npm run build:geometry --prefix experimental/declarative
npm run build:svg --prefix experimental/declarative
npm run build:fonts --prefix experimental/declarative
npm run build:fontkit --prefix experimental/declarative
npm run build:font-browser --prefix experimental/declarative
npm run test:browser --prefix experimental/declarative
npm run test:font-browser --prefix experimental/declarative
npm run test:svg-browser --prefix experimental/declarative
npm run test:consumer --prefix experimental/declarative
npm run check:graphs --prefix experimental/declarative
npm audit --prefix experimental/declarative
node experimental/declarative/dist/examples/font-proof.js
node experimental/declarative/dist/examples/painting-proof.js
node experimental/declarative/dist/examples/svg-proof.js
mkdir -p experimental/declarative/artifacts
node experimental/declarative/dist/examples/cli.js experimental/declarative/artifacts/cmr.pdf
node experimental/declarative/dist/examples/fontkit-cli.js experimental/declarative/artifacts/cmr-unicode.pdf
qpdf --check experimental/declarative/artifacts/cmr-unicode.pdf
pdffonts experimental/declarative/artifacts/cmr-unicode.pdf
pdftotext -layout experimental/declarative/artifacts/cmr-unicode.pdf experimental/declarative/artifacts/cmr-unicode.txt
pdftoppm -scale-to 1800 -singlefile -png experimental/declarative/artifacts/cmr-unicode.pdf experimental/declarative/artifacts/cmr-unicode
qpdf --check experimental/declarative/artifacts/cmr.pdf
pdfinfo experimental/declarative/artifacts/cmr.pdf
pdftotext -layout experimental/declarative/artifacts/cmr.pdf experimental/declarative/artifacts/cmr.txt
pdftoppm -scale-to 1200 -singlefile -png experimental/declarative/artifacts/cmr.pdf experimental/declarative/artifacts/cmr
npm run sizes --prefix experimental/declarative
git diff --check
```

Requires Node24, npm, installed `/usr/bin/chromium`, qpdf and Poppler tools.
Playwright is local fixture tooling, not a PDF dependency; no browser download
is needed. The browser test runs the **production** build in actual Chromium,
compares Blob and downloaded PDF bytes to Node, verifies Buffer/process absent,
checks GET `/cmr.pdf` exact content type/bytes and POST rejection, and saves a
screenshot. Native embedding is optional; no PDF.js/editor runtime is bundled.
The separate optional font-browser entry fetches the pinned TTF, runs public
Fontkit preparation in actual Chromium and compares Blob/download bytes exactly
to Node preparation of the same font/document. Its screenshot and downloaded
PDF are distinct artifacts, not inferred from the ordinary React build.
All handwritten implementation, examples, tests, tools and configurations are
TS/TSX. HTML and JSON manifests/tsconfigs are data/configuration formats, not
JavaScript exceptions. ESLint's TypeScript config is loaded by local jiti2;
the TS parser/plugin lint the whole subtree, including size/nesting rules.
Tooling/dependencies are consolidated into one bounded subtree manifest and
lockfile; the fixture remains a standalone Vite app. Root legacy tooling is
unchanged. Generated JS and the Vite `.mjs` core artifact are not handwritten.

`tsconfig.json` enables strict, noImplicitAny, noUncheckedIndexedAccess,
exactOptionalPropertyTypes, useUnknownInCatchVariables, noEmitOnError,
noUnusedLocals/Parameters and verbatimModuleSyntax. No `any`, `@ts-ignore` or
unchecked assertions are used. `@ts-expect-error` occurs only in deliberate
negative type tests, which fail if the expected rejection disappears.
`test/types/native-template.ts` exercises positive native templates and negative
version/type/key/text/align/readonly/CMR/unknown/diagnostic cases. The declaration
test copies that fixture to a **separate temporary strict consumer**, resolves
the built package exports with no Node/DOM ambient types, and confirms that
compiler input is emitted declarations rather than workspace source.
The same separate consumer compiles native TSX from `test/types/vdom-template.tsx`,
including component/children/registry inference and expected errors, with **no
React, Node or DOM ambient types**. The JSX namespace's scoped ESLint allowance
is required TypeScript runtime declaration syntax, not a global suppression.
Actual Rollup module graphs are saved per build and checked: PDF core and VDOM
have no Node/React modules; core, VDOM and ordinary React app have no font parser
closure. `sizes` measures separate core/VDOM/application artifacts, not guesses.
Run build before tests: this consumer intentionally depends on actual output.
There is no Changesets workflow to extend.

To run the standalone Node endpoint:
`node experimental/declarative/dist/examples/server.js` (loopback port3001).
It serves only a fixed fixture GET, not arbitrary request-body rendering.
CLI writes only the explicitly supplied output path. Generated artifacts,
subtree node_modules and build directories are ignored **only in this subtree**.

## Deliberately deferred work

Prepared canonical metrics/program data can be supplied without a runtime parser;
the optional adapter is implemented and validated by local Node/browser gates.
Shaping/normalization/bidi, subsetting, variable/color/CFF fonts and full operational
CMR remain out of scope. No shared Kalada package, editor or deployment is added.

See `EVIDENCE.md` for outcomes, actual delivery state, measured sizes, baseline
legacy failures and self-check. Build success alone is not browser execution;
the separate Chromium test and screenshot supply that evidence.
