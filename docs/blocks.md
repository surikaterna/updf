# Generic blocks and static fragment decorations (C)

Current D authoring can place `paragraph`/`span` data in these containers and use
imported `Block`/`Paragraph`/`Span` through the core-owned semantic normalization
bridge. `@updf/layout/vdom` `Document` accepts those children and owned local
extension scopes. See [inline.md](inline.md). C is independently verified per the
D assignment; D is implemented for audit, not verified. The historical C contract
and status below are retained rather than rewritten. Its paginator/numeric kernel
is unchanged, and E/F/G/Image remain outside D.

Implemented locally, awaiting independent C audit. D–G, final PageContext,
deferred page recipes, images and table-cell block content are not implemented.
This contract uses the existing native renderer and the single layout paginator.

## Public data entry

```ts
import { block, createExtensions, layoutFlow } from "@updf/layout";
import { chart, chartAdapter } from "../apps/showcase/src/chart.js";

const result = layoutFlow({
  pageTemplate: {
    width: 240, height: 160,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  body: [block({
    children: [chart({ height: 80, values: [0.2, 0.6, 0.9] })],
    style: {
      height: 48, overflow: "hidden",
      padding: { top: 6, right: 6, bottom: 6, left: 6 },
      border: { width: 2, color: [0, 0.6, 0] },
    },
  })],
}, {}, createExtensions([chartAdapter]));
```

The chart is example source, not a layout package export or native primitive.
`block` copies/freezes data without freezing callers, preserving owned extension
descriptors, decoration plans and prepared-font identities. VNodes are not block
or adapter data. Ordinary raw `{type: "block", ...}` records are also normalized
by `layoutFlowUnknown`; owned adapter/plan capabilities cannot be forged by JSON.

Children are readonly `FlowBlock[]`: current paragraph/fixed/spacer/break,
extensions and nested containers. Old paragraph wrapping/math remains unchanged.
The compiler handles block normalization; the paginator never switches on
paragraph/table/container kinds. Internal heap continuations support deeply nested
container selection and painting without depending on the JS call stack.

Plain data blocks work through the existing ordinary `Flow.Document` component.
Installing extension sets or transporting decoration capabilities through that
transitional JSX boundary is not implemented; use the native data entry above.
This is not a new JSX intrinsic grammar or the later semantic Paragraph API.

## Sizing and overflow

All coordinates are PDF points and all supplied numbers must be finite.
Present undefined fields, unsupported keys, getters, array holes and classes fail.

| Style | Meaning |
| --- | --- |
| `width` | Positive border-box width; omitted fills available width |
| `minWidth` / `maxWidth` | Nonnegative constraints applied to computed width; min > max rejects |
| `height` | Nonnegative **closed** border-box height; omitted uses natural content height |
| `minHeight` / `maxHeight` | Nonnegative constraints applied to computed height; min > max rejects |
| `padding` | Optional Insets with all four nonnegative sides; omitted is zero |
| `border` | Optional nonnegative width and readonly RGB color; reserves each side |
| `background` | Optional readonly RGB color |
| `gap` | Nonnegative space only between non-control children; no outer gap or margin collapse |
| `overflow` | `error` (default) or `hidden`; no visible/auto/scroll modes |

Width constraints do not shrink an oversized border box to fit a parent. Its final
width must remain positive and fit the available region, including in hidden mode.
Border and padding are subtracted before measuring children. Derived content axes
use the existing private 32-local-ULP dyadic certificates; native associations and
part/fragment reservations remain checked. No global tolerance change is made.

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

Decoration break policy is **clone per fragment**: background, all four border
sides and all padding sides are applied to every container fragment. Additional
clone reservations can increase aggregate fragmented height beyond its natural
unfragmented height. This is an explicit basic policy, not full CSS behavior.

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

Existing PageTemplate repeated regions and table header/row geometry retain their
existing paths. Block decorations are not final-page header/footer recipes. The
opaque ownership boundary is available for later E integration, but no deferred
callback/PageContext/FragmentContext API or mutable global current page exists now.

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
[architecture-blocks.md](evidence/architecture-blocks.md). Independent audit of C
must precede D; passing these implementation gates is not independent verification.
