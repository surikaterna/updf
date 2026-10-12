# Rich text: children and spans rather than paragraph-array props

Discussion/proposal, not an implemented API change.

## Problem

The showcase currently exposes low-level native `richText` in positioned captions:

```tsx
<richText x={24} y={20} width={432} height={40}
  paragraphs={[{ runs: [{ text: title }], defaultStyle: { /* ... */ }, /* ... */ }]} />
```

Converting the outer document to TSX did not remove that awkward inner data
structure. It is useful as the JSON renderer model, but not a good default
authoring example. Current [inline documentation](inline.md) already calls this
a low-level renderer/adapter path, not recommended new authoring.

## Existing API to prefer for flowing content

This is already supported inside the appropriate layout/Flow context:

```tsx
import { Paragraph, Span } from '@updf/layout';

<Paragraph style={{ font: 'Helvetica', fontSize: 12, lineHeight: 1.2 }}>
  Hello <Span style={{ color: [0.8, 0.1, 0.1] }}>important text</Span>.
</Paragraph>
```

The equivalent authored data uses `paragraph({ children: [...] })` and
`span({ children: '...', style: ... })`, not a renderer run array. Span boundaries
must not insert line/word breaks; paragraph boundaries do. Paragraph-level
alignment/wrapping and inline font/color inheritance are different responsibilities.

## Recommended direction for positioned content

Add a deliberate positioned text authoring component that accepts inline children,
so authors can write something like this **proposed, not current API**:

```tsx
<Text x={24} y={20} width={432} height={40}
  style={{ font: 'Helvetica', fontSize: 12, lineHeight: 1.2 }}>
  Hello <Span style={{ color: [0.8, 0.1, 0.1] }}>important text</Span>.
</Text>
```

Requirements before implementing:

- Plain strings and spans form one paragraph. Multiple paragraphs must have
  explicit boundaries; do not silently reinterpret a paragraph list as spans.
- Reuse the existing inline style, whitespace, inheritance and measurement
  semantics. Do not create a second divergent Span language just for captions.
- Lower into the current native model, preserving diagnostics, wrapping,
  geometry, resource ownership and identical rendering between TSX/JSON paths.
- Keep the low-level JSON model honest in the showcase's JSON tab. Do not hide a
  breaking native-model change behind a cosmetic rename.
- Choose the package boundary explicitly. Reusing `@updf/layout` is the simplest
  coherent design; a lightweight positioned-only subpath requires an actual
  dependency/normalization design, not a promise of zero cost. Do not introduce
  a core → layout dependency or export a helper that silently imports all layout.
- Measure the result. Current fixed text is 19.6 KiB gzip; native TSX text is
  25.2 KiB; the existing Paragraph/Span layout workload is 60.5 KiB. These are
  complete profile sizes, not an estimate of the as-yet-unimplemented helper.

Recommendation: **children + `Span` for authoring; keep paragraphs meaningful
for block structure and preserve the renderer's JSON contract initially.** The
remaining decision is whether positioned authoring may require layout or must
retain a separately measured lightweight path. No core or public API has been
changed by this comparison/proposal.
