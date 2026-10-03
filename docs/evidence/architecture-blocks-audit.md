# C-F1–C-F5 remediation — same C assignment

Status: **implemented, independent re-audit pending; not verified**. All five
findings were independently reported as changes_requested by the caller. No D–G,
delegation, tracker mutation, staging, commits, pushes, PRs, merges, Pages activation
or deployment. Integration owner is this Engineer; no scope/CI waivers were approved.

- cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`
- branch: `feature/measured-flow-tables`
- base = HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`
- Audited entry: **60 tracked modifications / 137 untracked files**, no staged or
  committed delivery. This includes inherited A/B and older #26–#28 dirt.
- New pre-edit snapshot: `architecture-blocks-audit-baseline.json`, **480 actual
  paths**, bytes/SHA-256 and actual entry status. The old C entry/progress/delta,
  original A/B baseline and foundation evidence are not rewritten.
- Remediation-specific current hashes: `architecture-blocks-audit-delta.json`.
  The generated delta excludes itself from its hashed file list.

## Findings, fixes and public-path proof

| Finding | Focused implementation | Regression evidence |
| --- | --- | --- |
| C-F1 HIGH: opaque background painted over child ink | Background is moved beneath content; border remains above/outside its clip. Emitted-node/command totals still match actual layers. | Actual qpdf/Poppler PDFs: public red 20×10 child over yellow 100×10 box now has **200 red / 800 yellow** pixels, rather than 0/1000. Fragmented variants have **600/200 red** on their two pages. Hidden variant has **80 red** plus visible yellow and green border. |
| C-F2 HIGH: isolated child probes postponed aggregate failure until painting | Private candidate forks accumulate siblings, known drawing outputs, static slots and ancestor wrappers before output validation/copy. Ancestor reservations are iterative, prefix-aware and tied to candidate state, so zero-height siblings cannot release prior reservations or add phantom wrappers. Discarded/deferred forks are not adopted; selected painting commits each native output once. | Two distinct child descriptors with nodes:20 fail **LIMIT before accessor index 2 is inspected**; getter never runs. Repeated-descriptor test stops at cumulative exhaustion (<=50 callbacks, not all 100), with one semantic measurement. Exact 18-node wrapper fit passes / 17 fails. Footer retries, zero-height nested siblings and space rollback pass. |
| C-F3 MED: indivisible gap and fixed fresh-sized minHeight chunks | Gap/blank producers consume actual available height. Private copy-on-write candidate state carries exact dyadic remaining height; safe-integer progress ordinals finish by jumping to the extent, not by exposing fractional offsets. Extent bounds include fresh-region count and finite binary64 remainder decomposition, not a pixel/point work cap. | Gap50 between spacers10 on page40 uses **[40,30]**, two pages. Preceding spacer10 + minHeight70 uses **[10,30,40]** and passes pages:2. Subpoint partial space and footer trial rollback preserve exact consumption. |
| C-F4 MED: cached producer retained first occurrence path | Compiler caches semantic paragraph/extension measurements only, not occurrence producers or mutable continuation state. Each occurrence gets a new source-bound producer. Cached adapter contexts temporarily use the current invocation origin during callback execution, restored in finally. | Reused descriptor fails at **/body/1**, reused nested block at **/body/1/children/0**, both with exactly one measurement. Measurement invoked by the cached second fragment reports its current font-resource origin. |
| C-F5 MED: ordinary callback throws escaped structured diagnostics | One private validate/measure/fragment invocation boundary emits stable TYPE + stage/current origin for arbitrary throws. It preserves existing DocumentError identity/diagnostics/span and never reads arbitrary error message/toString/getters. Operation/context cleanup remains finally-owned. | Error, TypeError, string and numeric throws across all three stages are structured. A malicious message getter has **zero reads**. Existing VALUE diagnostic and span survive unchanged; fragment and measure failures close retained contexts. |

Tests use `layoutFlow`/public constructors and installed public adapters, not just
private helper probes. New source files are cohesive private helpers for callback
invocation, semantic caching, quota totals, ancestor reservation and continuation
state. No public protocol fields/type cases were added to the paginator. Public
offsets/extents remain safe-integer progress contracts; public callback requests
do not expose provisional ledgers, continuation maps or font bytes.

The same captured operation policy/resources apply. Source/semantic measurement
accounting remains independent of generated accounting. A provisional ledger is
not an execution sandbox: arbitrary trusted callbacks/hostile Proxy code can still
consume CPU/memory. The numeric certificate, binary64 arithmetic helpers, core
glyph/wrapping math and native primitive dispatch were not changed or weakened.

## Reproduction and gates

Before production edits this command reproduced **eight failures / two passes**:

```sh
npx tsx --test packages/layout/test/c-audit.test.ts tests/integration/block-background.test.ts
```

It reproduced all five findings, including TYPE at the accessor, all 100 callbacks,
gap oversize, page-limit failure, wrong cached source origin, raw thrown Error and
actual background-hidden red ink. Final additions cover rollback/current-context/
zero-height/subpoint invariants too: **15 new tests**, native total **251 → 266**.

All final commands ran at the exact worktree/revision above, Node v24.21.0. Production
source was complete before the successful broad gate chain. Only docs/status and
remediation manifests were edited afterward.

| Exact command | Final outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome and production 400/49/depth-3 rules |
| `npm run typecheck` | Pass: workspace builds and root declarations |
| `npm test` | **266/266 pass**, all original 251 and older A/B/numerical/table/spatial/CMR regressions retained |
| `npm run test:consumer` | Six clean closures pass, NodeNext/Bundler/`types: []`, actual public adapter/container/plan execution |
| `npm run build:browser` | All 11 builds pass |
| `npm run check:graphs` | Pass after the final rebuild; native/layout root boundaries retained |
| `npm run sizes` | Pass; actual sizes below, not regression-budget completion |
| `npm run test:browser` | **7/7 pass**, including chart/container parity and all 11 strict SVG raster cases |
| `npm run build:showcase` | Pass |
| `npm run test:showcase` | **17/17 pass**, visible chart controls, cancellation/cleanup and optional graph boundaries |
| `npm run check:licenses` | All six actual tarballs retain full MIT Surikat AB 2026 / notices, no font assets |
| `npm run test:legacy:comparison` | Equivalent only; raw exit 1, **18 pass / 1 pending / 6 fail** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` | Preserved exit 1: **45 vulnerabilities**, 8 moderate / 10 high / 27 critical |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Both original hashes unchanged, below |
| `qpdf --check artifacts/cmr.pdf` and `qpdf --check artifacts/cmr-unicode.pdf` | Pass |
| `node /tmp/opencode/updf-foundation-preservation.mjs` | Pass: original 126 protected paths unchanged, none missing |
| `node /tmp/opencode/updf-c-audit-delta.mjs` | Pass: 465 audited-entry paths unchanged / 15 intentional changes / 10 new paths including the unhashed manifest; all 480 entry paths present; 131 historical/protected paths and numerical/wrapping helpers unchanged |
| `git diff --check`, `git diff --cached --quiet` | Pass; no staged changes |

CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
Unicode CMR: `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`.
Current raw/gzip: core 49,608/15,055; VDOM 59,256/16,927;
measurement 25,321/7,830; flow 82,234/23,365; tables 89,939/25,496;
SVG 40,740/12,462; optional Fontkit 492,601/169,756.

Intermediate executable attempts exposed an exact-optional-property annotation,
implicit internal continuation parameters and a >49-line preparation helper;
types/helpers were corrected/extracted, without waivers. The first broad chain
stopped at a negative fixture whose always-throwing validator inferred never;
its generic now explicitly models unknown props. The subsequent complete broad
chain passes on unchanged production source. The previous source's five confirmed
failures are not erased by gate totals; independent re-audit is still required.
No SVG black-frame failure occurred in this browser run; assertions were not weakened.

## Principles, delivery and next owner

- [x] Correctness self-checked with public production and real PDF spatial paths.
- [x] Defaults followed; **approved exceptions: none**; no new lint suppression,
  tolerance relaxation, parser policy rewrite, dependency or hidden workload cap.
- [x] Production files cohesive <=400 lines; functions <=49 and nesting <=3.
- [x] Comments explain ownership/rollback/representation invariants.
- [x] Risk-based tests proportional to the confirmed failures; all relevant gates pass.

No Changesets convention exists; none was added. Legacy/full-audit failures are
explicit inherited limitations, not new approved CI waivers. D–G remain deferred.
Status is local **implemented for re-audit**, not verified; no tracker changed.

Final complete Git scope: **60 tracked unstaged modifications / 147 untracked
files**, zero staged, no committed delivery. Relative to the audited 60/137 entry,
there are 15 changed existing files and 10 new files (the delta hashes nine new
paths, excluding itself). Historical C baseline/progress/delta and all older
protected evidence are unchanged. Only the mutable C status/contract docs were
superseded; the earlier evidence bodies remain intact.

Audit the current files against `architecture-blocks-audit-baseline.json` and
`architecture-blocks-audit-delta.json`, not against HEAD alone. Check actual cwd,
`git branch --show-current`, `git rev-parse HEAD`, `git status --short`, `git diff`,
`git diff --cached --quiet`, `git ls-files --others --exclude-standard`, and
`node /tmp/opencode/updf-c-audit-delta.mjs`. The historical C delta remains byte-identical;
all original protected paths and all audited-entry paths must remain present.

Auditor should independently rerun C-F1–C-F5/public regressions, challenge cumulative
candidate accounting and rollback/zero-height wrappers, inspect exact dyadic space
progress under partial regions and footer retries, verify current-origin caches and
safe thrown-value handling, and review actual background/clip/border PDFs plus the
complete existing dirty delivery. **No D before successful C re-audit.**
