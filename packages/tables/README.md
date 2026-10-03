# @updf/tables

Private, unreleased `2.0.0-poc.0`, MIT © 2026 Surikat AB. Composable atomic-row
tables for the ordinary `@updf/core` JSX/runtime and `@updf/layout` block protocol.

```text
@updf/tables → @updf/layout → @updf/core
```

No SVG, Fontkit, React, Node, private layout import or table-specific paginator.
SVG/charts are application-owned public block/inline adapters. Images remain future
backend work (#33), not an implemented cell feature.

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
    <Table.Body><Table.Row atomic>
      <Table.Cell><Paragraph>First paragraph</Paragraph>
        <Paragraph>Second paragraph</Paragraph></Table.Cell>
      <Table.Cell>{3}</Table.Cell>
    </Table.Row></Table.Body>
    <Table.Foot><Table.Row><Table.Cell>Totals</Table.Cell>
      <Table.Cell>{3}</Table.Cell></Table.Row></Table.Foot>
  </Table>
</Flow></Document>;
const bytes = render(lower(content));
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
  body: [{ key: "item-1", atomic: true, cells: [
    { children: "Item 1" }, { children: 3 },
  ] }],
  foot: { rows: [{ cells: [{ children: "Totals" }, { children: 3 }] }] },
});
```

All input types are readonly; the factory snapshots data without freezing callers.
Columns are positive explicit point widths; auto, weights, percentages, spans,
nested tables and row splitting are unsupported and diagnose rather than guess.
Unknown fields, getters, holes, class records and present undefined reject.

Cells accept readonly stacked block content, or all-inline content (including
finite scalar numbers) as one implicit Paragraph. Mixed naked inline/block content
requires explicit Paragraphs. Numbers in explicit Paragraph/Span remain subject to
the ordinary strict inline grammar. Text wrapping/baselines use D's existing engine.

`style` inherits table → column → cell → Paragraph → Span. Supported text fields are
`defaultStyle` (font id/fontSize/RGB), lineHeight, align, whiteSpace, breakLongWords.
Cell padding defaults to 4pt; background, gap, closed border-box height and
error/hidden overflow are supported. Closed cells use the C container/clip engine;
clipping is not redaction. Row height is max cell border-box height plus the grid
reservations, or explicit row minHeight. Grid has uniform width/RGB, contained outer
ink and shared interior edges, painted after content. No glyph-overhang tolerance
or numerical policy is relaxed.

Rows are atomic by default; `atomic={false}` fails. Head defaults first, Foot last;
`repeat` means every table fragment. Multiple section rows are reserved as a unit.
Without height they measure early; with positive explicit section `height`, JSX
content is deferred to sealed final PageContext/FragmentContext using the public
reservation adapter. It never repaginates the body. Final-only hooks without an
explicit reservation fail early. An empty body emits meaningful head/foot once,
or zero geometry if both are absent; the enclosing empty Flow still has one page.

Ordinary `layout()` results expose generic placement source ranges and body keys.
Repeated head/foot rows do not count as body progress; an empty table has source
range 0..0 even though its zero-height protocol occurrence advances once.

Legacy `@updf/layout/tables`, `/tables/vdom` and layoutTable/layoutTableFlow remain
unreleased migration controls only. G removes them; this package does not make
those paths a permanent facade. See `docs/evidence/architecture-tables.md` in the
workspace for delivery evidence and independent-audit status.
