# @updf/layout-kernel — allocation, boxes and fragmentation (A/B/C)

## Root API inventory (documentation slice)

| Exports | Declaration owner | Contract |
| --- | --- | --- |
| `resolveWidths` (typed and unknown overloads) | `src/width-resolver.ts` | Validated point allocation, frozen output, stable binary64 rounding |
| `WidthTrack`, `WeightedWidth`, `WidthResolutionInput`, `WidthResolution` | `src/width-types.ts` | Fixed or bounded weighted tracks and allocation snapshots |
| `LayoutInputError`, `LayoutInputErrorCode` | `src/error.ts` | Input errors with code/path; host exceptions retain identity |

This inventory and new declaration JSDoc cover the **root allocator only**, not
every field or subpath. Existing boxes/numeric/arithmetic/geometry/fragmentation
contracts remain below and in the linked architecture document; their declaration
owners are not part of this documentation slice. Width allocation does not page,
clip, paint or select an overflow policy. Capped shares can leave unused width.

Private MIT `2.0.0-poc.0` package: the canonical binary64 fixed/weighted bounded
width allocator, independent of PDF, fonts, VDOM, DOM, React, Node and `@updf/core`.
No runtime dependencies or ambient declaration dependencies.
The [authoritative current architecture/API contract](../../docs/architecture/layout-kernel.md)
consolidates host bindings, lifecycle, limits and evidence provenance.

```ts
import { resolveWidths, LayoutInputError } from "@updf/layout-kernel";
const result = resolveWidths({ availableWidth: 80, tracks: [20, { weight: 1 }], gap: 1 });
```

Inputs are ordinary data objects and dense ordinary arrays. Unknown keys,
accessors, explicit invalid optional values, invalid geometry and count budgets
reject with `LayoutInputError` (`code`, JSON-pointer `path`, `message`). Accessors
are not invoked, including inherited accessors. Only validated own enumerable data
properties are consumed: inherited optional fields are absent (use defaults), and
missing own required fields reject at their normal field diagnostic paths.
Track count is checked before entries. Proxy traps are arbitrary
host code: this is not a CPU sandbox, and host exceptions propagate unchanged.
Results and their width arrays are frozen; no caller data is mutated.

`@updf/layout-kernel/numeric` exposes only the existing binary64 primitives.
Its documented preconditions require validated nonnegative finite geometry;
it does not validate arbitrary numeric inputs.

## Atomic box source views

`@updf/layout-kernel/boxes` exports `layoutBoxes`, `viewBox` and their readonly
types. `layoutBoxes({root, view, width, limits?, exactInlineEdges?, measure?})`
reads an immutable host source through six callbacks: `id`, `path`, `style`,
`childCount`, indexed `childAt`, and opaque `content`. Each field is read once
per distinct node; repeated source references/cycles and repeated IDs reject.
Paths are host-provided diagnostic paths. The operation caches only validated
metadata/indices, not a deep copy of the host tree. Callback/proxy exceptions
retain identity. Arbitrary host callbacks are trusted code, not sandboxed code.

The canonical `BoxStyle` subset is:

- `flexDirection: "row" | "column"` (default column), numeric `gap >= 0`;
- border-box `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`;
- row children: a fixed positive width **or** positive `flexGrow` (default 1),
  optional `flexBasis: 0`, and the existing allocator's positive min/max bounds;
- `alignItems: "start" | "center" | "end" | "stretch"` (default start);
- numeric nonnegative `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`.

Root/column children cannot use grow/basis. Column alignment must be start.
There is no CSS shrink, wrap, percent, intrinsic width, margin, border or paint.
Padding reserves insets only; content width must remain positive. Row height is
the largest child height plus vertical insets; column height is the compensated
child/gap sum plus insets. Final height clamps cannot truncate content, with no
epsilon fit allowance. Stretch grows child boxes, never remeasures their content,
and rejects child height constraints. Nested row alignment uses stretched height.

Content is allowed only on leaves. A content leaf requires
`measure(content, {path, allocation: {width, exactStart?, exactEnd?}}): {height}`;
height must be finite/nonnegative. Width is the authoritative **content** width,
not the border width; PDF/font measurement remains the host's responsibility.
Own enumerable data records only: unknown keys, accessors and explicit undefined
reject. Inherited optional fields are absent. Owned styles, contexts, allocations,
output records/arrays are frozen; caller nodes/styles and opaque content are not.

Results have preorder `boxes` (`id`, `path`, `parentIndex`, `childStart`,
`childCount`, `left`, `top`, border-box `width`/`height`, optional `content`,
`allocation`) and an explicit `childIndices` array. Direct children need not be
contiguous in preorder. Offsets are relative to the parent's **content** origin;
the root is `(0,0)`. Insets are added by the host without rebasing source glyphs.
Exact inline edges are opt-in absolute sums of binary64 allocations/insets in
units of **2^-1075**, intended for terminal floor projection only. Default
allocations omit this extra BigInt edge metadata. Measurement and rendering must
project the same edges; the kernel does not know about terminal cells.

Traversal/height/placement passes are iterative with linear node/edge work (the
existing bounded-track allocator retains its own complexity). Defaults are nodes
100000, depth 1024, child calls 99999, measurements 100000. Limits are safe integers;
nodes/depth must be positive, child/measurement limits can be zero. Counters are
checked before invoking an over-budget callback and reported in `counts`.

`viewBox` is a narrow prepared-row source: final width/height, numeric edge insets,
gap/alignment, path, `childCount` and `childAt(index): {width,height}`. It snapshots
validated indexed sizes (at most 100000), uses the **same** pure placement routine,
and returns frozen `{height, children: [{left,top,width,height}]}`. It does not
resolve already-certified tracks or measure content. Zero child sizes are accepted;
children plus fixed gaps must fit width minus left/right insets, and the tallest
child plus vertical insets must fit height. Its prepared fit precondition
retains the host's existing metric `exceeds` policy, unlike generic boxes' strict
truncation/geometry checks. Production PDF preparation owns this placement; actual
complete fragments must match prepared heights. Both paint and content-line
metadata consume these offsets, preserving existing inset association.

## Numerical authority and dependency cost

`/arithmetic` exports the unchanged existing `MetricSum`, `sum` and `exceeds`
bodies, with the original metric/nonfinite preconditions. `/geometry` exports
the derived-axis/materialized-start certificate and certified row alignment.
`@updf/core` now **depends explicitly on this package**, but its runtime graph
imports only `/arithmetic`. A core-only install includes the **whole kernel
tarball**, including boxes; tree shaking does not reduce installed cost.
The allocator root entry does not import boxes. Kernel has zero dependencies,
including no core/layout/VDOM/fonts/DOM/Node/React imports or ambient types.

Production layout maps only recognized `LayoutInputError` failures to the existing
`DocumentError`. The terminal proof consumes public entries directly. This is not
a complete layout engine: page creation, painting, final contexts and nested PDF
pagination remain host-owned; no generic VDOM compiler or renderer is introduced.

## Fragmentation (separate entry point)

Import `createFragmentOperation` from `@updf/layout-kernel/fragmentation`.
Neither the package root nor `/boxes` reexports fragmentation or retains its code.

An operation supports both prepared range queries (`prepare`, `select`) and flat
indexed column flow (`start`, `fragment`). They use the same maximal-prefix selector.
Sources have immutable unique `id`/descriptor identities, `path`, nonnegative safe
integer `extent`, atomic/splittable mode, and either fixed width or reflow width.
The view supplies an own data `count` and trusted indexed `at` callback; sources are
read lazily, not copied eagerly. Repeated range queries are legitimate and charged.

`provider.next(descriptor, {offset, extent, width}, work)` measures **one legal
indivisible unit**, returning own data `{end, height, content}`. It receives no
height capacity and cannot supply a second page selector. End must progress within
extent; an atomic unit consumes the whole extent. Height is finite/nonnegative;
zero height still requires strict offset progress. Empty extents never invoke the
provider. Fixed-width mismatches reject with `VALUE` before measurement. Reflow
providers see the actual width of each region. This does not imply PDF rich-text
reflow: prepared PDF lines are fixed-width, while the ASCII proof uses character offsets.

Range results, unit references, placements, cursors and count snapshots are frozen.
Opaque host content/descriptors are retained by reference, never cloned or frozen.
Region input is own data `{id,width,height,usedHeight}` with finite nonnegative
dimensions and `usedHeight <= height`. Every accepted placement uses the boxes
kernel's start-aligned zero-gap column placement, plus the existing metric origin sum.
No nested fragmentable trees, gaps, alignment, page creation or fresh-region
oversize policy are included. Region results are `done`, `region-full` or `blocked`.

Cursors are operation-owned capabilities authenticated in a local WeakMap, without
reading token properties. Each attempt consumes the old cursor exactly once,
including blocked attempts, and returns a new cursor. Forged, foreign, replayed and
closed tokens reject before providers. Any error poisons the operation; `close()`
invalidates all cursors. Host callback/proxy exceptions retain their identity.
Reentrant prepare/start/select/fragment calls are rejected and poison the operation;
callbacks may read counts or close it. Health is checked immediately after each
provider/indexed-view callback, so caught failures cannot continue selection or
charge outputs; even `work.consume(0)` rejects after close/poison. Close and poison
drop operation-owned descriptor, provider, source, view and cursor associations.
Retained handles and frozen counts remain usable only for rejection/inspection;
accepted outputs still borrow host references and remain the caller's responsibility.
No placement history is retained by default. Active malformed cursor/source attempts
charge the attempt ledger before authentication; already-closed calls do not charge.

One monotonic ledger spans the entire operation, including unsuccessful trials and
the first rejected unit. Standalone protective defaults are:

| Category | Limit |
| --- | ---: |
| attempts (start/select/fragment) | 10,000 |
| sourceVisits (each selected/flow-visited source) | 100,000 |
| sourceReads (prepared snapshots/indexed callbacks) | 100,000 |
| measurements | 100,000 |
| unitsExamined | 100,000 |
| outputFragments (accepted unit refs and region placements) | 100,000 |
| providerUnits | 1,000,000 |

Limits are nonnegative safe integers, checked before the corresponding callback,
access or output allocation. Counts of already-performed work do not roll back on
failure. `work.consume(n)` charges provider-declared safe-integer work; its handle
expires when the callback returns, including exceptional return. These counters
are not heap measurements, practical CPU limits, or a hostile callback sandbox.

The PDF adapter uses **one enclosing-operation ledger** with each new category
capped at `Number.MAX_SAFE_INTEGER`, matching existing internal-work compatibility
policy pending issue **#25**'s budget design. PDF node/text/path/page caps remain
separate, unchanged and candidate-forked. This mapping does not weaken standalone
defaults and is not a practical CPU or hostile-sandbox guarantee.

## Nonroot declaration documentation inventory (remaining S5 slice)

The earlier root-only documentation note above describes the prior slice. This
append adds defining-declaration JSDoc for the nonroot public surface without
changing that slice's text or allocator code. Grouped coverage is not per-field
exhaustiveness. The compiled
[`layout-documentation-examples.ts`](../../tests/integration/layout-documentation-examples.ts)
uses all five subpaths; its companion test checks behavior and emitted comments.

| Import path / exports | Owners under `src/` | Hover coverage |
| --- | --- | --- |
| `@updf/layout-kernel/boxes`: `layoutBoxes`, `viewBox`, `BoxStyle`, `BoxView`, `BoxAllocation`, `BoxLimits`, `LayoutBoxesInput`, `BoxRecord`, `BoxLayout`, `PreparedBoxView`, `ResolvedBoxSize`, `BoxOffset`, `BoxPlacement` | `box-layout.ts`, `box-prepared.ts`, `box-types.ts`, `box-placement.ts`; barrel `boxes.ts` | Host units, defaults/budgets, tree/measurement roles, offsets, fit errors and shallow payload ownership; not every dimension/index member |
| `@updf/layout-kernel/fragmentation`: `createFragmentOperation`, `fragmentDefaults`, `FragmentOperation`, `FragmentSource`, `FragmentView`, `FragmentProvider`, `ProviderWork`, `FragmentLimits`, `FragmentCounts`, `FragmentUnit`, `SelectedRange`, `RangeRequest`, `PreparedSource`, `FragmentCursor`, `FragmentRegion`, `FragmentPlacement`, `RegionResult` | `fragmentation.ts`, `fragment-types.ts`, `fragment-work.ts` | Source versus physical units, default caps, lazy readers, progress/status, single-use cursor and poisoned lifecycle; most repeated numeric fields use grouped comments |
| `@updf/layout-kernel/numeric`: `bits`, `value`, `dyadic`, `spacing`, `floorDyadic`, `successor` | `binary64.ts`; barrel `numeric.ts` | Unchecked finite/nonnegative preconditions, encoding bounds, dyadic units and undefined boundaries |
| `@updf/layout-kernel/arithmetic`: `MetricSum`, `sum`, `exceeds` | `arithmetic.ts` | Mutable accumulation, nonfinite propagation, default scale and relative comparison, no implicit units |
| `@updf/layout-kernel/geometry`: `DerivedAxis`, `derivedAxis`, `materializedStart`, `alignedTop` | `geometry.ts` | Frozen axis/conditioning, native association, required host validation, fit errors and alignment roles |

These are host primitives, not the shape-drawing `@updf/geometry` package. They
do not create pages, choose fresh-page oversize policy, paint, redact or clip.
Kernel errors are `LayoutInputError` from the root; arbitrary host exceptions
propagate. Structural freezing does not deep-freeze generic host payloads.
