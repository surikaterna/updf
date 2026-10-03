# Mixed documents and final decorations (Slice E)

This is the current private, unreleased document contract. Tables are provided by
the separate `@updf/tables` package. Dated delivery and audit records are retained
under `docs/evidence`; they are not current API instructions. There is no Image API.

## One authoring/runtime path

Import `Document`, `Page`, `Flow`, `Block`, `Paragraph`, `Span`, `PageSize`,
`PageContext` and `FragmentContext` from `@updf/layout`. Keep the existing
`@updf/core` JSX runtime, `lower` and `render`:

```tsx
/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower, useContext } from "@updf/core/vdom";
import { Document, Page, Flow, Paragraph, PageSize, PageContext } from "@updf/layout";

function ReportFooter() {
  const page = useContext(PageContext);
  return <text x={0} y={0} width={200} height={12}
    fontSize={10} lineHeight={12} align="left">
    {`Page ${page.docPageNumber}/${page.docPageCount}`}
  </text>;
}
const content = <Document>
  <Page size={PageSize.A5}><ReportFooter /></Page>
  <Flow pageSize={PageSize.A5}
    margins={{ top: 36, right: 36, bottom: 36, left: 36 }}>
    <Flow.Body><Paragraph>Measured body content</Paragraph></Flow.Body>
    <Flow.Footer height={12}><ReportFooter /></Flow.Footer>
  </Flow>
  <Page size={PageSize.A4} />
</Document>;
const bytes = render(lower(content));
```

`layout(content, options?)` accepts the existing core LowerOptions (including a
local primitive registry and resource metadata) and returns an owned, deeply frozen
`{ document, pageCount, placements }`. Rendering its fixed `document` has exactly
the same bytes as ordinary `render(lower(content, options), renderOptions)`.
RenderOptions is the resources/budget subset, not the lowering-only registry or
metadata fields. Output-byte limits apply at serialization, so pass resources and
budget options to `render` too.
Fixed pages do not produce flow placements. Placement `pageIndex` is zero-based
in the **whole document**, and source paths identify the originating section.

Core's lowercase `document`/`page` primitives remain the fixed-position API.
The transitional `Flow.Document`, `layoutFlow`/`layoutFlowUnknown`, and
`@updf/layout/vdom`, `/tables`, `/tables/vdom` exports are removed, without a facade.
Use the root API; see [migration](authoring-migration.md).
No extra `renderDocument` API, React runtime, parser, global plugin or public
serializer plan is introduced.

## Sections and portable data

Document children expand to an ordered sequence of Page and Flow sections.
Providers, pure components, arrays and core fragments may wrap that sequence.
A Page contributes exactly one fixed page; its children are native positioned
drawings/components, evaluated only in finalization. A Flow contributes one or
more pages of block content. Each flow starts a new page: it never fills unused
space on a preceding fixed page or preceding flow section.

An empty flow intentionally contributes **one page**. Leading, trailing and
consecutive explicit breaks retain their intentional pages. A document without
any section/pages fails clearly. Bare Paragraph at Document root, Page in Flow,
Flow in Page, nested Document and nested flow sections are rejected. Known
semantic children in a fixed Page are rejected before invoking their descendants.

Use one `Flow.Body`, or direct body children, not both. Flow.Header and Flow.Footer
are optional, unique slots with **required positive finite height**. Slot children
are opaque at section normalization: even their pure components are not invoked
as an early preview. A provider wrapping a slot is captured independently of
providers wrapping the body or its sibling slots.

The non-JSX constructors are `document`, `page`, `flow`, `flowHeader`, `flowBody`
and `flowFooter`. Their branded readonly descriptors form a pure data tree:

```ts
const result = layout(document({ children: [
  page({ size: PageSize.A4, children: [
    { type: "text", x: 20, y: 20, width: 200, height: 12,
      text: "Fixed data cover", fontSize: 10, lineHeight: 12, align: "left" },
  ] }),
  flow({ pageSize: PageSize.A5, margins, children: [
    flowBody({ children: paragraph({ children: "Data-authored body" }) }),
    flowFooter({ height: 12, children: [] }),
  ] }),
] }));
```

Native node arrays are supported by fixed data pages and flow regions. Native
drawings and stacked block content cannot be mixed within one reserved region;
put positioned drawings in a native paintGroup or author the region as blocks.
Input snapshots never freeze the caller. Unknown fields, accessors and present
undefined section fields reject. Serialized/copy-forged authoring descriptors
are not library capabilities.

## Page sizes and units

`PageSize.A4`, `.A5`, `.Letter`, `.Legal` are individually frozen readonly point
dimensions, inside a frozen singular PageSize object. A4 is 210×297 mm, A5
148×210 mm, Letter 8.5×11 in, Legal 8.5×14 in. Millimeters normalize using
`72 / 25.4`; inches use 72. Native page geometry is always PDF points.

`pageSize(width, height, unit?)` creates a frozen custom size; units are exactly
`"pt"` (default), `"mm"`, `"in"`. There are no CSS strings/named-size parsers.
An ordinary readonly `{ width, height }` is also a valid point size. Omitting
orientation preserves dimensions; portrait orders the smaller edge first,
landscape the larger edge first, for presets and custom sizes without mutation.
Page accepts `size`, Flow accepts `pageSize`; neither accepts conflicting native
width/height props.

## Final-only contexts

Both handles are renderer-owned `ReadContext<T>` values. They have **no Provider**,
public setter, trust flag or phase escape. Copies/forgeries fail runtime ownership
checks. `useContext` outside synchronous component execution, after operation
closure, or before the relevant final binding fails structurally with
`MEASUREMENT_CONTEXT`; early flow body reads have their actual component path.

PageInfo contains:

- `docPageNumber`, `docPageCount`: one-based current page and final whole-document
  count, including fixed, empty-flow and explicit-break pages;
- `sectionNumber`: one-based ordinal of Page/Flow sections after wrappers expand;
- `flow: null` on fixed pages; otherwise `{ index, pageNumber, pageCount }`, where
  index is zero-based among flow sections only and local page numbers are one-based.

All body fragmentation across **all sections** completes before any final-page
callback. Fixed Page children, flow header/footer children and block decoration
children then run once per emitted occurrence. Counts are not estimates, callbacks
are not invoked for budget previews, and changes in their output never repaginate
the body. Ordinary context values use the original nearest provider snapshot,
including when the same slot VNode is reused under different providers.

Synchronous owned frames and normalization scopes restore in finally on success,
throw and nested operations. There is no global current-page singleton or async
context propagation. Promises/thenables are not accepted as component output;
ordinary thrown message getters are not invoked. Structured errors retain their
code, source path and span. Arbitrary trusted JavaScript is **not a CPU sandbox**.

## Generic fragment decorations

```tsx
<Block>
  <Block.Header height={12} repeat><ReportFooter /></Block.Header>
  <Block.Body><Paragraph>Fragmentable content</Paragraph></Block.Body>
  <Block.Footer height={12}><FragmentFooter /></Block.Footer>
</Block>
```

Header defaults to the first fragment, footer to the last; `repeat={true}` selects
every fragment. Use one Block.Body or direct block children, not both. Duplicate
slots and combining slots with an explicit decorations plan reject. Existing C
static decoration plans retain their unchanged first/all/last behavior and bytes.

FragmentInfo is `{ index, count, first, last }`: zero-based fragment index and final
owner-local count, not page count. Multiple owners/fragments can share a page.
The private decoration protocol reserves first/all/last heights during candidate
selection, including the last footer, without executing recipes. Actual painting
records owned opaque emissions and owner-local fragment totals. Only the phase
coordinator resolves them after all pagination; no marker or callback escapes in
the final portable document. The paginator has no Paragraph/Table/PageContext
dispatch. Future F tables can consume the same reservation seam.

Flow and block decoration regions can use native drawings or Paragraph/Block
content. Text may wrap within their known width/height; stacked content requiring
a second region fails `VERTICAL_OVERFLOW`, without body retry or shrinking. Native
fixed bounds/ink validation also remains mandatory. Explicit constrained Block
`overflow: "hidden"` can clip inside the reservation; clipping is not redaction.
Operation fonts and installed Flow extensions are shared with body and late
emissions, with captured adapter measurement contexts closing on success/error.
Late regions do not install a separate adapter registry. The new showcase uses
core drawings and prose, not a table/image migration.

Source normalization and measurement share the owned operation. Page allocation
and emitted node/text/path quotas aggregate across sections; late region trials
fork the existing output budget rather than installing independent ceilings.
Whole-document page exhaustion rejects before any final callback. Existing exact
numeric/32-ULP certification, mandatory geometry, and fixed CMR bytes are unchanged.

## Visible proof

The new bounded mixed showcase demonstrates a fixed cover → measured flow → fixed
appendix, size/orientation/theme controls, reserved header/footer toggles and real
Page N/total footers. Preview/download share exact bytes, displayed source is its
actual raw module, edits revoke prior Blobs and pending optional chunks cannot
install stale results. Keyboard/mobile checks, all-page qpdf/Poppler extraction,
prepared-font Node/Chromium context/fragment parity and a footer-overlap raster
negative control accompany the native contract tests. This is local evidence,
not independent verification, release or deployment.
