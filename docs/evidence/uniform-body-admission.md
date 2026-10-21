# Uniform top-level native body admission

## Bounded migration status

Worktree `/home/sprawl/projects/updf/trees/flow-admission`, branch
`feature/flow-admission`, unchanged base/HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`; issue N/A.
This bounded slice is **implemented, pending independent audit**, not verified,
not the whole provider migration and not either FINAL closure audit. Parent approved
the narrow cancellation assertion update; no production edits were needed to close
the previously failing root gate.

The existing Paginator now admits every validated top-level fragment without
content-kind, identity, atomic/split or natural-height eligibility. The private
`fixed-admission.ts` WeakSet module, registration and lookup are deleted, without
replacement markers, aliases or another dispatcher. Fixed preparation retains
its existing validation, output reservations and deferred recipe lifecycle.

Selection still validates progress, actual height and metric occupancy before
native admission. The native candidate uses the actual fragment height and the
compensated margin-adjusted cursor. Occupancy is captured before adding alignment
margin: a fresh-page alignment margin is not previous body content. A refused
used-page candidate advances via existing page/header/footer/quota accounting,
discards candidate state/budget forks and reselects the same offset. A fresh
endpoint refusal throws the existing exact GEOMETRY diagnostic; a missing fresh
fragment remains LAYOUT_OVERSIZED. Overlap checks apply to every root. Paint,
selection, malformed output, resource and policy errors are not caught as retry.

Accepted numeric y is reused for paint and placement. Public adapter output is
captured by its existing owner; private fragment metadata is readonly and owned
by internal producers, not exposed as mutable public callback results. No new
public PreparedBlock or provider ABI is introduced. Zero-height source progress
and authored page-break controls retain their existing separate handling.

## Remaining migration inventory

Current container-placement follow-on: immediate Container/Row child geometry is
prevalidated and coordinates stored before child paint. Descendant part certificates
remain late, fatal checks; no parent retry or budget rollback is promised. See
[container placement evidence](container-placement.md) for the bounded scope and
final passing seam results after the exact importer transfer; this does not revise
the historical gate results below.

- Provider height-aware selection callbacks, including canonical tables, remain.
- Nested/generated interval checks performed during paint still throw; root
  admission does not recover child certificate failures after painting begins.
- Generic Paginator helpers and ordinary producer policy remain in place.
- Frozen A/B1 source/engine and its
  [future contract](../architecture/flow-admission-contract.md) are unchanged and
  not wired into the production dispatcher by this slice.
- Full provider/nested/canonical table migration and both FINAL audits remain.

Historical fixed-only admission evidence is dated history, not the current rule.
The original uniform step did not change arithmetic. The parent-approved M1
addition below supersedes that arithmetic scope restriction only; geometry,
domains, width/cache identity, quota defaults and operation lifecycles stay intact.

## Evidence so far

Ignored artifacts are under `artifacts/uniform-body-admission/`. Entry verification
ran `python artifacts/table-removal/verify.py` successfully before edits, confirming
manifest SHA-256
`32981bbab8de61b07e68b2dfa4a217ca1848fee36977e4f001151a5e33a2d12c`.
`verify.py --entry` captured actual dirty-entry hashes and protected manifest
members, without regenerating or revising any prior hash record.

All subprocess-heavy commands used a private user/mount namespace binding this
slice's disk-backed `tmp` directory to `/tmp/opencode`, with a slice-local npm
cache. No other worktrees, tracker, staging, commits, pushes or PRs were changed.

| Command | Outcome |
| --- | --- |
| `npm run build` before edits | PASS, physical dirty entry |
| `npx tsx scripts/style-consumer-cost.ts before uniform-body-admission` | PASS, all three profiles |
| `npx tsx --test packages/layout/test/fixed-admission*.test.ts packages/layout/test/extensions.test.ts` | 28 pass, 0 fail |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including AST code-principles gate |
| `npm run typecheck` | PASS, full serial build and root tsc |
| `npm test` (initial run) | 1253 pass, 1 fail; stale cancellation assertion described below, now resolved |
| `npx tsx scripts/style-consumer-cost.ts after uniform-body-admission` | minified `paragraphFlow` browser ESM/es2022 bundle -95 raw/-42 gzip bytes; `textOnly` and `fixedGeometry` core-only profiles zero delta |
| `npm run test:consumer` | PASS, 14 packed consumer closures |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | PASS |
| `npm run test:browser` | 17 pass, 0 fail |
| `npx tsx artifacts/uniform-body-admission/mutation.ts` | PASS: removing used-page prepaint retry kills ordinary unknown-provider regression with GEOMETRY |
| `npx tsx --test packages/layout-boxes/test/geometry.test.ts packages/layout-boxes/test/fragment-candidates*.test.ts packages/layout/test/flow-admission-*.test.ts packages/layout/test/fixed-*.test.ts packages/layout/test/native-inline*.test.ts packages/layout/test/extensions.test.ts` | 117 pass, 0 fail |

The existing integration admission test passed in the root run: genuine one- and
two-page PDFs pass qpdf page counts and Poppler rasterization with exact placement
non-overlap. Full browser includes flow, inline, fixed-admission and SVG lineage.
Profiles compare the actual entry containing frozen A/B1 and legacy table removal,
not Git base; only this slice's byte delta is attributed here, not timing speedups.

## Authorized cancellation regression update and final gates

The initial sole root failure was `packages/layout/test/cancellation.test.ts:163`:
the old assertion required separate paragraph roots to throw GEOMETRY at `/body/2`.
Uniform admission intentionally recovers that third root before paint. Parent
authorized changing only that assertion and local helper lines inside the same
case. Paragraph content, font size, line height, widths and template are unchanged.
The test now asserts consumed source count 3 and exact source/page/box tuples:

- source 0: page 0, `{x: 0, y: 1, width: 100, height: 0.1}`;
- source 1: page 0, `{x: 0, y: 1.1, width: 100, height: 0.1}`;
- source 2: page 1, `{x: 0, y: 1, width: 100, height: 0.1}`.

Actual painted nodes must match these boxes and source text, stay inside page/body
bounds, and have exact non-overlapping endpoints on the shared page. Typed,
unknown and component paths still agree and render through the existing helper.
This is a valid two-page recovery, not a weakened not-throw assertion. Adjacent
nested-line and repeated-region GEOMETRY rejection controls remain byte-for-byte
unchanged; nested refactoring is not complete. Initial composite test used the
unsupported authored name `topRow`; it was corrected to ordinary `row`/`column`.

Fresh completion logs use the `completion-` prefix in the same artifact directory:

| Command | Outcome |
| --- | --- |
| `npx tsx --test packages/layout/test/cancellation.test.ts packages/layout/test/fixed-admission*.test.ts packages/layout/test/extensions.test.ts` | 37 pass, 0 fail |
| `npm test` | 1254 pass, 0 fail |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including AST code-principles gate |
| `npx tsc --noEmit` | PASS |
| `python artifacts/uniform-body-admission/verify.py` | PASS, frozen bytes and exact scope preserved |

The earlier full build/typecheck, 14 packed-consumer closures, browser build,
17 browser tests, graphs, paired footprint and retry-removal mutation evidence
above are reused, not rerun: production bytes are unchanged at completion. The
mutation was killed by the unknown-provider regression; it is not a nested-path
completion claim. No build was required for this test-only continuation.
`verify.py` adds only `cancellation.test.ts` to its owned scope; `entry.json` and
the prior A/B1/table-removal manifests are preserved. `delivery.json` records the
current owned hashes. Frozen A/B1 twelve files and legacy-removal 22 files remain
unchanged. No kernel predicates or numerical domains were edited.

Code-principles self-check: cohesive production files under 400 lines; functions
under 50 and nesting at most three (automated lint passed); intent-only comments;
risk-based unknown atomic/split, state/budget, mutable callback capture, malformed
output, zero-height, controls and registry absence coverage. No approved exceptions.
All required gates for this bounded slice are green. No tracker exists for this
assignment (N/A); no tracker or Git delivery mutations were performed. Independent
audit is next; neither FINAL closure pass is claimed.

## M1 audit fix: tentative compensated margin admission

M1 is ad-hoc N/A, **implemented, pending independent audit**, on the same worktree,
branch and base/HEAD above. Parent explicitly approved the Architect-justified
additive canonical arithmetic scope; this is not permission for the full mandatory
provider migration or either FINAL audit. All prior dirty work belongs to earlier
slices and is preserved. No Git/tracker/delivery actions were authorized or taken.

The public authored fixture has body height `0.05`, a fixed `0.02` root, then a
keep-together Block of height `0.01` with auto top margin. The used-page margin is
`0.020000000000000007`; the candidate offset is `0.04000000000000001`, whose native
endpoint `0.05000000000000001` exceeds `0.05`. Before M1, adding the margin changed
the live cursor before refusal. The page reservation callback, including a failing
one-page quota check, observed that uncommitted candidate instead of `0.02`.

`fragmentStart` now snapshots occupancy from the committed cursor. For nonzero
margin only, it forks the existing arithmetic owner, adds the margin there, probes
the actual fragment height and checks overlap. Only success assigns that snapshot
to the live position, before paint. Refusal and fresh-page diagnostic failures do
not adopt it. Existing height addition, budget/state adoption and paint-failure
timing remain unchanged; paint errors are not retried or rolled back. Zero margin
reuses the live accumulator without allocation or `add(0)` (validated finite cursor
domain). The source-structure test pins that branch and absence of collapsed sums.

The six-line `MetricSum.fork()` copies both total and correction. Reconstructing
from `.value` is incorrect: after adding `0.1`, `0.2`, a historical accumulator plus
`0.3` yields `0.6`, while `sum([cursor, 0.3])` yields `0.6000000000000001`.
This additive owner snapshot is not old PR68 alien-fit arithmetic, a preview/adopt
framework, a geometry certificate or a new tolerance. The recurrence, operation
order and `add`/`value`/`sum`/`exceeds` executable bodies are preserved byte-for-byte.
The source certificate retains the original source constant and hash
`6c99483a778c69420c73b74c4745247479d484c4d6d0eacce1be1ed28b0dd620`;
expected current source and compiled JS are original plus exactly the pinned fork,
allowing standalone JSDoc only, not arbitrary method removal. Controls reject
incorrect correction copy, aliasing, recurrence/EPS changes and an unexpected API.

### Entry, ownership and preservation

Ignored `artifacts/uniform-body-admission/m1/entry.json` captures all current dirty
hashes, newly owned existing files and historical manifest/artifact hashes before
production edits. Prior delivery and state are copied unchanged as `prior-*`:

- entry delivery SHA-256 `e6e975404ad7456c313420eb78163467482acfef035f84f736726ca4c7774d8d`;
- entry delivery-state SHA-256 `79a203dfb5c27ed4cad054d8f0ec61b7d0a10c0b22a1cd553fd535acc2b18695`;
- historical uniform entry SHA-256 `c5ae1b9fb05d28d0527728a346be0598c50f91ba524b8876736f2ca1a0f6a603`.

The extended delivery verifier checks M1 against its entry with a narrow allowlist,
then checks the historical uniform entry and writes current delivery hashes. M1
owns only paginator, canonical arithmetic, its source-certificate helper/tests,
new arithmetic-fork/uniform-margin tests, numerical policy, kernel README and this
evidence; ignored verification/evidence artifacts are owned here too. No original
A fragment assertions or B1 engine files were changed. A's 12 and B1's 12 SHA-256
members match, as do legacy removal's 9 present/13 absent files and its manifests.
The unchanged table-removal manifest is
`32981bbab8de61b07e68b2dfa4a217ca1848fee36977e4f001151a5e33a2d12c`.

Arithmetic's whole-file hash intentionally changes, explicitly owned, from
`d5bc5f926c12e01fd6db7133b0fb918f02502828c2cc8a1776fd62e2bab798a8` to
`380d1258cd70b9c20093906f4adfd8c65a756fb9a9d9ecc7c694e3361d7a7b8b`.
It was not a member of A/B1's frozen file lists. This is not historical whole-file
byte identity. Full current file hashes are in `delivery.json`/`delivery-state.json`;
`m1/report.json` records the production before/after pair and frozen manifests.

### Fresh validation and costs

All commands below ran in the assigned worktree, with the same private unshare
mount, disk-backed artifact tmp and local npm cache as before. `m1/gates.json`
records final exact commands and exit 0 for all gates. Logs are under `m1/`.

| Command | Final result |
| --- | --- |
| `npm run build` at physical captured dirty entry, before production edits | PASS |
| `npx tsx scripts/style-consumer-cost.ts before uniform-body-admission/m1` | PASS, three profiles |
| `npm run build` after production edits | PASS |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including function/file/nesting AST gate |
| `npm run typecheck` | PASS, full serial build and root tsc |
| `npx tsx --test packages/layout-boxes/test/arithmetic*.test.ts packages/layout/test/uniform-margin-admission.test.ts packages/layout/test/auto-margin.test.ts packages/layout/test/fixed-admission*.test.ts packages/layout/test/extensions.test.ts packages/layout/test/cancellation.test.ts` | 54 pass, 0 fail |
| `npx tsx artifacts/uniform-body-admission/m1/mutation.ts` | PASS: early commit and collapsed-sum mutants killed |
| `npm test` | 1261 pass, 0 fail |
| `npm run test:consumer` | PASS, 14 packed external closures |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | PASS |
| `npm run test:browser` | 17 pass, 0 fail |
| `npx tsx scripts/style-consumer-cost.ts after uniform-body-admission/m1` | PASS, paired options/tool versions/inputs identical |
| `python artifacts/uniform-body-admission/m1/report.py` | PASS, profiles and frozen SHA members |
| `python artifacts/uniform-body-admission/verify.py` | PASS, frozen bytes, historical entry and bounded current scope |

The first red run reproduced the wrong committed cursor in both quota/retry
assertions. Its initial paint control also had an incorrect literal expectation;
the final control uses exact `.25` inputs to isolate accepted-paint behavior.
Initial typecheck found exact-optional/possibly-undefined errors in instrumentation,
and one lint run found a 53-line test helper. Those were corrected, not waived;
the full final gates were rerun. Risk-based additions cover independent hidden
compensation, cancellation, zero/nonfinite propagation, refused state/paint/placement,
page quota cursor visibility, fresh retry coordinates, accepted-paint failure and
zero-margin allocation structure. The previous paragraph two-page cancellation
assertions and adjacent nested-error controls are unchanged and pass.

Paired minified browser ESM/es2022 costs (raw/gzip bytes):

| Profile | M1 before → after | M1 incremental | Cumulative versus original uniform entry |
| --- | --- | --- | --- |
| textOnly (core-only) | 58161/20056 → 58239/20076 | +78/+20 | +78/+20 |
| paragraphFlow | 193862/62613 → 194002/62658 | +140/+45 | +45/+3 |
| fixedGeometry (core-only) | 58242/20095 → 58320/20116 | +78/+21 | +78/+21 |

The historical `-42 gzip` flow saving is no longer the final cumulative result.
The class method is retained even by core-only consumers that do not call it;
there is no zero-cost claim. No retained modules were added. Qualitative allocation
proof: one independent object per nonzero-margin attempt, none on zero-margin
admission, with no new per-fragment framework or public hook. No timing benchmark
or speedup claim is made. The measured byte growth buys correct transactional
margin handling while preserving hidden compensation and the existing exact fit
authority; it is recorded explicitly rather than silently waived.

Code-principles self-check: correctness and risk-based tests pass; files remain
cohesive and below 400 lines; functions below 50 and nesting at most three; comments
state intent/contracts only; lint/typecheck/tests/builds pass. No approved principle
exceptions, dependency/root-script changes or Changeset requirement (private
unpublished package, no existing Changesets workflow). Safe stop: M1 is ready for
fresh independent Auditor review of actual unstaged/untracked delivery. Full
mandatory flow refactoring and both FINAL audits remain pending, not claimed here.
