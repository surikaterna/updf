# Layout kernel: authoritative current architecture and API contract

This is the current contract, not an ADR proposal. Allocation, atomic boxes,
fragment selection and the optional playground are implemented. The original
`feature/layout-kernel` delivery through `da0b23f` on `12e485b9` is historical
lineage, not this worktree's branch, base or current merge status. All native packages
remain private `2.0.0-poc.0`. See root README/current delivery evidence for the actual
revision. This contract does not authorize publication/deployment or claim fresh audit.

## One algorithm owner, host-specific bindings

`@updf/layout-kernel` owns host-neutral numerical layout. It has zero runtime
dependencies and ES-only declarations: no PDF, fonts, VDOM, DOM, Node or React
imports/types. Source-graph tests, boundary inventories, packed portable consumers
and retained bundle graph checks enforce the separation. VDOM/TSX and data are
legitimate **bindings** in layout; they are not competing layout algorithms.

| Entry | Authority |
| --- | --- |
| `@updf/layout-kernel` | `resolveWidths`, readonly allocation types and `LayoutInputError` |
| `/numeric` | Binary64 primitives with validated finite nonnegative geometry preconditions |
| `/arithmetic` | Canonical `MetricSum`, `sum`, `exceeds`; existing metric/nonfinite preconditions |
| `/geometry` | Derived-axis/materialized-start certificates and certified row alignment |
| `/boxes` | Generic `layoutBoxes` and prepared-row `viewBox`, sharing placement |
| `/fragmentation` | `createFragmentOperation`, prepared selection and region continuation |

Core reexports shared arithmetic through its inventoried internal seam; it does
not maintain another implementation. The accepted dependency is core → kernel,
not a new arithmetic package. Core's bytes/runtime closure retains only kernel
`/arithmetic`, but installing core installs the **whole kernel package**, including
boxes and fragmentation. Tree shaking is not an installed-size guarantee or a
universal “micro” guarantee.

## Allocation and atomic boxes

`resolveWidths({ availableWidth, tracks, gap?, maxTracks? })` allocates fixed
positive widths and positive weighted tracks with min/max bounds. Infeasible
fixed/minimum totals reject, rather than shrink; saturated maxima may leave
trailing space. Geometry is binary64, not rounded to a host's pixel/cell grid.
See the [package API](../../packages/layout-kernel/README.md) for input validation
and numerical preconditions.

`layoutBoxes({root, view, width, limits?, exactInlineEdges?, measure?})` uses the
host's readonly source view (`id`, `path`, `style`, `childCount`, indexed `childAt`,
opaque `content`). It snapshots validated metadata, not a mandatory deep copy of
the input tree. Cycles, repeated source references and duplicate IDs reject.
Measurement receives allocated **content** width and returns finite nonnegative
height. Content belongs only to leaves; PDF/font measurement remains host-owned.

The typed style subset is row/column direction, nonnegative gap and edge padding,
border-box width/height constraints, and row-only start/center/end/stretch
`alignItems`. Row children use fixed positive width or positive `flexGrow`, with
optional `flexBasis: 0` and allocator bounds. Root/column children cannot grow;
column alignment is start only. There is no shrink, wrap, percent sizing, intrinsic
width, CSS margin/border/paint, or complete CSS engine (#56). Height clamps cannot
truncate content. Stretch grows boxes without remeasuring content.

Frozen results contain preorder boxes and explicit child indices; direct children
need not be contiguous. Coordinates are relative to parent **content** origins,
with root `(0,0)`; hosts add insets once. Opt-in exact edges in units of `2^-1075`
support terminal floor projection, not terminal-specific kernel behavior.
Traversal, height and placement are iterative; allocator complexity is separate.
Limits charge before over-budget callbacks (defaults: 100,000 nodes/measurements,
1,024 depth, 99,999 child calls).

`viewBox` consumes an already-prepared row's final sizes, insets, gap and alignment.
It validates indexed child sizes and calls the **same placement routine** as
generic boxes; it neither reallocates certified widths nor measures content.
Production PDF prepared rows use these placements for paint and content-line
metadata. Its existing metric fit policy differs intentionally from generic box
strict truncation checks. These are two adapters, not two placement algorithms.
Wrapper-centering positions (#54) are not implemented by this kernel contract.

## Fragmentation: one fitting algorithm, two entry flows

The separate `/fragmentation` entry is not retained/reexported by root or boxes.
One operation supports `prepare`/`select` numeric range queries and
`start`/`fragment` explicit-region cursor flow. Both use the same maximal-prefix
fitting algorithm and shared metric arithmetic. Providers measure one legal
indivisible unit from `{offset, extent, width}`; they never receive height capacity
or implement a competing page selector. End offsets must progress, even for
zero-height units. Atomic units consume the whole extent; empty extents skip the
provider. Fixed-width mismatch rejects before measurement; reflow providers receive
each region's actual width.

Indexed sources are read lazily and metadata is cached. No mandatory input-tree
copy is required, but operation caches and immutable result state do exist.
Opaque descriptors/content remain borrowed host references, not cloned/frozen.
Region placements use the boxes column placement routine (start, zero gap) plus
the existing metric origin sum. Results distinguish `done`, `region-full`, `blocked`;
fresh-region oversize policy belongs to the host. No arbitrary nested fragmentable
tree engine, gap/alignment flow, page creation or final context is implied.

Cursors are operation-owned WeakMap-authenticated capabilities. Every attempt
consumes its old token once, including blocked attempts. Foreign/forged/replayed
tokens reject before providers. Any error poisons the operation; `close()`
invalidates cursors and releases owned source/provider/view associations. Reentrant
work rejects and poisons; health is checked after callbacks. Host exceptions retain
identity. Close in `finally`; accepted outputs still borrow host references.
There is no default retained placement history.

One monotonic ledger charges before source access, callbacks and output work,
including rejected units and repeated queries. Standalone defaults are 10,000
attempts, 100,000 each source visits/reads, measurements, units examined and output
fragments, and 1,000,000 provider-declared units. Callback-only `work.consume(n)`
handles expire on return; counts do not roll back. These are bounded work counters,
not heap measurements or a hostile-code sandbox.

### PDF and terminal integration

Typed PDF row bindings use kernel allocation/placements. Authored PDF paragraphs
use kernel selection over prepared fixed-width measured lines (line-index extent),
or one whole-paragraph atomic unit for keepTogether. They do **not** claim rich-text
reflow at new widths. The ASCII proof instead supplies character-offset reflow
units, preserving characters/LF across differently sized regions, and consumes
kernel placements. Recognized kernel errors map to PDF `DocumentError`; arbitrary
host errors retain identity.

Actual page creation, templates, final contexts, nested PDF pagination, painting,
fonts and fresh-page oversized diagnostics remain in `@updf/layout`/core bindings.
Legacy and transitional regression tests are intentionally retained; not all old
layout-looking code/tests have been removed.

The approved PDF compatibility mapping caps each **new internal work category**
at `Number.MAX_SAFE_INTEGER` in one enclosing-operation ledger. It is not a
practical CPU defense; budget design remains pending **#25**. Existing output
node/text/path/page limits remain real, separate and candidate-forked. Standalone
kernel protective defaults are not weakened.

## Optional playground and debug/proof consumers

The [playground](../../apps/layout-playground/README.md) consumes real B box geometry
and optional C finite regions. Boxes mode does not load core/C; PDF and pagination
load lazily. Native fixed-line export reconstructs accepted lines at the same width,
checks public measurement, and core render validates **and remeasures native text**.
It does not rerun whole-paragraph placement/pagination. SVG text is illustrative,
not a font fidelity proof; native PDF geometry/negative oracles provide that proof.
Incomplete/blocked prefixes remain visible and cannot export. No general automatic
headers/final contexts (#55), full CSS (#56), editor, or viewer engine is claimed.
Optional debug/UI/terminal tooling is not core runtime.

## Cost and evidence provenance

Recorded Node **24.21.0**, esbuild **0.28.2** entry-bundle measurements:

| Example entry | Raw bytes | gzip bytes |
| --- | ---: | ---: |
| Allocator | 4,575 | 1,991 |
| Boxes measured row | 14,392 | 5,419 |
| Fragmentation | 11,306 | 4,277 |
| Boxes + fragmentation | 21,879 | 7,772 |

These are particular example entry closures, not universal minima, installed
tarball costs, performance guarantees or additive totals. Shared code and gzip
make the combined result non-additive. No unverified performance claim is made.

[A](../evidence/layout-kernel-a.md), [B](../evidence/layout-kernel-b.md),
[C](../evidence/layout-kernel-c.md), [D](../evidence/layout-kernel-d.md) are dated
execution/audit logs, **not current API authority**. Their historical starting
revisions, dirty-state descriptions and gate counts must not be read as today's
delivery status. The caller reports prior runtime audits; this doc/workflow change
requires its own independent audit. Previously recorded suites include 687 root
tests, 7 playground Node tests, 8 packed consumers, 8 license checks, 56 showcase
tests and 5 playground browser tests. Fresh local commands/results for this slice
belong in its handoff, not an inferred rerun of those browser proofs.

## Non-deploying pull-request validation

[validate.yml](../../.github/workflows/validate.yml) runs on PRs to `develop` or
explicit safe dispatch. It uses Ubuntu 24.04, Node 24.21.0, lockfile install with
`--ignore-scripts`, qpdf/Poppler, read-only contents permission, SHA-pinned actions
and checkout without persisted credentials. It neither configures nor deploys
Pages, publishes packages, uses secrets/environments, nor changes the existing
manual Pages workflow. Logs/generated evidence are retained for seven days, not
node_modules or reference PDF assets.

Three normal-failure jobs cover native quality/portable consumers/fresh graphs,
sequenced production browser fixtures + showcase + playground, and the **entire
unmodified SVG reference suite** separately. Browser executables are explicitly
`/usr/bin/google-chrome` with version logs; the runner's Chrome version is not
pinned. Prior source-machine evidence (Chromium 152 passed; Chromium 154's known
differential failed) is not a promise of runner success. #48/#50 may fail visibly in the SVG
job: the user-approved known-SVG deferral is a reviewer-assessed explicit exception,
**not a green gate**, blanket waiver or `continue-on-error`. Unknown failures still
require investigation. No assertions are skipped or retried blindly.

`tests/browser/*.test.ts` runs all production fixture files; SVG's separate path is
explicit, not silently skipped. New suites outside these globs need deliberate CI
registration. Portable TUI proofs run in root tests; live Formbar proof needs a
pinned external checkout and remains a separate local gate, not a cached CI pass.
The known-failing raw legacy suite is outside the root-defined native suite; this
workflow does not claim all legacy tests pass. Remote results are unknown until the
parent creates the PR and CI actually runs. Local validation must preserve any
active playground `dist/` preview built with a non-root base.
