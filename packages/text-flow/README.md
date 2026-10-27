# @updf/text-flow

Opt-in rectangular/straight-path sibling flow and experimental atomic text composition, using
the existing text/font capability. This is numeric PDF layout, not browser CSS.

## Real Block with ordinary Paragraph siblings

```tsx
/** @jsxImportSource @updf/core */
import { render } from "@updf/layout/render";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { Block, Document, Flow, Paragraph, Span } from "@updf/layout";
import { createTextService } from "@updf/text";
import { floatable, textFlow } from "@updf/text-flow";

const runtime = fontRuntime();
const text = createTextService({ runtime, defaultFont: "Helvetica" });
const FloatingBlock = floatable(Block);
const options = {
  text,
  extensions: [textFlow()],
  resources: { Helvetica: createHelvetica() },
  providers: [fontProvider(runtime)],
};
const pdf = render(
  <Document>
    <Flow pageSize={{ width: 220, height: 260 }}
      margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      <FloatingBlock style={{ width: 72, height: 96, float: "left",
        backgroundColor: [0.2, 0.4, 0.6] }} />
      <Paragraph>Rich <Span style={{ color: [1, 0, 0] }}>styled</Span> text alongside a real Block.</Paragraph>
      <Paragraph>{"Ordinary text continues at full width below the float. ".repeat(20)}</Paragraph>
    </Flow>
  </Document>, options,
);
```

- `textFlow()` installs rectangle participation through operation `options.extensions`.
  `floatable(Block)` accepts the actual layout Block, preserving its children,
  style and painter without an extra box. It takes no service or per-Flow handle.
  The configured ordinary service must support the optional selection request;
  `createTextService` does, using its existing font resolver and default font.
  Unused installation remains lazy; duplicate feature installations reject.
- `@updf/layout/render` runs existing layout then existing core serialization, with
  independent lifetimes, snapshots and budgets. Resources, providers and service
  identities are reused, not a single ledger. Core render remains fixed-document-only.
  Natural `measure` adapter sets now use `options.adapters`, not `extensions`;
  `Flow.extensions` remains an adapter set. No compatibility alias is provided.
- One floating Block or Path per Flow, as a **direct body sibling**. Consecutive ordinary,
  non-kept Paragraphs participate. A Block, Row, kept Paragraph or PageBreak ends the
  affected sequence; later content is ordinary. A second float rejects explicitly.
  Flow.Body and nested marked Blocks are not supported by this bounded API.
- Explicit finite positive `width`/`height`, `float: "left" | "right"`, and optional
  `shapeOutside` source descriptor (rectangle on omission only). Explicit `undefined`,
  `"rect"`, bare SVG path strings and old `{ d, fillRule }` objects reject.
  Manual contours require the explicit handlers below. Dimensions must fit the body. Float margins
  and auto alignment reject; no top offsets, wrap gaps or multiple floats.
  Other supported Block styles, children and decorations use the existing Block
  normalizer, box measurement, preparation and painter, not a separate visual path.
- The initial fragment contains the whole float and actual side lines, including
  the line reaching/crossing its bottom. It reserves at least the actual float height.
  If it cannot fit the remaining page, it moves intact. An indivisible word or inline
  visual too wide for the side interval leaves its source unconsumed: the float can
  stand alone, followed by full-width text. Full-body-width floats behave likewise.
- The same rich source resumes at full width, including mid-Paragraph across pages.
  The float paints once; exclusion never restarts on a later page. Empty content
  still reserves the positive float height. Oversized text fails under ordinary
  bounded fresh-body admission; no clipping fallback, source rewind or zero-height
  fragment is introduced. Span styles, backgrounds, inline visuals and source paths
  retain the existing Paragraph owners.
- Placement `sourceRange` for participating content counts original body siblings,
  not internal scalar offsets. A partial Paragraph still reports that sibling's key
  and authored interval. Internal scalar progress uses compact ranges, not a metadata
  array per character. Without participation, existing report metadata is unchanged.

Local checks pass; independent audit is still required. See
[`text-flow-sibling-integration.md`](../../docs/evidence/text-flow-sibling-integration.md)
for exact gates, measured nonzero layout/addon costs and limitations.

## A real filled Path with the same Paragraph siblings

Install the geometry handler once in the same operation options as the ordinary
text service. No capability pair or per-Flow participation handle is needed:

```tsx
import { Path, pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { shapeSyntax } from "@updf/text-flow/syntax";
const FloatingPath = floatable(Path);
const shapedOptions = { ...options,
  extensions: [textFlow({ handlers: [pathShapes(), shapeSyntax()] })] };
// Pass shapedOptions to layout/render for the whole document.
<FloatingPath
  key="illustration"
  d="M0 0 H100 L20 96 H0 Z"
  fill="#3498db"
  fillRule="evenodd"
  style={{ width: 100, height: 96, float: "left" }}
/>
<Paragraph>Ordinary rich text follows the sloping side of the painted path.</Paragraph>
<Paragraph>Another paragraph continues alongside, then at full width below.</Paragraph>
```

`Path` is fill-only: `fill` accepts an RGB triple or the existing geometry color
grammar (hex, rgb/rgba, its small named-color set, `none`/`transparent`). Optional
`fillRule` is `nonzero` (default on omission only) or `evenodd`; explicit `null`
or `undefined` rejects, including in Source builder options. Stroke, transforms, children and
other escaping-outline props reject. The same normalized command capture paints
and supplies the exclusion; no virtual float or native-node array is needed.
Geometry stays reserved even for transparent/no fill. Path style admits explicit
width/height/float, optional shapeOutside, and the existing min/max width/height constraints only.
Ordinary `<Path d={...} fill={...} style={{ width, height }} />` uses the same retained
Block preparation and geometry handler without floating metadata. Multiple ordinary
Paths are allowed and are barriers to floating text. Even ordinary Path requires
`textFlow({ handlers: [pathShapes()] })`; it needs no font runtime or text provider.
Text selection is requested lazily only when a float has affected Paragraph siblings.

For an arbitrary real visual, use `FloatingBlock` and author its contour explicitly:

```tsx
<FloatingBlock style={{ width: 100, height: 96, float: "right",
  shapeOutside: Source.path("M0 0 H100 V96 H80 Z", { fillRule: "nonzero" }) }}>
  {/* ordinary Block children/decorations; the contour is not alpha extraction */}
</FloatingBlock>
```

`Source.path(d, { fillRule? })`, `Source.polygon(flatCoordinates, { fillRule? })` and
`Source.url(src)` return immutable plain data, not installed handles. `/sources`
has no core, geometry, assets or font runtime imports. Builders validate data and
throw `TypeError`; document consumption recaptures descriptors with sourced diagnostics.
Polygons accept 3–4095 finite numeric coordinate pairs (at most 8190 flat values),
using the existing native polygon normalizer, never generated SVG strings.
Fill rules default only on omission; explicit null/undefined is invalid.

The optional `shapeSyntax()` handler accepts `path('M0 0 ... Z')`,
`url("https://example.invalid/image.png")` and `polygon(0 0, 100 0, 20 96)`.
Quotes must match; only escaped matching quotes and backslashes are supported.
Polygon numbers are finite point values: no CSS units, nesting or fill-rule argument
such as `path(evenodd, '...')`. Strings require this handler; Source descriptors do not.
URL descriptors remain pure data. Resolution requires the separately selected
`pngAlphaShapes()` integration below and async preparation; without that handler
they reject without I/O.

Only `/path` loads `@updf/geometry`; rectangle-only root, `/atomic`,
and core/ordinary layout/text do not acquire a path parser. The polygon handler
retains the existing shared geometry parser module; descriptor-only `/sources` does not.
Missing geometry/syntax installations reject at the authored source; duplicate,
copied or foreign handler identities reject. Configuration is snapshotted per installer,
then shared through the operation's existing capability lifecycle owner.
Only normalized move/line/close
commands, explicitly closed nonempty non-collinear subpaths inside the **resolved**
local Block dimensions are accepted. Relative commands and H/V work. Cubics
(including normalized curves/arcs), open/empty/degenerate/out-of-box contours
reject: no flattening or bounding-box fallback.

Exclusion takes the outermost side over the **whole rich line-box/ink band**,
including internal vertices and touching horizontal edges. Compound fill rules
paint correctly, but holes are conservatively unavailable for text. There is no
center/multi-interval negotiation or maximal-packing promise. Blocked first units
retry at the rich owner's next top without consuming text; every retry/edge scan
is cumulatively budgeted. Path protection continues past the nominal float bottom
until the owned conservative ink/box certificate clears the visual for **all**
remaining Paragraph sources, not merely the first full-width line. Required gaps
are included in the actual initial fragment height and its intact page deferral.
There is no exclusion state or callback on subsequent pages. Both rectangle and
path modes retain S4's all-later-source negative-leading clearance certificate.
Rectangles permit exact boundary contact and clamp blocked retries to the float
bottom; an authored rectangle **path** keeps strict contact and predecessor-rounded
side widths. Parser/color diagnostics retain
the authored sibling's `d`, `fill` or `shapeOutside` field and parser offset.

S3 engineering status and current gates/costs are recorded in
[`text-flow-manual-shapes.md`](../../docs/evidence/text-flow-manual-shapes.md).
Historical side-path evidence remains an immutable record of the earlier API.

## Experimental atomic composition (explicit entry)

The existing `TextFlow`/`textFlowAdapter` and rectangle/edge-profile contracts move
to `/atomic`; there are no root aliases or re-exports. Install the
atomic adapter explicitly in each Flow and select the optional composition subpath:

```tsx
/** @jsxImportSource @updf/core */
import { Document, Flow, createExtensions, layout } from "@updf/layout";
import { createAtomicTextFlow } from "@updf/text-flow/atomic";
import { createTextComposition } from "@updf/text/composition";

// runtime, resources, providers and preparedParagraphs come from your existing
// text/font preparation. Use those same owned resource identities when rendering.
const composition = createTextComposition({ runtime });
const { TextFlow, textFlowAdapter } = createAtomicTextFlow(composition.capability);
const options = {
  resources,
  providers,
  ...composition,
};
const result = layout(
  <Document>
    <Flow
      pageSize={{ width: 300, height: 200 }}
      margins={{ top: 0, right: 0, bottom: 0, left: 0 }}
      extensions={createExtensions([textFlowAdapter])}
    >
      <TextFlow
        paragraphs={preparedParagraphs}
        exclusion={{ shape: "rect", side: "left", width: 80, top: 8, height: 40 }}
        style={{ width: 240, maxHeight: 160 }}
      />
    </Flow>
  </Document>,
  options,
);
// render(result.document, options) remains valid after layout has returned.
```

`paragraphs` uses the existing `ParagraphDefinition` grammar: prepared runs,
explicit font/size/color defaults, **left** alignment, positive point `lineHeight`,
`whiteSpace: "preserve" | "collapse"`, and `breakLongWords: "error" | "codePoint"`.
Newlines, empty lines, mixed runs and run-local source offsets retain the existing
text owner's behavior. Unsupported properties and modes reject explicitly.

Styles are CSS-familiar names with numeric PDF point values, **not browser CSS**.
Omit `width` to use the available width. An explicit width must fit that region.
`maxHeight` is required and bounds composition; it does not reserve that height.
Actual selected line height determines atomic layout/admission. Content moves to
a fresh page when necessary and fails if it cannot fit an empty body.

The equivalent data API is
`extension(textFlowAdapter, { paragraphs, exclusion?, style: { width, maxHeight } })`.
The optional `exclusion` reserves one left or right edge rectangle; it paints no
visual. Width and height are finite positive points, width cannot exceed the frame,
and top is finite/nonnegative (default zero). Arbitrary Paragraph/Span children are
not parsed by this atomic descriptor. It has no float, CSS length string, contour, visual-slot,
multi-interval, interval callback, or split-page props. No font loader, decoder or
SVG dependency is installed by this package.

Adapter authors call `useOperationCapability(context, composition.capability)`
from `@updf/core/resources`, then call `composeText({ width, maxHeight, paragraphs, exclusion? })`
and `composedText(frame)` on that operation API. Reports expose readonly width/height/measurement/
occupied bands. Frames authorize output only in their active owning operation;
copies, cross-operation frames and retained contexts reject. Native `nativeLeaf`
payloads are durable opaque identities, not portable JSON. They paint the captured
selected runs without rewrapping or remeasurement, and require the same relevant
owned font bindings. Core's existing snapshot owner preserves authorized identities
only; forged/cloned/serialized payloads reject.

Composition shares the existing operation ledger and resources. Its optional local
cumulative counter is bounded by the existing `limits.nodes` policy: attempts,
every captured data occurrence and every string Unicode scalar, before allocation.
Failed attempts retain prior charges. Existing source/text/output/page limits
remain independent and mandatory; trusted callbacks are not a code sandbox.

With an exclusion, a conservative paragraph-wide font/ink envelope selects one
available interval per line before wrapping. Intersecting bands narrow the whole
line; exact touching is disjoint. Full blockage or an indivisible first unit jumps
directly below the rectangle without consuming text. Height includes required jumps,
not unused trailing reservation height. This does not promise maximal packing.
Occupied reports use the selected line box and actual ink. Direct native
painting consumes those same baselines/fragments, not reconstructed rich-text
boxes. Out-of-frame occupancy rejects rather than growing or clipping the frame.
Atomic contours and multi-interval negotiation remain outside that retained API.
The single-rectangle implementation is pending independent
audit, not verified.

## Installer migration (PR89)

`createCompositionTextService` is removed, not aliased. Replace its `text:` option
with `...createTextComposition({ runtime, defaultFont? })`, then bind the returned
capability through `createAtomicTextFlow(capability)` for atomic composition. The returned `text` is one ordinary
seven-callback service using that same runtime closure; it has no `compose` method.
There are no composition methods on universal layout contexts. Missing or different
selected capabilities fail with `MEASUREMENT_CONTEXT` at the adapter origin.
No service-identity lookup, automatic installation or global adapter is provided.

## Static entry isolation and migration

The central path uses the ordinary `createTextService` and its optional selection
request. `@updf/text/selection` and `/composition` remain supported selected service
installers, but are not required pairs for central sibling flow. The separate legacy
atomic adapter still takes its owned capability; its name remains `updf.text-flow`.
Root exports `textFlow`, `floatable`, `FloatingBlockProps` and handler option types;
`/path` exports `Path`, `pathShapes`, `PathProps` and `FloatingPathProps`.
`createPathTextFlow` is removed, not aliased. `/sources` owns pure Source builders
and descriptor types; `/syntax` owns `shapeSyntax`.
`/atomic` owns `createAtomicTextFlow`, `TextFlowProps` and exclusion types.
There is no dynamic loader or registry. Browser entries are ESM; Node import facades
still share the existing CJS implementations with require, not genuine Node ESM
tree-shaking. The explicit atomic route remains a paired legacy contract;
separate Flows may coexist, but two participation compiler families in
one Flow reject. See [S2 evidence](../../docs/evidence/text-flow-central-registration.md).
# Optional prepared PNG geometry

Select `preparePngShape` from `@updf/text-flow/png-shape` and explicitly install
same-version `@updf/png` to extract exact intrinsic pixel-cell geometry from an
owned prepared PNG. Defaults are `shapeImageThreshold: 0`, `maxPixels: 16_000_000`
and `maxCommands: 4096`; budgets are lower-only, and `signal` uses PNG's structural
abort contract. The deeply immutable result is tagged `empty` or `contours`; the
latter contains native `commands` and `fillRule: "nonzero"`, directly usable by
the native path painter. No SVG string conversion is required. Omit absent fields,
not explicit undefined/null. This is **not** a shape handler or automatic URL/image
shape-outside support; default/manual-path users do not install or load PNG.
See [S7a contracts, bounds and evidence](../../docs/evidence/png-alpha-shapes.md).

## Automatic PNG URL masks (selected integration)

`/png-shape` stays extraction-only. Select the **separate** `/png-alpha` leaf for
automatic resource preparation, and install same-version optional `@updf/images`
and `@updf/png` peers:

```tsx
import { Image } from "@updf/images";
import { images, createAssetLoader } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { floatable, textFlow } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { Source } from "@updf/text-flow/sources";
const FloatingImage = floatable(Image);
const maskOptions = { ...options, extensions: [
  images({ loader: createAssetLoader({ fetch: globalThis.fetch, baseURI: "https://example.invalid/" }),
    formatHandlers: [pngImages()] }),
  textFlow({ handlers: [pngAlphaShapes()] }),
] };
// Inside the same ordinary Document/Flow:
<FloatingImage src="portrait.png" fit="contain"
  style={{ width: 100, height: 96, float: "left",
    shapeOutside: Source.url("portrait.png"), shapeImageThreshold: 0.15 }} />
// await renderAsync(document, maskOptions)
```

Add `pathShapes` only for manual paths and `shapeSyntax` only for string syntax,
using the imports shown above; neither is needed for this `Source.url` example.
Fetching is explicitly enabled on the loader; the example base URI is a placeholder.
An optional `allowUri` policy can further restrict resolved URLs.
URL syntax invokes that selected syntax owner during capture, charging
its real parsing work before any await. Missing syntax/loading services reject at
the authored occurrence before fetching. Duplicate resource handlers reject before
I/O. A mask URL may differ from the visual URL, including for an already-bound
visual Image; a floating Block can request a mask without a visual Image at all.
JPEG mask resources reject private PNG authentication; there is no rectangular
fallback. The mask never becomes an extra painted/embedded image.

`shapeImageThreshold` is finite numeric `[0,1]`, default **only on omission** to zero;
undefined/null reject even for non-URL shapes. It applies only to URL masks and
never changes manual geometry or image painting. Cells are occupied exactly when
`alpha / 255 > threshold`. Opaque PNGs give a full rectangle unless threshold is
one. Empty masks have zero obstruction, but the real positive-height visual still
participates in ordinary native body admission and paints once.

The mask's intrinsic unit square stretches to the Image's **actual painted
rectangle**, independently of mask aspect ratio, including contain letterboxing,
padding/borders and resolved constraints. A generic Block uses its outer border
box, not descendant Image geometry. URL masks initially support Image and Block;
Path and other owned visuals reject before I/O. Only positive scale/translation
is supported. Holes/islands remain in intrinsic commands, but the complete rich
line box/ink band takes only the **outer left/right projection**: text does not
enter holes or negotiate center lanes. No margin, curve or transform API is added.

`pngAlphaShapes({ maxPixels?, maxCommands? })` captures immutable lower-only
positive-safe-integer caps, default/ceiling **16,000,000 pixels and 4,096 commands
per operation**, not per call. Exact resource + exact threshold hits skip repeated
inspection/generation; `-0` and `0` remain distinct identities. Different thresholds
inspect again and accumulate charges. Command exhaustion rejects conservatively
before another extraction, even if that extraction might be empty. Cross-render
image cache hits avoid transport/PNG decode but still inspect shapes afresh.
Retained mask bytes and private owned geometry both count against resource bytes;
empty geometry has a nonzero header charge. No raw alpha plane or contour cache
is retained globally. Default entries load no Image/asset/PNG runtime, and the
integration leaf itself loads neither transport nor PNG decoder/normalizer.
