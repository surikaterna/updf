# Public paragraph/span text styles (#49-B)

This is a deliberate migration of the unreleased native authoring API, not CSS
compatibility. Import `ParagraphStyle`, `SpanStyle`, `LineHeight`, `PointLength`
and `pt` from `@updf/layout`. No React/CSS runtime or types are required.

| Field | Paragraph.style | Span.style | Units/default |
| --- | --- | --- | --- |
| font | yes | yes | Registered resource ID; `Helvetica` |
| fontSize | yes | yes | Positive finite PDF points; 10 |
| color | yes | yes | Readonly RGB triple, finite channels in [0,1]; black |
| lineHeight | yes | yes | Positive finite ratio, `"normal"`, or `pt(n)`; normal |
| textAlign | yes | no | `"left"` / `"center"` / `"right"`; left |

`font` is not `fontFamily`: there is no fallback list, weight synthesis or browser
font selection. Bind the same prepared resource IDs to measurement/layout/lower
and render. Existing simple LTR Latin/Cyrillic restrictions remain; no bidi,
ligatures or shaping are added.

## Units, inheritance and line boxes

`style: { fontSize: 12, lineHeight: 1.2 }` reserves 14.4pt for that participant.
A nested 20pt Span inheriting the raw ratio reserves 24pt, not 14.4pt. `pt(16)`
returns the frozen readonly data value `{ unit: "pt", value: 16 }`. Its inherited
length remains 16pt even at 20pt font size; different participant above/below
baseline requirements can still grow the combined box (12pt/20pt Helvetica with
16pt length gives 18.2pt). It is not a geometry-wide CSS unit system.

`normal` uses the selected prepared font's descriptor ascent minus descent scaled
from original unitsPerEm. Built-in Helvetica uses its existing conservative
font envelope (10pt at fontSize10), not an arbitrary 1.2 multiplier. Each line has
the paragraph strut, including empty paragraphs and empty LF lines. Empty Spans
validate but do not invent participants. Inline visuals contribute their declared
ascent/descent. The line box combines maxima above and below the shared baseline.

Tight positive line heights are allowed: glyph ink may extend beyond line boxes,
and adjacent lines can overlap. No silent clamping or implicit glyph clip occurs.
The native fixed-text reconstruction bounds nominal em-box/side-bearing padding
with an envelope containing **all actual ink plus the line box**, not just the
line box. Thus a tight line at the top/bottom of a page still rejects if its full
ink/envelope leaves page bounds; add explicit space or an explicit closed Block
clip. A Block `overflow: "hidden"` remains clipping, not redaction. Pagination
reserves line-box heights, not overflow ink. Final regions and adapter fragments
(including table rows) remain bounded owners: tight text needs sufficient padding/
reservation there too, or an explicit supported clip. Measurement `size.height` and
`inkBounds` intentionally differ. Zero, negatives, infinities and NaN reject:
UPDF requires positive finite line-height progress; it does not implement CSS's
zero-height line-box behavior. Arithmetic overflow/unrepresentable progress also
rejects under the existing binary64/ULP geometry policy.

## Role checks, composition and explicit themes

Unknown and wrong-role keys, present `undefined`, accessors, malformed lengths,
nonfinite numbers and invalid RGB/resource IDs reject with author-source paths.
Omit optional keys instead of clearing them with undefined. No shorthand text
properties are supported. Ordinary object composition is source-order, last key
wins: `{ ...body, ...emphasis }`. Span font/fontSize/color/raw lineHeight inherit
from their paragraph/Span parent; siblings resume the parent. `textAlign` controls
the paragraph only. Box backgrounds/borders/padding never become text defaults.
Read a theme using explicit `useContext(Theme)` and apply its values to `style`;
there is no ambient box font cascade, selector lookup or global theme registry.

```tsx
/** @jsxImportSource @updf/core */
import { Paragraph, Span, pt, type ParagraphStyle } from '@updf/layout';
const body: ParagraphStyle = { font: 'Helvetica', fontSize: 12, lineHeight: 1.2 };
const content = <Paragraph style={{ ...body, textAlign: 'center' }}>
  {'Ratio '}<Span style={{ fontSize: 20 }}>inherited per run</Span>
  <Span style={{ lineHeight: pt(16), color: [1, 0, 0] }}>absolute</Span>
</Paragraph>;
```

Whitespace remains paragraph controls, not CSS style keys: `whiteSpace` is
`"preserve"` or `"collapse"` with the existing ASCII-space behavior across run
boundaries; LF is a hard break in both. `breakLongWords` is `"error"` or
`"codePoint"`; the latter splits Unicode scalars, not browser line-breaking or
CSS min-content `overflowWrap: anywhere`. Span boundaries do not split words.
Fresh-page atomic oversize remains a strict error, not CSS break-inside fallback.

## Migration and bounded table plumbing

- Paragraph `defaultStyle: { fontSize: 12 }` → `style: { fontSize: 12 }`.
- Paragraph `align: "right"` → `style: { textAlign: "right" }`.
- Old paragraph `lineHeight: 16` → `style: { lineHeight: pt(16) }`, **not 16**.
- Span `style` gains raw lineHeight; its other field names are unchanged.
- Table/column/cell text defaults now use flat `font`, `fontSize`, `color`,
  `lineHeight` and `textAlign` within their existing style object. Existing
  table → column → cell defaults merge per key, then paragraph → nested Span
  overrides. Whitespace/break controls remain explicit paragraph defaults.
  C owns backgrounds/padding/row-cell schema and the final merge contract;
  B does not introduce row styles or aliases for old text defaults.

Fixed core `text`/`richText` and `ParagraphDefinition` are a separate low-level
point-valued contract; do not migrate them to ratios. Legacy and historical audit
documents are unchanged. No selectors, cascade interpreter, CSS parser, browser
layout, full shorthand set, per-edge borders (#42), Span backgrounds (#43), or
flex are added. Any future stylesheet adapter is a distinct optional boundary.

Compile-checked NodeNext/Bundler public examples live in
`tests/consumer/types/text-style-template.tsx`; geometry, inheritance, strict
runtime rejection and independent Poppler ink proofs protect the native path.
