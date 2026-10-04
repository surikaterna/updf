# @updf/layout-kernel — allocation and atomic boxes (A/B)

Private MIT `2.0.0-poc.0` package: the canonical binary64 fixed/weighted bounded
width allocator, independent of PDF, fonts, VDOM, DOM, React, Node and `@updf/core`.
No runtime dependencies or ambient declaration dependencies.

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
resolve already-certified tracks or measure content. Its prepared fit precondition
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
a complete layout engine: **Slice C fragmentation/pagination is not implemented**.
Existing PDF fragment, paint, callback/provider and pagination protocols stay in
the host; no generic VDOM compiler or renderer is introduced here.
