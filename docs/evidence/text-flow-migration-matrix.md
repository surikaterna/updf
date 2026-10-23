# Text-flow migration matrix — proposed work, not runtime evidence

**Plan only; all S milestones below are unimplemented future assignments.**
Issue: N/A. S0–S11 are planning labels, not tracker IDs. No issue creation, tracker
transition, staging, commit, push, PR, delegation, build or publish is authorized.
The [proposed authoring contract](../architecture/text-flow-authoring.md) is the
design companion; existing evidence is preserved, not rewritten or re-certified.

## Exact planning state and protected ownership

- Cwd/worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/HEAD:
  `882d6d38f432edcac97e962fbf446062c1483c3d` (committed PR baseline).
- Pre-feature reference: `244c0932c733accace68b7d8fb85cdc8f851d4e8` (`develop`).
- Entry: 40 tracked unstaged + 100 untracked inherited Architect paths; no staged
  changes. All 140 paths remain owned by prior work, not this docs delivery.
- This assignment owns only new `docs/architecture/text-flow-authoring.md`, new
  `docs/evidence/text-flow-migration-matrix.md`, and one discoverability link in
  `docs/agents/README.md`. No better architecture index was found in the bounded
  directory read; `packages.md` is an ownership document, not a plan index.
- Preserve live Vite preview PID `665048`, `100.74.77.69:5182/updf/`, app sources,
  generated outputs and `apps/showcase/dist`. No preview rebuild or server change.
  Entry dist aggregate: 80 files,
  `5dfd248ad67ec33fbee543d6e0b01b31d0e8c7e51d1d44382b631ef526d3dd9f`
  (sorted recursive path+content SHA-256). This is a preservation fingerprint,
  not a runtime baseline manifest or HTTP health certification.
- Entry aggregate of tracked/nonignored files excluding the three owned paths:
  `3949aec1c26d60f82a88c6d768694f8950d8a1fec90f62eeb7e97ac5e1f84286`
  (`git ls-files -co --exclude-standard -z`, sorted, per-file SHA-256 then SHA-256).

S0 must create a fresh full manifest **before runtime edits**, including every
inherited path, generated output and preview fingerprint. This docs fingerprint
is not a substitute. Separate all three references: pre-feature library, committed
HEAD and dirty delivered runtime. Preserve existing artifact trees; write new
evidence only to separately named approved locations. No commits are assumed;
future baseline freezing/commits require explicit authorization where applicable.

## Dependency and execution policy

Required early release-blocker ordering: **S0 → S4 → S2 → S3**, with **S1 after
S0 and before S2**. S1 is independent of S4 and may proceed early after S0's
independent audit approval, subject to the ownership policy below. S4's rectangle
safety fix must receive independent audit approval before S2 canonical authoring
starts; this is a start gate, not merely a suggested order or a final-release gate.
S3's Source.url descriptor must likewise receive independent audit approval before
S5 URL Image work starts. Do not parallelize shared files by default.

```text
S0 -> S4, S1
S1 + S4 -> S2 -> S3
S2 -> S5 -> S6, S7
S3 -> S5
S3 -> S8 -> S9
S4 + S9 -> S10
S3 + S5 + S6 + S7 + S10 -> S11
```

Parent is integration owner. Each row is a **fresh bounded Engineer assignment,
then independent Auditor**; it is not one epic handed to one Engineer. Every edge
is a mandatory start condition: all immediate predecessors must have explicit
independent Auditor approval of their required acceptance before the successor
starts. Engineer completion or parent correction/acceptance is not that approval
and does not authorize engineering. S0 has no predecessor but still requires a
fresh authorized assignment. In particular, S2 requires approved S1 and S4; S5
requires approved S2 and S3 (the direct S2 edge is intentionally redundant).
All milestones also require fresh parent authorization; this plan starts none.
Shared files are sequential. At most two independent assignments may run only after
explicit disjoint ownership and integration validation are justified. A row whose
proof reveals material scope growth stops for a new bounded assignment/decision.

## Milestones

| Label / bounded owner and likely source targets | Required acceptance | Safe stop / exclusions |
| --- | --- | --- |
| **S0 — baseline/evidence owner**. Existing `scripts/text-flow-costs.ts`, cost inputs and `artifacts/text-flow/` manifest conventions; app outputs read-only. | Freeze exact 140-path inherited scope and all generated outputs before runtime edits; record revision, lock/tool versions, ownership and three reference semantics. Preserve preview source/dist/URL fingerprints. Establish reproducible cost/profile inventory and approved output locations. | Stop at immutable manifests and reproducible evidence inputs. No implementation, commit, artifact replacement or preview rebuild implied. |
| **S1 — package-entry owner**. `packages/text-flow/{package.json,src/index.ts}`, `packages/text/package.json`, explicit new leaf entries; graph/packed-consumer checks. | Separate temporary old atomic entry from minimal root; no eager geometry/parser/font/extractor edges in root, rect or non-user graphs. Measure emitted browser ESM, Node facade and CJS load/retained closures even without tree-shaking; validate declarations/owned identity. Audit sideEffects metadata for truth, not blanket false. | Stop with graph isolation and disclosed CJS limitations. Temporary migration path is not a permanent alias. A genuine Node ESM packaging change needs explicit narrow closure authorization, not workspace-wide packaging rewrite. |
| **S2 — text/layout integration owner**. `text/src/{service,composition,composition-operation}.ts`, core text-service capture, layout options/extensions/participation and addon wrapper. | One central document/operation installation; reconcile existing Flow.extensions adapters at the same options boundary. Typed `floatable(Block)` preserves props without another box/painter; missing extension errors. Prove reuse of configured plain text service, resolved Span font and operation resource bindings via narrow optional capability around existing resolver. Custom service without it errors; nested operations/failed cleanup/foreign and closed handles reject. Remove migrated public per-Flow authoring; no second runtime/defaultFont or identity lookup. | Stop at one coherent minimal rectangular authoring API and contract proof. No async resources or new geometry. If optional service transport cannot preserve core capture/ownership, return for decision, not fallback. |
| **S3 — descriptor/Path owner**. Addon sources/path facades and migrated fixtures, `path.ts`, `path-band.ts`; existing geometry normalization. | Immutable Source.url/polygon/path metadata; rule outside d; Path paint/default exclusion share one owner; independently authored override allowed. Omission-only nonzero; null/undefined reject. Explicit descriptors replace ambiguous raw shapeOutside strings; bounded optional string grammar rejects path(evenodd,...). Direct high-level Path and typed wrapper preserve diagnostics and existing visual ownership. | Stop with canonical manual geometry authoring and migrated fixtures, no compatibility aliases. Proposed subpaths need real exports/declarations tests, not documentation assertions. |
| **S4 — rectangle safety owner, early release blocker**. `text-flow/src/{sibling-selection,path-selection}.ts`, existing inline-band/continuation owner and focused tests. | Reuse existing path whole-band/all-remaining-source clearance to eliminate omitted/rect negative-leading overlap, including later larger-overhang Paragraphs. Preserve source progress, charged retries, exact certificates, actual clearance height, full visual reservation and intact page deferral; prove no page leakage. Exact-color overlap reproduction must fail old selector and pass fixed. | Stop at audited rectangle safety; do not duplicate band/source contracts or expand authoring. Strict preservation of the unsafe legacy result is not an excuse to defer the fix. |
| **S5 — resource preparation owner**. New optional image feature; existing assets/PNG/JPEG owners, host loader and layout box placement seams. | Async preparation before layout; Image.src accepts URL string, Source.url or owned prepared resource; sync prepared path preserved. Bounded explicit transport, unsafe URI/cancellation/format/max-pixel policy, op-local in-flight dedup, actual resource ownership and cleanup. Prove shared resolved-box/aspect-fit transform for visual and contour; reuse optional browser 16-bit normalization generically. | Stop at URL/prepared image parity. No cross-render cache or alpha extraction. Missing shared placement contract stops for decision rather than copied fit arithmetic; no new renderer or hidden layout fetch. |
| **S6 — optional cache policy owner**. Separate app-owned cache module and image preparation integration tests. | Bounded bytes/entries, versioned exact resource+policy+threshold identity, ownership/storage/eviction/dispose documented. Concurrent same-resource dedup; subscriber refcounts prevent one abort cancelling others; failures do not poison cache. Cold/warm fetch/decode and retained memory measured. | Stop at optional reusable policy, no permanent global state or unbounded URL map. Ordinary and no-cache graphs remain isolated. |
| **S7 — opt-in PNG contour owner**. `png/src/{decode,index,options}.ts` narrow hook and separately imported extraction module. | Decode once; opt-in callback after alpha reconstruction before compression; no unconditional raw-alpha/public retention. Bounded immutable geometry and versioned extraction identity; threshold/bounds/cancellation/cleanup tested. Existing default PNG path/cost semantics preserved and measured. | Stop at image-independent geometry result. No layout import, JPEG segmentation, duplicated decoder or image-specific contour contract. |
| **S8 — pure compound geometry owner**. Optional `/intervals` and straight path handler; existing `path-band.ts` arithmetic reuse. | Closed M/L/Z compound fill with nonzero/evenodd holes and disconnected regions. Sorted disjoint free intervals conservatively safe across entire rich band; independent rational oracle, winding/tangency/extreme-scale tests and cumulative edge/query/output budgets. Existing parser limits reused; new limits justified from domain evidence. | Stop at pure interval queries; no text changes or painter. No curves, positive shapeMargin, arbitrary quota invention or baseline-only sampling. |
| **S9 — text selection owner**. Existing `text/src/inline-selection*.ts`, line/source owners and layout `content-paragraph-output.ts`. | One cursor consumes multiple intervals on one baseline in source order. Preserve spans, visuals, whitespace/newline/long-word semantics and source reports; backgrounds do not bridge holes. Whole selected graph prepared before painting, native certificates/admission and operation quotas retained. | Stop at generic multisegment text with oracle/native tests; no second normalizer/line writer or sibling scope expansion. |
| **S10 — sibling context integration owner**. Addon sibling source/selection, layout participation and Flow/Flow.Body normalization. | Dedicated explicit contract for center and sequential contexts plus Flow.Body symmetry. One active float; next marker begins only after clearance; nonparagraph/kept/PageBreak barriers. Entire visual plus initial side text/clearance admitted atomically, normal tail thereafter; no later-page exclusion state. Center is a non-CSS addon feature. | Stop at audited bounded sequential behavior. Current one-direct-marker scope is not evidence of this contract. No concurrent/nested floats. |
| **S11 — canonical integration/cutover owner**. Public addon exports, consumers, docs/examples and showcase only under explicit preview-output authorization. | Remove atomicTextFlow/public paired factories, old participation and convenience authoring after fixtures migrate; retain useful generic internal owners. Examples use normal fonts and one central install, no Eevee loader. Real source/PNG extraction proof: donut holes and bird text on both sides on same baseline, not fake columns. All closure, packaging, runtime and native gates pass. | Stop at independently audited canonical source delivery. Preserve existing live preview until audited build and user-authorized publication/output replacement. No Git/delivery authorization implied. |

## Packaging and measurable cost contract

The [packaging builder](../../scripts/packaging/build.ts) emits Node `.mjs`
facades importing CJS implementations. Browser ESM dead-code elimination does not
prove Node load isolation; unused CJS named exports cannot all be promised
removable. Explicit leaf entries must isolate capabilities without tree-shaking
in every format. If genuine Node ESM is required, avoid a dual-package hazard that
duplicates owned-resource/handle identity; bound any packaging follow-up to the
necessary package closure and obtain authorization first.

Translate “all tree-shakable” into full static ESM module graphs plus explicit CJS
leaf isolation, with this limitation disclosed. Root must not eagerly retain the
old atomic facade or geometry. Optional syntax parsing cannot become core code.
Non-user feature-module presence in either **loaded or retained** graphs is a
**hard failure**. Generic shared-seam byte deltas require measured explicit approval;
no arbitrary percentage quotas, blanket zero-byte promise or unmeasured micro-cost.

Use ten named profiles; keep each profile's output formats separate:

1. Ordinary drawing/core, no text-flow.
2. Ordinary text/layout, no text-flow.
3. Composition-only (temporary migration comparison).
4. Rectangular flow.
5. Prepared image flow.
6. Straight Path flow.
7. Optional CSS-inspired syntax.
8. Compound/multi-interval flow.
9. URL loading with optional shared cache (cold/warm recorded separately).
10. PNG alpha extraction flow.

For each supported profile/format record absolute before/after and deltas, raw,
minified and gzip bytes; retain module graphs and source/lock hashes. Compare
fresh dirty-runtime before/after for isolated slice cost, committed HEAD for
inherited delivery cost, and pre-feature library for total historical cost.
Unavailable combinations are N/A, never manufactured zero deltas. Record precise
profile/format/group names and metric row counts; do not mix old reports with new
profile sets or call a changed-lock comparison same-lock.

Inventory **all affected packages**: emitted browser/Node CJS/facades,
declarations, tarball packed and unpacked payload, and exact dependency graph.
Payload size is not installed dependency closure. Pair runtime cold/warm latency,
fetch/decode counts and memory/cache bounds using identical fonts, assets,
environment and repetitions; disclose noisy timing rather than claim speed from
bundle bytes. No promise that every profile is present in current scripts: S0
freezes current inputs and identifies the bounded additions needed per milestone.

## Runtime gates required later, not executed for this docs task

The actual root [package.json](../../package.json) is authoritative. Each runtime
assignment runs relevant focused tests plus:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npm run test:browser
```

`npm run typecheck` already runs `npm run build` before `tsc --noEmit`; it writes
package outputs. Affected standalone package builds also need coverage where not
already exercised. Showcase scope adds `npm run test:showcase` and
`npm run build:showcase` only in isolated approved output/worktree or after parent
authorization to replace preview outputs. Browser builds/checks also write
artifacts: preserve approved baseline/preview owners before execution.
Existing failures are not passes or CI waivers.

Native evidence must include qpdf validity, full-stream text extraction, exact
source/provenance progress, raster nonintersection (negative leading and holes),
Node/browser parity, native admission/preparation/lifecycle/foreign-handle tests,
resource cancellation/ownership, path diagnostics and cumulative failed-work
budgets. Preserve exact certificates. Add boundary/regression tests proportional
to each changed contract and independent geometry oracles, not screenshots alone.

## Docs delivery self-check and audit handoff

This slice validates local inline file links for these three owned Markdown files,
balanced code fences and scoped `git diff --check`; it does not claim runtime
coverage. Biome excludes docs; Markdown format/lint are N/A, not a passing runtime
gate. The existing `scripts/check-current-docs.ts` writes
`artifacts/jpeg-resources/current-docs.json` and skips evidence, so do **not** run
it for this protected docs scope; use a read-only scoped equivalent.

Universal checklist: cohesive documentation only; no production functions/files
changed; source size/nesting rules therefore N/A; comments/code sketches explain
contracts and are explicitly proposed; risk-based runtime tests are specified
above, not added because no runtime changed. No approved principle exceptions.
No Changeset: docs-only and no Changesets workflow introduced.

Docs checks completed in the worktree above: read-only Node inline-link/fence
validation passed for all three owned files; `git diff --check --
docs/agents/README.md` and `git diff --no-index --check -- /dev/null` for each new
document passed. The inherited-file aggregate and 80-file showcase dist aggregate
match the entry fingerprints above; PID 665048 remains the same preview command,
HEAD is unchanged and staging is empty. Final scope is 143 dirty paths: the 140
preserved inherited paths plus one unstaged link edit and two untracked docs.
No format/lint/typecheck/test/build/runtime project commands were run. Link checks
do not validate anchors or external URLs; preservation is not HTTP health proof.

Status: plan persisted for independent **docs** audit; runtime milestones remain
unimplemented. Auditor should check source-grounding, proposed/current separation,
parent corrections, S2 proof gate, early rectangle release blocker, dependency
ordering, exact ownership/preview preservation and scoped validation evidence.
Parent chooses the next fresh assignment; this document neither starts S0 nor
reopens implementation automatically.

## S1 implementation checkpoint (subsequent bounded assignment)

S1 only: **implemented, pending independent audit; not verified**, based on clean
`630e5d4f0b69921e8f85652fc2e0a78dd17548c1`. See
[entry-isolation evidence](text-flow-entry-isolation.md) for the actual temporary
root/path/atomic and text-selection contracts, 238-metric paired inventory, unshaken
CJS isolation, runtime/native parity, quality gates and preserved 80-file preview.
This additive checkpoint does not rewrite the original docs audit, upgrade prior
milestone audit metadata, authorize delivery or begin S2. The parent must obtain
independent S1 approval before assigning its successors.
