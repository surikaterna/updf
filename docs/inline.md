# Unified content authoring and measurement (D)

Private/unreleased; **implemented for independent audit, not verified**. A/B/C are
independently verified per the caller's D assignment. Their historical evidence is
retained verbatim. This slice adds authoring, not final page/fragment contexts,
deferred footer recipes, images, a new tables package, table-cell block normalization,
shaping, bidi or CSS.

## One content model, one JSX runtime

```tsx
/** @jsxImportSource @updf/core */
import { render } from '@updf/core';
import { lower } from '@updf/core/vdom';
import { Block, measure, Paragraph, Span } from '@updf/layout';
import { Document } from '@updf/layout/vdom';

const content = <Block style={{ padding: { top: 4, right: 4, bottom: 4, left: 4 } }}>
  <Paragraph defaultStyle={{ fontSize: 10 }}>
    {'Author text '}<Span style={{ color: [1, 0, 0] }}>with nested styles</Span>
  </Paragraph>
</Block>;
const measured = measure(content, { width: 180 });
const bytes = render(lower(<Document pageTemplate={{ width: 200, height: 100,
  margins: { top: 10, right: 10, bottom: 10, left: 10 } }}>{content}</Document>));
```

Data authoring is equivalent: `paragraph({ children: ['Author text ',
span({ style: { color: [1, 0, 0] }, children: 'with nested styles' })] })`, optionally
inside the existing `block({ children: [...] })`. `layoutFlow` accepts these data
paragraphs in its body. Use imported `Paragraph`, `Span`, `Block` from the root (also
re-exported by `/vdom`); use `/vdom` `Document` for a semantic JSX body. Root imports
do not load native document lowering, tables, SVG, Fontkit, React or Node code.
The small core-owned recipe/context normalization bridge is intentionally present.

`InlineContent` and `BlockContent` are distinct readonly unions, not a record with
all-optional fields. Data constructors reject block content in inline positions at
type checking. Core JSX erases component output roles to VNode: the provided
`InlineComponent<P>`/`BlockComponent<P>` aliases describe author intent, but cannot
prove arbitrary wrapper output. Runtime normalization always checks actual roles.
Paragraph/Block inside Paragraph/Span and Span outside Paragraph fail with their
actual child source path. There is no implicit paragraph (later table slice F).
Known invalid roles reject before expanding their descendants. Internal content
capabilities validate deeply frozen data, permitting only already owned font/VNode
exceptions: they cannot mint mutable or callback-bearing props.

Strings are text, arrays flatten in order, null/booleans are ignored. Numbers are
**never coerced**, matching existing core text semantics. Present undefined style/
paragraph fields, getters, holes, classes, cycles and copied capabilities reject.
Native drawings are not inline content: use an installed inline adapter instead.

`h`/the production and development JSX factories only capture owned props. They
never invoke an author component while constructing its VNode. The core-owned
private WeakMap recipe bridge recognizes known constructors without importing
layout into core. Normalization expands ordinary wrappers under the same operation,
provider environment and B progress frames. Providers and sibling environments are
restored in finally; returned thenables are not assimilated. Retained measurement
callbacks close on success **and normalization failure**. No public callback-injection
or global name registry is introduced; no PageContext hook is available.

## Paragraph styles and measurement

Defaults are Helvetica, 10 points, black, line height 12, left alignment, collapsed
ASCII spaces, and `breakLongWords: 'error'`. A larger base font defaults to
`max(12, fontSize * 1.2)`. Omitted lineHeight allows each line to grow for actual
mixed-font/visual ascent and descent and the text em strut. A supplied lineHeight is
a fixed reservation that must contain the complete envelope; insufficient height errors,
never clips or shrinks a visual. Blank paragraphs occupy one line; trailing LF
reserves a trailing empty line. `whiteSpace: 'preserve'` retains space advances;
collapse operates across Span boundaries. LF is a hard break in either mode.

Span `style` overrides only font/fontSize/color and inherits the **whole effective
parent style**. Siblings resume their parent, not the previous run. Span boundaries
are never artificial word-break opportunities. `breakLongWords: 'codePoint'` uses
the existing scalar splitter, preserving UTF16 spans and supplementary scalars;
NBSP is not an ASCII space opportunity. Alignment is left/center/right; there is
no justification, decoration, ligature/shaping or general CSS implementation.
Empty/overridden-away Span styles still validate, but an empty Span creates no
glyph/run reservation. Font/style diagnostics map to original Span attributes;
character diagnostics retain the original string's UTF16 range.

`measure(content, { width, height? }, { resources?, profile?, limits?, extensions? })`
returns a deeply frozen, JSON-portable readonly value:

- `size`: unpaginated natural border-box width/height, in PDF points;
- `lines`: top/height/baseline/advance, ink envelope, break reason and text/visual
  fragments; text fragments include style and original UTF16 start/end with a
  normalized author source path (including wrapper/provider expansion);
- `inkBounds`: native painted envelope after transforms/clips. Helvetica and
  stroked/affine path envelopes retain core's conservative bounds policy; prepared
  text uses actual glyph bounds. No nodes, font bytes, callbacks or trusted plans
  escape in this result.

Height is an overflow constraint, not a pagination instruction. Page-advance
controls have no unpaginated measurement. Hidden closed Blocks retain semantic
line metadata even when a native clip hides ink: clipping is not redaction. Generic
block adapters retain C's natural-size contract; do not supply dishonest metrics.
The compiler obtains real natural container capacities rather than inventing an
extreme page size. The C paginator, local-ULP certificates and numeric helpers are
unchanged. Text-only wrap/glyph math is reused, not duplicated; only atomic token
boundaries and the opt-in per-line auto-height envelope were adapted.
Native text fragments reserve actual em/ink envelopes and pad side bearings with
native alignment, never synthetic Unicode. If a nominal empty em box extends
beyond a line, an ink-neutral native line clip permits that box only **after** the
complete ink envelope has been checked. Tight zero-margin mixed-font and negative
bearing PDF tests cover this path. Insufficient explicit lineHeight still errors;
genuine glyph overflow is never converted into clipping.

The existing mixed table entry obtains authored prose through the same compiler;
its standalone operation closes newly possible wrapper contexts too. Table cells,
row protocols, new table components/package and implicit cell paragraphs remain F.

Pass the same resource bindings to measurement/lower/layout and render. Built-in
Helvetica is printable ASCII plus LF. Prepared fonts use the existing simple LTR
Latin/Cyrillic profile, require every glyph, and never fallback. No Fontkit/React/
Node runtime or type dependency leaks into core/layout. Invalid fonts/styles are
checked **before** inline callbacks execute. Trusted defaults and optional service
budgets remain B's policy, not an executable-code sandbox.

The unreleased `@updf/core/measurement` plain/rich inputs, native `richText`, old
Flow paragraph records and component `measurement.measureText` remain transitional
low-level implementation paths through G. They are **deprecated for new authoring**,
not a permanent compatibility facade or a recommendation to serialize rich-run
arrays in UI code. G is the final public replacement/removal tranche; this slice
does not prematurely remove internally used native primitives or proof fixtures.

## Local inline adapters

```ts
import { createExtensions, defineInlineAdapter, inline, measure, paragraph } from '@updf/layout';
const square = defineInlineAdapter<{ height: number }>({
  name: 'example.square',
  validate: input => input as { height: number }, // executable author code: validate real input here
  measure: ({ height }) => ({
    advance: height, ascent: height, descent: 0,
    inkBounds: { empty: false, left: 0, top: -height, right: height, bottom: 0 },
    nodes: [{ type: 'rect', x: 0, y: 0, width: height, height,
      paint: { fill: [0, 0.7, 0.25], stroke: null } }],
  }),
});
const extensions = createExtensions([square]);
const content = paragraph({ children: ['Before ', inline(square, { height: 24 }), ' after'] });
const metrics = measure(content, { width: 180 }, { extensions });
```

`defineInlineAdapter<P>` captures its definition; `inline(adapter, props)` captures
props without freezing callers. The same owned `createExtensions` scope accepts
block and inline adapters, validates duplicate names/identities and is local to an
operation. An inline descriptor cannot be serialized/forged or used as a block.
The existing `defineBlockAdapter` remains the default block visual path; this
temporary parallel role API avoids breaking C and will unify in G.

Advance must be positive; ascent/descent nonnegative with positive total height.
Nodes are native geometry at box top-left; declared ink coordinates are relative
to the baseline (positive y downward). Baseline is the box bottom when descent is
zero. Baseline alignment is the supported policy; top/middle alignment is not
implemented. Each visual is an atomic token, with break opportunities on either
side, never scalar-split. Too wide even on an empty line gives TOKEN_OVERFLOW;
too tall on a fresh page gives LAYOUT_OVERSIZED. Auto paragraphs grow naturally.

The frozen callback context has width, inherited style and operation-bound
`measureNative(nodes, size)` for actual transformed/clipped native ink. Output is
validated and charged **before defensive copying**. Native ink must fit its declared
box/envelope; returned measurements use computed native ink, not invented text or
magic glyphs. The existing C callback wrapper preserves DocumentError and emits
stable stage/origin errors for arbitrary throws without reading thrown getters.
Operation-local caches reuse immutable measurements; new occurrence producers bind
current origins. Source/semantic and emitted occurrence quotas remain independent.
Unique native visual captures use an operation-local provisional quota fork before
copying; failed captures roll back. Reused descriptor/width/style measurements do
not charge capture again. Empty native visual arrays emit no phantom wrapper.
Candidate-local forks charge selected inline painting once and discard probes.

Real application examples: [native badge](../apps/showcase/src/inline-badge.ts),
[actual TSX showcase](../apps/showcase/src/rich.tsx), and
[local optional SVG adapter](../apps/showcase/src/optional-inline-svg.ts). SVG is
compiled to native nodes with `compileSVG`; warnings are explicitly rejected in
this example. The application-owned adapter is the approved optional integration
choice: neither SVG's root/declarations nor layout acquires the other's dependency,
and no package/lockfile change is needed. The showcase Paragraph module is lazy,
keeping SVG/Fontkit/React and table code out of its closure and the initial bundle.
The prepared-font [browser proof](../apps/browser-fonts/inline-proof.tsx) exercises
both visuals and a provider with exact Node/Chromium metrics/PDF parity.

See [D delivery evidence](evidence/architecture-inline.md) for exact scope and gates.
