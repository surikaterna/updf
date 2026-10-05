# @updf/tables API inventory

Import from `@updf/tables` only. Install the exact `tableExtension` identity in
`createExtensions` from `@updf/layout`, then pass it to Flow (or measure options).
Use core's JSX runtime. This package supplies a block adapter, not a paginator or
PDF serializer. Lengths are PDF points; text line height also accepts the layout
ratio/`normal`/`pt(n)` contract.

| Root exports / grouped aliases | Declaration owners under `src/` | Coverage |
| --- | --- | --- |
| `Table`, `table` | `index.ts` | JSX author slots, data validation/snapshot, atomic row overflow |
| `tableExtension` | `adapter.ts` | Owned local installation shared by JSX/data |
| `Table.Head`, `.Body`, `.Foot`, `.Row`, `.Cell`, `.HeaderCell` | `parts.ts` | Slot purpose, repetition/reservation and accepted location |
| `TableStyle`, `RowStyle` (= `TableStyle`), `CellStyle` (= `TableStyle`) | `types.ts` | Cell-default precedence, text defaults, point height/gap, clipping; inherited fields follow layout docs |
| `TableColumn`, `CellProps`, `RowProps`, `SectionProps` | `types.ts` | Width/content grammars, atomicity, min height, final-context reservation |
| `TableRow`, `TableSection`, `TableProps`, `TableInput`, `TableDefinition` | `types.ts` | Data/JSX distinction, cell counts, body keys, grid fallback and empty-table behavior |

Every exported name is inventoried; not every repeated field is individually
annotated. `TableRow` repeats `RowProps` semantics, `TableSection` repeats section
semantics, and style aliases share a declaration. Detailed shared-edge conflict
resolution, numerical width rounding and inherited padding/text fields remain in
the [README](README.md) and linked [table guide](../../docs/tables.md). Internal
resolved table types/helpers are not public documentation targets.

JSDoc coverage is selective, not an exhaustive editor-hover guarantee. In
particular, slot documentation lives on the declarations in `parts.ts`, but
TypeScript does not propagate it through the inferred compound `Table` type:
public `Table.Head` and `Table.HeaderCell` hovers may show only their types.
Use this inventory and the [table guide](../../docs/tables.md) for slot semantics.

## Paging, overflow and ownership

Columns are fixed positive widths or bounded weighted tracks; resolve once per
occurrence before cell measurement. No auto sizing, percentages, spans, row
splitting or nested tables. All-inline cells permit finite numbers; mixed inline
and block content requires explicit Paragraphs. Default cell padding is 4pt.

Rows remain intact even when `keepTogether` is omitted; `false` rejects. An unfit
fresh-page row fails `LAYOUT_OVERSIZED`; hidden closed-cell overflow cannot make
the row fit. Clipping is not redaction and never skips font/content validation.
Head defaults first and Foot last; repeat means every fragment. Explicit JSX
section heights defer rendering to final page/fragment context without repagination.
Repeated head/foot do not advance body source ranges.

`table()` snapshots validated data into an owned frozen extension descriptor,
without freezing caller objects. Getter/class/holey/unknown/present-undefined data
rejects. Semantic width/font/content checks still occur at measurement. Callbacks
are trusted synchronous code, not a sandbox; no private layout entry is required.
