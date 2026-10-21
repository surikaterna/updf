# Immediate container child placement

Historical delivery evidence below describes the entry baseline, including its
then-current start closures and tests. The subsequent private painting ABI seam
is **implemented, ready for independent audit**, not verified: declarations and
whole-selected-graph preparation replace those closures; see
[current preparation evidence](fragment-paint-preparation.md). Neither delivery
constitutes either FINAL audit or height-selection/whole-flow closure.

## Scope and delivery state

Issue N/A. Worktree `/home/sprawl/projects/updf/trees/flow-admission`, branch
`feature/flow-admission`, base/HEAD `b70da49ace00c19a8e570b4fc783806dffd6931c`.
**Implemented — ready for independent audit.** Not independently verified,
either FINAL audit, or whole-flow closure.
No stage, commit, push, PR, issue/tracker mutation or nested delegation occurred.

Entry is the actual 118-dirty-path parent delivery, not a reconstruction from HEAD.
Its paragraph manifest SHA-256 is
`bdbe04255613f4c9b7c27d7026bb98e5fc39f01f3a862c97e0adb88e564cfe30`.
Ignored evidence is under `artifacts/container-placement/`: `entry/state.json`
pins source hashes and captured source/dist, `checkpoint-state.json` pins the
continuation entry, and `final-state.json` pins current hashes, full dirty scope,
owned delta, exact revisions and gate outcomes. Initial continuation comparison
matched all 1,431 checkpoint hash entries. `summary.json` pins before/current hashes
for all four owned production files. Outside the explicit batch and authorized
documentation status lines, inherited entry bytes are preserved.

## Runtime change

- New `packages/layout/src/container-placement.ts` prepares a frozen placement
  array with frozen `{ fragment, x, y, start }` records, without freezing children.
- `container-producer.ts` (`painted`) and `row-producer.ts` (`paintedRow`) each
  prepare once before returning the placed fragment.
- `container-paint.ts` consumes placements only. Old `checkPiece` is deleted;
  the painter no longer imports generated geometry, stack selection or coordinate
  summation and does not reconstruct immediate coordinates inside its closure.

Owned certificates retain the same predicate and materialization. Certified y is
the actual materialized allocation start; its endpoint uses allocation extent,
not semantic child height. Child semantic height is unchanged. Uncertified y
uses the existing top sum and x uses the existing left sum. Late `start` closures
capture fragment/y and retain certificate ownership and uncertified part bounds.
Hidden overflow preserves bypass plus explicit padding-edge clipping. Zero parent
height returns an empty frozen array without reading children.

Invalid later immediate children now fail during fragment construction before
**any** child paint or deferred recipe execution. This is fatal, not deferral or
parent retry. Candidate budget state can already have mutated; no rollback is
claimed. Descendant part checks remain late. Private height-aware selection,
stack policy, Row fit, decorations loops, provider/paragraph owners, frozen A/B1
and unwired B1 are unchanged. No public API, registry, tolerance, comparison or
generated-allocation changes were introduced.

## Approved Column timing correction

`packages/layout/test/column-boxes.test.ts` retains measurement and true-overflow
checks. Its original child 0.2, paddingTop 0.1, height 0.3 fixture fits metrically
but fails exact native containment: `0.1 + 0.2 > 0.3`. It now expects construction
`GEOMETRY` at `/column`, without painting the invalid candidate as preflight.
The explicit `0.30000000000000004` positive control measures, constructs and paints.
No rounding workaround was applied to the invalid fixture.

`node artifacts/container-placement/column-repro.mjs` passes with captured-entry
modules: old invalid trace measures 0.3, constructs 0.3, then fails at paint;
current invalid trace measures 0.3 then fails construction. Both versions construct
and paint the positive control. Initial focused red was this approved expectation;
local test calibration distinguished block measurement from fragment construction
and asserted the actual empty paintGroup, rather than weakening containment.

## Validation

`python artifacts/container-placement/gates.py ...` executes each named command
serially in a private user/mount namespace, binding only this batch's disk-backed
tmp to `/tmp/opencode` and using its own npm cache. No global configuration or
other worktree was changed. Commands have finished; no checks remain running.

| Exact command | Result |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including AST code-principles |
| `npm run typecheck` | PASS, full serial build and root tsc |
| `npm test` | PASS, 1,302/1,302 after authorized importer transfer |
| `npm run test:consumer` | PASS, 14 clean packed closures |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | PASS after fresh browser build and importer transfer |
| `npm run test:browser` | PASS, 18/18 |
| `npm run build:showcase` | PASS |
| `npm run test:showcase` | PASS, 101/101 |

Focused command (PASS, 112/112):

```sh
npx tsx --test packages/layout/test/container*.test.ts packages/layout/test/rows*.test.ts packages/layout/test/column*.test.ts packages/layout/test/cancellation.test.ts packages/layout/test/decorations.test.ts packages/layout/test/*recipe.test.ts packages/layout/test/shared-edge*.test.ts
```

Initial root failures were `packages/text/test/boundaries.test.ts` and
`tests/consumer/fontkite-graph.test.ts`. Both and `check:graphs` reported
`Forbidden internal importer: layout/src/container-placement.ts -> @updf/core/internal`.
The caller subsequently authorized transferring the exact core/internal importer
entry in `scripts/boundaries.ts` from `container-paint.ts` (no remaining internal
import) to `container-placement.ts`. No other inventory changes or globs were
added; inherited legacy-removal/measured-source edits are preserved. Format, lint,
typecheck/full build, root tests, fresh browser build and graphs were rerun and
passed. `npx tsx artifacts/container-placement/seam-control.ts` proves the exact
entry-relative transfer and rejects the stale painter, invalid sibling and nested
importer paths; full source-seam checking passes. No waiver is claimed.
Browser 18/18, showcase 101/101 and packed-consumer 14-closure passes above are
reused at unchanged runtime hashes, rather than claimed as new executions.

Risk tests: 12 new placement/architecture tests cover certificate ownership,
fractional/large origins and fatal conditioning, immutable coordinate snapshots,
late descendants, hidden clips, zero-height behavior, invalid second-child zero
paint/cleanup, repeated paint and architecture negative controls. The approved
Column update adds the exact representable positive control. Code principles:
cohesion, source/function sizes, nesting, intentional comments and risk coverage
pass the AST/lint gate; required correctness/CI checks are complete.
No approved code-principle exceptions. No Changesets setup or changeset added.

## Paired correctness and cost evidence

`node artifacts/container-placement/paired.mjs after` passes against preserved
before captures, not a rerun of before against edited source. Each arm creates
its own font runtime/text service/resources. Four fixtures exercise nested
Block/Row/Column with padding/border, translated/decorated content, hidden clipping,
deferred header/footer recipes, and a discarded kept candidate on a used page.
Exact document/placement results, dimensions, node and measurement/recipe counts,
PDF bytes, qpdf checks, Poppler text bounds and 96-DPI page rasters all match.
Node counts are nested 43, hidden 45, deferred 48, discarded [0, 38]. Each has
rich=8, inline=4, measure=0 calls; only deferred has two recipe calls.
`node artifacts/container-placement/extended.mjs` completes seven paired fixtures:
the historical four plus nested raw paragraph, rich paragraph mixing native inline
with tight line height/background, and fixed visual content in an auto-margin kept
Block with translated parents and deferred header/footer decorations. Instrumented
actual raw/rich/fixed producer entries prove branch use; each arm creates its own
font runtime, text service, resources and native-inline data. Both arms use the
same harness bytes. Exact native JSON (including placements/dimensions), callback
counts, PDF bytes, qpdf validity/page count, Poppler text bounds and every page's
96-DPI raster match. Extended runs also reproduce the original four historical
JSON/PDF/raster outputs without overwriting them. `extended-proof.json` records
loaded module hashes and branch/callback counts. Before uses captured dirty-entry
dist, not whole-tree HEAD; all three captured pre-change producer/painter source
hashes match pinned `b70da49`, and the helper is absent from the before graph.
Initial new raw fixture omitted required definition fields and the deferred VDOM
fixture passed an unsupported `type` prop; both harness-only mistakes were corrected
before the successful run. Production behavior was not changed to accommodate them.

Invalid-second-child traces preserve the expected timing distinction:
before `[construct, constructed, child.paint, GEOMETRY, closed]`, current
`[construct, GEOMETRY, closed]`. No child paint is used for current preflight.

Same esbuild options in `paired.mjs` (browser ESM, minify off/on; gzip on minified
bytes; same profiles and providers) give the following **net batch** costs:

| Profile | Raw delta | Minified delta | Gzip delta |
| --- | ---: | ---: | ---: |
| core-only unused layout | 0 | 0 | 0 |
| full layout + tables exports | +711 | +236 | +69 |
| layout consumer | +711 | +241 | +89 |
| text/paragraph consumer | +711 | +236 | +68 |

Owned production source bytes: paint -1,317, container producer +159, Row producer
+158, new placement helper +2,362: net **+1,362 bytes**. This includes deleted old
helper and added placement metadata/closures; it is not a full-engine saving.

Five warmups then 15 fixed runs, before/current median milliseconds:
nested 4.217/6.103, hidden 3.585/5.083, deferred 3.897/5.169,
discarded 3.078/4.627. These noncontemporaneous samples are descriptive, not a
speedup claim. Additional preparation is O(k); rejected candidates pay it too,
and accepted candidates retain k records and k start closures until release.

`node --expose-gc artifacts/container-placement/heap.mjs` records five fixed
samples with explicit major GC and retained batches of 1,000 placement arrays.
Median incremental bytes for k=0/1/10/100 are 40,048 / 240,264 / 1,897,320 /
18,456,592, showing positive retained cost (about 184 bytes per child at k=100,
plus array overhead; environment-dependent, not an ABI size). The paired discarded
fixture uses five warmups and five batches of 20 runs: before/current median
72.475/67.482 ms, pre-GC heap deltas 31,778,800/31,720,736 bytes, post-GC retained
deltas 77,104/74,176 bytes. These are noisy heap deltas, not peak measurements or
proof of lower memory/time. Full raw samples are retained in `heap.json`.

## Independent audit handoff

The authorized seam transfer, paired matrix and gate reruns are complete.
`completion-entry.json` preserves the prior final manifest (SHA-256
`c5c1c9fa365cd5fa7bd3e5b578b32ca390580d67f3a51b61ce48a42dd30dac78`);
the new `final-state.json` lists the 12-path entry-relative ownership, actual full
dirty scope, source/artifact hashes and validation. Auditor should inspect actual
unstaged/untracked delta against entry hashes, allocation semantics, error timing,
deferred lifecycle, retained costs and preserved inherited scope. No PR until the
broader migration and required closure audits are complete.
