# Integrated core resource names and native ownership — A/B/C

2026-10-06. Objective: core-owned resource names, cohesive policy for **all six**
native nodes, and a core-owned trusted native AST-to-owned-VDOM bridge. Issue: N/A.
PR #66 is context only; no PR/tracker/delivery mutation or independent audit occurred.
Parent Builder owns integration; this report supersedes the pending-C statements
in the historical [A](core-resource-names-slice-a.md) and
[B](native-node-owners-slice-b.md) stage evidence, without rewriting those snapshots.

## Worktree, ownership and complete scope

- Exact cwd: `/home/sprawl/projects/updf/trees/jpeg-resources`.
- Branch: `feature/jpeg-resources`; base and unchanged HEAD:
  `f97a07a223aad8ac6de043bf515777aec42f5778`.
- Inherited A/B: 35 tracked changes and 23 expanded untracked files. Preserved.
- Integrated delivery: 40 tracked changes (including two deletions), 27 expanded
  untracked files; zero staged files and zero new commits. All work is uncommitted.
- C owns its bridge, metadata structural addition, layout consumers, exact boundary
  inventory, tests/proofs and final documentation. Other worktrees remain untouched.
- No stage, commit, push, PR/tracker mutation, nested delegation, new dependency,
  lockfile edit or publication. There is no Changesets system in this repository.
- No geometry/clip/default-paint change, plugin API, JPEG parsing/source change,
  rendering optimization or wholesale VDOM overhaul. Existing layout output quota
  scanning and deferred-emission geometry remain outside C, not secretly rewritten.

The complete file-by-file manifest, status, content SHA-256 hashes, deletion flags,
and binary tracked patch are `/tmp/opencode/updf-slice-c-current/delivery-manifest.json`
and `delivery-tracked.patch`. The manifest includes **all inherited and new** tracked,
unstaged and expanded untracked files, not only C. A/B's exact lists remain in their
stage evidence. C adds/changes this exact delta to the inherited state:

```text
docs/architecture/native-nodes.md (shared B)
docs/evidence/native-node-cohesion.md (new)
packages/core/API.md (shared A)
packages/core/src/internal-drawing.ts (shared B)
packages/core/src/nodes/metadata.ts (shared B untracked)
packages/core/src/vdom/native-data.ts (new)
packages/core/test/native-data.test.ts (new)
packages/layout/src/document-native.ts (deleted)
packages/layout/src/mixed-layout.ts
packages/layout/src/native-vdom.ts
packages/layout/src/region-render.ts
packages/layout/test/document-native.test.ts
scripts/boundaries.ts (shared A/B)
scripts/consumer/cohesion-evidence.ts (new)
scripts/consumer/jpeg.ts (shared A)
scripts/consumer/native-node-proof.ts (shared B untracked)
tests/consumer/types/runtime-template.ts (shared A)
tests/integration/native-node-owners.test.ts (shared B untracked)
```

## Contracts and actual lifecycle drivers

| Responsibility | Authority / driver |
| --- | --- |
| Resource names | `core/resource-definition.ts`; successful document/category interning in `core/document-resources.ts` assigns F/GS/X/R names; provider counters removed |
| Six-kind inventory / structural child field | `nodes/metadata.ts`, checked against public `NodeDefinition`; exact case only |
| Node policy | rectangle, line, path, rich-text, paint-group, xobject owners; applicable phase functions selected by narrow `nodes/wiring.ts` maps |
| Validation / measurement / ink | existing `core/validate.ts`, `measure.ts`, `ink.ts` iterative drivers; owners provide kind policy, not recursive traversal |
| Collection / PDF painting | `core/document-resources.ts` / `core/content.ts`; all pages register before lazy completion; group descendants collected once |
| Native lowering / work / early measurement | existing `vdom/native.ts` / `measure-output.ts`, phase-specific owner functions; existing quotas and source origins |
| Trusted AST-to-VDOM conversion | `vdom/native-data.ts`; postorder task stack and active cycles, existing `createNode` ownership/snapshot factory |
| Layout integration | `native-vdom.ts` assembles only document/pages and maps the core converter; mixed-layout and region-render use core shallow array classification |

All six kinds validate, measure, contribute ink, paint and lower. Collection is
explicitly absent for groups; early measurement is applicable only to rich text
and XObjects. See [architecture](../architecture/native-nodes.md) for narrow phase
contracts. No all-phase dynamic registry, foreign closures or automatic plugin
installation. Owner contexts are type-only; drawing stays independent of optional
fonts/text/JPEG, and XObject policy retains normalized unit-rectangle semantics.

Classification reads enumerable own data descriptors, not getters or inherited
tags. It is shallow routing, **not** safety/schema validation: `{type:'rect'}` is
recognized and must still fail strict lowering/validation. `text`, unknown tags
and case variants are not native. Proxies remain trusted and may run descriptor
traps; this is not a proxy sandbox. The bridge rejects unsupported tags instead
of layout's former unsound fallback to path; this is the requested intentional
fallback removal, not a geometry change or a compatibility exception.

The converter checks records before copying, removes only `type`, preserves extra
fields for strict rejection, uses shared child metadata, rejects active cycles,
and converts children iteratively. Owned factories preserve IDs/options/snapshots
and canonical loader identity, without forged brands. DAG reuse is legal. Lowering
retains operation quotas and source-origin remapping; the bridge adds no arbitrary
limits. A future kind needs core owner/metadata/applicable phase wiring, not a
layout kind case. Layout still creates groups/rich text and has preexisting quota
and geometry checks; searches are not falsely claimed to show zero kind strings
anywhere in layout. The two former native bridges have no leaf inventory/case chain.

## Integrated checks against actual A/B/C scope

All commands ran in the exact cwd above. Engineer implementation checks, not an
independent audit. No check remains running asynchronously.

| Command | Result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass; Biome and AST 400-line/49-line/depth-three gates |
| `npm run typecheck` | Pass; full dual-format workspace build and strict root compilation; final proof scripts also `npx tsc --noEmit` |
| `npm test` | Pass, 885/885; zero skipped/cancelled |
| `npm run test:consumer` | Pass, 12 clean installed tarball closures, NodeNext/Bundler declarations, both loader orders; cross-loader bridge ownership/resource identity exercised |
| `npm run check:licenses` | Pass, 11 actual library tarballs |
| `npm run build:browser` then `npm run check:graphs` | Pass, 12 emitted-JS targets/graphs and exact internal import/export inventory |
| `npm run test:browser` | Pass, 11/11 default `/usr/bin/chromium`, run once; prior black-raster qualification did not recur |
| `BROWSER_CHROMIUM=/tmp/opencode/issue41-chromium-software.sh npm run test:browser` | Pass, 11/11 separately qualified, same Chromium with `--disable-gpu` |
| `npm run build:showcase` then `npm run test:showcase` | Pass, build and 67/67 default-Chromium tests |
| `npm run build -w @updf/layout-playground` | Pass |
| `npm test -w @updf/layout-playground` | Pass, 13/13 |
| `npm run test:browser -w @updf/layout-playground` | Pass, 5/5 |
| `npx tsx scripts/check-current-docs.ts` | Pass, scoped local-file links |
| `git diff --check` | Pass |

Logs: `/tmp/opencode/updf-slice-c-{typecheck-final,test-final,consumer-final,licenses,browser-build,graphs,browser-default,browser-software,showcase-build,showcase-test-final,playground-build,playground-test,playground-browser,sizes}.log`.
The first combined showcase command exceeded its 120-second tool timeout after
26 successful tests and 13 cancellations; `showcase-test.log` preserves that
incomplete run. A standalone rerun with a sufficient 300-second command timeout
completed 67/67; it is not silently presented as the interrupted run's result.

Non-final build/test/lint failures were fixed, not waived: classifier enumerable
typing, a literal-typed mutation fixture, incorrect missing-fields diagnostic
expectation and near-page-edge deep fixture, and boundary helper size. The first
Post-B native proof lacked profile PDFs until the resource proof generated them;
correct ordered reruns pass. No source change was made to hide these outcomes.
The provenance script initially tried to hash esbuild's virtual stdin filenames;
it now explicitly lists those producer inputs separately from real emitted modules.

Risk additions: four bridge tests for exact shallow descriptors/nonexecuted
accessors, unknown/malformed tags and props, owned snapshots, symbols, dense child
arrays, DAGs/cycles, 2,048 groups and lower depth limits. Existing six-kind actual
compiled-owner instrumentation now runs through the bridge, preserving AST/PDF
and resource-site parity. Installed tarball type fixtures exercise the minimal
internal surface, and both CJS/ESM loader orders convert/lower JPEG AST with the
other loader's factories. A/B risk tests and all existing layout/table/app tests
remain part of the integrated gates.

## Frozen baselines, behavior proof and honest costs

Matched f97: `/tmp/opencode/updf-slice-a-f97-baseline`, archived source at
`/tmp/opencode/updf-slice-a-f97-source.tar`. Historical Post-A/B artifacts are
unchanged. **Before C edits**, actual Post-B was freshly built/frozen at
`/tmp/opencode/updf-slice-c-post-b`; its eight costs match B's prior report exactly.
Final current reports/bundles/tarballs/PDFs: `/tmp/opencode/updf-slice-c-current`.

```sh
npx tsx scripts/sizes.ts . current /tmp/opencode/updf-slice-c-current
npx tsx scripts/consumer/resource-name-proof.ts /tmp/opencode/updf-slice-a-f97-baseline /tmp/opencode/updf-slice-c-current
npx tsx scripts/consumer/native-node-proof.ts /tmp/opencode/updf-slice-c-post-b /tmp/opencode/updf-slice-c-current --bridge
npx tsx scripts/consumer/cohesion-evidence.ts /tmp/opencode/updf-slice-c-current
```

The resource proof compares identical producer inputs, qpdf object/name/reference
normalization only (plus derived stream lengths), exact raster/extraction, font/
image object inventory and embedded bytes, and measurement DTOs. The bridge proof
installs frozen Post-B tarballs and compares its prior native factory fixture to
the actual new core converter: six kinds, four root/translated/rotated/hidden-clip
workloads, exact AST/PDF/ink/diagnostic code/path/message parity and four qpdf PDFs.
All six ordinary profile PDFs also remain byte-exact versus Post-B.

| Profile | f97 raw/gzip | Post-B raw/gzip | Final raw/gzip | C delta raw/gzip | Total delta raw/gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| Drawing | 33,744 / 11,675 | 35,673 / 12,331 | 35,701 / 12,334 | +28 / +3 | +1,957 / +659 |
| Helvetica | 55,616 / 19,229 | 57,385 / 19,802 | 57,413 / 19,807 | +28 / +5 | +1,797 / +578 |
| Prepared | 59,889 / 20,446 | 61,658 / 21,119 | 61,686 / 21,121 | +28 / +2 | +1,797 / +675 |
| Font measurement | 24,285 / 8,586 | 24,345 / 8,617 | 24,373 / 8,623 | +28 / +6 | +88 / +37 |
| Fontkit | 433,155 / 173,922 | 434,928 / 174,468 | 434,956 / 174,471 | +28 / +3 | +1,801 / +549 |
| Host measurement | 20,735 / 7,199 | 20,795 / 7,222 | 20,823 / 7,229 | +28 / +7 | +88 / +30 |
| JPEG | 40,394 / 14,183 | 42,230 / 14,808 | 42,258 / 14,811 | +28 / +3 | +1,864 / +628 |
| Mixed | 66,221 / 23,113 | 67,900 / 23,584 | 67,928 / 23,587 | +28 / +3 | +1,707 / +474 |

Both standalone measurers retain only **132 bytes** of frozen kind/structural
metadata (Post-B: 104), zero owner/wiring/painting/provider emission. Parsed inputs
are not claimed as retained code. Drawing has no JPEG/fonts/text; JPEG-only has no
fonts/text/Fontkit. No source aliases or CJS/Node browser inputs. The actual bridge
workload separately grows from 83,664/28,319 to 84,163/28,521 raw/gzip: **+499/+202**,
including descriptor/cycle handling and removal of fixture conversion. Its actual
metafile contributions live in `native-node-proof.json`. The eight ordinary
profiles do not retain the bridge, so their +28-byte metadata delta is not claimed
as its runtime cost. Core tarball grows 1,902 compressed/11,563 installed bytes
versus B (multiple JS/declaration/map formats); no net-zero or bundle reduction claim.

`cohesion-evidence.ts` records actual dirty source hashes, baseline/current report
hashes and parsed emitted-input hashes, and **rebundles all eight current inputs**
to assert byte identity with the saved producer outputs before audit. It does not
pretend f97 HEAD is a fingerprint of uncommitted A/B/C. Complete current source
hashes include final docs/tests/proof scripts. Older PR/JPEG cost history is left
untouched and is not substituted for the matched f97 baseline.

## Self-check, status and independent handoff

Universal checklist: correctness validated; no avoidable unsafe patterns; strong
defaults followed; cohesive production files under 400 lines; functions at most
49 lines and nesting at most three; comments describe intent/invariants; risk-based
tests proportional to bridge/identity/traversal risk; lint/typecheck/tests pass.
Approved code-principles exceptions: **none**. Trusted-proxy and software-browser
qualifications are explicit, not hidden exceptions. Raw legacy suites were not
rerun; legacy compile and installed consumer gates pass, and legacy runtime source
is unchanged.

Status: A/B/C **implemented**, not independently verified; tracker N/A, unchanged.
Completed acceptance: core naming authority, all-six cohesive owners/narrow wiring,
trusted owned bridge with no layout leaf inventory, integrated gates, cost/output/
source provenance. Remaining: independent Auditor review, then caller-authorized
delivery only. Auditor should inspect the complete actual uncommitted manifest,
descriptor/extra-field handling, child metadata typing, cycle/DAG ordering, quota
and origin preservation, all-six compiled-owner evidence and honest retained-cost
attribution. No approval or merge readiness is inferred from Engineer checks.
