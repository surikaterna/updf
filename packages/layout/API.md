# @updf/layout API inventory

Import all names below from `@updf/layout`; use `@updf/core`'s JSX runtime,
`@updf/core/vdom` lowering/context APIs, and core `render` for PDF bytes. There
are no public layout subpaths. All layout lengths are PDF points, y down, unless
an explicit conversion helper or source-unit range says otherwise.

## Grouped root exports and declaration owners

| Purpose / exports (including aliases) | Defining owners under `src/` | Coverage |
| --- | --- | --- |
| `layout`, `DocumentLayoutResult` | `mixed-layout.ts` | Entry lifecycle, options, frozen result, hierarchy/oversize errors |
| `measure`, `ContentConstraints`, `ContentOptions`, `ContentMeasurement`, `ContentLine`, `ContentTextFragment`, `ContentVisualFragment` | `content-measure.ts`, `content-types.ts` | Natural point measurement, height ceiling, report coordinates; not every fragment field |
| `Document` (alias of `MixedDocument`), `Flow`, `Page`, `document`, `flow`, `page`, `flowHeader`, `flowBody`, `flowFooter` | `vdom.ts`, `document-data.ts` | Section/slot purposes, snapshots, paging/finalization |
| `DocumentProps`, `PageProps`, `FlowProps`, `RegionProps`, `BodyProps`, `DocumentContent`, `DocumentContentData`, `PageContent`, `FlowContent`, `RegionContent` | `document-types.ts` | Grammar and ownership, point margins/reservations; selective field comments |
| `Block`, `Paragraph`, `Span`, `paragraph`, `span`, `block` | `content-data.ts`, `container-data.ts` | JSX/data purpose, snapshots, clipping distinction |
| `Content` (= `BlockContent`), `BlockContent`, `InlineContent`, `ImplicitInlineContent`, `ParagraphProps`, `SpanProps`, `ContentBlockProps`, `ParagraphContent`, `SpanContent`, `InlineVisual`, `BlockComponent`, `InlineComponent` | `content-types.ts` | Grammar and paragraph defaults; component/descriptor members mostly signature-level |
| `Insets`, `BoxStyle`, `BlockStyle`, `ContainerBlock`, `BlockInput` | `container-types.ts` | Point insets/padding, local styling, overflow/atomic behavior; individual bound members not fully annotated |
| `Row`, `Column`, `row`, `column`, `RowAlignment`, `RowStyle`, `ColumnStyle`, `RowInput`, `ColumnInput`, `RowBlock`, `ColumnBlock`, `RowProps`, `ColumnProps` | `row-vdom.ts`, `row-data.ts`, `row-types.ts` | Atomic Row versus standalone Column fragmentation, width/style roles; discriminant/props aliases use signatures |
| `pt`, `PointLength`, `LineHeight`, `SpanStyle`, `ParagraphStyle` | `text-style.ts` | Font resource IDs, point sizes, defaults, ratio versus absolute line height |
| `PageSize`, `pageSize`, `PageDimensions`, `Orientation` | `page-size.ts` | Presets, conversion/default units and orientation |
| `PageBreak`, `PageBreakProps`, `PageContext`, `FragmentContext`, `PageInfo`, `FragmentInfo` | `page-break.ts`, `page-context.ts` | Control marker, final-context availability, index bases |
| `createDecorationPlan`, `DecorationPlan`, `StaticDecoration`, `BlockRegionProps` (Block.Header/Footer props) | `decorations.ts`, `decoration-types.ts`, `deferred-decoration.ts` | Owned reservations, repetition, final rendering and height fit |
| `expandBorders`, `mergeBorders`, `BorderEdge`, `BorderPolicy`, `ExpandedBorders`, `BorderLayer` | `borders.ts` | Shorthand/null precedence, units, validation, freezing distinction |
| `defineBlockAdapter`, `createExtensions`, `extension`, `blockComponent`, `defineBlockPart` | `extensions.ts`, `author-parts.ts` | Local identity installation, synchronous callbacks and snapshots |
| `BlockAdapter`, `BlockAdapterIdentity`, `BlockAdapterDefinition`, `Extensions`, `ExtensionBlock`, `ReadonlyProps`, `MeasureContext`, `AdapterContentConstraints`, `MeasuredContent`, `MeasuredBlock`, `BlockFragmentRequest`, `BlockFragment`, `ContentDecoration`, `BlockPartIdentity`, `BlockPartComponent`, `BlockPart`, `ScopedContent` | `extension-types.ts` | Ownership/lifecycle, physical versus source units, progress; not every callback/metadata field |
| `defineInlineAdapter`, `inline`, `InlineAdapter`, `InlineAdapterIdentity`, `InlineAdapterDefinition`, `InlineMeasureContext`, `InlineMeasurement` | `inline-adapters.ts`, `content-types.ts` | Identity, synchronous callback and metric contracts; context/type-brand fields partly signature-level |
| `EdgeRegionInput`, `LocalEdgeClaim` | `shared-edge-types.ts` | Local units/ownership and existing inset comments; detailed conflict algorithm remains in linked border docs |
| `FlowBlock`, `ParagraphBlock`, `FixedBlock`, `SpacerBlock`, `PageBreakBlock`, `PageRegion`, `PageTemplate`, `FlowDocumentDefinition`, `FlowPlacement`, `FlowResult` | `types.ts` | Low-level shape purposes, placement/source ranges; no restored layoutFlow API |
| `resolveWidths`, `WidthTrack`, `WeightedWidth`, `WidthResolutionInput`, `WidthResolution` | `width-resolver.ts`; types reexported through `width-types.ts` from kernel | Wrapper error mapping; allocator/type JSDoc lives at kernel definitions |

This is a complete **grouped export inventory**, not a claim that every member has
an individual JSDoc paragraph. Private helpers and unexported shapes are excluded.
The declarations are authoritative for signatures; the README and linked
[documents](../../docs/documents.md), [blocks](../../docs/blocks.md),
[inline](../../docs/inline.md), [rows](../../docs/rows.md), and
[text styles](../../docs/text-styles.md) describe detailed interactions.

## Operational boundaries

- `layout` creates fixed pages; it does not serialize them. `measure` is natural,
  unpaginated measurement and returns no reusable painting capability.
- Header/footer reservations are selected before final page/fragment callbacks;
  final content must fit, never repaginate the body.
- Paragraphs split at complete lines. Atomic blocks/Rows defer intact and reject
  on an unfit fresh body. Hidden overflow clips explicit constraints, not validation,
  oversized Rows, or secrets (it is not redaction).
- Descriptors and results are snapshots/capabilities, not portable JSON protocols.
  Do not retain operation-scoped contexts or captured content after return.
- Resource IDs and operation policies are explicit. Trusted synchronous callbacks
  are not isolated or CPU-sandboxed. No implicit CSS cascade/fallback is promised.
