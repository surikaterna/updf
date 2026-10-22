# @updf/text-flow

Opt-in **rectangular, atomic** composition of prepared rich paragraphs. This is
not contour flow, browser floats or split pagination. Install the adapter explicitly
in each Flow and select the optional composition subpath:

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
      <TextFlow paragraphs={preparedParagraphs} style={{ width: 240, maxHeight: 160 }} />
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
`extension(textFlowAdapter, { paragraphs, style: { width, maxHeight } })`.
Arbitrary Paragraph/Span children are not parsed in this phase. There are no float,
CSS length string, exclusion, contour, visual-slot, interval callback, or split-page
props. No font loader, decoder or SVG dependency is installed by this package.

Adapter authors call `useOperationCapability(context, composition.capability)`
from `@updf/core/resources`, then call `composeText({ width, maxHeight, paragraphs })`
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

Occupied bands are computed **after rectangular line selection** from the line box
(which contains the selected font envelope) and actual selected ink. Direct native
painting consumes those same baselines/fragments, not reconstructed rich-text
boxes. Out-of-frame occupancy rejects rather than growing or clipping the frame.
This proves no preselection, exclusion negotiation or multi-interval contract.
Those features require separate design, implementation and audit.

## Installer migration (PR89)

`createCompositionTextService` is removed, not aliased. Replace its `text:` option
with `...createTextComposition({ runtime, defaultFont? })`, then bind the returned
capability through `createTextFlow(capability)`. The returned `text` is one ordinary
seven-callback service using that same runtime closure; it has no `compose` method.
There are no composition methods on universal layout contexts. Missing or different
selected capabilities fail with `MEASUREMENT_CONTEXT` at the adapter origin.
No service-identity lookup, automatic installation or global adapter is provided.
