# Layout kernel — Slice C fragmentation, authored PDF paragraphs and ASCII regions

## Delivery identity

- Objective: actual host-neutral fragment selector/region flow, actual production
  authored-paragraph consumer, and a headless one/two-region ASCII consumer.
- Issue: **N/A**; **#25** is the approved budget-policy follow-up, not this delivery's
  fabricated tracker ID. No tracker mutation performed.
- Worktree: `/home/sprawl/projects/updf/trees/layout-kernel`.
- Branch: `feature/layout-kernel`.
- Clean assigned base and unchanged HEAD:
  `cb719c2e709f0d2ee2dc79773fb093c9ce17650a`.
- Engineer owns the original delivery below; the remediation assignment received
  and preserved its 15 tracked modifications and 19 untracked files. Everything is
  unstaged/uncommitted; nothing staged, committed, pushed or delivered. No nested
  delegation, other-worktree/tailnet mutation or Formbar edit.
- Status: **implemented**, ready for independent audit, not verified. No publish,
  deployment, tracker or Git-delivery authorization inferred.

## Changed-file manifest

Tracked modifications:

```text
packages/layout-kernel/README.md
packages/layout-kernel/package.json
packages/layout-kernel/test/graph.test.ts
packages/layout/src/blocks.ts
packages/layout/src/content-measure.ts
packages/layout/src/content-paragraph.ts
packages/layout/src/content-producer.ts
packages/layout/src/extension-producer.ts
packages/layout/src/inline-adapters.ts
packages/layout/src/layout.ts
packages/layout/src/mixed-layout.ts
packages/layout/test/inline-background.test.ts
scripts/boundaries.ts
scripts/box-profile.ts
scripts/consumer/kernel.ts
```

New, untracked delivery files:

```text
docs/evidence/layout-kernel-c.md
packages/layout-kernel/src/fragment-regions.ts
packages/layout-kernel/src/fragment-select.ts
packages/layout-kernel/src/fragment-source.ts
packages/layout-kernel/src/fragment-types.ts
packages/layout-kernel/src/fragment-work.ts
packages/layout-kernel/src/fragmentation.ts
packages/layout-kernel/test/fragment-proof.test.ts
packages/layout-kernel/test/fragment-lifecycle.test.ts
packages/layout-kernel/test/fragment-release-child.ts
packages/layout-kernel/test/fragment-release.test.ts
packages/layout-kernel/test/fragmentation.test.ts
packages/layout/src/paragraph-emission.ts
packages/layout/src/paragraph-fragments.ts
packages/layout/test/paragraph-fragments.test.ts
scripts/consumer/kernel-fragmentation.ts
scripts/fragment-profile.ts
scripts/tui-layout-proof/fragment-cli.ts
scripts/tui-layout-proof/fragment-provider.ts
scripts/tui-layout-proof/fragment-regions.ts
tests/consumer/types/kernel-fragmentation-template.ts
tests/integration/kernel-paragraph.test.ts
```

Generated build, PDF/raster, pack and profile artifacts are ignored, not source
delivery files. This private pre-release workspace does not use Changesets.

## Kernel contract and scope

The distinct public `@updf/layout-kernel/fragmentation` entry exports
`createFragmentOperation` and its readonly types/defaults. Root and boxes have no
fragmentation reexport or import. One operation owns the prepared-source selector
and explicit-region wrapper; both call the **same** `selectRange` loop.

Source records snapshot own data `id/path/descriptor/extent/mode/width` metadata.
Extent is a nonnegative safe integer; fixed widths compare **values**, not object
identity. Flat column views expose count/indexed `at`. Count is checked against
remaining source-read capacity before any entry access; visited sources are lazily
cached, rather than copying the whole host tree. IDs/descriptors are unique and
immutable; duplicate indexed identities reject. Trusted view code and opaque host
descriptor/content references are not cloned, frozen or sandboxed.

The provider measures exactly one indivisible legal unit, with offset/extent/width
and **no height capacity**. End must strictly progress within extent, and atomic
units must consume their whole extent. Finite nonnegative zero heights are legal
only with progress. Empty extent skips providers. `MetricSum`, `sum` and `exceeds`
remain the fitting authority. The selector accepts a maximal prefix and charges
the first rejected unit. Accepted ranges/unit references are frozen.

Frozen opaque cursors authenticate through operation-local WeakMaps, not token
properties. Each region attempt consumes the old token once, even when blocked;
it returns a new token with `done`, `region-full` or `blocked` and frozen placements.
Foreign/forged/replayed/closed tokens fail before providers. Errors poison the
operation; close invalidates all cursors. Arbitrary callback/proxy exceptions retain
identity. No placement history is retained. Start/select/fragment attempts share
one explicit attempt budget, so repeated blocked continuations cannot reset it.

All accepted region placement uses B's unchanged internal `placeResolved` for a
zero-gap, start-aligned column. Used origin is added with existing metric arithmetic.
Region dimensions are finite/nonnegative and used height cannot exceed height.
There is no kernel-owned page creation, fresh oversize policy, nested fragmentable
tree, gap/alignment feature, CSS, generic renderer, production viewer or Slice D.

## Work policy and production integration

Each operation has one monotonic ledger: attempts, sourceVisits, sourceReads,
measurements, unitsExamined, outputFragments and providerUnits. Defaults are documented
in the package README (10,000 attempts; 100,000 each source/measurement/unit/output
category; 1,000,000 provider units). Charges precede corresponding access/callback/
output allocations. Snapshots are frozen. `work.consume(n)` accepts safe-integer
nonnegative counts only during its callback; retained handles expire on return,
including exceptional return. Failure never rolls back already-performed work.
Output-fragment counts mean accepted unit refs plus region placements, not heap
allocations, paint nodes or a derived total-work budget.

**Parent-approved PDF compatibility mapping:** each new category uses
`Number.MAX_SAFE_INTEGER` in one enclosing-operation ledger stored on the existing
compiler/extension lifetime. It is shared across paragraphs and candidate trials,
not forked with output budgets. This matches existing internal-work policy pending
**#25**; it is **not a practical CPU limit or hostile callback sandbox**. Standalone
protective defaults remain unchanged. Existing node/text/path/page caps are separate,
unchanged and candidate-forked.

The actual path is `blocks.prepareLeaf(authorParagraph) -> measureParagraph ->
contentProducer -> selectParagraph -> operation.select -> selectRange`. Splittable
PDF units are measured lines with line-index extent; keepTogether is one atomic
whole-paragraph unit with extent 1. Actual request width is checked against prepared
width. This does not claim rich-text reflow at a new width. Private PDF numeric
continuations remain unchanged; no kernel cursor is forced into nested paginators.
Only recognized kernel input errors map to `DocumentError`.

The old content-producer line-fit while loop is removed, with no old-fit fallback.
Selected prefixes retain ancestor reservations, generated interval certificates,
line-index ranges and the exact sum association. The paginator, page creation,
fresh `LAYOUT_OVERSIZED` behavior, callback/provider contexts and candidate painting
remain unchanged. Lifetimes explicitly close the new operation in success/failure
finally paths.

Speculative `paintLine(end,0,0)` preflight is gone. Native text emission counts are
computed from measured fragments; prepared inline visual snapshots use the existing
output scanner for exact counts, including owned marker exclusions. No scanner copy
or speculative renderer resources are introduced. Accepted preflight applies those
counts; final paint charges actual output and compares counts. Existing background
counts retain their special work accounting, and all backgrounds still precede all
glyphs/visuals. Existing measured fonts/resources remain host-owned.

## ASCII and unchanged Formbar proof

`scripts/tui-layout-proof/fragment-provider.ts` supplies one atomic row unit (whose
whole height is measured by B's `layoutBoxes` row max, not a host height loop) and
splittable printable-ASCII/LF text units with stable character offsets. It scans
only the requested unit plus at most one LF lookahead, charges each character read,
and does not repeatedly scan whole remaining suffixes. Unsupported glyphs reject.
Whitespace and LF remain in exact string pieces. The region proof takes coordinates
only from kernel placements, not a bespoke height-selection/placement loop.

The 29-character fixture has these fresh exact counters:

| Mode | attempts | visits | reads | measurements / examined | output refs + placements | provider units |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| one region, width 8 | 2 | 2 | 2 | 6 / 6 | 8 | 32 |
| two regions, widths 8 then 5 | 3 | 3 | 2 | 8 / 8 | 10 | 34 |

Two-region placement: row `[0,1)` at top 0, height 2; first text `[0,13)` at
top 2, height 2; second text `[13,29)` at top 0, height 4, actual width **5**.
All source characters occur exactly once. Unit work includes discarded/rejected
work and exceeds the three final region placements. Debug CLI emits only bounded
geometry/count summaries, not complete callbacks/production rendering state.

Existing FSX bridge/source aliases, terminal renderer and all four literal live
bodies are unchanged. Read-only Formbar root `/home/sprawl/projects/formbar` stays
clean at `4fc67c225ef9af80dd2345852df3b884e62656eb`. Existing live tests pass 4/4,
covering both states at all 137 widths (**274** projections).

## Cost and compatibility evidence

Fresh neutral ES2022 minified esbuild profiles, gzip at default settings:

| Closure | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| A allocator/numeric | 4,575 | 1,991 |
| B empty box | 14,219 | 5,358 |
| B measured row | 14,392 | 5,419 |
| C fragmentation only | 11,306 | 4,277 |
| B boxes + C fragmentation | 21,879 | 7,772 |
| Core baseline closure | 39,516 | 13,985 |

B/A byte counts are unchanged; `box-profile.ts` additionally asserts no retained
fragment code. C profiles retain positive selector and shared placement bytes,
kernel-only inputs and zero externals. Raw source/metafile artifacts are in
`artifacts/layout-kernel-c/{fragmentation,boxesAndFragmentation}/` and `report.json`.
The whole kernel tarball is now 36,634 compressed / 152,435 unpacked bytes (99 files),
including declarations/maps/README. Tree shaking does not shrink installed tarballs.
No heap, CPU or allocation measurement is claimed by these bundle/counter profiles.

All four supplied historical PDF SHA-256 hashes match:

```text
core    07175eea062e0b7e4ce412840d86ad6d65a51faa6e6a081bc4ee8a0d1056ee6a
CMR     8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22
Row     83c3e00d2ed01e1d26721c315b6ae35a9346da3cd97f6ee89af8f7bc09f60a2e
Freight fb0e28599369c2eccd401bd236fadcb0399de3480385e2e80fde56014381c58c
```

The new three-page authored-paragraph integration independently substitutes the
original producer Git blob from the exact assigned base (not another production
selector) and proves byte equality with current output, data/TSX parity, exact line
ranges, qpdf validation and Poppler line order/raster generation. Existing full
integration gates retain background/inline visual raster oracles and negative PDFs,
mixed-page final callbacks/resources, quota failures and #51 interval controls.

## Exact validation commands and outcomes

The following original implementation checks ran in the worktree/HEAD above against
unstaged and untracked delivery. See the remediation section for fresh checks and
explicitly reused prior evidence; these original counts are not new audit results.

| Command | Final outcome |
| --- | --- |
| `npm run typecheck` | Pass; includes complete workspace build and `tsc --noEmit` |
| `npm run lint` | Pass; Biome plus authoritative code-principles ESLint |
| `npm run format:check` | Pass |
| `npm test` | 673/673 pass, zero skipped/cancelled |
| `npx tsx --test packages/layout-kernel/test/*.test.ts packages/layout/test/*.test.ts` | 330/330 pass |
| `npm run test:consumer` | Eight clean packed closures pass; kernel-only installed, NodeNext/Bundler ES2022 `types:[]`, no DOM/Node/React ambients; fragmentation runtime/ownership proof |
| `npm run check:licenses` | Eight actual tarball licenses pass |
| `npm run build:browser && npm run test:browser && npm run check:graphs` | Pass; browser runner reports **10/10** current top-level tests, not historical 152; graph includes all 12 browser closures |
| `npm run build:showcase && npm run test:showcase` | Build pass; 56/56 pass |
| `npx tsx scripts/layout-kernel-baseline.ts` | All four hashes and core 39,516/13,985 match |
| `npx tsx scripts/fragment-profile.ts && npx tsx scripts/box-profile.ts` | All closures, positive retained-byte controls and B isolation pass |
| `npx tsx scripts/tui-layout-proof/fragment-cli.ts` | One-region exact coverage/count proof passes |
| `npx tsx scripts/tui-layout-proof/fragment-cli.ts --two-regions` | Changed-width exact coverage/count proof passes |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown` | Four literal live bodies unchanged |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs` | 4/4; 274 width/state projections |
| `git diff --check` | Pass |

Earlier failures were resolved, not waived: expected export inventory changed for
the new entry point; narrow internal importer inventory gained the two helpers;
browser build initially raced showcase's deletion/rebuild of `layout/dist` and was
rerun serially; new test fixtures corrected the actual `h` signature, esbuild's
unsupported Unicode-regex flag, and a self-invalidating prototype descriptor.
SVG thresholds were never changed, skipped or blindly retried. No running checks
or asynchronous handles remain at handoff.

## Code-principles self-check and audit handoff

- [x] Correctness validated, explicit strict input/ownership boundaries.
- [x] Defaults followed. **No code-principles exceptions.** The approved PDF cap
  mapping is a compatibility decision, explicitly documented, not a sandbox waiver.
- [x] Cohesive production files at/below 400 lines.
- [x] Functions below 50 lines, nesting at/below three levels; enforced by ESLint.
- [x] New comments explain invariants/intent rather than restating implementation.
- [x] Risk-based tests added for selector quotas/progress, immutable data, hostile
  accessor shapes, callback identity/expiration, tokens, changed widths, repeated
  PDF candidate ledgers, absence of speculative paint, and pre-C PDF byte parity.
- [x] Lint/typecheck/tests/builds pass. No Changeset: private internal workspace,
  no existing Changesets workflow or publish authorization.

Auditor should independently review the entire tracked + untracked manifest,
operation poisoning/cursor consumption, charge-before-access and quota boundaries,
the single fitting authority, actual PDF preflight counts (especially inline markers),
ancestor reservations and #51 certificates, unchanged paginator/oversize behavior,
fixed PDF width versus ASCII reflow, and B/root retained-graph isolation. Budget
redesign in #25 and any audit-requested follow-up are separate assignments; none is
silently implemented here.

## Four-bug audit remediation (2026-10-04)

Objective/issue: fix the four assigned C lifecycle/quota defects; **N/A**, no tracker
mutation. Worktree, branch and base/HEAD remain exactly as above. Remediation edits
are restricted to `fragmentation.ts`, `fragment-select.ts`, `fragment-work.ts`, the
kernel README, this evidence and the three new `fragment-{lifecycle,release,release-child}`
test files. All original production PDF adapter files and other delivery files are
preserved. Final delivery: 15 tracked modifications, 22 untracked files; zero staged
files or new commits. No nested delegation, Formbar/service/other-worktree changes.

Completed acceptance:

1. Provider and indexed-view callback returns have an immediate operation-health
   barrier, before result inspection, further callbacks or output charges. Work
   handles check operation health even for zero consumption. Caught close/quota/
   reentry failures cannot resume selection. Both valid and invalid reentrant
   prepare/start/select/fragment calls explicitly reject and poison, rather than
   recursively laying out. Counts/close remain callable from callbacks. Escaping
   host exceptions retain identity, including a host close followed by a throw.
2. Close **and** poison clear strong ID/descriptor maps, replace source/cursor/view
   WeakMaps (including values behind caller-retained keys), and detach the provider.
   Expired work handles detach their ledger/health lease; the poison link preserves
   the previous expired-handle-misuse behavior, but closed state holds no host
   resources. Frozen counts remain readable; closed tokens reject.
3. Validated measurement data has no accepted-record `start` field. After fitting
   and health checks, quota charges precede construction/freezing of accepted
   `{start,end,height,content}` records. Cap-zero and cap-one freeze controls prove
   zero/one accepted records with the rejected measurement still charged; a failed
   call returns no partial output. Temporary validation allocation is not forbidden.
4. Active fragment attempts charge before cursor authentication, just like prepared
   selection. Valid/replayed/foreign/forged cases have exact ledger assertions and
   no forbidden providers. Already-closed calls do not resurrect the ledger.

New risk-based tests cover all four defects: multiunit zero-height select **and**
region paths stop at exactly one provider call and zero outputs; view close invokes
zero providers; caught quota rejects subsequent `consume(0)`; reentry is bounded;
host exception identity, output precharge and attempt accounting are explicit.
The isolated GC child retains closed/poisoned operations, prepared/cursor/work
handles and checks three separate original 1-MiB host Buffers per operation
(descriptor/provider/view). Twenty separate event-loop/forced-GC turns avoid
WeakRef dereference-induced job retention, with unregistered collecting and strong
surviving controls. Five additional bounded child runs pass. This establishes
collection for these reference scopes, **not** an RSS/heap/native-memory-size,
general CPU or arbitrary-host-buffer leak claim. Accepted borrowed outputs may
retain host resources naturally; neither close nor poison mutates those outputs.

Fresh commands/results (same worktree/HEAD, actual dirty delivery):

| Command | Outcome |
| --- | --- |
| `npm run lint` | Pass, Biome and code-principles ESLint |
| `npm run format:check` | Pass |
| `npm run typecheck` | Pass, complete workspace build and no-emit TS |
| `npm test` | **687/687** pass, zero skipped/cancelled |
| `npx tsx --test packages/layout-kernel/test/*.test.ts packages/layout/test/*.test.ts` | **344/344** pass |
| `for i in 1 2 3 4 5; do node --expose-gc --import tsx packages/layout-kernel/test/fragment-release-child.ts \|\| exit 1; done` | Five independent child runs pass |
| `npm run test:consumer && npm run check:licenses` | Eight packed closures and eight tarball licenses pass |
| `npm run build:browser && npm run check:graphs` | All 12 builds/graphs pass; existing large font chunk warning only |
| `npx tsx scripts/layout-kernel-baseline.ts` | Four historical PDF hashes and core closure unchanged |
| `npx tsx scripts/fragment-profile.ts && npx tsx scripts/box-profile.ts` | C/B+C sizes above; A/B unchanged, positive retained-byte controls, no externals/leaks |
| `npm pack --dry-run --json -w @updf/layout-kernel` | Final README-inclusive package size above, 99 files |
| `npx tsx scripts/tui-layout-proof/fragment-cli.ts` and `... --two-regions` | Exact existing geometry/coverage/counts unchanged |
| `git diff --check` | Pass |

Prior browser runtime 10/10, showcase 56/56 and literal Formbar evidence above are
reused, not reported as rerun: no production adapter, geometry, paint, UI or Formbar
changes in this fix. Fresh full integration/PDF hashes and rebuilt browser graphs
cover the shared-kernel blast radius. Initial fixture width typo, expired-handle
poison regression, import order and prefer-const lint failures were fixed; no failed
gate is waived and no asynchronous check remains.

Code-principles: full universal checklist satisfied; cohesive files under 400 lines,
functions under 50, nesting at/below three, intent-only comments, proportional tests,
all required gates pass. No code-principles exceptions. Approved standalone defaults
and PDF MAX_SAFE_INTEGER compatibility mapping remain unchanged; #25 is not worked.
No Changeset in this existing private, non-Changesets workspace.

Status: **implemented**, ready for independent re-audit, **not verified**. No remaining
assigned acceptance item. Auditor should independently inspect all four fixes and
new negative/positive controls, check retained work poison-link/reference ownership,
and review the entire preserved delivery manifest as appropriate. Reused broad
runtime evidence and bounded GC scope remain explicit limitations.
