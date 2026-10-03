# @updf/layout — composable measured content

Private/unreleased `2.0.0-poc.0`, MIT ©2026 Surikat AB. Optional, core-only runtime
dependency; importing `@updf/core` never loads layout. Root exports exclude tables.
#26/#27 are independently verified per the #28 assignment, not released.
#28 tables are independently verified including spatial R1, not released or deployed.
Issues #26–#28 remain OPEN; changes are local, uncommitted and unmerged.
See the [dated final handoff](../../docs/evidence/measured-flow-handoff.md).

## Unified authoring (D)

Private/unreleased D is implemented for independent audit, **not verified**.
New authoring uses `paragraph`/`span` data or imported `Paragraph`/`Span`/`Block`
components with core's JSX runtime. `measure` accepts that same content and returns
readonly frozen size, lines, baseline/ink and original UTF16 source-path metadata.
No public plain/rich kind is required.

```ts
import { measure, paragraph, span } from '@updf/layout';
const content = paragraph({ children: [
  'Author text ', span({ style: { color: [1, 0, 0] }, children: 'styled text' }),
] });
const metrics = measure(content, { width: 180 });
// metrics.size.height; metrics.lines[0]?.baseline; metrics.inkBounds
```

```tsx
/** @jsxImportSource @updf/core */
import { render } from '@updf/core';
import { lower } from '@updf/core/vdom';
import { Paragraph, Span } from '@updf/layout';
import { Document } from '@updf/layout/vdom';
const content = <Paragraph>{'Author text '}<Span style={{ color: [1, 0, 0] }}>styled text</Span></Paragraph>;
const bytes = render(lower(<Document pageTemplate={{ width: 200, height: 100,
  margins: { top: 10, right: 10, bottom: 10, left: 10 } }}>{content}</Document>));
```

Defaults: Helvetica10, black, line12, left alignment, collapsed spaces and long-word
error. Omitted lineHeight grows for mixed font/atomic inline visual metrics; an
explicit insufficient lineHeight errors. Span inherits the whole effective parent
style and never creates a word-break opportunity. Numbers are never coerced.
Prepared fonts/resources retain core's supported profile and ownership checks.
`defineInlineAdapter`/`inline` use the existing operation-local extension scope and
native painting; SVG integration is application-owned and optional. See the
[complete D contract](../../docs/inline.md) and [executed TSX](../../apps/showcase/src/rich.tsx).

The examples below are preserved transitional low-level flow/table contracts, not
the recommended new paragraph authoring API. Unreleased core plain/rich measurement,
native richText and old paragraph records are deprecated for new authoring until
G's final public replacement/removal, not a permanent compatibility facade.

## Transitional fixed-template data API

```ts
import { render } from '@updf/core';
import { layoutFlow, type FlowDocumentDefinition } from '@updf/layout';

const definition: FlowDocumentDefinition = {
  pageTemplate: {
    width: 200, height: 100,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  body: [{ type: 'paragraph', paragraph: {
    runs: [{ text: 'Complete measured lines\nExplicit page template' }],
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: [0, 0, 0] },
    lineHeight: 12, align: 'left', whiteSpace: 'preserve', breakLongWords: 'error',
  } }],
};
const result = layoutFlow(definition);
const bytes = render(result.document);
```

`layoutFlowUnknown(unknown, options?)` uses the same checked data boundary.
Both return deeply frozen `{ document, pageCount, consumed, placements }`.
`document` is an ordinary fixed core document, never a serializer plan. Placements
carry source index/path, page index, point box and half-open paragraph line ranges.
`consumed` counts every body item, including explicit page breaks and spacers.

Native TSX uses the **existing core runtime**, not a new JSX grammar:

```tsx
/** @jsxImportSource @updf/core */
import { render } from '@updf/core';
import { lower } from '@updf/core/vdom';
import { Flow } from '@updf/layout/vdom';
// definition is the same readonly object as above.
const bytes = render(lower(<Flow.Document {...definition} />));
```

For prepared fonts, pass the same `{ resources: { Alias: ownedPreparedFont } }`
mapping to `layoutFlow` and `render`, or `lower` and `render`. Layout snapshots the
mapping for its operation; it cannot replace resources in component context or
read font bytes. No font fallback, synthesized styles, shaping or DOM types.

## Deliberate semantics

- Template dimensions are positive; four explicit margins and optional gaps are
  nonnegative. Header/footer have positive heights and readonly **local** fixed
  nodes. They must fit their own regions. Gaps apply only when that region exists.
  Body width/height must remain finite and strictly positive.
- Ordered body blocks: `paragraph` (one core paragraph, optional `keepTogether`),
  positive-height atomic `spacer`, explicit `pageBreak`, or positive-height atomic
  `fixed` with local core `children`. Fixed blocks must fit body width/block height.
- Paragraphs split only at complete internally measured lines. Normalized line
  fragments retain effective font/size/RGB, whitespace, alignment and baseline
  metrics. No unknown caller-provided measurement/plan is trusted.
- Atomic blocks and kept paragraphs move to a fresh page once if needed; too tall
  on a fresh body fails `LAYOUT_OVERSIZED`. No clipping, shrinking or truncation.
- Empty body yields one page. Exact fit does not add a page. Leading, trailing and
  consecutive page breaks deliberately create blank pages, with repeated regions.
  Break placements identify the consumed break on the preceding page with height 0.
- Source and generated output have independent accounting under the core operation
  policy. Trusted defaults allow page 21; optional service policy retains a 20-page
  seed. Generated repeated regions reserve node/scalar-text/command budgets before
  copying. Internal work counters check safe arithmetic, not a public workload cap.
  See [foundation policy and residual parser limits](../../docs/architecture/composable-layout.md).
- Narrow relative roundoff follows core rich measurement. It is not an absolute
  point tolerance: genuine overflow and prepared-font ink/resource errors reject.

## Derived-region numerical contract (Auditor R1 remediation)

Layout establishes native boundary coordinates once from compensated source
reservations: left to page-minus-right, and top/header/applicable-gap to
page-minus-bottom/footer/applicable-gap. Source dimensions, margins, region heights
and gaps are never quantized or changed. Nonfinite, reversed or nonpositive regions
reject before body measurement, including empty bodies.

The private operation-owned derived capacity is the greatest finite binary64 extent
`d` for which native `start + d` rounds to a value at or before the region end.
A constant-sized exact dyadic certificate obtains the endpoint's next-value midpoint,
subtracts the start exactly and floors to binary64; midpoint equality belongs only
to an even endpoint significand. This is inverse translation, not recovery of a
user's intended decimal value, iterative numerical nudging or a page-scaled epsilon.

Both half the end's upward binary64 spacing and the absolute capacity-versus-nominal
difference must be **at most 32 ULPs of the local nominal extent**. Comparisons use
exact dyadics even for subnormals, so the budget cannot underflow. Ill-conditioned
coordinates reject unconditionally, even with an empty body, with `GEOMETRY` at
`/pageTemplate/width` or `/pageTemplate/height` and message:
`Derived region is numerically ill-conditioned: coordinate rounding exceeds the local precision budget.`
There is no public allowance/certificate/precision knob or accepted external plan.

Capacity is used consistently for paragraph measurement, pagination, generated rich
boxes and placements. Differences admitted by the same native endpoint rounding
cell may fit; moving the actual page endpoint down one binary64 value can change
the decision, after the unchanged small #26 local measurement allowance is accounted
for. Explicit fixed-block/header/footer heights are **not** enlarged. Font size,
line height, advances and baseline metrics are never shrunk or shifted, and prepared
left-edge ink checks retain their original local scale.

Actual output association is checked separately: `y = regionStart + cursor`, then
`y + height`. Every materialized body box must remain inside the intended boundaries
and cannot overlap an earlier body reservation. Header/footer materialized endpoints
must fit their shared reservations too. A different compensated association is not
a proof of these endpoints: disagreement fails `GEOMETRY` at the body source index
(or template height for repeated regions), rather than clipping or moving a baseline.
Thus local `measureText` can still accept three 10.3-point lines in 30.9 points,
while flow at origin zero rejects the rounded generated endpoint beyond 30.9;
the audited translation at origin 700 fits page endpoint 730.9 in one page.
Public #26 measurement values/tolerances and final core validation remain unchanged.

No nested flow, columns, floats, flex, percentages, CSS, widow/orphan control,
keep-with-next, page callbacks/dynamic page numbers, plugins or editor.
Tables are available only through the separate optional entry documented below.
The paginator and producer switches remain private, with no public plugin registry.
Core remains the sole renderer/serializer.

See [native contract](../../docs/native-api.md), [architecture](../../docs/architecture/packages.md),
[local evidence](../../docs/evidence/flow.md), and the actual bounded
[showcase module](../../apps/showcase/src/flow.ts). Historical #27 evidence is preserved.

## Optional paged tables (#28)

Import data APIs/types from `@updf/layout/tables`, and the ordinary core component
`Tables.Document` from `@updf/layout/tables/vdom`. Root data/VDOM exports do not load
table validation, measurement or painting. Core does not depend on layout.

```ts
import { render } from '@updf/core';
import { layoutTable, type TableDocumentDefinition } from '@updf/layout/tables';

const input: TableDocumentDefinition = {
  pageTemplate: { width: 200, height: 100,
    margins: { top: 10, right: 10, bottom: 10, left: 10 } },
  table: { type: 'table', columns: [{ width: 100 }, { width: 80 }],
    align: 'left', repeatHeader: true,
    defaults: { defaultStyle: { font: 'Helvetica', fontSize: 10, color: [0, 0, 0] },
      lineHeight: 12, align: 'left', whiteSpace: 'preserve',
      breakLongWords: 'codePoint', padding: 2 },
    grid: { width: 1, color: [0, 0, 0] },
    header: { cells: [{ paragraph: { runs: [{ text: 'Item' }] } },
      { paragraph: { runs: [{ text: 'Count' }] } }] },
    rows: [{ cells: [{ paragraph: { runs: [{ text: 'Inventory' }] } },
      { paragraph: { runs: [{ text: '3' }], align: 'right' } }] }] },
};
const result = layoutTable(input);
const bytes = render(result.document);
```

`layoutTableUnknown(unknown, options?)` checks the same standalone boundary.
`layoutTableFlow`/`layoutTableFlowUnknown` take `{ pageTemplate, body }`, where
`body` is readonly `FlowBlock | TableDefinition` data. Multiple prose/table blocks
use the **same private #27 paginator**: cursor, fit/progress, actual endpoint checks,
template repetition, budgets and page creation. No second pagination engine.

`render(lower(<Tables.Document {...input} />, options), options)` is byte-identical
to data layout/render. `Tables.Document` also accepts the mixed-flow definition.
Resources come from the existing operation-owned core context; they cannot be
replaced by component props or retained after lowering closes.

### Model, inheritance and geometry

- At least one explicit positive finite point width per column; table width is
  their compensated sum. It must fit the already-derived body capacity strictly,
  without a wider text/ink tolerance. Table placement is left/center/right.
- Every row has exactly one cell per column. Each cell has one paragraph with
  required `runs`; omitted paragraph settings inherit table defaults then column
  defaults. Cell paragraph overrides apply per key; run overrides apply last,
  per key, never from a previous run. Defaults expose only actual font id/size/RGB,
  line height, text alignment, whitespace, long-word policy, scalar padding and
  optional solid RGB background. Unknown keys and present undefined values reject.
- Padding is explicit nonnegative points (zero allowed). `minRowHeight`, when
  supplied on a row, is positive. Cell content inset is `padding + grid.width`
  (grid reservation zero when omitted). Content width is the private derived-axis
  capacity between local cell inset endpoints, with the unchanged **32-local-ULP**
  conditioning policy. Native translated cell endpoints are separately certified
  under that same guard; their capacity is not used to widen local measurement.
  Ill-conditioned/erased widths reject at the cell path.
- Natural row height is the maximum measured paragraph height plus both insets,
  lower-bounded by `minRowHeight`. All paragraphs use #26 rich measurement;
  empty/zero-run cells consume one paragraph line. No custom wrapping or shrinking.
- Explicit column dimensions are never enlarged. Actual local column endpoints,
  line boxes, native translated row/cell geometry and ink reservations are checked
  before final core bounds validation. Metric/font/measurement tolerances are unchanged.

### Pagination and reports

- Rows are atomic; no row splitting. Header is optional and `repeatHeader` is
  explicit. A table header consumes body space **in addition** to template regions.
- Header plus first body row are preflighted together, then move together if needed.
  An impossible fresh pair fails `LAYOUT_OVERSIZED` at the first row path; no
  returned page contains an orphan header. Continuations repeat the header only
  when requested. A row taller than fresh body after the repeated header fails at
  its row path before copying the header. Never loop/drop/clip/shrink.
- Empty table prints its header once, if present, otherwise no table geometry;
  an empty parent still has one page. Exact fits do not create an extra page.
- Frozen results add `tablePlacements`, `repeatedHeaderCount` and
  `consumedBodyRowCount` to flow results. Table placements carry stable body source
  index, source path, table ordinal, zero-based row index, page/point box, and
  `repeatedHeader`. Header row index is `-1`; header copies are never body rows.
  `consumed` still counts source body blocks, not header copies or individual rows.
- Standalone paths start `/table`; mixed paths start `/body/N`. Row/cell/paragraph/
  run paths remain structured, and core TSX lowering adds its existing context prefix.

### Grid, backgrounds and bounded accounting

Native core rect fill and line stroke paths paint cells; there is no new renderer.
One uniform positive stroke width/RGB grid, butt caps and bevel joins: internal
column boundaries are emitted once per row segment, and shared horizontal edges
once (on the following row). Each page fragment has its own outer top/bottom edge.
Outer line center inset is one full grid width: true half-stroke ink is inside
the table, **and** unchanged core conservative Frobenius envelope
`(grid.width / 2) * sqrt(2)` fits tight zero-margin tables without an endpoint-equality
roundoff dependency. This is an explicit border reservation, not a relaxed ink
tolerance. Cell backgrounds are unstroked exact cell rectangles. The full
grid-width content reservation keeps text clear of all grid ink; no border cascade,
per-edge conflicts, opacity groups or clipping masks are introduced.

The existing source scan, measurement ledger and generated output budget now share
explicit core trusted/service policy. Repeated-row/header nodes, scalar text and
path commands are reserved **before** paint arrays, normalized runs, snapshots or
header copies. Descriptor/getter/cycle/dense-array and geometry checks remain
mandatory. Old per-cell 4,096/work ceilings are removed; this B foundation still
requires independent audit and does not close #25 or implement the later table namespace.

No automatic/weighted/percentage columns, spans, nested tables, widgets, formulas,
row splits, border cascade or layout grammar rewrite. See [table evidence](../../docs/evidence/tables.md)
and the dynamically imported [inventory showcase](../../apps/showcase/src/tables.ts).
