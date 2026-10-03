# Composable tables (F)

The private `@updf/tables` capability implements ordinary block content, not a new
document root or JSX runtime. The complete authoring/data/measurement contract and
example are in [the package README](../packages/tables/README.md).

```text
@updf/tables → @updf/layout → @updf/core
application SVG/chart adapters → supported public layout/core (and optional SVG)
```

Choose `Table.Head`, `.Body`, `.Foot`, `.Row`, `.Cell`, `.HeaderCell` for JSX, or
`table(readonlyTableInput)` for data. Install `tableExtension` once per local Flow
extension scope; both paths use ordinary `layout()`, core `lower()` and `render()`.
Cells stack Paragraphs, Blocks and owned chart/SVG block adapters. All-inline cells
get one implicit Paragraph; mixed naked inline/block content requires explicit
Paragraphs. Finite numbers are accepted only at that implicit cell root, not as a
global change to explicit Paragraph/Span or core text grammar.

The table adapter coordinates explicit point column widths, measures cell border
boxes via public `measureContent`, chooses complete atomic rows, and emits native
content. It does not import the layout compiler, create pages, manipulate a cursor
or switch paginator types. Head/foot rows share column widths and generic
first/all/last reservation rules. Multiple rows in a decoration are one reserved
unit. Head defaults first; Foot defaults last; `repeat` selects all fragments.

Static sections measure early. A positive explicit section `height` makes JSX
content opaque until finalization, allowing ordinary callbacks to read sealed
PageContext/FragmentContext and captured providers. Overflow within that reservation
is an error, never body retry or repagination. The native-style/ink and C clipping
checks still apply. Clipping is not redaction; hidden text remains extractable and
counts toward resource policy.

Generic placements expose `sourceRange` and optional body `sourceKeys`. Header/foot
copies are decoration emissions, not consumed body rows. Empty tables make zero
body progress and zero geometry unless their head/foot is meaningful, in which
case it emits once atomically. An enclosing empty Flow still contributes one page.

The actual showcase module is `apps/showcase/src/tables.tsx`. Its chart uses C's
public chart factory through the ordinary component bridge. SVG cells use a
separate, application-owned optional chunk and inline adapter: text/chart selection
does not load SVG, and core entry does not load layout/tables. Preview/download are
the exact Node/browser bytes; source display is the actual raw JSX module.

Images/#33, nested tables, row splitting, spans, CSS, weighted/auto/percentage
columns, formula evaluation and global plugin installation are not implemented.
Unsupported fields and `atomic={false}` diagnose explicitly. Legacy layout tables
remain **transitional, unreleased migration controls only** until G removes them.

See [F evidence](evidence/architecture-tables.md) for actual delivery scope, checks,
preservation manifests, known legacy/audit failures and independent-audit status.
