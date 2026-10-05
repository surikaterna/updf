# Row and Column layout

`@updf/layout` exports semantic `Row`/`Column` and data `row()`/`column()` for native side-by-side composition:

```ts
import { column, paragraph, row } from "@updf/layout";

const summary = row({
  style: { gap: 12, padding: 4 },
  align: "top",
  children: [
    column({ width: 120, children: [paragraph({ children: "Label" })] }),
    column({
      width: { weight: 2, min: 80, max: 300 },
      style: { gap: 6 },
      children: [paragraph({ children: "Description" })],
    }),
  ],
});
```

Use this content in `flow({ ... , children: summary })` or `measure(summary, { width }, options)`.
Text-bearing measurement/layout/render uses explicit resources, text service and providers;
see [composition](migration/fonts-text.md). Row constructors do not install fonts.
Columns accept existing paragraphs, blocks, nested Rows, and public block adapters;
charts and SVG do not need special engine kinds or tables-as-layout.

Row defaults to the available border-box width, not shrink-to-fit. Its padding and
borders are subtracted before **all** tracks resolve, and all Column insets are
validated before child measurement. Column `width` is a positive point width or
`{ weight, min?, max? }`, defaulting to `{ weight: 1 }`. Bounds are positive point
border-box widths. The shared `resolveWidths` contract distributes remaining
space, clamps bounds, assigns residual ULPs in input order, and errors for
infeasible minima/fixed widths/gaps. Maxima may leave unused trailing space.
Column style cannot contain `width`, `minWidth`, or `maxWidth`.

Row `gap` is horizontal; Column `gap` separates vertical children. Natural Row
height is its insets plus the tallest Column. `top` (default), `middle`, and
`bottom` align Column border boxes within the Row content height. `stretch`
extends Column backgrounds/borders, without child reflow or scaling; it rejects
Column `height`, `minHeight`, and `maxHeight` constraints.
Baseline alignment is deliberately unsupported; this is not a CSS flexbox API.

Rows are always atomic: they stay on the current page when they fit, otherwise
move whole to a fresh page, and error if too tall. There is no Row `keepTogether`
option and Row overflow is only `error`. Page-advance controls within Rows are
invalid. Explicit nested Block/Column `overflow: "hidden"` height constraints can
clip their own content; Row never implicitly hides an oversized Row. Standalone
Columns resolve one track against their available width, use ordinary vertical
fragmentation, and support `keepTogether`.

The same contract is available in native TSX (`/** @jsxImportSource @updf/core */`):

```tsx
import { Row, Column, Paragraph } from "@updf/layout";

const summary = <Row align="stretch" style={{ gap: 12, padding: 4 }}>
  <Column width={120}><Paragraph>Label</Paragraph></Column>
  <Column width={{ weight: 2, min: 80, max: 300 }} style={{ gap: 6 }}>
    <Paragraph>Description</Paragraph>
  </Column>
</Row>;
```

`RowProps` and `ColumnProps` are readonly public types. A Row's normalized direct
children must be Columns: components, Fragments and providers may produce Columns,
but bare text, Paragraphs and native drawing nodes are rejected with structured
diagnostics at their actual source path. Column descendants remain deferred until
all sibling tracks, insets and stretch constraints have passed preflight. Captured
provider scopes, selected-page deferred decorations, resource ownership and operation
lifetime checks apply just as they do in Blocks. Standalone `<Column keepTogether>`
uses ordinary vertical keep-together semantics, not Row's unconditional atomic policy.
The JSX child type accommodates components and wrappers; normalized Column-only
hierarchy is enforced at runtime, not inferred from a component's return type.

The checkout showcase's **Side-by-side Row/Column** entry composes paragraphs, a
Block with explicit clipping, an external chart, native SVG and nested Rows, with
fixed/weighted bounded tracks, gap, borders and all four alignments. Its rows move
whole to fresh pages. The separate intentional oversize entry reports
`VERTICAL_OVERFLOW` and retains the previous preview; it does not truncate.
The executed TSX and imported adapter source are displayed alongside the accessible
PDF.js preview. These are focused layout examples, not the separate #46 invoice/
manifest work, and are not release or deployment claims.
