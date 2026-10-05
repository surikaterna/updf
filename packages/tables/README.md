# @updf/tables

Private, unreleased `2.0.0-poc.0`, MIT © 2026 Surikat AB. Composable atomic-row
tables for the ordinary `@updf/core` JSX/runtime and `@updf/layout` block protocol.

```text
@updf/tables → @updf/layout → @updf/core + @updf/text + @updf/layout-kernel
```

No SVG, Fontkit, React, Node, private layout import or table-specific paginator.
SVG/charts are application-owned public block/inline adapters. Images remain future
backend work (#33), not an implemented cell feature.

Text resources, service and providers are installed explicitly at the application
boundary, as shown in the [layout composition example](../layout/README.md).
The following example uses that `options` object for both lowering and rendering;
tables do not install Helvetica or any fallback font, and empty/overridden cell
styles still validate against the selected service.

See the grouped [API inventory](API.md) for declaration owners and honest hover
coverage, and the compiled
[`layout-documentation-examples.ts`](../../tests/integration/layout-documentation-examples.ts)
for a data table paged through an ordinary Flow with a local extension set.

```tsx
/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { createExtensions, Document, Flow, Paragraph } from "@updf/layout";
import { Table, tableExtension } from "@updf/tables";

const content = <Document><Flow
  pageSize={{ width: 240, height: 200 }}
  margins={{ top: 16, right: 16, bottom: 16, left: 16 }}
  extensions={createExtensions([tableExtension])}>
  <Table columns={[{ width: 140 }, { width: 68 }]}>
    <Table.Head repeat><Table.Row>
      <Table.HeaderCell>Description</Table.HeaderCell>
      <Table.HeaderCell>Count</Table.HeaderCell>
    </Table.Row></Table.Head>
    <Table.Body><Table.Row keepTogether>
      <Table.Cell><Paragraph>First paragraph</Paragraph>
        <Paragraph>Second paragraph</Paragraph></Table.Cell>
      <Table.Cell>{3}</Table.Cell>
    </Table.Row></Table.Body>
    <Table.Foot><Table.Row><Table.Cell>Totals</Table.Cell>
      <Table.Cell>{3}</Table.Cell></Table.Row></Table.Foot>
  </Table>
</Flow></Document>;
const bytes = render(lower(content, options), options);
```

Install `tableExtension` **once** in the local Flow extension set, together with any
chart/inline/SVG adapters. Data uses the same descriptor and producer:

```ts
import { table } from "@updf/tables";
const content = table({
  columns: [{ width: 140 }, { width: 68 }],
  head: { repeat: true, rows: [{ cells: [
    { children: "Description" }, { children: "Count" },
  ] }] },
  body: [{ key: "item-1", keepTogether: true, cells: [
    { children: "Item 1" }, { children: 3 },
  ] }],
  foot: { rows: [{ cells: [{ children: "Totals" }, { children: 3 }] }] },
});
```

All input types are readonly; the factory snapshots data without freezing callers.
Columns are positive point widths or weighted tracks; auto, percentages, spans,
nested tables and row splitting are unsupported and diagnose rather than guess.
Unknown fields, getters, holes, class records and present undefined reject.

## Column widths (#45)

`TableColumn.width` uses layout's shared `WidthTrack`: a fixed number of points or
`{ weight: number, min?: number, max?: number }`. Weights and explicit bounds must
be positive finite numbers; max must be at least min. Omitted min is the smallest
positive binary64 number, omitted max is the table's available content width.
For example, `columns={[{ width: 40 }, { width: { weight: 1, min: 30 } },
{ width: { weight: 3, max: 150 } }]}` reserves 40pt and divides the remainder 1:3,
redistributing after bounds clamp. Fixed widths plus minima exceeding available
width fail `GEOMETRY` at the occurrence's `/props/columns` before cell measurement;
invalid track parts diagnose `/columns/<index>/width/<part>`. No silent shrinking.

Resolution is once per table occurrence, before measuring cells, without scanning
content. Frozen scalar columns are reused by body, static head/foot, and deferred
PageContext sections through their ordinary adapter-props snapshots. Deferred
section occurrences certify those same fixed scalars; they do not redistribute
weights. Caller arrays/objects remain mutable but are not retained by descriptors.
Separate occurrences use their current available width, providers and resources.
Actual column counts charge the operation source-node budget before resolver work.

Rounding uses exact binary64 arithmetic, floors fractional shares, then permits one
successor ULP in stable column order when the exact residual can pay for it and
max allows it. No decimal quantization or epsilon. Saturated maxima and unavoidable
representational slack remain unused; table width is the native left-to-right sum
of allocated scalar widths, **not** the full available width. This preserves fixed
table placement/output association. Native materialized overflow is rejected;
existing translated-coordinate/ink certification remains authoritative. Cell
content uses its allocated column width less local borders and effective padding.
See [the resolver contract](../../docs/evidence/widths45-a.md) for exact rounding
and numerical guarantees. No intrinsic/auto content scan or CSS flex semantics.

Cells accept readonly stacked block content, or all-inline content (including
finite scalar numbers) as one implicit Paragraph. Mixed naked inline/block content
requires explicit Paragraphs. Numbers in explicit Paragraph/Span remain subject to
the ordinary strict inline grammar. Text wrapping/baselines use D's existing engine.

Text defaults merge library → table → column → row → cell → explicit Paragraph → nested Span.
`TableStyle`, `RowStyle` and `CellStyle` are explicit readonly role schemas. Supported text fields are
`font` (resource ID), `fontSize` (points), RGB `color`, `lineHeight` (positive ratio,
`"normal"`, or layout `pt(n)`), `textAlign`, whiteSpace, breakLongWords. Text fields
merge per key before becoming Paragraph.style defaults; raw line heights inherit
through nested Spans. See [text styles](../../docs/text-styles.md). Old text names
reject rather than alias. Table/column/row styles are cell defaults, not table or row
layout boxes. Box fields never inherit into cell descendants.
Cell scalar `padding` defaults to 4pt; `paddingTop/Right/Bottom/Left` override the
shorthand within each layer regardless of key enumeration. Each layer expands its
shorthand before merging: a higher-priority padding replaces lower-priority edges.
`backgroundColor`, gap, closed border-box height and
error/hidden overflow are supported. Closed cells use the C container/clip engine;
clipping is not redaction. Row height is max cell height plus its own effective edge
reservations, or explicit row minHeight. `border`, `borderTop/Right/Bottom/Left` reuse
layout's `BorderPolicy` on every table/column/row/cell style layer, expanded before
merging. Omitted edges fall back to uniform `grid`; explicit null/zero suppresses it.
An explicit positive shared edge wins over fallback/null; greater explicit width wins,
then upper-bottom/left-right owner on ties. Each final interval paints once after
content, including deferred head/foot styles. Shared bands center on logical boundaries;
explicit exposed outer bands stay inside allocation. Grid-only placement is preserved.
Opposing thicker winners never enlarge a neighbor's content inset or cause reflow.
See [the border contract](../../docs/text-styles.md#table-cell-edges-and-shared-painting)
for corners, fragments and clips; this is not CSS border-collapse. No glyph-overhang tolerance
or numerical policy is relaxed.

Rows stay together by default; `keepTogether={true}` is explicit and omission has
the same behavior. `keepTogether={false}` rejects unsupported splitting. The old
`atomic` field is rejected, not aliased. A row moves intact to a fresh page or fails
`LAYOUT_OVERSIZED`; cell `overflow: "hidden"` never permits an oversized row to fit.
Head defaults first, Foot last;
`repeat` means every table fragment. Multiple section rows are reserved as a unit.
Without height they measure early; with positive explicit section `height`, JSX
content is deferred to sealed final PageContext/FragmentContext using the public
reservation adapter. It never repaginates the body. Final-only hooks without an
explicit reservation fail early. An empty body emits meaningful head/foot once,
or zero geometry if both are absent; the enclosing empty Flow still has one page.

Ordinary `layout()` results expose generic placement source ranges and body keys.
Repeated head/foot rows do not count as body progress; an empty table has source
range 0..0 even though its zero-height protocol occurrence advances once.

The transitional `@updf/layout/tables`, `/tables/vdom` and layoutTable/layoutTableFlow are removed.
There is no permanent facade. See [migration](../../docs/authoring-migration.md)
and the preserved dated records in `docs/evidence/architecture-tables.md`.
