# @updf/layout — native document authoring

Private/unreleased `2.0.0-poc.0`, MIT ©2026 Surikat AB. Optional, core-only runtime
dependency; importing `@updf/core` never loads layout. Tables remain in the real,
separate `@updf/tables` package. Dated audit evidence is retained in `docs/evidence`.

## Public surface

Import `Document`, `Page`, `Flow`, `Block`, `Paragraph`, `Span`, `PageSize`,
`PageContext`, `FragmentContext`, `layout`, `measure`, data constructors,
decorations and adapter contracts from the root. Use core's JSX runtime and renderer.
The transitional `/vdom`, `/tables`, `/tables/vdom`, `layoutFlow`,
`layoutFlowUnknown` and `Flow.Document` exports are removed without a facade.
See [migration](../../docs/authoring-migration.md).

```tsx
/** @jsxImportSource @updf/core */
import { render } from '@updf/core';
import { lower } from '@updf/core/vdom';
import { Document, Flow, Paragraph, Span } from '@updf/layout';

const content = <Document><Flow pageSize={{ width: 200, height: 100 }}
  margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
  <Paragraph>{'Author text '}<Span style={{ color: [1, 0, 0] }}>styled text</Span></Paragraph>
</Flow></Document>;
const bytes = render(lower(content));
```

```ts
import { render } from '@updf/core';
import { document, flow, layout, measure, paragraph, span } from '@updf/layout';

const content = paragraph({ children: [
  'Author text ', span({ style: { color: [1, 0, 0] }, children: 'styled text' }),
] });
const metrics = measure(content, { width: 180 });
const result = layout(document({ children: flow({
  pageSize: { width: 200, height: 100 },
  margins: { top: 10, right: 10, bottom: 10, left: 10 }, children: content,
}) }));
const bytes = render(result.document);
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

See [content](../../docs/inline.md), [blocks](../../docs/blocks.md),
[documents](../../docs/documents.md), [tables](../../docs/tables.md) and
[historical flow evidence](../../docs/evidence/flow.md) for detailed contracts.
