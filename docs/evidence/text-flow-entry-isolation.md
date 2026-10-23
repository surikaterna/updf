# S1 — static text-flow entry isolation

Issue: N/A. Status: **implemented, pending independent audit; not verified**.
This is only the approved S1 slice. S2 canonical installation/authoring and all
later geometry, image, URL, cache and multisegment migrations are not implemented.

## Delivery boundary

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; clean entry and unchanged base/HEAD:
  `630e5d4f0b69921e8f85652fc2e0a78dd17548c1`. Parent supplied prior audit approval.
- All delivery changes are Engineer-owned, unstaged modifications/deletion or
  untracked additions. No staging, commits, push, PR, tracker mutation, delegation,
  preview restart or served-output replacement. The parent owns integration/delivery.
- Runtime owners: text-flow entries/static policies/shared sibling selector; text
  selection entry, shared work-counter extraction and the narrow interpolation leaf.
  Associated tests, package exports, boundary/consumer/cost scripts and READMEs move
  with those contracts. Only the two showcase authoring sources change imports,
  factory names and the corresponding factory return-type reference.
- `service.ts`, ordinary text entry, core, layout, layout-boxes, fonts, geometry,
  Paginator, native preparation and production build/packaging generator are unchanged.
  Versions, lock and dependency edges are unchanged. No Changesets workflow exists.

## Exact temporary public contracts

| Entry | Factory / result | Public props/types |
| --- | --- | --- |
| `@updf/text-flow` | `createTextFlow(capability<InlineSelectionOperation>)` → `{ Block, participation }` | Rectangle-only `FloatingBlockProps`; `shapeOutside` omitted or `"rect"`; explicit undefined rejects |
| `@updf/text-flow/path` | `createPathTextFlow(capability<InlineSelectionOperation>)` → `{ Block, Path, participation }` | Full `FloatingBlockProps`, `FloatingPathProps`, `SideShape`; current straight-path grammar and rectangle mode |
| `@updf/text-flow/atomic` | `createAtomicTextFlow(capability<TextCompositionOperation>)` → `{ TextFlow, textFlowAdapter }` | `TextFlowProps` and existing exclusion types; adapter name remains `updf.text-flow` |
| `@updf/text/selection` | `createTextSelection(TextServiceOptions)` → `{ text, capability }` | `InlineSelectionOperation`, `InlineSelection`, `InlineContinuation`, `SelectedInlineLine`, `TextServiceOptions` |

No root atomic/path factory, facade or type re-exports and no compatibility aliases.
`@updf/text/composition` remains combined: atomic plus inline selection use one
counter. Mixed consumers may pass that **one** capability to the explicit factories;
they do not install a second runtime/service. Generic line-height contracts remain.

All new entries have browser/import/require runtime and declaration conditions.
Public `/path` maps to `path-entry`; `path.ts` remains the internal visual owner.
Node import facades remain CJS-backed and share the existing owned resources,
capabilities and WeakMaps with require. This is static entry isolation, **not** a
claim of genuine Node ESM tree-shaking. No global `sideEffects: false` is added:
new entries have imports, declarations/factories or private policy objects, not
installation side effects; existing ownership modules must retain shared identity.

## Shared ownership and numerical preservation

`sibling.ts` remains the single participation, source provenance, geometry
preparation, checkpoint and cleanup owner. A tiny private static policy captures
and validates markers and supplies a prepared visual/side query. Rectangle policy
has no path import. Path policy owns capture/parser/paint wiring. There is no
registry, string dispatch, lazy loader or extra ordinary-line feature branch.

`side-selection.ts` is the renamed existing selector, not a copied line loop.
Full-width continuation still uses `sibling-selection.ts`. Existing exact native
certificates remain exact: rectangle contact is `>=`, path contact is `>`;
rectangle available width is subtraction, path width retains the one-ULP predecessor;
rectangle retries clamp at the float bottom, path retries use the owned next top.
Band/lookahead/query order and every cumulative charge site remain unchanged.
Marker validation also retains common side/undefined checks before contour checks.
No approximate comparison, scalar domain, identity, quota or admission changes.

Selection calls `serviceClosure` once and uses the existing `inlineSelection`,
font/resource resolvers and `createOperationCapability`. The mechanically extracted
`compositionWork` keeps the same per-operation limit, diagnostic and arithmetic.
Combined composition and inline selection still debit the **same** counter. No
line/font runtime, output validator or ownership map is copied.

Path-band formerly imported the existing conservative segment helper through
`/composition`, retaining the atomic planner even after a selection migration.
The authorized `@updf/text/internal-interpolation` subpath re-exports that **single
existing** binary64 helper from its pure emitted leaf. It does not duplicate
arithmetic, relocate it into another package or add core/layout dependencies.

## Frozen references and paired evidence

Before runtime edits, `node /tmp/opencode/updf-s1-freeze.mjs` wrote
`artifacts/text-flow/entry-isolation-before/manifest.json`: 1,582 source files,
4,188 historical artifact files, all 80 served dist files, 1,676 emitted files for
the affected/protected package set, PID command and HTTP fingerprints. The fresh
cost capture also retains all 15 library tarballs and emitted inventories.

```sh
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/entry-isolation-before/costs
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/entry-isolation-delivery/costs --compare artifacts/text-flow/entry-isolation-before/costs/report.json
TEXT_FLOW_ENTRY_EVIDENCE_OUT=artifacts/text-flow/entry-isolation-delivery npx tsx scripts/text-flow-entry-evidence.ts parity
TEXT_FLOW_ENTRY_EVIDENCE_OUT=artifacts/text-flow/entry-isolation-delivery npx tsx scripts/text-flow-entry-evidence.ts summary
TEXT_FLOW_ENTRY_EVIDENCE_OUT=artifacts/text-flow/entry-isolation-delivery npx tsx scripts/text-flow-entry-evidence.ts protected
```

The final report recounts **238 paired metrics**, ten existing cost profiles ×
browser/Node × raw/minified = **40 bundles**, plus all package inventories.
These are not the ten proposed canonical profiles below. `parity.json` hashes the
frozen baseline costs/tarballs and records **20 raw runtime pairs**: exact output/
PDF bytes, available layout/provenance results, composition and kernel charge
sequences. It compares unchanged ordinary input strings byte-for-byte. Optional
fixtures permit only explicit import/factory substitutions; their distinct before/
after source hashes are disclosed, not described as identical consumer inputs.
Fonts, resources, document/options and selected runtime behavior are unchanged.

The pre-feature reference remains immutable `library-baseline/report.json` at
`244c0932c733accace68b7d8fb85cdc8f851d4e8`. `cost-summary.json` separately compares
that historical different-lock reference, using null/N/A for missing profiles.
The same-lock S1 reference is fresh clean HEAD `630e5d4…`, not an unsafe pre-S4
selector. Intermediate `entry-isolation-after` and `entry-isolation-final` evidence
is preserved; **delivery** supersedes it after validation-order/type tightening.
Older S0/S4 drivers and reports remain historical, not rerun or relabeled as S1.

### Retained output costs (bytes)

| Output | Before | Delivery | Delta |
| --- | ---: | ---: | ---: |
| All library packed payload | 701,698 | 707,653 | +5,955 |
| All library unpacked payload | 3,866,242 | 3,897,711 | +31,469 |
| Browser ESM JS / declarations | 828,682 / 331,728 | 832,369 / 337,199 | +3,687 / +5,471 |
| CJS JS / declarations | 956,122 / 331,728 | 960,831 / 337,199 | +4,709 / +5,471 |
| Node facade JS / declarations | 13,858 / 2,964 | 14,363 / 3,282 | +505 / +318 |
| Rectangle browser min / gzip | 247,390 / 81,011 | 227,678 / 74,007 | -19,712 / -7,004 |
| Rectangle Node min / gzip | 373,782 / 115,444 | 347,347 / 106,377 | -26,435 / -9,067 |
| Path browser min / gzip | 247,409 / 81,035 | 237,050 / 77,834 | -10,359 / -3,201 |
| Path Node min / gzip | 373,801 / 115,471 | 361,612 / 111,571 | -12,189 / -3,900 |
| Atomic browser min / gzip | 247,620 / 80,964 | 224,902 / 73,018 | -22,718 / -7,946 |

Every package except intentionally changed text/text-flow has zero emitted/packed
deltas. All five ordinary consumer profiles have zero raw/min/gzip byte deltas.
Full format/profile rows and module graphs are retained, not inferred from imports.
Payload is not installed dependency footprint. No latency/memory/fetch/decode speed
claim: work ordering is preserved and this slice changes static entry ownership.

| Proposed canonical inventory | S1 evidence / limitation |
| --- | --- |
| 1. Drawing/core | Existing drawing profile |
| 2. Ordinary text/layout | Existing ordinaryText, preparedFont and layout profiles |
| 3. Composition-only temporary comparison | Existing three atomic profiles; text `/composition` intentionally remains combined |
| 4. Rectangular flow | Existing textFlowSiblings, explicitly migrated to root + selection |
| 5. Prepared image flow | N/A: no canonical Image flow implemented/measured; ordinary JPEG is not this profile |
| 6. Straight Path flow | Existing textFlowPath, explicitly migrated to path + selection |
| 7. Optional CSS-inspired syntax | N/A: future contract, not zero-cost implemented syntax |
| 8. Compound/multi-interval flow | N/A: future contract |
| 9. URL + optional shared cache cold/warm | N/A: future contract |
| 10. PNG alpha extraction flow | N/A: future contract |

## Gates and preserved preview

Commands run serially from the worktree above. Final logs use `/tmp/opencode/updf-s1-*`.

| Command | Result |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS; Biome and AST principles |
| `npm run typecheck` | PASS; full package/example build included |
| `npm test` | PASS; 1,578 tests |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | PASS |
| `npm run test:consumer` | PASS; 15 clean installed tarball closures; NodeNext/Bundler, no source aliases |
| `npx vite build --config apps/showcase/vite.config.ts --outDir /tmp/opencode/updf-s1-showcase-630e5d4-delivery` | PASS; isolated output only |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s1-showcase-630e5d4-delivery npm run test:browser` | PASS; 22 tests |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s1-showcase-630e5d4-delivery npm run test:showcase` | PASS; 105 tests |
| Final parity / summary / protected commands above | PASS |
| `git diff --check` | PASS |

Fresh-process unshaken `Module._load` checks verify rectangle+selection excludes
atomic/path/parser, atomic excludes addon sibling/path code, and path+selection
positively retains the parser/helper but not atomic planner/profile. Ordinary core,
text and layout acquire no selection/addon graph; no unrequested font/image engines.
Packed tests exercise mixed import/require owned resources and capabilities, every
new entry's declarations, removed-root exports and rectangle prop rejection.
Lifecycle/quota additions check selection-only versus combined results/exhaustion,
one combined counter, copied/foreign capabilities and closed contexts.
Existing rational oracle, exact-boundary, provenance, preparation, page deferral,
rejected-fork exhaustion and native PDF/raster tests pass. S4's historical 75→0
overlap proof is preserved; current rectangle/path safety remains 0 overlap, not
an expectation of reproducing unsafe historical output.

Early scoped iterations caught unmigrated fixtures, overbroad graph regexes, probe
parameter renaming, invalid new test inputs and a misplaced negative-type directive;
they were fixed without relaxing production contracts. One showcase invocation was
tool-timeout interrupted; the full isolated run completed with no cancellations.
No failure is waived. The final docs/format/lint/typecheck and seal supersede early logs.

All 80 `apps/showcase/dist` files, all 4,188 inherited artifact files, PID 665048's
command and live `http://100.74.77.69:5182/updf/` HTTP fingerprints remain unchanged.
The live source view intentionally still shows the old compiled code. Tests preview
the fresh isolated output and read its graph/notices through default-preserving
`SHOWCASE_OUT_DIR` plumbing; production Vite configuration is untouched.

Code-principles: correctness and owned identities checked; cohesive files ≤400
lines; functions <50 lines and nesting ≤3; intent/invariant comments; risk-based
contract, graph, type, native and quota tests; lint/tests pass. **No approved
exceptions**. `delivery.json` seals the actual unstaged/untracked scope and evidence.
Auditor should independently review that scope, the static policies and type-only
boundaries, helper leaf, shared counter, native/charge parity, costs and preservation.

## Supplemental pre-delivery audit advisory fix

The path protocol test helper now requires explicit `children`: its unused optional
argument previously selected rectangle-factory defaults under path participation,
causing `VDOM_HIERARCHY` at `/siblings/0`. The shared sibling helper's useful
rectangle defaults remain unchanged (three existing no-argument protocol tests).
One path protocol regression checks required argument arity at compile time and
selection/reporting of explicit matching-factory Block/Paragraph children at runtime.
No production API, runtime, tool input or numerical contract changes.

Current supplemental proof: `artifacts/text-flow/entry-isolation-audit-fix/after.json`,
with pre-edit `before.json`, scoped SHA-256 inventories and `checks.json` outcomes.
The original `entry-isolation-delivery/delivery.json` remains an immutable historical
seal; use it together with this supplemental proof for the current delivery scope.
All 238 paired metrics, path fingerprints and prior evidence remain historical,
unchanged and not regenerated. The supplemental checks cover path/sibling protocol
tests, format, lint, `npx tsc --noEmit` (existing package declarations; no build),
full `npm test`, protected-state verification and `git diff --check`.
The build-coupled `npm run typecheck` is intentionally not rerun for this test-only
fix. No app dist build, preview/server mutation or cost rerun is needed.
Status: implemented, pending focused independent re-audit; issue N/A. No new
code-principles exceptions.

## PR #89 clean CI build-order correction

Correction base/HEAD: `91b0cc3218c8748c4d3fa356f4bdf3b0969f5c43`, branch
`feature/text-flow-design`, worktree `/home/sprawl/projects/updf/trees/text-flow-design`.
Issue: N/A. Independent audit approved the exact two-file correction: root build
ordering plus this evidence update. Commit and publication to existing PR #89 were
authorized; no tracker or preview mutation is in scope.

`gh run view 39939521040 --log-failed` confirms all three jobs failed building
text-flow: TS2307 in `src/path-band.ts:3` and `src/path.ts:4`, missing
`@updf/geometry`. Run: <https://github.com/surikaterna/updf/actions/runs/39939521040>.
CI tested merge `c1206287ba9857421028bf7f958d6aa12d7e02da` of the HEAD above into
`244c0932c733accace68b7d8fb85cdc8f851d4e8`. Earlier local build/typecheck passes
used existing outputs and did **not** prove clean build ordering.

Only root `scripts.build` changes: move the existing geometry step immediately
before text-flow. Geometry depends only on core, already built; text-flow's other
dependencies (core, layout, text, layout-boxes) already precede it. All steps remain
present once. No runtime, package API, dependency edge, lock or showcase script
changes. No existing build-order test owner was found; the actual clean build is
the risk-based regression proof, rather than new general graph infrastructure.

Disposable source: `/tmp/opencode/updf-s1-clean-NHoQHAtf`. Parent `/tmp/opencode`
was checked with `ls` before `mktemp -d /tmp/opencode/updf-s1-clean-XXXXXXXX`.
Export/application commands from the worktree:

```sh
git archive 91b0cc3218c8748c4d3fa356f4bdf3b0969f5c43 | tar -x -C /tmp/opencode/updf-s1-clean-NHoQHAtf
git diff -- package.json | git apply --directory=/tmp/opencode/updf-s1-clean-NHoQHAtf --unsafe-paths
```

Only the intended package.json patch was applied before validation. No dist or
node_modules paths are tracked (`git ls-files '*/dist/*' 'node_modules/*'
'*/node_modules/*'` returned empty); no installed dependency/output copy or symlink
was reused. Node `v24.22.0`, npm `11.19.1`; CI used `v24.21.0` / `11.19.0`.
From the disposable cwd, all passed (exit 0), in this order:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build:browser
npm run build:showcase
npm run build -w @updf/layout-playground
npm run check:graphs
npm run test:consumer
```

`typecheck` includes the entire root production package/example/legacy build from
zero outputs, then `tsc --noEmit`. Install/build/check logs are retained as
`/tmp/opencode/updf-pr89-clean-{install,typecheck,browser,showcase,playground,graphs,consumer}.log`;
actual failed CI logs: `/tmp/opencode/updf-pr89-ci-failed.log`.
From the live worktree: `npm run format:check`, `npm run lint`, `npm test`
(1,579 passed, zero failed/skipped), and `git diff --check` passed.
Test log: `/tmp/opencode/updf-pr89-test.log`.

Protected-state before/after comparison (`python /tmp/opencode/updf-pr89-preserve.py
before` / `after`) passed: all 545 tracked app/package source files, all 80 served
showcase dist files and PID 665048's command unchanged. Live dist and root
node_modules were not deleted/reinstalled; app builds wrote only in the disposable
copy. Historical evidence remains unchanged. Code-principles checklist satisfied:
cohesive two-file script/evidence scope, no new functions/nesting/comments or unsafe
runtime patterns, risk-based clean regression proof, format/lint/tests pass, no
approved exceptions. No Changeset: internal build-order correction only.

The clean build evidence above validates the failed build step from zero outputs;
it is not a passing GitHub CI claim. Hosted checks must be rerun after publication.
Browser/SVG runtime suites and the entire workflow were not replayed locally for
this script-only fix; the fresh hosted workflow remains authoritative.
