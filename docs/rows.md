# Data Row and Column layout

`@updf/layout` exports `row()` and `column()` for native side-by-side composition:

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

Use this content in `flow({ ... , children: summary })` or `measure(summary, { width })`.
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

Rows are always atomic: they stay on the current page when they fit, otherwise
move whole to a fresh page, and error if too tall. There is no Row `keepTogether`
option and Row overflow is only `error`. Page-advance controls within Rows are
invalid. Explicit nested Block/Column `overflow: "hidden"` height constraints can
clip their own content; Row never implicitly hides an oversized Row. Standalone
Columns resolve one track against their available width, use ordinary vertical
fragmentation, and support `keepTogether`.

This slice supplies the runnable data API. Semantic `Row`/`Column` TSX components
and expanded browser/raster fixtures are planned for the following slice.
