# Private fragment painting ABI

Issue N/A. **S2/private painting batch implemented; ready for independent audit**, not independently
verified, either FINAL audit, or whole-flow closure. Worktree
`/home/sprawl/projects/updf/trees/flow-admission`, branch `feature/flow-admission`,
base/HEAD `b70da49ace00c19a8e570b4fc783806dffd6931c`. No staging, commit, delivery,
tracker mutation, other-worktree modification or nested delegation occurred.

**2026-10-18 second audit / S1 history:** H1-A and H1-B failed the second audit;
H2 passed. The earlier readiness and complete-composition claims below are
historical, superseded by the S2 section below. S1 addressed H1-A only; S2 now
intersects all applicable declared ancestor constraints before paint.
New evidence lives in `artifacts/fragment-paint-preparation/declared-frames/s1/`;
all previous source snapshots, entry manifests, audit logs and proofs are retained.
This is declared layout-frame validation, not arbitrary opaque-operator/ink proof.

**Historical wrapper-fix update:** independent whole-private-ABI audit requested
changes for two composition defects. Both are now implemented and ready for a
fresh independent audit; this is not verification or FINAL closure. The current
delivery manifest is `artifacts/fragment-paint-preparation/wrapper-fix/final-state.json`.
The original `final-state.json` (SHA-256
`0d6937270a2e759f2a688c697b52e66f94945ef2ce2ca98089f93ee7fc095403`)
and all original proof files remain unchanged. Immutable copies of the old manifest,
checks, after proof and source-cost report have `pre-wrapperfix-` names in the new
directory. The sections below retain the original implementation's chronology;
the final section supersedes its acceptance and cost claims.

## Entry, ownership and intentional limits

The actual entry contains 126 inherited dirty paths, not a reconstruction from
HEAD. Ignored `artifacts/fragment-paint-preparation/entry.json` and its 3,565-file
source/dist archive remain immutable. Archive SHA-256:
`9e94ca0c394d203112087bc669ee0f48b90629646e00f6c7007b272be626ecdd`.
The prior incomplete checkpoint remains `checkpoint-state.json`, SHA-256
`9ed2a45a8d0d21e5f0874f7ec1e2f9be87fc79d9cdf8bb36efcbdbc7b47eb5ac`.
It is historical, not the current validation manifest.

The original `final-state.json` enumerates the pre-wrapper-fix dirty scope, ownership relative
to that entry, staged state, source/artifact hashes and checks. Its allowlist is
the 17 assigned layout source owners, 20 private test/helper files, boundary
permissions, the historical paragraph control's private transport, and these
three authorized documentation/status files. It asserts preservation of every
entry source outside that allowlist. Mechanical migrations and semantic control
changes are included, not hidden as inherited work.

No public provider ABI, kernel, measurement, source-selection policy, or other
production owner changed. Width-only `next` retains its frozen three-field query,
unbound invocation and operation lifetime. Private height-aware selection,
PreparedBlock.fragment/container selection and natural capacity's existing
`Math.max(1, ...)` remain future work; B1 remains unwired.

## Contract and implementation

- Every PlacedFragment requires geometry: owned parts, direct children and exact
  traversal order, including empty/control fragments. There is no missing-metadata
  fallback or backwards-compatible start helper.
- Producers declare selected numbers before paint. Frozen geometry records copy
  child relationships/bounds without copying child geometry or foreign ownership.
  Immediate container placements retain the existing authoritative x/y check.
- Iterative preparation traverses only declared selected data. It checks finite
  scalars, exact order coverage, source/native geometry, declaring-fragment
  certificates and ancestor cycles, on a forked work budget before painting.
  Distinct occurrences of a reused fragment remain distinct; no flattened ancestor
  offset arrays or recursive JS traversal are introduced.
- Read-only prepared positions/children are associated privately with their
  fragments and parents. resolvePaint consumes a prepared root and accepts only
  that parent's declared prepared child records. Forged contexts and authentic
  foreign child records reject. Two WeakMaps provide these associations; no
  public API or additional certificate registry was introduced.
- Container/local, decoration/relative, shared-edge/zero and natural-root frames
  remain distinct. Decoration materializes `sum([context.y, before])` once, then
  uses the child's own parts/certificates, ordered before/body/after, including
  zero-ink reserved parts. Shared-edge preflight occurs at explicit local zero;
  outer placement stays outside the ledger. Natural root parts use `y + offset`
  with no fake page axis or new natural-height constraint. Row columns are
  independent local frames, not globally vertically disjoint siblings.
- Semantic whole boxes retain authored height and check enclosing content bounds
  independently of any generated slot allocation. Paragraph line slots remain
  line boxes: glyph/background overlap is still legal, not an ink-box constraint.
- Paginator runs selection trial/progress validation, native candidate admission,
  all-descendant preparation, paint, then append/position/bottom/placement/state
  commit. PREP failure has no live cursor, budget, nodes, placements or adopted
  recipe state effects; source-selection work is not rolled back. Successful
  preparation work is charged once at paint entry, not selection output twice.
  PAINT failure may leave live budget/recipe effects, intentionally without
  rolling back; margin/position and placements remain uncommitted until success.

## Authentication resolution and numerical controls

The incomplete draft authenticated hidden certificates by materializing them.
The parent explicitly approved adding `owned.has(interval)` to the existing
assertGeneratedPart boolean predicate. That assertion now proves both genuine
token identity and exact declaring owner/offset/extent. Authentication-only
materializations in certificate preparation and hidden container placement are
removed. Visible materializer checks, arithmetic, certifiedExtent, and its separate
entry authenticity check are unchanged. Hidden geometry retains finite-scalar
checks and authenticity, while explicit clipping bypasses containment/materialization.

`dedicated-repros.mjs` executes archived entry placement/painting and current code:

- Authentic sequence `[1e20, 30000, 30000, 30000]`: interval starts at
  `100000000000000070000`, ends at `100000000000000080000`. Both entry and current
  hidden placement accept the same y. Portable tests also preflight an authentic
  hidden declared part; copied, unowned, forged and wrong-owner tokens reject.
- Unchanged opaque height `1.1` at generated start `1.3`: entry accepts its native
  semantic end `2.4000000000000004` under parent `2.4`; current rejects GEOMETRY
  before paint. Parent `2.4000000000000004` remains a positive control. No height
  is shrunk to the generated allocation extent.
- Invalid final descendant: archived painter executes one earlier paint before
  rejection; current preparation executes zero. Paginator regression additionally
  confirms unchanged position/cursor/bottom/placements/nodes/live budget and zero
  real fragmentIndex calls, with a successful two-leaf/index-once control.

The distinguishing decoration regression uses actual generated/kernel arithmetic:
`y=0.1`, `before=0.1`, child offset `1.1`. New immediate origin `0.2` yields `1.3`;
old `sum([0.1, sum([0.1, 1.1])])` yields `1.3000000000000003`. This intentional
association difference is not covered up by changing inputs or claimed byte parity.

The unchanged mocked-ratio invoice is another correctly rejected whole-box case:
origin `26.6`, offset `649.4000000000001`, authored height `38.2`, fragment height
`687.6` produce start `676.0000000000001`, end `714.2000000000002` beyond its
fragment end. Its old deterministic-success assertion now requires the precise
GEOMETRY/path; ordinary invoice deterministic rendering remains a positive control.
Historical pre-C paragraph bytes remain pinned and immutable; the test harness
ports only its geometry declaration and prepared-position transport, preserving
the historical selector/painter body and executed-sentinel negative control.

## Original validation (before independent wrapper findings)

`final-checks.json` and `final-*.log` record exact serial commands/results:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` (Biome + AST code principles) | PASS |
| `npm run typecheck` (full root build + root tsc) | PASS |
| `npm test` | PASS, 1,316/1,316 |
| `npm run test:consumer` | PASS, all 14 clean packed closures |
| `npm run build:browser` | PASS, all browser profiles |
| `npm run check:graphs` | PASS |
| `npm run test:browser` | PASS, 18/18 |
| `npm run build:showcase` | PASS |
| `npm run test:showcase` | PASS, 101/101 |

Runner commands use a private user/mount namespace, bind only this batch's tmp
directory to /tmp/opencode, and use a batch-local cache; all processes complete.
Early fixture, format, principles, lifecycle and boundary failures were corrected,
not skipped or waived. Root tests retain the old numerical/forgery regressions
through the new ABI, and include AST/import guards, executable negative compile
controls (missing geometry and restored start fail), exact importer inventory,
20,000-depth/reused graph, cycle, part-order and prepared-association coverage.

## Paired behavior and net cost

The immutable before arm and final after arm each create their own fonts, text
service and resources. `paired.mjs before` ran at actual entry; the final
`node --expose-gc artifacts/fragment-paint-preparation/paired.mjs after` ran once
after the final runtime bytes. Both pass all 11 fixtures: nested, hidden, deferred,
discarded, raw, rich-inline, fixed-auto, native-units, table-edges, natural and
decor-association. JSON/PDF bytes, callback traces, placements/counts, qpdf page
counts, Poppler text bounds and every 96-DPI raster match exactly for these
fitting cases only. Every loaded compiled-module hash and profile/input hash is
retained in the two proof manifests. No universal byte-parity claim is made.

| Browser ESM profile | Before raw/min/gzip | Final raw/min/gzip | Delta raw/min/gzip |
| --- | --- | --- | --- |
| core-only | 67136/35558/12272 | 67136/35558/12272 | 0/0/0 |
| full layout/tables | 351843/181807/57706 | 359803/186128/59133 | +7960/+4321/+1427 |
| layout consumer | 313746/160823/51159 | 321679/165135/52619 | +7933/+4312/+1460 |
| text/paragraph | 335673/170567/54550 | 343621/174885/55998 | +7948/+4318/+1448 |

This is a significant positive micro-cost, not an optimization. Inspection retained
the two purposeful association maps, occurrence records and exact-order duplicate
sets rather than trading away authentication/order checks. No extra generic frame
chain, capability registry or benchmark framework was added. In the 17-owner
scope, source grows 1,899 to 2,174 lines and 73,286 to 84,249 bytes (+275/+10,963).
AST-counted function-valued start properties/bindings drop 4 to 0; named
context/parent.start call sites drop 7 to 0. Source schemas/prepared records replace
executable geometry ownership; this is not a claim of fewer total lines.

Both proof arms retain five warmups and 15 timing/ephemeral heap samples per fixture.
Median milliseconds before/final: nested 4.852/6.440, hidden 4.527/6.170,
deferred 4.692/6.011, discarded 4.070/6.234, raw 2.108/2.675,
rich-inline 2.541/3.165, fixed-auto 2.045/2.456, native-units 1.034/1.407,
table-edges 29.874/39.991, natural 2.093/2.955, decor-association 0.877/1.192.
These noncontemporaneous samples show a positive observed timing cost, not speedup,
causal isolation, a stable benchmark ratio or peak memory. `retained.mjs` separately holds
actual source and prepared roots alive across explicit GC at 1k/5k/20k edges.
At 20k edges both deep and reused trees have exactly 20,001 records/contexts;
deep has 1 position and 40,002 work units; reused has 20,000 positions and 60,001
work units. Observed retained heap deltas are 7,189,264 and 6,588,704 bytes. Counts
prove linear occurrence storage; heap samples are descriptive, not universal
retained/peak bounds or a leak proof. Declaration arrays are allocated earlier
under selected source/output limits. reserveWork guards MAX_SAFE_INTEGER
accounting only, not a new finite CPU quota or universal resource guarantee.

## Original principles and audit handoff

Checklist satisfied: correctness/unsafe-pattern review; cohesive files under 400
lines; functions at most 49 lines; nesting at most three; comments for intent;
risk-based regressions added; format/lint/typecheck/tests green. No approved code
principle exception, CI waiver, Changeset (private unpublished seam) or unrelated
cleanup. Auditor should independently review actual source plus all unstaged and
untracked files against final-state.json, exact frame/ownership semantics,
intentional strict rejections, lifecycle ordering and the reported positive costs.
The two FINAL audits and broader engine migration remain pending.

## Independent composition findings and fixes — 2026-10-18

The audit's read-only scripts/logs remain under
`artifacts/audit-fragment-paint-20261018/`. Its `critical-wrapper-repros.mjs`
asserted **violations**, so its exit zero was not acceptance. Before runtime edits,
we ran it into our own `wrapper-fix/before-critical.log`, confirming the shared-edge
visible bypass and authentic hidden regression. The auditor's separate real-owner
decoration log additionally showed deferred fragmentIndex and live emission charges
after a body exceeded page end. These failures supersede the old ready-for-audit
claim, despite all original gates being green.

### H1: enclosing reservation lost through wrappers

Common preparation now checks every visible immediate child's actual semantic
height against its parent frame and explicit content bounds, even when the child
wrapper declares no parts. Relative edges use the stored parent origin/end;
local and zero edges validate in their own coordinate frames. A page root retains
the actual external page endpoint, not a derived remaining-height subtraction.
Zero/local rebasing also retains bounded projection metadata (origin/start/end)
for descendants and parts, so a shared-edge wrapper around a decorated fragment
cannot erase its outer reservation. Each rebase composes its stored origin once,
following the native transform association rather than summing an ancestor list.
Local authored containers establish their own hidden policy, independently of
visible coordinate reservation transport. There is no parent callback chain, ancestry scan per
part, fabricated DerivedAxis, new tolerance, height shrinking or content-kind branch.
Unknown frame policies reject rather than falling through to local coordinates.

Portable regressions execute real width-only measured.next, prepare/container,
decoration and paginator paths with sharedEdges false/true:

- Page end `0.6`, previous content `0.1`, before decoration `0.1`, body `0.4`:
  both reject GEOMETRY before deferred fragmentIndex or source emission. Live
  budget, position, bottom, placements and page nodes remain unchanged. The genuine
  deferred-recipe positive control at page end `0.6000000000000001` paints, with
  one index and one source emission and actual end `0.6000000000000001`.
- Parent `2.4`, padding `0.1`, preceding spacer `1.2`, unchanged opaque `1.1`:
  both wrapper flags reject; parent `2.4000000000000004` paints the same real
  rectangle end. No generated allocation is resized to impersonate semantic height.
- A final same-owner composition probe found that dropping projection at **local**
  rebasing could similarly omit the external page bound: container height `0.5`
  at origin `0.1`, padding `0.2`, body `0.3` has a valid local end but actual page
  end `0.6000000000000001`. `local-before-fix.log` records both wrapper flags
  incorrectly accepting before this last correction. Both now reject under page
  `0.6` without live effects and paint under `0.6000000000000001`. Geometry
  projection therefore survives visible local as well as zero rebasing; hidden
  inheritance still stops at local policy. All gates and paired proofs were rerun
  after this correction, not reused from the intermediate manifest.
- Empty generic wrappers, unknown frames, decorated-container/shared-edge nesting,
  shared-edge-around-decoration, and direct decoration-around-shared-edge controls
  supplement the original part/certificate tests. Row columns remain independent,
  with no vertical sibling stack check. The existing distinguishing `1.3` versus
  `1.3000000000000003` decoration association regression remains unchanged.

### H2: hidden policy lost at transparent zero frame

Hidden policy now propagates through relative **and zero** wrappers, but not
through a local container that declares its own overflow policy. Authentic measured
units `[1e20, 30000, 30000, 30000]` under height-10 overflow:hidden prepare and emit
the same explicit clip with both shared-edge flags. Outer hidden plus inner local
overflow:error still rejects. Original genuine-interval/declaring-owner assertions
always execute; copied, forged, unowned and wrong-owner hidden certificates also
reject through an added transparent-zero test arm. Authentication never calls the
materializer, and renderer-side clip/native validation is unchanged.

### Updated validation, parity and cost

`wrapper-fix/checks.json` records exact commands and completed results. Format,
lint/AST principles, full serial typecheck/build, focused preparation/deep/lifecycle
suite (56), root `npm test` (**1,329/1,329**), packed consumers (**14**), browser
builds/graphs, browser (**18/18**), showcase build and showcase (**101/101**) pass.
An initial paginator fixture width mismatch was corrected. Browser's first run
failed an SVG-only raster-reference assertion (17/18); its complete failure log is
preserved as `browser-failed-attempt.log`. A complete rerun passed without source
changes, test weakening, skip or CI waiver; the transient failure is not hidden.

`wrapper-fix/evidence.py` reruns the 11-fixture current arm against the frozen actual
entry arm, exact before/current browser-profile hashing, corrected critical wrapper
assertions, archived/current dedicated hidden/opaque/late-descendant repros and
linear retained-record sampling. All pass. JSON/PDF bytes, callback traces,
placements/counts, qpdf counts/checks, Poppler bounds and all ordinary rasters are
exact. Source hashes and every loaded compiled-module hash are retained. New unsafe
wrapper edges intentionally change accepted-to-GEOMETRY; parity is not claimed for
them. The original hidden-auth reproduction and archive remain untouched.

| Profile | Fixed raw/min/gzip | Additional cost versus audited pre-fix raw/min/gzip |
| --- | --- | --- |
| core-only | 67136/35558/12272 | 0/0/0 |
| full layout/tables | 361643/187170/59453 | +1840/+1042/+320 |
| layout consumer | 323519/166174/52945 | +1840/+1039/+326 |
| text/paragraph | 345461/175921/56332 | +1840/+1036/+334 |

The 17-owner source total is now 2,208 lines/86,365 bytes: +34/+2,116 versus the
audited pre-fix state; +309/+13,079 versus original entry. This additional positive
cost buys common edge validation and finite coordinate-rebase reservation transport, not
an optimization. No new registry, per-node closure or deep copy was added. Existing
generated part-specific allocation/materialization checks remain intact. Deep and
reused 20k samples retain exactly 20,001 records/contexts and respectively
40,002/60,001 work units. Edge validation is constant work per child. Timing and
explicit-GC heap samples remain descriptive, not speedup or peak-memory claims.

Only common preparation changed in production; decorated/shared-edge declarations,
protocol, providers, kernel, paragraph selector and all other runtime owners are
byte-preserved against this assignment's 147-path entry. Tests changed only to add
coverage; none of the previous bad cases were removed. Checklist passes with no
approved exception or Changeset (private unpublished seam). Delivery remains
uncommitted/unstaged. Fresh Auditor should review the original whole batch plus
the five-path wrapper-fix delta and close the two findings independently; private
  height selection, unwired B1, both FINAL audits and whole-flow closure remain pending.

## Declared-frame S1 correction — supersedes composition readiness above

S1 owns only protocol associations, the existing core/internal export bridge,
preparation, raw/rich/decorated declarations, wrapper regressions and this evidence.
The authorized architecture status correction is documentation-only. Root tests
required the conditionally authorized two-name export inventory update in
`scripts/boundaries.ts`; importer permissions and other seam policies are unchanged.

`BoxAssociation` describes declaration arithmetic, not content kind. Omitted values
normalize to translated-box; unknown values reject, including declarations supplied
without the helper. Raw lines declare positioned parts and a positioned virtual
whole frame. Rich lines retain translated parts with a positioned virtual whole
frame. Decorations retain translated before/after groups and a positioned virtual
parent frame because their output is flattened. Other known native wrappers retain
the translated default. No public provider metadata or payload inspection is added.

Preparation carries the incoming native matrix, composing core `multiply` once at
local/zero rebasing and retaining it across relative edges. Core `rectangle` with
zero width supplies exact vertical endpoints under the declared association; native
arithmetic is not compensated or reassociated. Existing materialized local-coordinate
and genuine generated-slot arithmetic remains separate. Whole boxes use authored
height; generated slots may use their owned allocation extent without resizing ink.
The root retains its own semantic endpoint; paged roots intersect that reservation
with the separate page interval. Natural root height alone creates no new constraint.
Root part coordinates are finalized by the existing page certificate before projection.
Hidden inheritance/authentication and local authored overflow policy are unchanged.

H1-A now rejects unchanged body height `0.4`, before reservation `0.1`, root origin
`0.1` and root semantic end `0.6`, even on pages `0.7` and `1`, with both shared-edge
flags. No fragmentIndex, emission, live budget, placement, nodes, bottom or position
is published. The old page-only positive at `0.6000000000000001` now correctly
rejects its own frame escape. The fitting neighbor enlarges the semantic before
reservation to `0.10000000000000006`, keeping the body height `0.4` unchanged;
root height is `0.5000000000000001` and actual native end `0.6000000000000001`.
An independent width-only measured following rectangle of height `0.05` begins at
that accepted end. The local-container positive likewise enlarges its authored
reservation, not its child geometry. Test geometry uses actual core multiply/rectangle,
not recursive scalar flattening. Genuine deferred resources are operation-owned.

**Historical S1 stopping point:** `effectiveSpan` transports the root constraint but does not yet
intersect every descendant's own span and explicit relation bounds. H1-B is not
claimed fixed or proved. Tighten all ancestor constraints in a fresh assignment,
preserving local hidden-policy resets and transparent hidden inheritance. Neither
this seam nor S2 is authorization for arbitrary opaque-operator replay or ink proof;
host-local payload validation and final renderer checks remain distinct.

Validation in `declared-frames/s1/checks.json`: serial `npm run typecheck` (full
build + root tsc), `npm run lint`, `npm run format:check`, focused preparation/
wrapper/container/generated/lifecycle/raw-rich tests and root `npm test` pass.
Root result: **1,331/1,331**. Initial compile/test/AST failures and runner bind-path
failure logs are preserved, not counted as passes. The initial runner continued
inside its private namespace after a failed bind; it was corrected to fail closed
and subsequent checks use the batch-local bind/cache. No global configuration or
unrelated cleanup occurred.

All 11 original frozen-entry ordinary fixture pairs pass: exact JSON/PDF, callback
traces, placements/counts, qpdf checks/counts, Poppler bounds and 96-DPI rasters.
Each arm owns independent resources. These are ordinary fitting controls, not
parity claims for intentionally rejected wrapper edges. New after-arm module hashes
and the original frozen input/archive identities remain in `after-proof.json`.

Eight entry browser profiles (four raw/four minified) were captured before rebuilding;
their sizes match the immutable wrapper-fix proof. Final incremental raw/min/gzip
costs are core-only `0/0/0`, full-layout `+1388/+782/+257`, layout consumer
`+1388/+785/+264`, text/paragraph `+1388/+781/+278`. Bundle hashes are retained in
`profiles-before.json` and `profiles-after.json`. This is positive correctness cost,
not a speedup; retained timing/heap samples are descriptive only. Broader browser,
showcase and packed-delivery reruns are deferred to S2/full-batch validation.

Code-principles checklist: correctness checked for this slice; defaults followed;
cohesive production/test files <=400 lines, functions <=49 lines, nesting <=3;
comments explain intent; risk-based boundary/hidden/lifecycle/ordinary tests pass;
lint and tests pass. No approved principle exception, CI waiver or Changeset
(private unpublished internal seam). S1 is implemented, not independently verified;
no issue/tracker mutation, staging, commit, push, PR, other-worktree edits or nested
delegation. `final-state.json` records the exact entry-relative ten-path delta,
source hashes, preserved previous proofs and actual dirty scope for S2/Auditor.

## Declared-frame S2 and final private-painting batch gates

S2 supersedes the historical pending-H1-B/readiness statements above. The private
painting batch is **implemented, ready for independent whole-batch audit**, not
verified. H1-A/H1-B and the previously verified H2 policy have passing implementation
controls; only Auditor can close the findings. Height-aware selection/B1 and both
FINAL audits remain pending. No whole-engine or arbitrary opaque-ink guarantee is made.

### Scope and reservation invariant

Runtime changes since S1 are confined to `fragment-paint-preparation.ts`.
`fragment-paint-reservations.test.ts` adds cohesive boundary/lifecycle controls;
only this evidence and the content-role architecture document change otherwise.
S1 protocol, core exports, raw/rich/decorated associations, emitter bytes, certificate
fields/ownership/math, measurement, sizes, defaults and public APIs are preserved.
The exact S1 entry manifest SHA-256 is
`aeccb6caa5e9ae4deee60c748f21336cedd80a09d1765ab880508e7ec30dbea1`.
New scripts, immutable logs, entry sources and delivery manifest live in
`artifacts/fragment-paint-preparation/declared-frames/s2/`; previous proofs are not overwritten.

Each occurrence computes its own semantic projected span once with the existing
core `multiply`/`rectangle` owners and its S1 declared association. Descent combines
the parent's effective and own span, checks the child's own span against applicable
inherited/relation constraints, then intersects both endpoints with `Math.max/min`.
Parts check both their declaring own frame and this effective intersection. Explicit
relation start/end project separately as zero-extent points in the parent-logical
convention; there is no endpoint subtraction/reconstruction. Relative placement
retains the incoming matrix; local/zero placement composes the emitted parent
translation once. No ancestor walk/list, FitFrame chain, EPS, clamping, resizing,
extra paging, native-operator inspection or scalar flattening is introduced.

Natural roots still have no new projected reservation from literal height alone:
`bounded=false` leaves `projectedSpan` undefined, with no fabricated page axis.
Existing immediate local semantic/slot checks remain distinct; descendants and
explicit relation bounds retain their declared reservations. Paged roots preserve
S1's separate own semantic and page intervals; planned bottom cannot replace either.

Hidden geometry still requires finite numbers and authentic declaring-owner tokens,
but skips containment/materialization. Relative/zero wrappers carry hidden policy;
a new local overflow:error frame resets it. A clipped parent's constraint is not
reintroduced on that reset, including through the old immediate-local check;
the reset child's own reservation and explicit relation bounds remain active.
The authentic `[1e20,30000,30000,30000]` hidden controls and forged/copied/foreign/
wrong-owner failures remain green. Row columns may overlap vertically in separate
x frames; glyph ink may overlap line boxes. This proves declared geometry only:
host-local opaque payload validation and final renderer defense remain separate.

### Deliberate rejection versus unchanged fitting controls

`before-reservations-2.log` executes the corrected new tests against S1 compiled
bytes: unsafe H1-B cases incorrectly accept; fitting neighbors pass. The initial
fixture-error log is retained separately. `h1b-proof.json` independently bundles
archived S1 preparation and current preparation with all other current owners
unchanged, records native core matrix/rectangle bounds, and separates these cases:

| Public case, both shared-edge flags, 0/1/2 extra wrappers | S1 | S2 |
| --- | --- | --- |
| Page/outer 10, padding top 0.1, visible inner height 2.3, spacer 1.2, measured body 1.1, following 0.1 | accepts body end 2.4000000000000004 beyond inner/next start 2.4 | GEOMETRY before paint/publication |
| Same, inner height 2.3000000000000003 | accepts | accepts unchanged body 1.1; inner end/body end/next start all 2.4000000000000004 |

All six fitting neighbor pairs preserve PDF bytes, Poppler bounds and 96-DPI
rasters, and pass qpdf. All six unsafe pairs deliberately change accepted-to-GEOMETRY;
portable tests assert zero fragmentIndex/emission calls and unchanged live budget,
position, bottom, placements and page nodes. S1 H1-A page 0.6/0.7/1 and positive
neighbor tests remain unchanged. Additional internal controls cover nonnegative
lower-bound rounding, authored endpoints (0.03/0.29 differs from reconstructed
0.29000000000000004), virtual frames, natural parts and hidden/local policy resets.

### Fresh complete gates and preserved evidence

`checks.json` records commands run serially through `s2/check.py` with a private
user/mount namespace, owned disk tmp/cache and `/tmp/opencode` bind. No global
configuration, tool installation, other worktree access or unrelated cleanup occurs.

| Command | Final outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome and AST principles |
| `npm run typecheck` | PASS, full root build and tsc |
| `npx tsx --test packages/layout/test/fragment-paint-*.test.ts packages/layout/test/container-placement*.test.ts packages/layout/test/generated-interval.test.ts packages/layout/test/flow-admission-lifecycle.test.ts packages/layout/test/paragraph-fragments.test.ts packages/layout/test/text-composition.test.ts` | PASS, 73/73 |
| `npm test` | PASS, 1,339/1,339 |
| `npm run test:consumer` | PASS, all 14 packed closures |
| `npm run build:browser` / `npm run check:graphs` | PASS / PASS |
| `npm run test:browser` | PASS, 18/18 |
| `npm run build:showcase` / `npm run test:showcase` | PASS / PASS, 101/101 |

The first showcase invocation exceeded the outer tool timeout; the interrupted log
is retained, no matching check process remained, and the complete longer-timeout
rerun passed. Source-arm harness path/CJS-facade failures and the first H1-B harness
template error are retained, not waived or presented as passing checks.

All 11 frozen ordinary fixtures reproduce exact JSON/PDF bytes, callbacks,
placements/counts, qpdf checks/page counts, Poppler bounds and every raster from the
initial pre-private-ABI arm. `paired.mjs after` uses compiled modules;
`source-paired.mjs` loads current TypeScript sources. Each run creates its own
resources; neither borrows another arm's font/text handles. The unchanged frozen
entry/profile/input identities and loaded source/compiled module hashes remain in
`after-proof.json` and `source-after-proof.json`. Ordinary parity does not extend
to deliberately rejected numerical cases or arbitrary opaque operators.

### Complete cost, complexity and principles

`cost-summary.json` reports every original profile and fixture, initial-to-final and
S1-to-final costs, all warm timing/heap samples and 33 independent cold runs.

| Browser profile | Final raw/min/gzip | Delta vs initial | Delta vs S1 |
| --- | --- | --- | --- |
| core-only | 67136/35558/12272 | 0/0/0 | 0/0/0 |
| full layout/tables | 363918/188352/59858 | +12075/+6545/+2152 | +887/+400/+148 |
| layout consumer | 325794/167359/53350 | +12048/+6536/+2191 | +887/+400/+141 |
| text/paragraph | 347736/177102/56734 | +12063/+6535/+2184 | +887/+400/+124 |

This is positive correctness cost, not an optimization. Core-only hashes are also
unchanged; full build, packed closures and graph gates introduce no new import cycle.
The original 17-owner runtime source total is 2,292 lines/89,493 bytes versus initial
1,899/73,286 and S1 2,271/88,417: +393/+16,207 and +21/+1,076 respectively.
AST-counted start callbacks remain 4-to-0, named context/parent.start calls 7-to-0.

`operation-counts.json` instruments only local evidence bundles, not runtime hooks.
For deep/reused 1k/5k/20k graphs, with/without explicit bounds, actual imported core
calls match `multiply=2n+p`, `rectangle=n+p+2b*n`, `point=4*rectangle`, preparation
intersection calls `3n`, and pending occurrences `n+1`. Here p is declared leaf
parts and b is 0/1 for explicit bounds. Source inspection confirms constant-sized
state/no ancestor scan. Both 20k graphs retain 20,001 records/contexts, with work
40,002/60,001. Observed prepared-root retained heap deltas are 7,209,008/6,595,504
bytes. Cold import/first-run times and retained result heaps are separately recorded
for initial/S1/final, one process per fixture. Warm runs use five warmups/15 samples.
These noncontemporaneous descriptive samples prove neither speedup, peak-memory
bounds nor causal timing ratios; no profile or fixture is cherry-picked.

Code-principles checklist passes: correctness and exact domains/certificates;
cohesive source/test files <=400 lines, functions <=49 lines, nesting <=3;
intent-only comments; risk-based public upper/native-neighbor and internal lower/
endpoint/hidden/natural tests plus unchanged ownership/deep/row/paragraph controls;
format/lint/typecheck/tests green. No approved exception, CI waiver, or Changeset
(private unpublished internal seam). No staging, commits, push, PR, tracker mutation
or nested delegation. `s2/final-state.json` inventories owned-versus-S1-versus-initial
source hashes, exact dirty scope, preservation assertions and command outcomes.
Auditor should review the entire original batch plus wrapper/S1/S2 deltas, independently
close H1-A/H1-B/H2, and leave height selection/B1 and both FINAL audits explicitly pending.
