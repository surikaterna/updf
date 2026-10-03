# A+B foundation delivery — 2026-10-02

## Scope and delivery identity

Local **implemented**, not independently verified. New task has no authorized
tracker mutation; #25 is not closed. C–G are not implemented. No nested delegation,
staging, commits, pushes, PRs, merges, Pages settings changes or deployments.

**Current status: F1–F5 audit remediation implemented; independent re-audit pending.**
The remaining F3 enumerable-key-order correction is implemented as the bounded
follow-up recorded at the end; it is ready for re-audit, **not verified**.
The original 186-test/14-site-test gate pass below did not establish correctness:
independent adversarial auditing confirmed five must-fix findings. The current
remediation/evidence section at the end supersedes the original delivery counts,
gate totals and progress/allocation claims. No verification is claimed.

- cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`
- branch: `feature/measured-flow-tables`
- base = HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`
- committed slice: none; staged slice: none; all delivery is unstaged/untracked,
  on top of the preserved 42-modified/84-untracked source/record baseline.
- Baseline: [427 paths, original hashes and prior evidence](architecture-baseline.json).
- API decisions, removed/residual policy inventory and deferred whole-plan summary:
  [composable-layout.md](../architecture/composable-layout.md).

Generic snapshots live in `core/data`, not VDOM: the clean consumer gate caught
an initial accidental VDOM closure dependency in native layout. It was corrected
before the final complete gate run. Context/VDOM snapshot ownership remains an
adapter over that generic copier. No new package/dependency/Changesets machinery.

Original pre-audit preservation check: all **427** baseline files still exist; **357** are
byte-identical and the following **70** have intentional B edits. All **126**
protected prior evidence/roadmap/legacy/font-fixture/Pages-workflow paths are
byte-identical to their captured baseline. There are **12** new actual paths.
Full dirty delivery (including prior work) is **59 tracked unstaged modifications**,
**96 untracked files**, no staged files and no committed slice. Do not mistake the
existing 42/84 baseline delta for changes made entirely by this task.

Exact files changed **relative to the captured working baseline**, not HEAD:

```text
apps/browser-fonts/rich-proof.ts
apps/showcase/index.html
apps/showcase/src/demos.ts
apps/showcase/src/flow-controls.ts
apps/showcase/src/flow.ts
apps/showcase/src/rich.ts
docs/measurement.md
docs/native-api.md
docs/roadmap/current.md
packages/core/README.md
packages/core/src/core/bytes.ts
packages/core/src/core/content.ts
packages/core/src/core/error.ts
packages/core/src/core/layout-operation.ts
packages/core/src/core/measure.ts
packages/core/src/core/schema.ts
packages/core/src/core/serialize.ts
packages/core/src/core/validate.ts
packages/core/src/fonts/checks.ts
packages/core/src/fonts/cids.ts
packages/core/src/fonts/prepare.ts
packages/core/src/fonts/resources.ts
packages/core/src/fonts/types.ts
packages/core/src/index.ts
packages/core/src/internal.ts
packages/core/src/measurement/index.ts
packages/core/src/measurement/ledger.ts
packages/core/src/measurement/lines.ts
packages/core/src/measurement/measure.ts
packages/core/src/measurement/metrics.ts
packages/core/src/measurement/validate.ts
packages/core/src/measurement/wrap.ts
packages/core/src/painting/alpha.ts
packages/core/src/painting/commands.ts
packages/core/src/painting/read.ts
packages/core/src/painting/style.ts
packages/core/src/vdom/create.ts
packages/core/src/vdom/data.ts
packages/core/src/vdom/expand.ts
packages/core/src/vdom/index.ts
packages/core/src/vdom/lower.ts
packages/core/src/vdom/measure-output.ts
packages/core/src/vdom/native.ts
packages/core/src/vdom/registry.ts
packages/core/src/vdom/state.ts
packages/core/src/vdom/types.ts
packages/core/test/font-resources.test.ts
packages/core/test/measurement-context.test.ts
packages/core/test/measurement.test.ts
packages/core/test/render.test.ts
packages/core/test/vdom.test.ts
packages/fontkit/src/index.ts
packages/layout/README.md
packages/layout/src/blocks.ts
packages/layout/src/budget.ts
packages/layout/src/data.ts
packages/layout/src/layout.ts
packages/layout/src/paginator.ts
packages/layout/src/tables/layout.ts
packages/layout/src/tables/paint.ts
packages/layout/src/tables/validate.ts
packages/layout/src/template.ts
packages/layout/test/budgets.test.ts
packages/layout/test/flow.test.ts
packages/layout/test/table-boundaries.test.ts
packages/layout/test/tables.test.ts
packages/svg/src/index.ts
scripts/boundaries.ts
tests/consumer/types/measurement-template.tsx
tests/showcase/rich.test.ts
```

New paths (all untracked):

```text
docs/architecture/composable-layout.md
docs/evidence/architecture-baseline.json
docs/evidence/architecture-foundation.md
packages/core/src/core/data.ts
packages/core/src/core/operation.ts
packages/core/src/core/policy.ts
packages/core/src/core/traversal.ts
packages/core/src/measurement/source.ts
packages/core/src/vdom/context.ts
packages/core/src/vdom/progress.ts
packages/core/test/context.test.ts
packages/core/test/policy.test.ts
```

## Final quality gates

This section records the original pre-audit foundation run. Current remediation
gates and final source scope are recorded below; the original numbers are retained
as evidence rather than silently recast as an independent verification.

All commands below ran from the exact worktree above with Node `v24.21.0` and
unchanged HEAD. Final complete runtime/code gate run followed all source edits;
only evidence/status documentation was edited afterward.

| Exact command | Final outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome plus ESLint 400-file/49-function/depth-3 rules |
| `npm run typecheck` | Pass, includes full workspace build and root `tsc --noEmit` |
| `npm test` | Pass: **186/186**, including qpdf/Poppler parse/extraction/raster, R1 numerical regressions and CMR digests |
| `npm run test:consumer` | Pass: six clean packed closures, NodeNext/Bundler emitted types, `types: []`, ownership/runtime checks |
| `npm run build:browser` | Pass: all 11 actual Vite builds |
| `npm run check:graphs` | Pass **after** final browser rebuild; no Node/React/Fontkit leakage, native layout remains VDOM-free |
| `npm run sizes` | Pass: final rebuilt artifact sizes; measurements are not #32 regression-budget completion |
| `npm run test:browser` | Pass: six actual Chromium tests, including context + service-profile rich proof parity and all 11 SVG raster cases |
| `npm run build:showcase` | Pass: TypeScript and production Vite build |
| `npm run test:showcase` | Pass: **14/14**, source/download/Node parity, context-policy report, mobile/Blob/error behavior and optional graphs |
| `npm run check:licenses` | Pass: actual six tarballs retain full MIT license/notices; no font assets shipped |
| `npm run test:legacy:comparison` | Pass for **baseline equivalence only**; raw legacy still exits 1 with **18 pass, 1 pending, 6 fail** |
| `npm audit --omit=dev` | Pass: **0 vulnerabilities** |
| `npm audit` | Fails as preserved: **45 vulnerabilities**, 8 moderate / 10 high / 27 critical; not 45 tests; no dependency fixes attempted |
| `git diff --check` | Pass |
| `git diff --cached --quiet` | Pass: no staged changes |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Both unchanged, below |
| `qpdf --check artifacts/cmr.pdf` | Pass |
| `qpdf --check artifacts/cmr-unicode.pdf` | Pass |

CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`
(5,779 bytes).
Unicode CMR: `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`
(423,448 bytes).

Final raw/gzip bytes: core 49,336/15,007; VDOM 58,119/16,664;
measurement 25,049/7,768; flow 53,865/15,716; tables 63,743/18,294;
SVG 40,740/12,462; optional Fontkit 492,601/169,756. These are regenerated
measurements, not unreviewed universal performance thresholds.

## Earlier failed attempts, not waived

- First pre-update native run: old cap-expectation failures and fresh-node recursive
  component OOM when the old depth cap disappeared. Explicit same-data active-chain
  progress rejection and heap-based traversal were added; final recursive/deep/
  130,000-sibling tests pass. No arbitrary trusted depth/work cap was restored.
- Intermediate compilation/type gates exposed generic readonly JSX recursion and
  narrowed fixture typing; fixed, including packed negative readonly/async/image types.
- Intermediate native failures from legacy cap expectations and a too-tight stroked
  deep-test fixture were corrected. Geometry tolerances were **not** relaxed.
- An intermediate consumer gate failed because generic layout snapshots imported
  VDOM. Corrected by the core-owned copier; final consumers/graphs pass.
- Formatting/lint failures (callback return, adversarial thenable lint rule, size/
  nesting constraints) were corrected; no universal-principles blanket exemptions.
- Prior SVG Chromium all-black intermittency is known from preserved evidence.
  All three browser gate attempts in this session passed all cases; no raster
  tolerances/assertions/fixtures were weakened or browser failure hidden.

## Risk-based tests and code-principles self-check

19 new native tests (167 -> 186) cover default/provider copies and caller mutation,
nesting/text/sibling restoration, reentrant lower including throw cleanup, forged
contexts/fonts, symbols/accessors/binary/class/cyclic/VNode values, Promise/thenable
output without getter execution, prepared handle identity, trusted old-cap exceedance,
safe/unknown/getter/undefined options, zero/override/exact/+1 budgets, scalar emoji
units before font rejection, aggregate paths, unique font aliases, >10 MiB PDF,
depth-1,500 data/VDOM/painting, 130,000-character rich lines and 130,000 VDOM siblings.
Old cap tests now exercise explicit service/overrides; geometry/profile assertions
remain mandatory. Existing rich browser proof now executes context with owned fonts
under service options; consumer sources exercise deeply readonly providers and
unsupported async/image fields. Showcase reports policy without page-context claims.

- [x] Correctness checked; source validation/ownership and mandatory geometry preserved.
- [x] Strong defaults followed; no approved universal-code-principles exception.
- [x] Production files cohesive and <=400 lines.
- [x] Functions <=49 lines and nesting <=3, enforced by ESLint.
- [x] Comments explain invariants/intent, not statement restatements.
- [x] Tests proportional to broad validation/runtime risk.
- [x] Relevant format/lint/typecheck/native/browser/showcase/consumer gates pass.

One narrow Biome suppression is documented in the adversarial **test** getter
named `then`: the test intentionally proves it is not assimilated/invoked. This
does not relax production checks. Legacy/full-audit failures are preserved baseline
limitations, not newly approved CI waivers. Changesets are not used by this project,
so no changeset was added.

## Auditor handoff

Audit the complete actual worktree, not HEAD alone. Use `git status --short`,
`git diff`, `git diff --cached`, `git ls-files --others --exclude-standard`,
`git rev-parse HEAD`, `git branch --show-current`, and the baseline's per-path
SHA-256/byte records. The final preservation/delta check is
`node /tmp/opencode/updf-foundation-preservation.mjs` from the exact cwd (the
script is local evidence, not a shipped API); missing/protected-changed must be empty.
Review B's precise independent source/generated counting, repeated measurement,
preallocation reservations, private context/progress rules, residual parser policy
and technical constraints. Independently rerun risk-relevant gates. Do not proceed
to C or claim #25 complete until this slice has been independently audited.

## F1–F5 remediation round — 2026-10-02 UTC

The exact cwd/branch/base/HEAD above are unchanged. All five findings are
**remediated by implementation and regression checks, not independently verified**.
Scope stays B only. No universal execution-termination guarantee is inferred from
cycle detection: only repeated function/owned props/effective provider bindings are
compared, and progressively changing infinite expansion or loops inside executable
components remain outside the guarantee.

| Finding | Implementation | Adversarial regression evidence |
| --- | --- | --- |
| F1 HIGH: eager million-sibling scheduling before next node budget | Shared cursor scheduler advances one array element/descriptor at a time in lowering, text children and owned snapshots. No new array-length policy or changed VDOM structural charges. Dense/extra-key validation finishes on successful consumption. | Drawing/text million-sibling limits inspect exactly **one index descriptor, zero own-key enumerations**; both finish with a **64 MiB child heap**. Accessor never invoked; extra array field still rejects. |
| F2 HIGH: recreated provider Map bypasses cycle checks | Compare effective immutable bindings, using declaration defaults for absent bindings; do not substitute or mutate captured provider values. | Drawing and text recreation loops reject `VDOM_CYCLE` after one call for default-equivalent values, two for an initial real value change. Three-step value changes finish normally. |
| F3 HIGH: observable shape/opaque identity collapsed into false cycle | Shared owned-data comparator preserves prototypes, array/record shapes and `Object.is` scalar distinctions; prepared font and VNode handles require identity. | Finite array -> record -> null-prototype record completes. Distinct owned font programs with identical metadata progress in props and context. Signed-zero change completes; genuine NaN repetition rejects. |
| F4 HIGH: recursive native -> VNode flow/table adapters | One private postorder converter shared by both adapters, retaining ordinary factories and typed leaf dispatch. | Depth-3,000 fixed blocks and repeated header/footer regions have exact native/Flow/Tables PDF parity. Service depth failures remain structured `LIMIT`, not call-stack failures. |
| F5 MED: phantom region/fixed generated wrappers | Reserve generated wrapper/children only for nonempty emitted regions/fixed blocks; geometry reservations remain unchanged. | Shared empty header/footer + four breaks: seven distinct source containers, five pages, **zero output nodes**, succeeds at `nodes: 7`; source +1 fails. Empty fixed bodies do not create phantom nodes. Real repeated output succeeds at 10 nodes, fails at 9 **before snapshot reads**. |

### Exact remediation delta from the independently audited 59/96 delivery

Changed existing paths:

```text
docs/architecture/composable-layout.md
docs/evidence/architecture-foundation.md
packages/core/src/core/data.ts
packages/core/src/vdom/context.ts
packages/core/src/vdom/lower.ts
packages/core/src/vdom/native.ts
packages/core/src/vdom/progress.ts
packages/layout/src/paginator.ts
packages/layout/src/tables/vdom.ts
packages/layout/src/vdom.ts
scripts/boundaries.ts
```

New paths:

```text
packages/core/src/vdom/equality.ts
packages/core/test/foundation-audit.test.ts
packages/layout/src/native-vdom.ts
packages/layout/test/foundation-audit.test.ts
```

Boundary inventory adds only the shared private converter's core-validator import.
Public APIs, policy defaults/units, SVG/parser budgets, numeric tolerances, theme/site
features, licenses, dependencies and prior baseline evidence are not changed.

### Commands and outcomes on the final remediation source

| Exact command | Outcome |
| --- | --- |
| `npx tsx --test packages/core/test/foundation-audit.test.ts packages/layout/test/foundation-audit.test.ts` | **15/15 pass**, including constrained subprocess and deterministic descriptor/copy probes |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome + ESLint 400/49/depth-3 |
| `npm run typecheck` | Pass: all workspace builds + root declarations/type check |
| `npm test` | **201/201 pass** (186 retained + 15 new); numeric, resource, schema, PDF and CMR regressions retained |
| `npm run test:consumer` | Pass: six clean tarball closures, NodeNext/Bundler/`types: []`, ownership and runtime parity |
| `npm run build:browser` | All 11 builds pass |
| `npm run check:graphs` | Pass after current browser rebuild; native layout remains VDOM-free and optional/parser boundaries hold |
| `npm run sizes` | Pass; current artifacts below, not universal regression thresholds |
| `npm run test:browser` | **6/6 pass**, including all 11 Chromium SVG cases; no tolerance relaxation |
| `npm run build:showcase` | Pass |
| `npm run test:showcase` | **14/14 pass** |
| `npm run check:licenses` | All six actual tarballs pass |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Both original hashes unchanged |
| `qpdf --check artifacts/cmr.pdf` and `qpdf --check artifacts/cmr-unicode.pdf` | Pass |
| `node /tmp/opencode/updf-foundation-preservation.mjs` | No missing baseline paths; **126 protected paths unchanged** |
| `git diff --check`, `git diff --cached --quiet` | Pass; no staged changes |

Intermediate remediation checks caught a 52-line helper and fixture typing/import
errors; the helper was decomposed and fixture imports/narrowing corrected. No rule
was disabled. All 15 adversarial regressions passed on their first executable run;
all current full gates passed. Earlier legacy/audit baseline evidence is retained,
not reported as newly rerun in this round: 18 pass / 1 pending / 6 fail legacy,
0 production / 45 full-audit vulnerabilities. None was silently waived or fixed.

Current raw/gzip bytes: core 49,608/15,055; VDOM 59,135/16,902;
measurement 25,321/7,830; flow 54,665/15,877; tables 64,543/18,475;
SVG 40,740/12,462; optional Fontkit 492,601/169,756.

Current complete delivery relative to the original 427-path hashed baseline:
**355 unchanged, 72 intentionally changed, 16 new actual paths**, none missing.
The original 70 changed-path list gains `packages/layout/src/vdom.ts` and
`packages/layout/src/tables/vdom.ts`; the original 12 new-path list gains the four
remediation paths above. Full Git scope is **59 tracked unstaged modifications /
100 untracked files**, zero staged and zero committed delivery. The original
baseline JSON and all protected evidence/roadmap/legacy/font/Pages paths remain
byte-identical. Check commands: `git status --short`, `git diff`,
`git diff --cached --quiet`, `git ls-files --others --exclude-standard`,
`git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`,
and the preservation script.

Code-principles checklist rechecked: all production files cohesive and <=400 lines,
functions <=49 lines, nesting <=3; comments are intent/invariant focused; 15 tests
are proportional to the confirmed runtime/allocation/false-cycle/accounting risk;
format/lint/typecheck and all affected gates pass. **Approved exceptions: none.**
No new lint suppression, dependencies or Changesets convention were introduced.

Auditor should independently rerun the five failure scenarios and their new
regressions, verify cursor bookkeeping before rejection and actual effective-data
comparison boundaries, deep adapter byte parity and exact emitted-node budgets.
Then review the complete current unstaged/untracked delivery. **No C before re-audit.**

## Remaining F3: ordered enumerable keys — bounded follow-up

Caller-provided independent audit evidence confirms F1/F2/F4/F5 passed, including
the constrained million-sibling probe, depth-3,000 byte parity and phantom-node
checks. It found one remaining F3 false cycle: `Object.keys` exposes insertion
order, but the comparator treated `{a: 1, b: 2}` and `{b: 2, a: 1}` as identical.
This correction is **implemented and ready for independent re-audit, not verified**.
No C, public API additions, delegation or Git/tracker delivery mutations.

`sameData` now compares the complete ordered enumerable-key sequence before
reading/comparing values. Existing prototype/array/scalar and opaque handle
identity distinctions remain intact. Four new regressions cover props and provider
key-order changes: each finite drawing/text branch completes in exactly two calls.
Same-order/same-value recreated props and providers still fail `VDOM_CYCLE` before
a second invocation, in both drawing and text. This is not a broader guarantee of
arbitrary executable component termination.

Exact follow-up delta (four existing files; no new paths):

```text
packages/core/src/vdom/equality.ts
packages/core/test/foundation-audit.test.ts
docs/architecture/composable-layout.md
docs/evidence/architecture-foundation.md
```

| Exact command | Current follow-up outcome |
| --- | --- |
| `npx biome check --write --diagnostic-level=error packages/core/src/vdom/equality.ts packages/core/test/foundation-audit.test.ts` | Pass; test formatting applied |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome and ESLint 400/49/depth-3 |
| `npm run typecheck` | Pass: workspace builds and root types |
| `npx tsx --test packages/core/test/foundation-audit.test.ts packages/layout/test/foundation-audit.test.ts` | **19/19 pass**; all five finding regressions retained |
| `npx tsx --test packages/core/test/*.test.ts` | **78/78 core tests pass** |
| `npm run test:consumer` | Six clean packed closures pass, including NodeNext/Bundler/`types: []` and ownership/runtime checks |
| `git diff --check`, `git diff --cached --quiet` | Pass; no staged delivery |
| `node /tmp/opencode/updf-foundation-preservation.mjs` | No missing paths; all 126 protected paths unchanged; dirty scope remains 59/100 |

Before the production edit, the following command reproduced both finite-test
failures with `VDOM_CYCLE` (props initially exercised nested record order; the final
props regression uses the caller's exact top-level `{a, b}` -> `{b, a}` scenario):

```sh
npx tsx --test --test-name-pattern="ordered enumerable props|ordered provider keys" packages/core/test/foundation-audit.test.ts
```

The prior `npm test` 201/201, 14 site tests and browser/graph evidence above remain
historical evidence for the preceding remediation scope, not newly rerun follow-up
gates. Unchanged SVG/browser/site checks were deliberately not repeated for this
bounded comparator change. Caller reports the known independent Chromium SVG
intermittency: an initial all-black failure followed by a passing rerun. That failed
attempt is not erased or recast as a first-attempt pass, and no tolerance was relaxed.

Risk-based additions: four tests, each exercising drawing and text. Code-principles
checklist remains satisfied: cohesive small comparator, functions <=49 lines,
nesting <=3, no unsafe/public trust shortcut, intent-focused comments, relevant
format/lint/typecheck/core/consumer gates pass. **Approved exceptions: none.**
No new lint suppressions or dependencies. Full dirty scope remains 59 tracked
unstaged modifications / 100 untracked files, no staged or committed delivery;
cwd/branch/base/HEAD are unchanged. Auditor should rerun the two finite order-change
scenarios and their unchanged-order negative controls before declaring B verified.
**No C until re-audit.**
