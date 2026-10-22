# PR89: selected capability and sealed native leaf refactor

**Implemented; ready for independent audit, not verified.** Issue/tracker: N/A;
PR89 is the assignment reference, not an invented issue ID. Integration owner:
Engineer. Worktree `/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`. Starting and final HEAD:
`99b5acaf3de43e23072209176dc02ae67cc4593a`; pre-feature comparison revision:
`244c0932c733accace68b7d8fb85cdc8f851d4e8`. The worktree started clean. All
delivery changes are Engineer-owned, unstaged/uncommitted, including new files.
No delegation, staging, commit, push, tracker or PR mutation was performed.
This evidence supersedes the architecture of the prior
[runtime evidence](text-flow-runtime.md), not its immutable measurements.

## Delivered ownership and deliberate API migration

- Core's `operation-capability.ts` owns an opaque identity, one selected capability,
  origin/lifetime bindings and lazy initialization. Its WeakMaps authenticate exact
  identities; there is no name lookup, search, installer registry or service-identity
  lookup. The factory/binding bridge is internal, not a broad public plugin API.
  `useOperationCapability(context, capability)` is the generic public accessor.
- Ordinary operations never initialize the optional capability or allocate its
  frame map, capture counter or feature closures. Core's ledger has no composition
  counter. Selected initialization happens once per actual existing operation state,
  including multiple VDOM wrappers. It receives the actual owned bindings and
  existing ledger, not another font runtime, ledger or standalone measurement call.
  Adapter access binds the current mutable origin and active lifetime; caller-supplied
  paths cannot replace the adapter origin. Missing/wrong/forged selectors and expired
  access fail structurally with `MEASUREMENT_CONTEXT`.
- `@updf/text/composition` owns all composition input/report/frame types, report
  validation, band/height/ink policy, frame authorization and cumulative feature work.
  The ordinary seven-callback `TextService` has no `compose`; universal
  `LayoutOperation`/`MeasureContext` have no composition methods. The three adversarial
  composition suites moved from core tests to text tests rather than being dropped.
- `createTextComposition({ runtime, defaultFont? })` returns `{ text, capability }`
  and creates **one** existing `serviceClosure`. The text service and selected
  capability share that exact captured runtime/resolution closure.
- `createTextFlow(capability)` returns `{ TextFlow, textFlowAdapter }`. Install that
  adapter using the existing `createExtensions`. A global adapter cannot safely
  discover an installer-owned identity without the prohibited registry/identity
  side channel, so explicit pairing replaces global exports. There are no aliases
  or parallel old routes. See the [executable migration](../../packages/text-flow/README.md).
  Paragraph grammar, numeric style width/maxHeight, atomic extent/height and explicit
  adapter installation semantics are otherwise unchanged.
- Core's old `preparedText` builtin is removed. `nativeLeaf` is Box plus an opaque
  sealed handle, with no children or user painter/collector/command/recipe callback.
  The only checked construction helper in this slice, internal `sealSelectedText`,
  accepts an existing owned text-output snapshot and reuses the existing fragment
  validator. It stores a closed selected native `richText` representation and exact
  relevant owned resource identities, not the frame, report or feature closure.
- Native measurement checks authenticity, exact dimensions and resource identity;
  it does not call the text service. Ink/collection/painting dispatch the selected
  representation to the **existing native owners**, with current x/y. No second
  native pipeline, text wrapping, coordinate reconstruction or custom painting phase
  exists. Durable payloads work after operation closure and without a text service.
  Normal selected-graph preparation, native admission and source/output/page budgets
  remain mandatory. Layout's output scanner only asks the generic sealed leaf owner
  for its text-accounting data.
- The existing iterative snapshot owner is unchanged apart from the sealed identity
  predicate name. Its visit-before-terminal ordering still charges **every occurrence**:
  repeated owned resources, opaque runs, sealed payloads and DAGs; strings charge
  Unicode scalars. Both feature captures use that owner. Accessors/cycles/hidden or
  symbol fields still reject. Failed attempts retain cumulative charges. Reflect
  metadata enumeration, proxy traps and trusted callback allocations are not a sandbox.

**Intentionally not changed:** layout-boxes algorithms, paginator, box layout,
line breaking/wrapping, native rich-text painting behavior, contours/exclusions,
arbitrary children, visuals, floats or split pagination. No numerical comparison
contract changed: exact domains/identities/quotas/native certificates stay exact;
existing local-scale approximate frame/band/ink containment moved to text unchanged.

## Validation and risk-based tests

Final serial commands in this worktree (all pass):

```sh
npm run format:check
npm run lint
npm run typecheck
npx tsx --test --test-concurrency=1 packages/core/test/operation-capability.test.ts packages/text/test/composition-capture-budget.test.ts packages/text/test/composition-runtime.test.ts packages/text/test/composition-boundary.test.ts packages/text/test/composition-native-parity.test.ts packages/text/test/composition-parity.test.ts packages/layout/test/composition-contract.test.ts packages/text-flow/test/adapter.test.ts tests/integration/native-node-owners.test.ts tests/integration/text-flow-graphs.test.ts
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npx tsx scripts/text-flow-costs.ts --root /home/sprawl/projects/updf/trees/text-flow-design --out artifacts/text-flow/surgical-vs-baseline --compare artifacts/text-flow/library-baseline/report.json
npx tsx scripts/text-flow-costs.ts --root /home/sprawl/projects/updf/trees/text-flow-design --out artifacts/text-flow/surgical-vs-current --compare artifacts/text-flow/runtime-final/report.json
npx tsx scripts/text-flow-seam-costs.ts
git diff --check
```

Results: **41/41 focused**, **1,415/1,415 full tests**, zero failures/skips;
typecheck includes the full package build; all 12 browser graphs and 15 clean
external tarball closures pass, including NodeNext/Bundler TSX declarations and
execution. Browser large-chunk warning and the historical arithmetic test's
intentional syntax diagnostic are expected passing controls, not waived failures.
The offline workspace install only added the declared text dependency to text-flow;
no external dependency changed. Environment remains Node 24.22.0 / npm 11.19.1.

New regressions cover lazy/singular initialization, absent/wrong/forged selection,
actual shared operation across VDOM contexts, origin changes, retained APIs after
closure, adapter origin spoofing and a malformed later sealed leaf rejecting the
whole native graph **before any resource collection or painting**. Existing tests
retain cross-operation/copy/JSON/forged-frame attacks, durable native output,
resource/dimension mismatch, byte-identical native parity without remeasurement,
10,000 repeated terminal/nested-output attacks, failed cumulative charges and
incremental snapshot ordering. Old emitted browser/Node consumers assert absence
of composition modules **and behavior**, not just the addon package name.

Development failures corrected before the final pass: drawing coordinator object
copy lost selected identity (now one operation with explicit close ownership);
test source/emitted private brands required a documented test-only ABI cast;
new internal importer/export inventories and the packed resource-export inventory
needed exact migration; one test lacked node narrowing; one reporting loop exceeded
the nesting gate. No failure was waived and no quota was increased to pass attacks.

## Paired measurements, bytes

Both requested report directories contain 206 comparisons, 15 tarballs and all
24 consumer bundles/metafiles. `scripts/text-flow-seam-costs.ts` asserts identical
metrics between the two new runs, unchanged flags, and byte-identical old consumer
input strings against both preserved reports. The new TextFlow input changes only
the required installer/adapter wiring, not the requested rectangle/render operation.
Package payloads below are **not dependency closures or installed footprint**.
No latency improvement or across-the-board byte reduction is claimed.

Preserved report SHA-256 (unchanged before/after):

- `library-baseline/report.json`: `cc3cc2e01cad80ee10427ec9dfdda5e9645669d43ff61c822b544fb189e2dd53`
- `runtime-final/report.json`: `bae5429859303bcafb0a4f59c8df75fdf29c958dc63cfb573f23a0be1f432e03`

| Core payload metric | Pre-feature | Prior runtime | Surgical | Delta vs pre-feature / prior |
| --- | ---: | ---: | ---: | ---: |
| Browser JS | 144,059 | 154,960 | 153,636 | +9,577 / -1,324 |
| CJS JS | 175,235 | 188,388 | 187,808 | +12,573 / -580 |
| Node facade JS | 4,224 | 4,354 | 4,810 | +586 / +456 |
| Browser/CJS declarations, each | 82,367 | 88,186 | 85,716 | +3,349 / -2,470 |
| Facade declarations | 698 | 698 | 698 | 0 / 0 |
| Browser maps/other | 242,138 | 258,193 | 256,524 | +14,386 / -1,669 |
| Tarball | 127,160 | 135,686 | 134,653 | +7,493 / -1,033 |
| Unpacked | 741,281 | 793,158 | 785,101 | +43,820 / -8,057 |

| All library payloads, including addon | Pre-feature | Prior runtime | Surgical | Delta vs pre-feature / prior |
| --- | ---: | ---: | ---: | ---: |
| Browser JS | 734,988 | 750,531 | 754,599 | +19,611 / +4,068 |
| CJS JS | 847,163 | 865,429 | 870,900 | +23,737 / +5,471 |
| Node facade JS | 12,082 | 12,511 | 12,902 | +820 / +391 |
| Browser/CJS declarations, each | 291,060 | 300,171 | 302,078 | +11,018 / +1,907 |
| Facade declarations | 2,720 | 2,864 | 2,864 | +144 / 0 |
| Tarballs | 625,017 | 640,653 | 644,419 | +19,402 / +3,766 |
| Unpacked | 3,424,231 | 3,504,588 | 3,525,834 | +101,603 / +21,246 |

**Retained consumer minified level-9 gzip**, browser / Node. All raw/minified/raw
gzip values and exact delta percentages remain in each JSON comparison.

| Consumer | Pre-feature | Prior runtime | Surgical | Delta vs pre-feature / prior |
| --- | ---: | ---: | ---: | ---: |
| Drawing | 12,326 / 17,884 | 13,100 / 19,581 | 12,990 / 19,269 | +664 / +1,385; -110 / -312 |
| Ordinary text | 20,062 / 37,094 | 20,744 / 38,978 | 20,636 / 39,008 | +574 / +1,914; -108 / +30 |
| Prepared font | 21,370 / 37,116 | 22,068 / 39,004 | 21,944 / 39,043 | +574 / +1,927; -124 / +39 |
| JPEG | 14,799 / 21,231 | 15,580 / 23,002 | 15,444 / 22,695 | +645 / +1,464; -136 / -307 |
| Layout | 57,121 / 90,466 | 58,365 / 92,393 | 57,812 / 92,270 | +691 / +1,804; -553 / -123 |
| TextFlow | N/A | 66,600 / 97,782 | 67,050 / 98,642 | N/A; +450 / +860 |

Composition ownership moves into the optional text payload; it is not byte-free.
Text package browser JS 44,106 (pre-feature 36,360; prior 38,621), CJS 51,470
(42,733; 45,286), declarations each 19,084 (12,290; 14,631), tarball 36,560
(30,083; 32,070), unpacked 207,391 (165,204; 178,155).

The composition-only file inventory (including its private modules, excluding
ordinary service dependencies) is in `surgical-vs-baseline/seams.json`: browser JS
7,523 vs prior 2,038; CJS 8,480 vs 2,296; implementation declarations each 4,963
vs 510; browser maps 10,757 vs 2,613; facade JS 127 vs 141, declarations 78 vs 78.
Pre-feature subpath costs are N/A, not zero or a claimed dependency-closure delta.

Addon absolute payloads (pre-feature N/A): browser/CJS/facade JS
2,022 / 2,178 / 107 vs prior 1,708 / 1,874 / 158; declarations
875 / 875 / 66 vs 723 / 723 / 66; maps 2,381 vs 2,094;
tarball 5,332 vs 4,832; unpacked 14,848 vs 12,863. Its text import is type-only;
the runtime implementation is selected explicitly by the caller.

### Residual generic seam costs, not additive gzip attribution

`seams.json` itemizes exact module paths and `bytesInOutput` for every consumer.
These are **whole shared modules**, not marginal feature costs. Existing snapshot,
native dispatch, style validation and layout code are included; summing category
totals does not establish incremental cost or a compressed contribution.

| Minified consumer | Capture modules | Generic access | Sealing/accounting | Native dispatch | Operation wiring | Layout wiring |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Drawing browser | 3,287 | 179 | 594 | 1,263 | 767 | 0 |
| Drawing Node | 3,986 | 1,364 | 1,711 | 3,385 | 1,522 | 0 |
| Ordinary text browser | 3,286 | 179 | 594 | 1,263 | 767 | 0 |
| Ordinary text Node | 3,986 | 1,364 | 1,711 | 3,397 | 4,778 | 0 |
| Layout browser | 3,286 | 414 | 594 | 1,131 | 3,112 | 5,933 |
| Layout Node | 4,012 | 1,364 | 1,711 | 3,409 | 4,778 | 7,581 |
| TextFlow browser | 3,318 | 1,041 | 1,204 | 1,729 | 3,050 | 5,124 |
| TextFlow Node | 4,012 | 1,364 | 1,711 | 3,408 | 4,778 | 7,581 |

Capture means existing `data` + `text-capture`; access means `operation-capability`;
sealing means `native-leaf` + its identity owner; dispatch means native leaf node,
wiring and metadata; operation wiring means layout-operation/text-service/resources
and VDOM measurement; layout wiring means extension-producer/output-scan/content-measure.
Browser tree shaking drops the checked construction helper from old consumers;
Node's canonical CJS facade retains more generic exports. Ordinary text/prepared
Node gzip rises slightly despite feature code separation. Aggregate package costs
also rise. These are explicit tradeoffs for this architecture, not claimed wins.

## Self-check and handoff

Universal checklist passes: correctness and risk-based tests; no avoidable unsafe
production patterns; cohesive files ≤400 lines; functions <50 lines; nesting ≤3;
intent/invariant/tradeoff comments only; format/lint/typecheck/tests pass. **No
approved principle exception or failure waiver.** The test-only source/emitted
brand cast is documented in the fixture. No Changeset: this repository does not
use Changesets and packages are private/unpublished.

All bounded acceptance items are implemented; independent verification and any
authorized PR evidence update remain with Auditor/Diplomat/caller. Auditor should
inspect the actual unstaged **and untracked** delivery, challenge real-operation
state sharing and active origins, replay terminal/malformed-later-leaf attacks,
check native-leaf resource/dimension enforcement and no second painting owner,
verify ordinary graph separation and both paired reports including their regressions.
No contours or additional optimization slice is part of this handoff.
