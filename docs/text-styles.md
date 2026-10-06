# Public role-aware styles (#49)

This is a deliberate migration of the unreleased native authoring API, not CSS
compatibility. Import `ParagraphStyle`, `SpanStyle`, `LineHeight`, `PointLength`
and `pt` from `@updf/layout`. No React/CSS runtime or types are required.

| Field | Paragraph.style | Span.style | Units/default |
| --- | --- | --- | --- |
| font | yes | yes | Registered resource ID; omitted selects only the injected service's explicit default |
| fontSize | yes | yes | Positive finite PDF points; 10 |
| color | yes | yes | Readonly RGB triple, finite channels in [0,1]; black |
| backgroundColor | no: use Block | yes | Readonly RGB triple in [0,1]; omitted means no highlight |
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
The native rich-text reconstruction bounds nominal em-box/side-bearing padding
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

## Inline backgrounds (#43)

`Span.style.backgroundColor` uses the same canonical RGB property as Block and
Cell. It is an explicit **inline text contract**: a nested Span inherits the nearest
Span highlight when omitted, can override it with its own RGB value, and siblings
resume their parent's value. Object spreads choose the last value for the same
key. There is no implicit Span block, padding, border, background shorthand,
transparent/null reset, CSS decoration model or ambient box-background cascade.
Present undefined and invalid RGB reject at `/style/backgroundColor` (or its
channel path), including on empty Spans and overridden nested styles.

Each measured fragment paints a rectangle of its **advance**, including retained
spaces, with that participant's resolved line height and baseline-relative leading.
The shared line box may be taller because of other fonts/visuals or the paragraph
strut; highlighting does not expand to that box. An inherited inline visual uses its
declared ascent/descent box without changing its callback's text-style contract.
All backgrounds of a placed paragraph fragment paint before all its foreground
glyphs/visuals, including across tight overlapping lines. Glyph ink can overhang
the rectangle horizontally or vertically with tight heights; no ink-sized fill,
baseline shift, implicit clip, or reflow is introduced. Explicit Block clipping and
page bounds still apply. Paragraph fragmentation does not create a continuous
rectangle across page boundaries or reserved gaps.

Wrapping and span boundaries follow existing measurement exactly. Collapsed-away
spaces receive no fill; preserved/retained spaces do. LF has no advance and creates
no rectangle; empty LF lines retain the paragraph strut, and empty Spans create no
participant or highlight. Line/fragment ink bounds remain foreground ink bounds;
aggregate content ink bounds include painted highlights just like Block/Cell fills;
generated rectangles do count toward output nodes and path-command limits.

For a paragraph-wide background, use an explicit
`<Block style={{ backgroundColor: [1, 1, 0] }}><Paragraph>...</Paragraph></Block>`.
`Paragraph.style.backgroundColor` deliberately rejects: there is no duplicate
paragraph-decoration engine, and Block/Cell backgrounds do not become Span defaults.
The rich showcase's actual `rich.tsx` source demonstrates adjacent wrapped RGB
highlights with explicit foreground colors and preserved spaces.

## Boxes and table defaults

Import `BoxStyle`/`BlockStyle` from `@updf/layout` and `TableStyle`, `RowStyle`,
`CellStyle` from `@updf/tables`. These are supported schemas, not
`React.CSSProperties` or arbitrary Paragraph props. Row and cell defaults currently
support the same fields; the named schemas describe where they apply.

| Fields | Block.style | Table / column / row / cell.style | Paragraph / Span |
| --- | --- | --- | --- |
| font, fontSize, color, lineHeight, textAlign | no | Paragraph defaults | as above |
| whiteSpace, breakLongWords | no | Paragraph controls | Paragraph props only |
| backgroundColor | yes | cell-owner fill | Paragraph no; Span inline highlight |
| padding, paddingTop/Right/Bottom/Left | yes | cell-owner insets | no |
| height, gap, overflow | yes | cell-owner constraints | no |
| width, min/maxWidth, min/maxHeight | yes | no; columns have explicit width, rows have minHeight prop | no |
| border, borderTop/Right/Bottom/Left | yes; typed edge or null | yes; cell-owner policy, with Table.grid fallback | no |
| marginTop | only `"auto"`; terminal Block with explicit keepTogether | no | no |

Native layout RowStyle and ColumnStyle also exclude `marginTop` rather than
inheriting it from BlockStyle. There are no numeric/general margins. See the
[terminal auto-margin contract](blocks.md#terminal-auto-top-margin-53), including
explicit-height versus natural parent regions and unchanged table defaults.

Geometry is finite nonnegative PDF points, except positive Block/column width and
fontSize. Background is an RGB triple, not a CSS color string. Omitted background
means no fill; omitted border/grid means no stroke reservation. Block padding is
zero by default; cell padding is 4pt. Gap defaults zero, height is natural when
omitted, overflow defaults error. Block width fills available width; omitted min/max
constraints do not impose extra bounds. Cell height closes its border box, not the
row; row height is max cell height plus its own effective edge reservations, subject to row minHeight.
Table, column and row style objects supply cell defaults; they do not create extra
layout boxes or an ambient cascade. Box properties never flow into nested Blocks,
Paragraphs or Spans. Text defaults do reach explicit Paragraphs inside cell Blocks
under the explicit table content contract. Header/footer rows use the same rules.

Only scalar `padding` is a shorthand; no strings, arrays or Insets object. An edge
overrides shorthand within one style object, **independent of key enumeration**:
`{ paddingLeft: 8, padding: 4 }` and `{ padding: 4, paddingLeft: 8 }` are equivalent.
Ordinary object spreads still choose the last value for the *same* key. Objects
have no history: `{ ...{ paddingLeft: 8 }, ...{ padding: 4 } }` retains that explicit
left edge. Across distinct table default layers, each shorthand is expanded to
four edges **before** merging, so a later row `padding: 3` replaces an earlier
column `paddingLeft: 8`. A cell's explicit edge can then override just that edge.
No general CSS shorthand set, parser or cascade is implemented.

Merge order is per property: library → table → column → row → cell → explicit
Paragraph → nested Span. Last supported value wins; omitted keys preserve earlier
values. Ratios remain raw through all layers. Present undefined is an error, not a
reset; unknown/wrong-role keys and malformed/nonfinite/negative values reject with
source paths even when an earlier layer would be overridden. Resource IDs are
validated before content measurement callbacks. Table measurements and final PDF
painting share the same operation's resources, profile, limits and extension scope.
Do not add an independent callback or measurement configuration for styles.

```tsx
/** @jsxImportSource @updf/core */
import { Block, Paragraph, Span } from '@updf/layout';
import { Table } from '@updf/tables';
const content = <Block style={{ backgroundColor: [0.9, 0.96, 1], padding: 4,
  paddingLeft: 8, border: { width: 1, color: [0, 0, 0] } }}>
  <Table columns={[{ width: 120, style: { paddingLeft: 9 } }]}
    style={{ fontSize: 10, lineHeight: 1.2, padding: 4 }}>
    <Table.Body><Table.Row style={{ padding: 3, color: [0, 0, 1] }}>
      <Table.Cell style={{ backgroundColor: [1, 1, 0], paddingTop: 5 }}>
        <Paragraph style={{ fontSize: 12 }}>Text<Span style={{ fontSize: 20 }}>!</Span></Paragraph>
      </Table.Cell>
    </Table.Row></Table.Body>
  </Table>
</Block>;
```

Install `tableExtension` explicitly in the containing Flow/measurement extensions.
For branding, read an application-owned `Theme` via `useContext(Theme)` and apply
its typed values to these styles explicitly, as in the mixed showcase. A provider
alone does not restyle anything. Border policy is documented below; grid-only
placement remains unchanged. Span highlights use explicit inline inheritance, not box inheritance.

### Reusable edge-border policy (#42)

Import `BorderEdge`, `BorderPolicy`, `ExpandedBorders`, `expandBorders` and
`mergeBorders` from `@updf/layout`. A `BorderEdge` requires both nonnegative finite
`width` (PDF points) and `color` (readonly RGB triple in [0,1]); there is no implicit
width/color. Width zero reserves and paints nothing. `border` is a uniform fallback.
An explicit `borderTop`, `borderRight`, `borderBottom` or `borderLeft` beats that
fallback within the same object, regardless of key enumeration. Omission means
unspecified; `null` deliberately means no border (also supported for `border`).
Present undefined, unknown keys, accessors, malformed edges and invalid numbers/colors
reject with the source path, even in layers subsequently overridden.

```ts
import { type BorderEdge, type BorderPolicy, type BlockStyle, mergeBorders } from '@updf/layout';
const rule: BorderEdge = { width: 2, color: [0, 0, 1] };
const heading: BorderPolicy = { borderBottom: rule };
const framed: BlockStyle = { border: rule, borderTop: null, padding: 4 };
const composed: BlockStyle = {
  ...mergeBorders([
    { style: { borderLeft: rule }, path: '/theme/base' },
    { style: { border: rule, borderBottom: null }, path: '/theme/override' },
  ]),
  padding: 4,
};
```

`expandBorders` accepts a border-only policy, validates and snapshots it, and expands
uniform shorthand without filling unspecified edges. `mergeBorders` accepts explicit
border-only layers with their diagnostic paths, expands **each layer before merging**,
then replaces per edge in source order. Thus a later uniform shorthand replaces earlier
explicit edges; a later omitted edge preserves the previous value, and null clears it.
Ordinary spreads have no history: `{ ...{ borderLeft: rule }, ...{ border: null } }`
still contains an explicit left edge, so use `mergeBorders` for layer semantics.
This is explicit data composition, not CSS `all`, a parser, or a cascade.

Block width/height allocate the **border box**. Content insets are the resolved edge
width plus that edge's padding; borders do not inherit into children. Borders paint
as filled strips wholly inside allocated geometry, not centered strokes extending
outside it. Top/bottom own corner strips; sides fill the remaining height. Background
fills the border box behind content, then borders paint in front. Hidden overflow clips
content at the padding edge (border box minus each border width), not at the content edge.

Natural fragmented Blocks retain the existing cloned padding **and border-width
reservations on every fragment**, preserving content capacity and pagination, including
when that fragment's horizontal edge does not paint. Top paints only on the first
fragment, bottom only on the last, and sides paint on each fragment. Closed/kept Blocks
paint all specified edges once; explicit/max-height hidden overflow has no continuation.
Ancestor preflight conservatively reserves specified decorations before the last-fragment
decision; final painting accounts for the actual fragment edges.

### Table cell edges and shared painting

Table, column, row and cell styles reuse this same policy. Each layer expands its
border shorthand before table → column → row → cell merging, just like padding.
Every layer is validated even if overridden. These are **cell defaults**, not borders
around additional table/column/row boxes; borders never enter Paragraph defaults.
Omitted resolved edges use `Table.grid` (or zero without a grid). Explicit null or
width zero suppresses that cell's grid fallback. Each cell locally reserves its own
effective top/right/bottom/left widths plus padding. A thicker opposing winner does
**not** increase the other cell's content padding or reflow it: winning ink can extend
into that cell's locally unreserved space. Deferred sections cannot repaginate neighbors.

Final painting resolves each logical shared interval once, after all backgrounds and
content, including current-page deferred head/foot styles. An explicit positive edge
beats grid fallback and explicit null/zero. Between positive explicit edges, greater
width wins; equal widths choose the **upper cell's bottom** or **left cell's right**
edge, irrespective of report order. Without any explicit positive edge, null/zero
suppresses fallback; otherwise the grid paints. Equal grid claims use the same owner
tie rule; exact same-owner ties use stable report order.

Shared bands center on the logical cell boundary. Exposed explicit outer bands move
inward by half their width, wholly inside the allocation; top/bottom own exposed
corner strips and vertical edges trim by the cell's own top/bottom insets. Grid-only
outer bands preserve historical inward centerline displacement by a full grid width
and grid endpoint trims. Logical identity is never displaced or epsilon-snapped.
At shared perpendicular boundaries endpoint trims are waived to keep intervals joined.
Rows remain atomic: fragment tops/bottoms use the edges of actual first/last rows on
that fragment; repeated sections join only where their actual measured roots touch.
Reserved gaps remain gaps. Hidden overflow clips actual ink, never invents a border
at the clip cut. This is a deterministic UPDF policy, **not CSS border-collapse**, CSS
`all`, a selector engine or an ambient cascade.

## Migration

- Paragraph `defaultStyle: { fontSize: 12 }` → `style: { fontSize: 12 }`.
- Paragraph `align: "right"` → `style: { textAlign: "right" }`.
- Old paragraph `lineHeight: 16` → `style: { lineHeight: pt(16) }`, **not 16**.
- Span `style` gains raw lineHeight and canonical RGB `backgroundColor`; other field names are unchanged.
- Table/column/row/cell text defaults now use flat `font`, `fontSize`, `color`,
  `lineHeight` and `textAlign` within their existing style object. Existing
  table → column → row → cell defaults merge per key, then paragraph → nested Span
  overrides. Whitespace/break controls remain explicit paragraph defaults.
- Block/cell `background` → `backgroundColor`, with no alias.
- Block `padding: { top: 2, right: 3, bottom: 2, left: 3 }` →
  `padding: 3, paddingTop: 2, paddingBottom: 2`. All scalar geometry stays points.

Fixed core `richText` and `ParagraphDefinition` are a separate low-level
point-valued contract; do not migrate them to ratios. Legacy and historical audit
documents are unchanged. No selectors, cascade interpreter, CSS parser, browser
layout, full shorthand set, or
flex are added. Any future stylesheet adapter is a distinct optional boundary.
The former core/native `text` node is removed, not a point-style compatibility alias.

Compile-checked NodeNext/Bundler public examples live in
`tests/consumer/types/text-style-template.tsx`; geometry, inheritance, strict
runtime rejection and independent Poppler ink proofs protect the native path.
Cross-role table examples compile in NodeNext and Bundler mode in
`tests/consumer/types/composable-tables-template.tsx` using clean packed packages.
