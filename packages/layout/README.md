# @updf/layout — native document authoring

Private/unreleased `2.0.0-poc.0`, MIT ©2026 Surikat AB. Depends on core, text and
layout-boxes; importing `@updf/core` never loads layout. Tables remain in the real,
separate `@updf/tables` package. Dated audit evidence is retained in `docs/evidence`.

Production Row and standalone Column geometry comes from the shared staged
`@updf/layout-boxes/boxes` engine also used synchronously by the portable TUI.
Layout retains document scheduling, atomic Row versus splittable Column pagination,
page controls and painting adapters. Generic fragment selection remains in the
separate `@updf/layout-boxes/fragmentation` subpath for document and non-document
providers; it does not pull document policy into box-only hosts.

## Public surface

The grouped [API inventory](API.md) maps root exports to their declaration owners
and states the limits of field-level hover coverage. The compiled
[`layout-documentation-examples.ts`](../../tests/integration/layout-documentation-examples.ts)
exercises data layout/measurement, paged tables and the kernel subpaths.

Import `Document`, `Page`, `Flow`, `Block`, `Paragraph`, `Span`, `Row`, `Column`, `PageSize`,
`PageContext`, `FragmentContext`, `layout`, `measure`, data constructors,
decorations and adapter contracts from the root. Use core's JSX runtime and renderer.
The transitional `/vdom`, `/tables`, `/tables/vdom`, `layoutFlow`,
`layoutFlowUnknown` and `Flow.Document` exports are removed without a facade.
See [migration](../../docs/authoring-migration.md).

Text composition belongs to the application, not layout. The examples below use
this explicit configuration; pass the same runtime/service/provider pairing to
`measure`, `layout`/`lower`, and final `render`:

```ts
import { createHelvetica, fontProvider, fontRuntime } from '@updf/fonts';
import { createTextService } from '@updf/text';
const runtime = fontRuntime();
const options = {
  resources: { Helvetica: createHelvetica() },
  text: createTextService({ runtime, defaultFont: 'Helvetica' }),
  providers: [fontProvider(runtime)],
};
```

Layout has no implicit font. Omitted author fonts select only the injected service's
explicit default; empty paragraphs and overridden styles still validate. Generic
owned resource handles retain identity through snapshots and deferred callbacks.

```tsx
/** @jsxImportSource @updf/core */
import { render } from '@updf/core';
import { lower } from '@updf/core/vdom';
import { Document, Flow, Paragraph, Span } from '@updf/layout';

const content = <Document><Flow pageSize={{ width: 200, height: 100 }}
  margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
  <Paragraph>{'Author text '}<Span style={{ color: [1, 0, 0] }}>styled text</Span></Paragraph>
</Flow></Document>;
const bytes = render(lower(content, options), options);
```

```ts
import { render } from '@updf/core';
import { document, flow, layout, measure, paragraph, span } from '@updf/layout';

const content = paragraph({ children: [
  'Author text ', span({ style: { color: [1, 0, 0] }, children: 'styled text' }),
] });
const metrics = measure(content, { width: 180 }, options);
const result = layout(document({ children: flow({
  pageSize: { width: 200, height: 100 },
  margins: { top: 10, right: 10, bottom: 10, left: 10 }, children: content,
}) }), options);
const bytes = render(result.document, options);
```

`layout` accepts core `LowerOptions`, including local registry/metadata. It returns
deeply frozen `{ document, pageCount, placements }`; serialize the ordinary fixed
core document explicitly. Pass the same resources/policy to layout/lower and render;
render accepts `RenderOptions`, not lowering-only registry/metadata fields.
Prepared resources are owned handles, never font bytes or implicit fallback.

## Semantics

- Document contains ordered Page/Flow sections. Fixed Page children are positioned
  drawings; Flow children are block content. Each section begins a new page.
- Flow.Header/Footer reserve positive finite heights; use Flow.Body or direct body
  children, not both. Final callbacks see sealed PageContext/FragmentContext.
- Paragraphs split only at complete measured lines. Block/Paragraph `keepTogether`
  moves content intact once, then errors `LAYOUT_OVERSIZED` on a fresh body if too
  large. JSX Fragment is syntax grouping, not an atomic layout box.
- Hidden overflow clips an explicitly constrained Block, not arbitrary oversized
  atomic content. It is not redaction and does not bypass resource/text validation.
- Row/Column compose ordinary block content side by side without tables or manual
  coordinates. Fixed and bounded weighted border-box tracks resolve before Column
  descendants; Rows are always atomic and support top/middle/bottom/stretch alignment.
  Standalone Columns retain vertical fragmentation and optional `keepTogether`.
  See [Row/Column](../../docs/rows.md) for the complete width, clipping and error policy.
- Text uses `Paragraph.style`/`Span.style`: `font` is a resource ID, `fontSize`
  is points, `color` is RGB, and paragraph-only `textAlign` is left/center/right.
  `lineHeight: 1.2` is a positive font-size ratio; `pt(16)` is an absolute point
  length inherited unchanged. The default `normal` is font-aware (Helvetica10:
  10pt). Glyph ink may overflow tight line boxes, but must fit page bounds or an
  explicit clip. Zero is unsupported by the positive-progress contract.
  See [text styles](../../docs/text-styles.md); old top-level paragraph `align`,
  `lineHeight`, and `defaultStyle` reject, not compatibility aliases. Fixed core
  `ParagraphDefinition` retains its separate point-valued contract.
- Theme is explicitly read with core `useContext` and applied to props. Providers
  scope copied data; they do not create an implicit CSS cascade or box inheritance.
- Source and generated output have independent accounting under the same trusted/
  service operation policy. Callbacks are trusted synchronous code, not a sandbox.

## Derived-region numerical contract

Native boundaries are established from compensated source reservations. The private
capacity is the greatest finite binary64 extent whose translated endpoint rounds
at or before the region end. An exact dyadic certificate resolves the endpoint's
next-value midpoint, including ties-to-even. This is not quantization, decimal
recovery, iterative nudging or a page-scaled epsilon.

Both half the endpoint's upward spacing and capacity-versus-nominal difference must
be at most 32 ULPs of the local nominal extent. Ill-conditioned coordinates reject
with `GEOMETRY`, even for empty bodies. Actual materialized endpoints and region
separation must fit independently. Font sizes, advances, line heights and explicit
reservations are never shrunk or shifted. There is no public precision certificate.

Generated paragraph parts and stack pieces privately own endpoints from the same
`MetricSum` sequence. Container reservation comparisons admit these source edges
strictly before translating them. When native addition of the semantic extent
disagrees with the shared edge, only the **comparison allocation** uses a certified
native-fitting capacity, with an exact dyadic residual bounded by 32 local ULPs.
This is a conditioning/rejection ceiling, not overflow tolerance. Certificates
are bound to their actual fragment or stack piece; copied/foreign records and
mismatched semantic extents cannot borrow the allocation. Painted line heights,
transforms, glyph baselines, clips and source reservations remain unchanged.

Native page geometry still has to fit independently. In particular, two 12.6pt
lines inside 6pt padding fit a 37 × 37.2pt zero-margin page. Removing bottom
padding on a 37 × 31.2pt page leaves the second native transformed clip ending at
`18.6 + 12.6 = 31.200000000000003`; strict core `BOUNDS` rejection is retained.
This native-materialization constraint means not every mathematical fit is a
renderable fit. No clips, page dimensions or core bounds comparisons are adjusted.

See [content](../../docs/inline.md), [blocks](../../docs/blocks.md),
[documents](../../docs/documents.md), [tables](../../docs/tables.md) and
[JPEG native placement](../../docs/jpeg-images.md) for detailed contracts. No layout
`Image` component is added; native XObjects can use existing declared-height atomic
FixedBlock data and reserved/fixed drawing regions.
