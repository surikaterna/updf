# Generic blocks and static fragment decorations (C)

Current private/unreleased contract. `paragraph`/`span` data and imported
`Block`/`Paragraph`/`Span` use the core-owned normalization bridge. Native
`Document` contains `Page`/`Flow` sections; Flow accepts block children and local
extension scopes. See [inline](inline.md), [documents](documents.md) and
[tables](tables.md). The native renderer, paginator and numeric kernel are unchanged.
Historical C delivery/audit records remain under `docs/evidence`.

## Public data entry

```ts
import { block, createExtensions, document, flow, layout } from "@updf/layout";
import { chart, chartAdapter } from "../apps/showcase/src/chart.js";

const result = layout(document({ children: flow({
  pageSize: { width: 240, height: 160 },
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  extensions: createExtensions([chartAdapter]),
  children: [block({
    children: [chart({ height: 80, values: [0.2, 0.6, 0.9] })],
    style: {
      height: 48, overflow: "hidden",
      padding: 6,
      border: { width: 2, color: [0, 0.6, 0] },
    },
  })],
}) }));
```

The chart is example source, not a layout package export or native primitive.
`block` copies/freezes data without freezing callers, preserving owned extension
descriptors, decoration plans and prepared-font identities. VNodes are not block
or adapter data. Ordinary raw `{type: "block", ...}` records are also normalized
by native `layout`; owned adapter/plan capabilities cannot be forged by JSON.

Children are readonly block content: native paragraphs, extensions and nested
containers. Paragraph wrapping/math remains unchanged.
The compiler handles block normalization; the paginator never switches on
paragraph/table/container kinds. Internal heap continuations support deeply nested
container selection and painting without depending on the JS call stack.

Data blocks and ordinary `<Block>` components work as children of native `<Flow>`
inside `<Document>`. Install adapters with `Flow.extensions`. No extra JSX runtime
or intrinsic grammar is introduced.

## Sizing and overflow

All coordinates are PDF points and all supplied numbers must be finite.
Present undefined fields, unsupported keys, getters, array holes and classes fail.

| Style | Meaning |
| --- | --- |
| `width` | Positive border-box width; omitted fills available width |
| `minWidth` / `maxWidth` | Nonnegative constraints applied to computed width; min > max rejects |
| `height` | Nonnegative **closed** border-box height; omitted uses natural content height |
| `minHeight` / `maxHeight` | Nonnegative constraints applied to computed height; min > max rejects |
| `padding` | Optional scalar nonnegative shorthand in points; omitted is zero |
| `paddingTop` / `paddingRight` / `paddingBottom` / `paddingLeft` | Nonnegative point edges overriding shorthand, regardless of key enumeration |
| `border` | Uniform fallback: required nonnegative width and readonly RGB color, or null for none |
| `borderTop` / `borderRight` / `borderBottom` / `borderLeft` | Typed edge or null; explicit edge beats uniform fallback; omission is unspecified |
| `backgroundColor` | Optional readonly RGB color; absent means no fill |
| `gap` | Nonnegative space only between non-control children; no outer gap or margin collapse |
| `overflow` | `error` (default) or `hidden`; no visible/auto/scroll modes |

Block style never becomes an ambient descendant style. See [styles](text-styles.md) for
role support, object composition and the deliberate unreleased API migration.
Width constraints do not shrink an oversized border box to fit a parent. Its final
width must remain positive and fit the available region, including in hidden mode.
Border and padding are subtracted before measuring children. Derived content axes
use the existing private 32-local-ULP dyadic certificates; native associations and
part/fragment reservations remain checked. No global tolerance change is made.
Border strips paint wholly inside the allocated border box. Top/bottom own corners;
side strips fill the remaining height. See the [reusable border policy](text-styles.md#reusable-edge-border-policy-42-a)
for typed objects, strict source-path validation and per-layer shorthand expansion.

Natural height sums child natural heights, between-child gaps and vertical insets.
An unconstrained auto-height block grows naturally and is splittable by default,
even when `overflow: "hidden"` is set: there is no silent clipping to a page.
Children retain their own atomicity or complete-line fragmentation. Extra minHeight
space is real blank space, split arithmetically against measured region capacities,
not a materialized unbounded array or a one-point quantum. Gaps are explicit
between-child reservations and can straddle a page boundary; they are not collapsed.

An explicit height closes the box. A maxHeight that truncates natural content also
closes it. Natural content exceeding such a constraint errors `VERTICAL_OVERFLOW`
by default; it is not silently continued into more boxes/pages. Hidden mode paints
all native content beneath a positive padding-edge PDF clip in the one closed box.
Following document items start after the constrained box, not after hidden content.

The clip includes the padding area but excludes the border reservation. Background
paints before content; borders paint afterward. Both are outside the content clip;
ancestor clip stacks still
contain nested descendants. A nonempty hidden box with no positive padding-edge
height rejects `GEOMETRY`, rather than inventing a zero-area native clip or dropping
text. An empty height-zero box is legal and advances finite extent without ink.

**Clipping is not redaction.** Clipped text/glyph data remains in the PDF and can
be extracted. Do not use overflow controls to remove confidential information.
Hidden mode does not bypass text wrapping, font-profile/resource/ink validation or
service accounting; clipped text still counts as generated text.

`keepTogether: true` makes the entire container atomic independently of overflow.
It moves once to a fresh region or errors `LAYOUT_OVERSIZED`; it does not shrink or
implicitly clip. Closed explicit-height boxes are atomic too. An auto block may
contain generic advance controls, including intentional leading/trailing blanks.
Closed/kept blocks reject page-advance controls rather than pretending a break
can both remain atomic and create a continuation page.

Paragraphs use the same `keepTogether` spelling: `true` keeps all measured lines
together; omission or `false` permits complete-line fragmentation. Table rows stay
together even when the property is omitted and reject `false` (row splitting is
unsupported). Adapter `fragmentation: "atomic"` remains capability terminology,
not an authoring prop. JSX Fragment only groups syntax; it does not create a layout
box or keep its children together. Use an actual `<Block keepTogether>` to group a
headline with a visual. Hidden overflow never grants an atomic oversize fallback.
The showcase SVG headline and graphic now share a kept Block in `src/svg.ts`;
the chart headline/visual pair in `src/blocks.tsx` is also a kept Block, independent
of the surrounding container's whole-block toggle. Source display reads these
actual modules rather than a separate illustrative snippet.

Background and all padding/border-width **reservations clone per fragment**. Border
painting uses top only on the first fragment, bottom only on the last, and sides on
every fragment. Reserved insets remain even on fragments whose top/bottom does not
paint, preserving existing content geometry/pagination. Additional clone reservations
can increase aggregate fragmented height beyond its natural unfragmented height.
This is an explicit basic policy, not full CSS behavior.

## Static decorations and candidate reservation

```ts
import { createDecorationPlan } from "@updf/layout";

const decorations = createDecorationPlan([
  { edge: "before", repeat: "first", height: 12, nodes: [] },
  { edge: "after", repeat: "last", height: 12, nodes: [] },
]);
// block({ children, decorations })
```

`StaticDecoration` has before/after edge, all/first/last repetition, known height
and native nodes. A height can come from same-operation measurement in an adapter's
measure callback; resources and native geometry are validated in that operation.
Zero height permits only empty static nodes. `DecorationPlan` is a privately branded,
deeply immutable capability, not a serialized plan. Copies/JSON lookalikes reject.

Container inputs or an adapter's `MeasuredBlock.decorations` may declare the plan.
If a placed callback result repeats a `decorations` field, it must be exactly the
same declared identity; a callback cannot introduce an unreserved foreign plan.
Headers/footers reserve before selecting content, including atomic head + content
+ foot fit. Last-only reservations use at most two candidate constraints: a
final-capable candidate, then a nonfinal candidate if needed. An unreserved final
candidate never gets accepted. Candidate nodes are owned before another callback
can mutate shared results. Provisional trials do not amplify emitted-node/text
budgets. Content must advance strict offset/extent even when its height is zero;
decoration output alone cannot excuse nonprogress.

Static decorations are distinct from reserved deferred `Block.Header`/`Block.Footer`
recipes. PageContext/FragmentContext are sealed during finalization; see
[documents](documents.md). There is no mutable global current page.

## Extension trust and policy

`defineBlockAdapter<P>` captures synchronous validate/measure callbacks and a name.
`createExtensions(readonlyAdapters)` captures an immutable name + identity scope;
there is no global name registry. `extension(adapter, props)` creates an owned
descriptor. Its installed identity, not an arbitrary `kind` string, determines
which producer is invoked. Public measured outputs have finite natural size,
positive safe extent, atomic extent one and checked placed/defer results.

Callbacks are trusted executable code, not a sandbox. A callback or hostile Proxy
can consume host CPU/memory regardless of output validation. Strict finite progress
is required of returned fragments; zero-height progress is legal. A paginator defer
moves only once to a fresh region at that offset, then fresh failure is structured
oversize. Public contexts expose measurement width and operation-bound text
measurement only; retained callbacks fail after operation closure.

The same captured resources/policy govern text measurement, static regions,
fragment outputs and final native validation. Generated output has an incremental
candidate-local cumulative budget before native validation/copy, including selected
siblings and ancestor wrappers. Deferred/discarded candidates roll back their ledger
and space continuations; only selected painting commits output once.
Sibling tails/accessors beyond the next failing node budget are not inspected.
Source/measurement caches are operation-local; repeated semantic measurements and
candidate trials do not charge source text again. Only semantic measurements are
cached; occurrence producers and diagnostic origins are rebound for each use.
Gap/minHeight continuation consumes actual remaining region height with private
exact dyadic bookkeeping and finite safe-integer progress ordinals, not fixed
fresh-region chunks or point-sized iteration. There are no new hidden work caps.

Validate/measure/fragment callback throws become stable `DocumentError` diagnostics
with callback stage and current source origin. Existing `DocumentError` instances
and spans are preserved without prefixing them again. Arbitrary thrown objects'
message/toString/getters are not read. Measurement callbacks still close in `finally`.

For actual code, browser/demo controls and audited-scope evidence, see
[architecture-blocks.md](evidence/architecture-blocks.md). Passing implementation
gates is not independent verification.
