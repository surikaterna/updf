# @updf/text-flow

Opt-in rectangular/straight-path sibling flow and experimental atomic text composition, using
the existing text/font capability. This is numeric PDF layout, not browser CSS.

## Real Block with ordinary Paragraph siblings

```tsx
/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { Document, Flow, Paragraph, Span, layout } from "@updf/layout";
import { createTextComposition } from "@updf/text/composition";
import { createTextFlow } from "@updf/text-flow";

const runtime = fontRuntime();
const composition = createTextComposition({ runtime, defaultFont: "Helvetica" });
const f = createTextFlow(composition.capability);
const options = {
  ...composition,
  resources: { Helvetica: createHelvetica() },
  providers: [fontProvider(runtime)],
};
const result = layout(
  <Document>
    <Flow pageSize={{ width: 220, height: 260 }}
      margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
      participation={f.participation}>
      <f.Block style={{ width: 72, height: 96, float: "left",
        shapeOutside: "rect", backgroundColor: [0.2, 0.4, 0.6] }} />
      <Paragraph>Rich <Span style={{ color: [1, 0, 0] }}>styled</Span> text alongside a real Block.</Paragraph>
      <Paragraph>{"Ordinary text continues at full width below the float. ".repeat(20)}</Paragraph>
    </Flow>
  </Document>, options,
);
const pdf = render(result.document, options);
```

- `createTextFlow(existingCapability)` adds `{ Block, Path, participation }`; it does not
  install a second text service. Put that exact opaque participation handle on the
  Flow containing the marked Block. No global installation or adapter set is needed
  for this sibling feature. Ordinary inline adapters still use `extensions` normally.
- One marked Block per Flow, as a **direct body sibling**. Consecutive ordinary,
  non-kept Paragraphs participate. A Block, Row, kept Paragraph or PageBreak ends the
  affected sequence; later content is ordinary. A second marker rejects explicitly.
  Flow.Body and nested marked Blocks are not supported by this bounded API.
- Explicit finite positive `width`/`height`, `float: "left" | "right"`, and optional
  `shapeOutside: "rect"` (default) or a straight path (below). Dimensions must fit the body. Float margins
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

Using the same `f`, `options` and `<Flow participation={f.participation}>` above:

```tsx
<f.Path
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
or `undefined` rejects, including in a `shapeOutside` object. Stroke, transforms, children and
other escaping-outline props reject. The same normalized command capture paints
and supplies the exclusion; no virtual float or native-node array is needed.
Geometry stays reserved even for transparent/no fill. Path style admits explicit
width/height/float and the existing min/max width/height constraints only.

For an arbitrary real visual, keep `f.Block` and author its contour explicitly:

```tsx
<f.Block style={{ width: 100, height: 96, float: "right",
  shapeOutside: { d: "M0 0 H100 V96 H80 Z", fillRule: "nonzero" } }}>
  {/* ordinary Block children/decorations; the contour is not alpha extraction */}
</f.Block>
```

`shapeOutside` is `"rect" | string | { d, fillRule? }`. A string is SVG path data,
**never a URL**. The optional addon depends on `@updf/geometry`; core/ordinary
layout/text do not acquire a path parser dependency. Only normalized move/line/close
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
There is no exclusion state or callback on subsequent pages. Existing legacy
`"rect"` behavior/charges, including its immediate blocked-tail policy, are unchanged;
that legacy mode does not gain this negative-leading safety contract. An authored
rectangle **path** uses the stricter path policy. Parser/color diagnostics retain
the authored sibling's `d`, `fill` or `shapeOutside` field and parser offset.

The runtime is implemented pending independent audit; exact evidence, geometry
limits and nonzero retained-code costs are in
[`text-flow-side-path.md`](../../docs/evidence/text-flow-side-path.md).

## Experimental atomic composition (retained API)

The existing `TextFlow`/`textFlowAdapter` and rectangle/edge-profile APIs remain
available; they are not aliases or replacements for sibling flow. Install the
atomic adapter explicitly in each Flow and select the optional composition subpath:

```tsx
/** @jsxImportSource @updf/core */
import { Document, Flow, createExtensions, layout } from "@updf/layout";
import { createTextFlow } from "@updf/text-flow";
import { createTextComposition } from "@updf/text/composition";

// runtime, resources, providers and preparedParagraphs come from your existing
// text/font preparation. Use those same owned resource identities when rendering.
const composition = createTextComposition({ runtime });
const { TextFlow, textFlowAdapter } = createTextFlow(composition.capability);
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
capability through `createTextFlow(capability)`. The returned `text` is one ordinary
seven-callback service using that same runtime closure; it has no `compose` method.
There are no composition methods on universal layout contexts. Missing or different
selected capabilities fail with `MEASUREMENT_CONTEXT` at the adapter origin.
No service-identity lookup, automatic installation or global adapter is provided.
