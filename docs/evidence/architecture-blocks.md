# C progress: generic producer and extension boundary — 2026-10-03

## Current status: C implemented, independent audit pending

**Superseded by independent C-F1–C-F5 findings:** remediation is implemented and
awaiting independent **re-audit**, not verified. Current evidence is in
[architecture-blocks-audit.md](architecture-blocks-audit.md). The prior 251-test
delivery and its delta are preserved below/as separate manifests; passing those
gates did not establish correctness. No D before C re-audit.

The complete assigned C scope is now **implemented, not verified**. The continuation
and final integrated evidence are appended below. The prior incomplete-tranche
record, commands and counts that follow this notice are **historical**, retained
without rewriting them into a completion claim. Its accepted 456-path delivery and
partial delta are archived in `architecture-blocks-progress.json`; the original
443-path C entry snapshot remains unchanged. The current delta manifest covers
the full C delivery. D–G have not started and require independent C audit first.

## Status and delivery identity

**C is incomplete / in progress.** This records an implemented first tranche,
not completion of the requested slice and not independent verification. The
caller reports B independently verified; its historical foundation notes and
the original preservation manifest remain unchanged. D–G have not started.
No tracker changes, nested delegation, staging, commits, pushes, PRs, merges,
Pages activation or deployment occurred. Integration owner: this Engineer.

- cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`
- branch: `feature/measured-flow-tables`
- base = HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`
- committed/staged C scope: none; delivery is unstaged/untracked.
- Entry dirty scope: **59 tracked modifications / 100 untracked files**.
- C entry snapshot: [architecture-blocks-baseline.json](architecture-blocks-baseline.json),
  **443 paths**, SHA-256 and byte lengths, plus actual entry Git status. Captured
  before source edits; does not replace the original 427-path A/B baseline.
- Final incremental paths/hashes: [architecture-blocks-delta.json](architecture-blocks-delta.json).
  That generated manifest excludes itself to avoid a recursive self-hash.
- Final full Git scope: **59 tracked unstaged modifications / 113 untracked files**,
  zero staged files and no committed delivery. Relative to C entry: **432 unchanged
  paths / 11 changed existing paths / 13 new paths**, no missing paths. The delta's
  hashed new-file list has 12 entries because it excludes the manifest itself.
- Preservation: all **128 C-entry protected paths** are byte-identical, including
  the original baseline/foundation evidence; the original A/B checker separately
  confirms its **126 protected paths unchanged**, no missing original paths.

## Implemented tranche

`paginator.ts` imports no paragraph/table/old-block producer or measurement module.
It has one offset/extent fragment loop and only a generic advance control; no
paragraph/table kind dispatch. Paragraph line selection/materialization now lives
in `paragraph-producer.ts`. Fixed, spacer and break producers use the same private
protocol. The existing table row API's atomic entry point is a bridge into that
loop, retaining its reservation-before-paint accounting, placement paths, grid
ink checks and repeated-header orchestration. Existing table extraction/API
rewrites are not included. Existing output expectations were not changed.

The numeric certificate/axis/binary64/measurement arithmetic modules are untouched.
Cursor accumulation remains `MetricSum`, fit remains the existing `exceeds`/`sum`
policy, and native materialization/overlap checks remain mandatory. No global
tolerance change, shrink, hidden workload limit or native chart kind was added.

Public `@updf/layout` exports:

```ts
defineBlockAdapter<P>(definition: BlockAdapterDefinition<P>): BlockAdapter<P>
createExtensions(adapters: readonly BlockAdapterIdentity[]): Extensions
extension<P>(adapter: BlockAdapter<P>, props: P): ExtensionBlock
layoutFlow(input, options?, extensions?): FlowResult
layoutFlowUnknown(input, options?, extensions?): FlowResult
```

Definitions are captured and frozen, not installed in a global name registry.
Private WeakMap brands establish owned definition/descriptor/scope identity;
name resolution exists only within the caller's immutable extension set for the
operation. Duplicate names/identities, same-name foreign identities, forged sets,
copied adapters and JSON-roundtripped descriptors reject structurally. There is
no serialized measured-plan trust flag. Different operations must explicitly
pass their installed set; installation never leaks to a subsequent call.

The adapter validates unknown props, then receives a copied/frozen deep readonly
data result. Owned prepared-font handles remain opaque identities. The narrowly
inventoried internal `isPreparedFont` check lets source preflight recognize that
same opaque exception; it does not accept resource lookalikes, expose bytes or
alter mandatory resource resolution. VNodes are not extension data props.

`MeasureContext` exposes measured width and the same-operation text measurement
function, not fonts/maps/bytes/plans or policy mutation. Its callback closes in
`finally` on success/failure. Unknown font ids still fail core resource validation.
This tranche's data adapter entry is `layoutFlow`/`layoutFlowUnknown`, not a new
TSX binding: existing `Flow.Document` does not install these extension sets.

Measured output has `fragmentation`, finite `naturalSize`, a positive safe integer
`extent` and a synchronous `fragment` callback. Atomic extent must be one. The
frozen request contains offset, available/fresh height, fresh-region status and
the width captured at measurement. A placed result must advance strictly within
extent and have finite nonnegative fitting height; zero height with real offset
progress is permitted. A defer from a partial region moves to a fresh page;
another defer at that offset errors `LAYOUT_OVERSIZED` instead of generating blank
pages indefinitely. Output getters, holes/extra array fields, promises, foreign
native kinds and malformed geometry reject before page integration. Generated
output is budgeted before its owned snapshot; later caller mutation cannot alter
the returned document.

Callbacks are **trusted synchronous executable code**, not sandboxed. These checks
do not bound callback execution time/allocation, hostile Proxy traps or arbitrary
loops inside executable code. Native validators and service policy still apply to
their returned data. This is not a claim that all remaining C policy adversaries
have been implemented/tested.

## Real external proof

`tests/fixtures/chart.ts` depends only on public core/layout APIs and constructs an
owned data descriptor via `extension`. Its adapter draws paths, rectangles and
text, fits atomically between paragraphs, moves intact to a fresh region and
errors rather than shrinking when oversize. No paginator/native kind changes
were required for chart recognition. It is intentionally not a general chart API.

- `tests/integration/blocks.test.ts`: actual PDF at `artifacts/blocks/chart.pdf`,
  qpdf check, ordered extracted text and spatial blue-ink raster assertions.
- `apps/browser-fonts/block-proof.ts` and `tests/browser/browser-blocks.test.ts`:
  same external adapter, exact Chromium/Node placement/document/PDF bytes; Blob
  download and pagehide cleanup. This is a browser proof, not the C showcase UI.
- Existing packed flow fixture now compiles/runs a local public adapter under
  NodeNext and Bundler with `types: []`, and negative readonly/identity/async types.
  Six consumer closures are still six closures, not seven because a test was added.

## Remaining C acceptance criteria — do not mark C implemented

- Public generic stacked-child block constructor and normalization/ownership,
  including nested extension descriptors.
- Border-box omitted/explicit width/height, finite min/max constraints, padding,
  border, inter-child gap, natural growth, minHeight blank space and the approved
  fractional math applied to nested content regions.
- Generic keepWhole independent of overflow, natural auto-height fragmentation
  and explicit-height fragmentation/error semantics.
- Overflow error/hidden with actual padding-edge PDF clips, nested clip stacks,
  border outside clip, no hidden continuation pages, and qpdf/text/raster proof
  that clipping is visual containment **not redaction**.
- Public optional decoration output and privately owned DecorationPlan; static
  before/after repeat all/first/last reservations before candidate selection,
  final-footer decisions, header-only nonprogress rejection and clone-per-fragment
  border/background policy. No final PageContext/deferred recipes promised yet.
- Complete C output/source-cache/policy adversaries, especially huge-output early
  reservation probes and repeated child-measurement/counting cases.
- C showcase external-chart/height/atomic/error-vs-hidden comparison with safe
  bounded controls, actual source/preview/download, accessibility/mobile behavior
  and abort/cleanup regression tests. Existing showcase is unchanged.

These omissions are unfinished assigned scope, **not approved exceptions**, a
request to reduce the approved scope, or separate authorized tracker items.
Independent **C audit must precede D**, after C is actually completed.

## Quality gates on this actual tranche

All commands ran from the exact worktree above at unchanged HEAD, Node v24.21.0.
Runtime/source changes were complete before the final broad run; only these
evidence/status docs and the generated delta manifest were added afterward.

| Exact command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome plus production 400-line / 49-function / depth-3 ESLint |
| `npm run typecheck` | Pass: workspace builds and root no-emit types |
| `npm test` | **223/223 pass**, retaining all 205 B tests, R1 table spatial oracle and native CMR checks |
| `npm run test:consumer` | Six packed closures pass, including actual public adapter execution and NodeNext/Bundler/`types: []` |
| `npm run build:browser` | All 11 builds pass |
| `npm run check:graphs` | Pass after current browser builds; native layout VDOM-free, no new root React/Node/Fontkit/SVG closure |
| `npm run sizes` | Pass; measurement evidence, not completion of regression-budget work |
| `npm run test:browser` | **7/7 pass**, including new external chart proof and all 11 existing SVG reference cases |
| `npm run build:showcase` | Pass; no C showcase feature claim |
| `npm run test:showcase` | Existing **14/14 pass** |
| `npm run check:licenses` | All six actual tarballs pass full MIT Surikat AB 2026 / third-party notices; no font assets |
| `npm run test:legacy:comparison` | Baseline equivalent only; raw legacy exit 1, **18 pass / 1 pending / 6 fail** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` | Preserved failure: **45 vulnerabilities**, 8 moderate / 10 high / 27 critical |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Original hashes unchanged, below |
| `qpdf --check artifacts/cmr.pdf` | Pass |
| `qpdf --check artifacts/cmr-unicode.pdf` | Pass |
| `git diff --check` and `git diff --cached --quiet` | Pass; no staged changes |
| `node /tmp/opencode/updf-c-delta.mjs` | Pass: C-specific incremental scope/hashes, no missing/protected-changed paths |
| `node /tmp/opencode/updf-foundation-preservation.mjs` | Pass: original 126 protected paths unchanged |

CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
Unicode CMR: `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`.
Final raw/gzip bytes: core 49,608/15,055; VDOM 59,115/16,903;
measurement 25,321/7,830; flow 60,965/17,518; tables 69,320/19,782;
SVG 40,740/12,462; optional Fontkit 492,601/169,756.

Intermediate attempts: one implicit callback parameter type failed package build;
fixtures initially used nonexistent plain text style fields and the async negative
type directive was on the wrong line; these were corrected. One adversarial test
expected KEY for a foreign native kind, while core correctly reports TYPE; the
new test was corrected to the existing structured contract. The first full native
run failed two new chart tests because the default miter stroke envelope extended
outside its local box. The external producer now explicitly requests butt/bevel
stroke semantics; engine bounds/tolerances and spatial raster assertions were
not weakened. Final complete native/browser gates pass. Known old SVG black-frame
intermittency remains a baseline risk; this browser run passed on its first attempt.

## Code-principles self-check and next action

- [x] Correctness checked for this tranche, including unknown/owned boundaries,
  strict extent progress, malformed outputs, cleanup and native integration.
- [x] Defaults preserved; **approved exceptions: none**; unfinished C scope listed.
- [x] Cohesive production files <=400 lines.
- [x] Functions <=49 lines and nesting <=3; no new lint waiver/suppression.
- [x] Comments describe intent/invariants; no unrelated source churn intended.
- [x] Risk-based additions: 16 native boundary tests, two real PDF integration
  tests, one Chromium parity test and packed positive/negative declaration probes.
- [x] Lint/type/native/browser/consumer/showcase gates pass for actual scope.

Changesets are not used by this project; none added. Full-audit/raw legacy failures
are recorded, not waived or silently fixed. No dependencies or license changes.

Check actual delivery with `git status --short`, `git diff`,
`git diff --cached --quiet`, `git ls-files --others --exclude-standard`,
`git branch --show-current`, `git rev-parse HEAD` and the two C manifests.
Preservation commands: `node /tmp/opencode/updf-c-delta.mjs` and
`node /tmp/opencode/updf-foundation-preservation.mjs`. The original 126 protected
historical paths, plus foundation evidence and original baseline JSON, must remain
byte-identical. Auditor can review this tranche's risks, but **must not declare C
verified** while the remaining assigned acceptance criteria are absent.

## C completion continuation — same assignment/worktree/HEAD

The previously listed remaining C criteria are implemented in this continuation.
The public contract, exact sizing/fragmentation choices, zero-height/clip behavior,
clone decoration policy and transitional JSX limits are documented in
[blocks.md](../blocks.md). No second public engine, new native kind, new Image,
final page context, mixed document or table package extraction was introduced.

### Completed scope

- Public `block({children, style?, keepTogether?, decorations?})` and readonly
  `ContainerBlock`, `BlockStyle`, `Insets` data types. The compiler normalizes
  built-in children and owned extension descriptors, not custom chart kind strings.
- Border-box omitted/explicit width and natural/closed height, finite min/max,
  padding, border/background and between-child gap; contradictory/erased regions
  reject. MinHeight blank space uses finite extent/arithmetic chunks, including
  sub-point regions, without an unbounded chunk array or hidden quantum.
- Default stacked fragmentation and independent whole-block atomicity. Explicit
  heights and truncating maxHeight constraints close the box; natural auto height
  grows/fragments rather than being clipped to a page. No implicit shrink or CSS
  margin/visible/auto/scroll semantics. Generic nested advance controls consume
  extent; atomic/closed blocks reject conflicting advance controls.
- Hidden native padding-edge clips do not clip border/background paint. Nested
  clip stacks remain ancestor-bounded and closed hidden content does not continue
  into extra pages. Resource/font/text validation and clipped-text accounting
  remain mandatory; actual PDF text still extracts, so this is **not redaction**.
- Public privately owned immutable `createDecorationPlan` / `StaticDecoration`:
  before/after, all/first/last, known/measured height and static nodes. Reservation
  precedes content choice; final footer trials cannot accept an unreserved final
  candidate or create an unbounded header-only page loop. Atomic sums include
  head/content/foot. Basic background/border/padding policy clones every fragment.
- Private heap continuation execution for container/decoration selection and
  painting supports depth 3,000 without recursively calling nested JS producers.
  There is still one paginator; paragraph/table/container kind switches do not
  live there. Public callbacks remain synchronous, trusted and checked, not sandboxed.
- Output scanning advances siblings incrementally. An aggregate generated-budget
  probe precedes output validation/copy; provisional reservation trials restore
  probe ledgers and only selected native output commits. Returned node snapshots
  are owned before another callback can mutate a shared candidate result.
- Repeated child compilation/semantic measurement is operation-local and cached;
  body/candidate passes do not inflate B source text ledgers. Retained contexts
  close on success/failure, caller resource mutation cannot change captured bindings,
  and foreign/undeclared decoration or adapter identities fail structurally.
- Visible optional showcase with actual external `apps/showcase/src/chart.ts`,
  height/whole/error-vs-hidden controls, actual compiled source, preview/download,
  fragment/page metrics, mobile keyboard behavior, readable failures and cancellation/
  Blob cleanup. Browser proof also compares its closed clipped container bytes.

The native-only closure must also reject authentic VNodes as data without importing
VDOM. The existing VNode identity WeakSet was relocated to private generic
`core/node-ownership.ts`; `vdom/ownership.ts` delegates to it, and the generic copier
rejects executable node handles unless its existing purpose-specific opaque callback
allows them. VDOM ownership/context semantics are retained; no public core export
or internal export inventory expansion accompanied this move. The extra tracked
file is this small ownership delegate, not a change to native traversal/primitive
dispatch. Existing B/F1–F5, context and packed/runtime identity tests still pass.

The numerical certificate files (`axis`, `binary64`) and core measurement arithmetic,
wrapping/glyph math are unchanged. Existing table output expectations and the R1
spatial oracle are unchanged. Legacy table normalization simply passes real fresh
capacity into the same compiler/row bridge; extraction/cell blocks remain F.
Extension sets/decoration capabilities through transitional JSX remain G; plain
data containers through the current ordinary Flow.Document have byte parity now.

### Risk-based validation and real artifacts

Since the accepted partial tranche: **28 new native/integration tests** (223 → 251),
including 12 container tests, five decoration tests, seven policy tests and four
PDF clip/raster tests. Three new site tests (14 → 17), extended actual Chromium
chart/container parity within the existing seven browser tests, and packed positive/
negative container/plan/readonly/JSX declarations across both module resolutions.

`artifacts/blocks/hidden.pdf` and `hidden-nested.pdf` pass qpdf, retain extractable
`HIDDEN SECRET`, and have no red ink outside the padding-edge clip while every
tested outer green border pixel remains present. Negative-no-clip PDF still retains
text/borders but fails the red spatial oracle; negative-no-border retains clipping/
text but fails the border oracle. Raster assertions/tolerances were not loosened.
`artifacts/showcase/block-hidden.pdf` contains the actual clipped external chart
demo and still extracts the tail paragraph. No stronger confidentiality claim exists.

Source-generated policy adversaries show an unvisited accessor is not inspected
after aggregate node exhaustion, and a million-element output rejects before
inspecting any index descriptor. Shared semantic measurement during last-footer
trials succeeds at the exact one-code-point budget. Invalid fonts, malformed text,
foreign plans and genuine nonprogress cannot be hidden behind clipping/decorations.

### Final integrated gates on completed source

All commands ran from the exact cwd/branch/base/HEAD above, Node v24.21.0.
The complete broad source gate chain ran once after the final source edits and
passed. Only documentation/status/evidence manifests were edited afterward.

| Exact command | Final outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome and 400/49/depth-3 production rules |
| `npm run typecheck` | Pass: workspace builds/root declarations |
| `npm test` | **251/251 pass**, including all 205 B and older numerical/table/CMR regressions |
| `npm run test:consumer` | Six clean closures pass; actual public adapter/container/plan execution; NodeNext/Bundler/`types: []` |
| `npm run build:browser` | All 11 builds pass |
| `npm run check:graphs` | Pass after current browser builds; native root remains VDOM/React/Node/Fontkit/SVG-free |
| `npm run sizes` | Pass, actual regenerated sizes below, not #32 completion |
| `npm run test:browser` | **7/7 pass**, including chart/container bytes and all 11 strict SVG raster cases |
| `npm run build:showcase` | Pass |
| `npm run test:showcase` | **17/17 pass**, includes four optional chunk boundaries and new chart UI |
| `npm run check:licenses` | Actual six tarballs pass full MIT Surikat AB 2026/third-party notices, no font assets |
| `npm run test:legacy:comparison` | Equivalent only; raw exit 1, **18 pass / 1 pending / 6 fail** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` | Preserved exit 1: **45 vulnerabilities**, 8 moderate / 10 high / 27 critical |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Both original hashes unchanged (recorded above) |
| `qpdf --check artifacts/cmr.pdf` and `qpdf --check artifacts/cmr-unicode.pdf` | Pass |
| `git diff --check`, `git diff --cached --quiet` | Pass; no staged files |
| `node /tmp/opencode/updf-foundation-preservation.mjs` | Pass: original 126 protected paths unchanged, none missing |
| `node /tmp/opencode/updf-c-delta.mjs` | Pass: 424 C-entry paths unchanged, 19 intentionally changed, 37 new (manifest itself excluded from its hashed list); all 456 accepted-partial paths present; 128 protected paths and numeric/wrapping certificates unchanged |

Final raw/gzip bytes: core 49,608/15,055; VDOM 59,256/16,927;
measurement 25,321/7,830; flow 77,480/22,100; tables 85,189/24,190;
SVG 40,740/12,462; optional Fontkit 492,601/169,756. Numeric measurements are
reported honestly, not new universal bundle-budget claims or silent regressions.

Earlier bounded failures are retained as evidence, not waived: initial compiler
functions exceeded 49 lines (decomposed); a first hidden-zero-height case silently
dropped content (now rejects a nonpositive clip); the 3,000-depth test initially
reproduced JS recursion (heap continuations now pass); minHeight originally used a
one-point floor (removed with a sub-point regression); final-candidate callbacks
could mutate an earlier candidate's shared nodes (owned immediate snapshots now
pass). A new raster fixture's adjacent following glyph antialiasing contaminated a
bottom-border pixel; a real four-point spacer now separates it, leaving every border
assertion and both negative controls unchanged. A new showcase test incorrectly
expected an atomic group larger than the fresh body to fit; its successful-fit
fixture now uses the actual fitting default height and keeps the oversize rejection
test. Lint caught a 50-line demo function (region helper extracted). None of these
failed targeted attempts is recast as independent verification. The completed full
gate chain passed; known old SVG black-frame intermittency was not observed in it.

### Code principles, final delivery and Auditor handoff

- [x] Correctness checked with finite progress, ownership, policy adversaries,
  source-cache/lifetime regressions and real PDF spatial negative controls.
- [x] Defaults followed; **approved exceptions: none**. No new blanket rule waiver,
  hidden workload cap, parser cap rewrite or tolerance relaxation.
- [x] Production files cohesive and <=400 lines; functions <=49 and nesting <=3.
- [x] Comments explain invariants/intent; risk-based tests cover broad C blast radius.
- [x] Lint, types, native, consumer, browser, site and license gates pass.

No Changesets convention exists here, so none was added. Raw legacy/full-audit
failures remain explicit inherited limitations, not approved new CI waivers.
No dependency changes, delegation, tracker/Git delivery mutations or deployment.

Full Git scope is **60 tracked unstaged modifications / 137 untracked files**,
zero staged and no committed delivery. C-entry and accepted-partial scopes were
59/100 and 59/113 respectively; do not attribute all inherited dirt to C.
The current C delta and archived partial hashes identify C-specific changes.
The complete C scope relative to its original 443-path entry is 19 changed existing
paths plus 37 new paths, including the mutable delta manifest (not self-hashed).
All 13 prior C-added paths remain present, and original protected evidence/fonts/
legacy/Pages paths remain byte-identical. Check `git status --short`, `git diff`,
`git diff --cached --quiet`, `git ls-files --others --exclude-standard`,
`git branch --show-current`, `git rev-parse HEAD`, and
`node /tmp/opencode/updf-c-delta.mjs` plus the original preservation command above.

Auditor should review the complete unstaged/untracked delivery against the C entry
and archived partial manifests; challenge nested numeric associations, zero/minHeight
space, keep/closed-height breaks, all/first/last final-candidate reservations, mutation
and early budget probes, VNode/opaque font identities and actual clip/border/text
artifacts. Verify the visible UI cancellation/source/Node parity and root/packed
closures. **C implemented, ready for independent audit; not verified. No D before
that audit, and no claim that the A–G blueprint or #25 is complete.**
