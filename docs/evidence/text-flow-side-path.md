# Side-path sibling runtime

## Auditfix3: backwards tail ink and authored validation

Status: **implemented, ready for independent re-audit**. Issue: N/A. This section
supersedes the original runtime's nominal-bottom tail policy below; the original
runtime/prerequisite records and all historical artifacts remain preserved.

- Exact cwd/worktree `/home/sprawl/projects/updf/trees/text-flow-design`, branch
  `feature/text-flow-design`, base/HEAD
  `882d6d38f432edcac97e962fbf446062c1483c3d`, unchanged. No staged/committed delivery,
  tracker changes or delegation. Initial dirt is inherited, not this delivery.
- Fresh frozen hashes (including showcase dist) are in
  `artifacts/text-flow/side-path-fixed-vs-before/fix-before-manifest.json`;
  `fix-scope-summary.json` records the exact final hashes and ownership delta.
  Owned source: only addon's `path-selection.ts`, `path-band.ts`, `path.ts`;
  tests: new `path-fix.test.ts`; plus README, this record and new
  `scripts/text-flow-path-fix-evidence.ts`. No apps, core, Paginator, kernel,
  ordinary text, layout, inherited band/proof, dependency or lock edits.
- Selection queries the existing owned band at actual compensated tops, even
  after nominal float height. It releases the ordinary tail only when the current
  **and every later source's** paragraph-wide subset certificate clear the visual.
  Rounded operations underlying that certificate are monotone in authored top;
  future positive line progression cannot move its lower bound back upwards.
  Therefore a later run/Paragraph with greater overhang cannot invalidate release.
  Selected lines retain existing actual-ink validation, source offsets and work
  owners. No nominal-band arithmetic, new tolerance or native-certificate change.
- Blocked unconsumed text keeps advancing through the owned next-top operation.
  Required clearance gaps are reserved in the whole positive-height initial
  composite, using the maximum of actual visual, accumulated top and selected
  line end. This preserves selected geometry as well as compensated accumulation.
  Existing admission/deferral and full selected-graph preparation remain owners;
  there is no late geometry callback or host exclusion state on a fresh page.
- `fillRule` defaults only on omission. Both Path and Block object shapes reject
  explicit `null`, `undefined`, and unknown strings before painting. Parser/color
  boundary remapping handles only existing `DocumentError` diagnostics under the
  known parser root, preserves code/message/span and path offset, and rethrows
  unexpected exceptions unchanged. Public Document Flow paths retain
  `/document/children/children/i/...`; direct compiled sources retain their supplied
  roots rather than being renamed to a fabricated `/body/i`.
- Legacy omitted/`"rect"` selection is intentionally unchanged, including the
  pre-existing unsafe negative-leading tail policy. Authored rectangle **paths**
  receive the stricter fix. This is a separate legacy contract limitation, not an
  approved waiver or a claim that legacy rectangles gained the path guarantee.

Risk tests include the exact 200-point-body, 36-point path, 20-point red `A`,
2-point leading reproduction; mirrored slopes and full rectangle paths; repeated
tight lines followed by a larger-overhang Paragraph; actual gap height, source
paths, fresh-page deferral and later tail; invalid fill rules on both facades;
malformed Path/string/object contours, invalid fill and unchanged host exceptions.
Eight native PDFs and 144-dpi exact-color rasters are saved under `native/` with
SHA-256 fingerprints, full-stream extraction and qpdf checks. All have zero red
pixels in the strict common blue interior, with guards requiring visible exact
blue and red pixels. A separate bundle uses a **byte-exact hash-checked frozen
selector** only in the proof: the original single-A repro has 75 strict-interior
red pixels in its tight y=38..45 crop; fixed has zero. The differing count from
the caller's 104 reflects the deliberately narrower common-interior crop, not a
different no-overlap threshold. `audit-{before,fixed}.{mjs,pdf,ppm}` and
`regression-proof.json` preserve both outcomes. Original outputs are not overwritten.

### Auditfix3 checks and cost evidence

Final commands passed in this worktree:

- `npx tsx --test packages/text-flow/test/path*.test.ts packages/text-flow/test/side-path.test.ts`:
  30 focused tests, including 11 new auditfix regressions.
- `npm run format:check`, `npm run lint`, `npm run typecheck` (full workspace build
  plus declarations), `npm test`: 1,554 passed, zero failed/cancelled/skipped.
- `npm run build:browser`, `npm run check:graphs`, `npm run test:consumer`:
  15 clean external tarball closures; `npm run test:browser`: 22 passed, zero
  failed/cancelled/skipped. These build only browser test artifacts, not showcase.
- `npx tsx scripts/text-flow-paginator-proof.ts`: byte-identical protected ordering;
  `npx biome lint --diagnostic-level=error packages/text-flow`, `git diff --check`.
- `npx tsx scripts/text-flow-path-fix-evidence.ts`: exact frozen-selector before/fix
  raster regression; legacy placements/native/PDF **and full quota/kernel charge
  sequences** unchanged against runtime-before; all ordinary retained consumer
  sizes unchanged against old runtime-final, with no path/parser/band modules.
  Full Path fixture remains 2 pages/5,838 bytes, SHA-256
  `2786f7e96408d6b18bb39fabf6d0b5a4ad173bbbb803cdedda7313120f935c64`,
  qpdf and exact full-stream text extraction pass. Node/Chromium full fixture
  placements/native output/complete PDF parity passes in the browser suite.
- `node /tmp/opencode/updf-path-fix-scope.mjs`: all 1,643 inputs outside the seven
  owned paths retain frozen hashes, including app sources and showcase dist;
  no staging or HEAD mutation. Final source hashes are in `fix-scope-summary.json`.
  Live preview PID 665048 remains Vite; `/updf/`, the actual chunk manifest, all
  emitted manifest chunks and previously linked local assets return 200. Fresh
  URL content fingerprints are in `preview-proof.json`.

Preserved paired cost commands (no historical report overwritten):

```sh
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/side-path-fixed-vs-before --compare artifacts/text-flow/side-path-runtime-before/report.json
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/side-path-fixed-vs-library --compare artifacts/text-flow/library-baseline/report.json
```

The original before record still has 230 metrics; fresh final has 238. Both new
reports retain raw/minified browser/Node output, graphs, package payloads and all
comparison rows. `fix-proof.json` also subtracts the preserved **old final**
`side-path-runtime-vs-before/report.json` for the isolated same-lock fix cost:
optional sibling browser min +534 bytes/+254 gzip; Node min +608/+220. Path browser
min +534/+257; Node min +608/+218. Addon package payload +1,114 packed/+5,244
unpacked bytes (includes README/declarations), not installed dependency footprint.
Ordinary/drawing/text/font/JPEG/layout consumers have zero fix-only changes;
the original shared layout tax is unchanged, not retroactively described as zero.
Fresh final Path absolute browser min is 248,072 bytes/81,200 gzip, Node min
374,532/115,708. The lock/dependency graph is unchanged from old runtime-final;
historical library comparison still spans inherited work/lock changes.

Logs: `/tmp/opencode/updf-path-fix-{typecheck,test,browser-build,graphs,consumer,browser-test,cost-before,cost-library,evidence}.log`.
Initial fixture typings/source-path expectations and one formatting error were
corrected. A 120-second combined gate timeout cancelled four browser tests; the
complete suite was rerun successfully with a 360-second command timeout. An initial
preview probe incorrectly treated source inventory entries as emitted URLs (404);
the corrected check uses manifest file/import fields and actual linked assets.
The frozen-selector reconstruction hash correctly rejected a later formatting
change; final proof reads the previously saved frozen source and checks it against
the original manifest, rather than depending on fragile reverse text edits.
None of these initial failures is counted as a pass or waived.

Universal checklist: correctness/regression evidence, cohesive source <=400 lines,
functions <50, nesting <=3, intent/invariant comments and risk-based tests checked;
format/lint/typecheck/test gates pass. **No approved principle exceptions.** No
Changeset (repository does not use Changesets). No speed/zero-cost claim.
Auditor next: independently challenge all-remaining-source clearance and its
monotonic release proof, actual gap/selected geometry, source offsets/deferral,
strict fillRule domains and diagnostic remapping, then inspect native raster/PDF,
frozen ownership and fix-only cost artifacts. Implementation is not verification.

## Original runtime delivery record (historical)

Status: **implemented, independent runtime audit pending**. Issue: N/A.
The caller confirmed the `inlineBand` prerequisite independently verified; its
original delivery record is preserved below, not reopened or represented as a
new prerequisite. This runtime is not independently verified yet.

## Runtime scope and delivery state

- Objective: real `f.Path` TSX and authored straight-path `f.Block.shapeOutside`
  alongside ordinary rich Paragraph siblings, using existing admission/painting.
- Worktree `/home/sprawl/projects/updf/trees/text-flow-design`, branch
  `feature/text-flow-design`, unchanged base/HEAD
  `882d6d38f432edcac97e962fbf446062c1483c3d`.
- All initial tracked/nonignored input hashes (except evolving logs) are frozen in
  `artifacts/text-flow/side-path-runtime-before/source-manifest.json`. Every
  inherited sibling/app/prerequisite edit is protected outside the explicit
  runtime allowlist. `side-path-runtime-vs-before/scope-summary.json` records the
  exact changed/new ownership, hashes and dirty delivery state.
- No stage/commit/push/PR/tracker/delegation mutations; issue N/A. Runtime edits
  are unstaged, new modules/tests/evidence scripts untracked. Inherited dirty work
  remains inherited, not claimed as this delivery.
- Addon owns three new cohesive modules: `path.ts` (facade/fill capture/native
  fixed visual), `path-band.ts` (closed straight contours and conservative query),
  `path-selection.ts` (variable-width policy). `sibling.ts` dispatches only the new
  branch; `sibling-selection.ts` and `sibling-source.ts` are unchanged from freeze.
- Shared seams only: `content-inline-selection.ts` forwards the owned band query;
  `content-paragraph-output.ts` joins positioned selected lines; the small optional
  offset consumer in `content-producer.ts` retains its original generated
  certificates/preparation/single background-before-glyph painter. Internal
  exports reuse the existing `chargeSourceWork` owner. No duplicate painter.
  Text changes only export the existing conservative segment interpolation from
  the optional composition subpath; the implementation and ordinary math remain
  untouched. No parser/core/Paginator/kernel ABI/image/font implementation edits.

## API, layers and geometry limits

`createTextFlow(capability)` now also returns `Path`. Block and Path are two typed
TSX facades on the same owned semantic marker, preserving authored keys without
another registration. Path accepts `d`, required `fill` (RGB or existing
`parseColor` string grammar, including `#3498db`), optional `fillRule`
(`nonzero`/`evenodd`), and explicit point width/height/left-or-right float plus
existing min/max dimensions. Unknown/stroke/transform/children props reject.
Color opacity/no fill never removes the exclusion. README shows real TSX, not a
virtual float or required raw native-node array.

`Block.style.shapeOutside` is `"rect" | string | {d,fillRule?}`; omission is rect,
explicit undefined still rejects. Strings are path data, never resource URLs.
Arbitrary Block visuals use the authored contour, not alpha extraction.
`@updf/geometry` is an addon dependency only. One normalized `parsePathData`
capture supplies both Path native commands and side edges: no second parse.
Path first resolves an empty ordinary Block's box constraints, then prepares its
one native fixed visual at that actual size through the existing native owner.
It does not measure the native visual or rich inline visuals twice. Arbitrary
Block contents keep their original preparation/decoration owners.

Only move/line/close, explicitly closed nonempty non-collinear subpaths inside
the actual resolved local dimensions pass. Normalized cubics reject, including
curves/arcs that normalize to cubics; no implicit flattening/bbox fallback.
Relative M/L/H/V and compound paths work. Compound native fill rules paint as
authored, but text gets the outermost side over the whole band: holes, center and
multiple intervals are unavailable. Degenerate collinearity is an exact dyadic
orientation check using existing numeric primitives, not rounded area arithmetic
that silently accepts/rejects extreme scales.

Numerical classification: finite/nonnegative domains, local bounds, fill-rule
identity, closed state and non-collinearity are exact input/shape policy. Segment
queries and right reflection are outward geometric enclosures, not approximate
fit allowances. Clipped endpoints, internal vertices and horizontal touches all
contribute to the maximum intrusion. The existing `profileDepth` algorithm is
reused via `conservativeSegmentDepth`; no duplicated interpolation/binary64 owner.
Right reflection widens its rounded subtraction; remaining width rounds inward.
Independent dyadic-rational endpoint inequalities certify no underbound on both
sides, including subnormal, huge finite and adjacent-height vertices. No EPS,
unit allowance, fixed-point rewrite or native-certificate change.

At each actual compensated top, each rich source's owned continuation supplies
`{top,bottom,nominalHeight,nextTop}`. A charged full-edge query and non-consuming
first-unit probe determine one interval. Each selection opens a **fresh one-line
candidate cursor at the exact width/offset** on the existing reflow token, then
materializes it. No fixed-width cursor is reused across y, no hidden mutable
descriptor or kernel ABI change. Actual selected box/ink is checked against the
certificate and side interval. Blockage uses the rich owner's next top while
inside the float without consuming source; retries/queries remain cumulative.
The actual crossing-bottom line is retained, then the same scalar source resumes
at full width. Unused retry tops do not grow the fragment reservation. Initial
positive-height visual+text admission uses actual `frameFits`; deferral cannot
commit offsets or duplicate paint. Complete selection and whole selected graph
preparation still precede every painter. Gap offsets must reproduce their exact
generated certificate; unrepresentable geometry rejects rather than bypassing it.

Path input UTF-16 length is charged once before parsing; parser's existing finite
100,000-character/4,096-command/scanner caps remain separate safeguards, not a
second operation input charge. Normalized visits, retained edges/projected points,
exact orientation work, color input and every query scan are charged before their
work via the existing cumulative operation source-node budget. Text and kernel
work retain their respective existing owners. Failed/repeated work stays charged;
quota failure never falls back to a rectangle or paints early.

## Runtime tests and quality gates

Risk-based additions cover both sides across two paragraphs, real TSX Path and
object/string contours, relative/H/V commands, blocked words fitting later inside
the slope, mixed normal/point struts with negative leading, inline ink/background
ordering and one visual preparation, actual source-coordinate reports, crossing
and full-width continuation, min/max resolved boxes, horizontal touches/internal
vertices/holes, subnormal/huge/adjacent vertices with a rational oracle, malformed
and open/curved/degenerate/outside contours, unknown fill rules/escaping props,
closed operation failure, cumulative failed queries, complete selected-graph
rejection before paint, fresh-body oversize, intact page deferral and provenance.
The existing boolean auto-band oracle remains in the accepted prerequisite;
TSX uses its existing normal/point/multiplier grammar, not a new `"auto"` string.

Final runtime commands passed:

- `npm run format:check`, `npm run lint` (Biome + AST principles),
  `npm run typecheck` (includes full workspace build), `npm test` (1,543 passed,
  zero failed/skipped, including 19 new focused path/runtime tests).
- `npm run build:browser`, `npm run check:graphs`, `npm run test:consumer`
  (15 clean external tarball closures, including Path TSX runtime/declarations
  in NodeNext and Bundler modes), `npm run test:browser` (22 passed, none failed).
- `npx tsx scripts/text-flow-paginator-proof.ts`: protected Paginator admission,
  cursor, preparation, paint and state/control ordering unchanged.
- `npx biome lint --diagnostic-level=error packages/text-flow`, `git diff --check`.
- `npx tsx scripts/text-flow-path-evidence.ts`: all 230 initial cost metrics have
  zero deltas against `inline-band-after/report.json`; instrumented frozen/current
  rectangle bundles have identical placements/native nodes/PDF bytes and identical
  full quota-check and kernel charge sequences. This instruments retained proof
  bundles only, never production source. Path PDF: 2 pages, 5,838 bytes,
  SHA-256 `2786f7e96408d6b18bb39fabf6d0b5a4ad173bbbb803cdedda7313120f935c64`,
  qpdf check and exact entire-stream pdftotext pass. Browser parity compares all
  placements/native data and complete PDF bytes, not a screenshot subset.
- `npx tsx scripts/text-flow-path-evidence.ts --costs-only` and `--scope-only`
  assert ordinary retained isolation, lock-only dependency delta and frozen owners.

Logs: `/tmp/opencode/updf-side-runtime-{typecheck,test,browser-build,graphs,consumer,browser-test}.log`.
Initial test-only key/undefined handling, fixture whitespace/height grammar, state reuse
and exact-optional typing failures were corrected, not waived. Initial guessed
root manifest probes returned 404: the unchanged showcase uses `/updf/`, not `/`.
At `http://100.74.77.69:5182/updf/`, index, actual `chunk-graph.json`, all manifest
chunks and linked local assets returned 200 (`preview-proof.json`). PID 665048,
app sources and showcase dist remain unchanged; no showcase build was run.

Universal checklist: correctness/boundary tests, cohesive source files <=400
lines, functions <50, nesting <=3, intent/invariant comments, risk-based tests,
lint/typecheck/test gates all pass. **No approved exceptions.** This unpublished
repo does not use Changesets; none introduced. No speed, dependency-footprint or
zero-cost claim.

## Runtime cost evidence (preserved paired artifacts)

- Before: `npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/side-path-runtime-before --compare artifacts/text-flow/inline-band-after/report.json`.
- Final: `npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/side-path-runtime-vs-before --compare artifacts/text-flow/side-path-runtime-before/report.json`.
- Historical: `npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/side-path-runtime-vs-library --compare artifacts/text-flow/library-baseline/report.json`.

Existing cost source fixtures are byte-preserved; the separate Path fixture adds
eight absolute raw/minified browser/Node byte/gzip metrics (230 -> 238 total).
All reports retain raw output, metafiles, emitted/package payloads and comparison
rows. Ordinary graphs contain **zero new path/parser/band/policy modules**.
Drawing/text/prepared-font/JPEG consumer bytes stay unchanged. The shared optional
positioned-offset consumer is not free: ordinary layout browser min +274 bytes /
+82 gzip; Node min +997 / +314 gzip (raw +486/+131 and +1,937/+408 respectively).
Existing sibling optional consumers retain the Path capability: browser min
+11,272/+4,309 gzip; Node min +16,311/+5,998 gzip. The new actual Path consumer
is 247,538 bytes/80,943 gzip browser min and 373,924 bytes/115,490 gzip Node min (absolute
costs, not deltas against a nonexistent previous Path fixture).

Package payload deltas: layout +1,354 packed/+8,930 unpacked bytes; text
+130/+719; addon +8,408/+47,797. These are payloads, not installed dependency
closure or speed. Before lock SHA-256:
`dfe53dc12b83cd72c6e4712e835d8e3b58605e7766bfb1d2f79ec183977f75ea`;
final `d215481cbe03738b857a5f8e5148bf55fd13d7c20a40cd5b884368a0b326c018`.
The only fresh lock delta is addon's `@updf/geometry`; removing that entry
reproduces the exact frozen lock hash. The zero-delta initial comparison is
same-lock; final comparisons transparently include this authorized addon
dependency change. Historical library comparison additionally spans inherited
work/lock changes and must not be called a same-lock runtime measurement.

Auditor next: independently review conservative clipped-edge/reflection enclosure,
budget/lifetime and candidate offset ownership, positioned generated/native
certificates, all-background-before-glyph output, complete pre-paint graph,
full-stream PDF/Chromium parity, frozen protected inputs and measured retained
scope. No app migration/showcase Path/image alpha facade or delivery is included.

---

## Preserved prerequisite delivery record (historical)

# Exact rich-inline band prerequisite (no path integration)

Status: **implemented, independent audit pending**. Issue: N/A. This replaces the
previous stopped prerequisite reproduction, not the deferred side-path runtime.
No Path facade, contour geometry, host integration, ordinary line arithmetic,
native painting certificate, core/layout owner or app source was changed.

## Frozen scope and ownership

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/HEAD:
  `882d6d38f432edcac97e962fbf446062c1483c3d`.
- Fresh baseline: `artifacts/text-flow/inline-band-before/source-manifest.json`:
  1,554 tracked/nonignored input hashes and 119 inherited dirty paths; none staged.
  This includes all current showcase-owned inputs. The earlier side-path baseline
  is historical, not the current app/runtime baseline.
- Assignment owns only `packages/text/src/inline-selection{,-types}.ts`, new
  `inline-band{,-interval}.ts`, four `inline-band*.test.ts` files, this evidence,
  and exact new-module entries in `scripts/{boundaries,graph-check}.ts`.
- `inline-band-after/scope-summary.json` checks every frozen input hash outside
  that allowlist and absence of staging. No Git delivery/tracker mutation.
- Live preview PID 665048, `100.74.77.69:5182`, was not stopped/reconfigured.
  No showcase build was run; its static app dist was not rebuilt.

## Contract, owners and work accounting

The optional composition operation adds
`inlineBand(continuation, top, path) -> {top,bottom,nominalHeight,nextTop}`.
Authored query top is **finite nonnegative host-local y**, validated exactly.
Returned top may be negative to contain ink. The band covers the line box and
declared atom ink for any ordered selected subset of the captured source, not
just the current width, and intentionally may be loose.

The active-operation check and owned-handle lookup precede query work. Preparation
captures the already prepared atoms with the original snapshotted paragraph and
height. A certificate is built lazily on first valid query and cached privately
on that source. Fork/selected continuations and resume share it; band queries do
not invoke the selector, consume offsets, or invoke visual preparation again.
Queries cost one cumulative `owner.charge`; certificate preparation charges each
atom and each distinct participant (including the default/strut). Failed queries
and partial failed preparation retain work; cache assignment happens only after
successful preparation. Existing original-domain validation is preserved and
regression-tested, not replaced by derived-height validation.

Text participants use existing `participant(effectiveStyle(...), ...)`; visual
participants use captured atom ascent/descent and the existing compensated sum.
Boolean empty metrics use the existing `richMetrics` owner. There is no second
font resolver, line engine or visual prerender. Atomic visual `Atom.style` remains
the paragraph default, not a run override. No ordinary module imports the helper.

## Binary64 enclosure proof

These are **exact enclosures of rounded operations**, not approximate fit tests
or changes to native certificates. `inline-band-interval.ts` owns finite point,
hull, rounded add/subtract/half/max and compensated two-term-sum intervals. IEEE
rounded add/subtract/half are monotone in each argument (subtract reverses the
second); their rounded endpoint operations therefore enclose every rounded result
without EPS or arbitrary padding. Every constructed arithmetic bound is checked
finite and ordered. Intermediate overflow rejects, never clamps Infinity into a
usable certificate. Correlation loss may reject a source whose actual lines would
be finite; this conservative failure is intentional, not a tightness guarantee.

`metricSum2(A,D)` evaluates the actual `MetricSum` sequence: first `fl(0+a)=a`
with zero correction, then `s=fl(a+b)` and residual
`fl(fl(a-s)+b)` if `abs(a)>=abs(b)`, otherwise `fl(fl(b-s)+a)`.
It evaluates `fl(s+fl(0+residual))`. Interval magnitude dominance selects a branch
only when certified, otherwise both residual branches are hulled. This helper
certifies the existing sum; it does not replace that implementation.

Let `G=[min(0, nonempty atom ink tops), max(0, nonempty atom ink bottoms)]`.
Ascent/descent intervals `A,D` include default-empty metrics and every atom,
including conservative newline metrics. For boolean heights:

- Fixed `H=point(paragraph.lineHeight)`.
- Auto `H=[paragraph.lineHeight, max(paragraph.lineHeight, every atom.style.fontSize,
  metricSum2(A,D).hi)]`.
- `B(t)=add(add(point(t),A),half(sub(H,metricSum2(A,D))))`.

This preserves the actual `fl(fl(t+ascent)+fl(fl(H-sum)/2))` association.
Empty source arrays are covered without spreading an empty extrema list.

For explicit heights, resolve strut `S` using the existing participant owner.
Initialize `A=point(S.above), H=point(S.height)`. Enumerate distinct atom run indices
in source order, matching `inlineEnvelope` deduplication. Text participant `P`
uses its effective run style and `runs[index] ?? strut`; atomic visual `P` uses
captured ascent/descent and `sum([ascent,descent])`. For each participant, using
the **old** state throughout the include branch:

```text
Ai = max(A, point(P.above))
Hi = max(add(H, sub(Ai,A)), add(point(P.height), sub(Ai,point(P.above))))
A  = hull(A,Ai)
H  = hull(H,Hi)
B(t) = add(point(t),A)
```

Induction: old state contains every previous selected subset; monotone interval
evaluation contains each include transition in its original association; hull
with old state also contains every skip transition. Negative leading and negative
above/below do not require a nonnegative-envelope assumption.

Direct ink is `add(B(t),G)`. Optional `selectInline` actually builds at top zero
before host translation, so translated ink is separately
`add(point(t),add(B(0),G))`. Hull **both** associations. Returned band top is the
minimum of authored top and that ink low; bottom is the maximum of ink high and
`add(point(t),H).hi`. The certificate covers vertical line box/declared ink only:
it is **not** a certificate for arbitrary native affine transforms or painting.

`nominalHeight` is paragraph line height for booleans, strut height for explicit
heights, validated finite positive. It is retry policy, never the actual selected
ink height. `nextTop=fl(top+nominalHeight)`; if that collapses, the shared numeric
`bits/successor/value` implementation supplies the next representable number.
Require finite strict progress, and reject overflow/no successor.

## Risk-based tests and gates

Four focused test files cover the original A/B 16/80-point counterexample at
widths 12/120; all 32 subsets of five ordered atoms across fixed/auto/normal,
multiplier, per-run point heights and scales `1e-300`, `1`, `1e300`; repeated runs,
newlines, whitespace, empty arrays, visual atoms, negative leading/ink edges;
actual `inlineEnvelope`/`line` outputs at direct top and top-zero translated top.
Containment uses exact inequalities, never tolerance. Real mixed-font sources
exercise both whitespace policies. Additional tests cover subnormal/cancellation
arithmetic, 2,000 deterministic random interval samples against the actual sum,
both magnitude branches, lazy metric counts, snapshot mutation, visual default
binding, cumulative failed/repeated-query limits, forged/foreign/closed handles,
exact top domains, collapsed retry progress and finite-bound overflow rejection.

Final commands and outcomes:

- `npx tsx --test packages/text/test/inline-band*.test.ts packages/text/test/inline-validation.test.ts`:
  17 passed, zero failed/skipped.
- `npm run format:check && npm run lint && npm run typecheck && npm test && npx tsx scripts/graph-check.ts && git diff --check`:
  passed; full suite 1,524 passed, zero failed/skipped. Typecheck includes the full
  workspace build. Graph check covers source seams and the 12 existing browser
  module-graph artifacts; those app artifacts were not rebuilt. Fresh retained
  consumer graphs are independently generated by the paired cost commands below.
- `node /tmp/opencode/updf-inline-band-summary.mjs`: passed frozen-input,
  same-lock, no-staging and fresh ordinary retained-graph/zero-delta assertions.
- Logs: `/tmp/opencode/updf-inline-band-{typecheck,test,graphs}-final.log`;
  `artifacts/text-flow/inline-band-after/scope-summary.json` records final hashes.

Initial lint runs found test expression/function-size/nesting issues and the
400-line boundary inventory ceiling; these were corrected without waivers.
Initial typecheck failed on the oracle's invalid `"end"` break reason; the fixture
now uses typed `"paragraphEnd"`, not an unsafe cast. Initial standalone graph
check required adding exactly `inline-band.ts` to the numeric-import inventory;
the final check passes. Earlier partial attempts are not represented as passes.

No principle exceptions are approved: cohesive production files under 400 lines,
functions under 50, nesting at most three, intent/invariant comments only; AST
principles enforcement is required along with format/lint/typecheck/tests.

## Paired cost evidence and historical-lock caveat

Before (current inherited manifest, before edits):
`npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/inline-band-before --compare artifacts/text-flow/side-path-before/report.json`.
After:
`npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/inline-band-after --compare artifacts/text-flow/inline-band-before/report.json`.
Both passed workspace builds and retained-consumer assertions; no prior artifact
was overwritten. All 230 metrics are paired against the fresh same-lock baseline.
Ordinary drawing/text/prepared-font/JPEG/layout browser and Node consumers have
zero byte/gzip deltas and no inline-band helper retention, including CJS.
Optional text-flow consumers do retain the new capability: representative minified
growth is browser +2,718 bytes/+856 gzip, Node +3,752/+1,118 gzip. Text package
payload increases +4,470 packed/+31,270 unpacked bytes, not dependency closure.
This is not a zero-cost or speed claim for the optional graph.

Historical lock SHA-256 is
`5999d00291aa79dbb7136288868af55b17ac80384feb77db9bb983961f8d7035`;
fresh before/after both use
`dfe53dc12b83cd72c6e4712e835d8e3b58605e7766bfb1d2f79ec183977f75ea`.
The inherited lock diff from HEAD adds showcase's `@updf/text-flow` dependency
and text-flow's `@updf/layout-boxes` dependency. Neither lock nor app manifest was
edited here. Historical deltas are retained separately in `scope-summary.json`,
not represented as a same-lock comparison. No dependency-footprint claim.

## Safe stopping point

Independent Auditor should review interval induction/compensated branch coverage,
actual source lifetime/work accounting, protected-input hashes, paired graphs and
costs. A fresh assignment must own any side-path facade/geometry/runtime work,
path PDF/paginator/browser parity and delivery. None is implemented here.
