# Native authoring migration (#41)

This intentional breaking cleanup is before release. The real `@updf/layout` and
`@updf/tables` packages remain; there is no public compatibility facade.

| Removed surface | Native replacement |
| --- | --- |
| `@updf/layout/vdom` | Components from `@updf/layout` |
| `layoutFlow` / `layoutFlowUnknown` | `layout(document({ children: flow(...) }))` or `layout(<Document>...)` |
| `Flow.Document` with `pageTemplate`/`body` | `Document` containing `Flow` with `pageSize`, `margins`, `children` |
| `@updf/layout/tables`, `/tables/vdom`, `Tables.Document`, `layoutTable*` | `Table` / `table` from `@updf/tables` inside native Flow |
| Table row `atomic` | `keepTogether?: true`; omission is atomic, false rejects |

Use native `paragraph`/`span` or `Paragraph`/`Span` for prose, and `block`/`Block`
for grouping. Regions use `flowHeader`/`flowFooter` or Flow.Header/Footer. Reserve
any spacing in the region's explicit height or an authored block; no implicit CSS
layout is introduced. Install local table adapters with
`createExtensions([tableExtension])` on the containing Flow.

`layout` returns frozen `{ document, pageCount, placements }`. It accepts core
LowerOptions including registry/metadata. Pass resources/profile/limits to both
layout/lower and render; output-byte limits apply during serialization. No CMR
renderer, fixed-output fixture, resource callback or numeric policy is changed.

`Block` and `Paragraph` share `keepTogether`: true means intact placement or a fresh
`LAYOUT_OVERSIZED` error, never automatic clipping/shrinking. Table rows are always
atomic and reject false. Adapter `fragmentation: "atomic"` remains a capability
term. JSX fragments do not supply atomicity; use `<Block keepTogether>` for a
headline plus graphic.

Theme is explicit context data: create a context, provide its value, read it with
`useContext(Theme)` in a component and apply the chosen values to native props.
The provider does not implicitly style descendants or implement a CSS cascade.
Native Paragraph and Span styles now follow the [#49 text-style migration](text-styles.md):
replace paragraph `defaultStyle` with `style`, `align` with `style.textAlign`, and
old point-valued `lineHeight: 16` with `style: { lineHeight: pt(16) }`. Numeric style
line heights are ratios, not points. No old-prop aliases remain. Fixed core text/
rich-text definitions and the separate legacy package are unchanged. Block/cell
`background` is now `backgroundColor` without an alias; Block padding is a scalar
shorthand plus `paddingTop/Right/Bottom/Left`. Table row styles join explicit cell
default layers, expanded before merging. The linked contract defines supported
roles and precedence; per-edge borders #42 and Span backgrounds #43 remain planned.

Historical audit records under `docs/evidence` retain their dated APIs/status.
Test-only direct source imports preserve internal renderer regression coverage;
they are not supported package exports. Packed NodeNext/Bundler and runtime
consumers test native exports and reject the removed surfaces.
