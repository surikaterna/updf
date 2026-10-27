# S7b2 automatic PNG URL masks: local delivery evidence

Objective: automatic `Source.url` PNG shape masks through the existing selected
text-flow preparation, Image loading service and native placement owners. Issue:
N/A. Integration owner: S7b2 Engineer. **Implemented; ready for independent audit,
not independently verified.** Completion evidence below supersedes the initial
incomplete gate, without erasing its failures.

## Worktree and preservation

- Worktree: `/home/sprawl/projects/updf/trees/image-preparation`.
- Branch: `feature/image-preparation`.
- Base/HEAD: `fbf2f78fd59635c6b965f2a707f35508dc1e4392`, unchanged.
- Before editing: 98 modified tracked files, 208 untracked files, 1,807 source
  manifest entries. Sorted path-to-SHA256 manifest hash verified as
  `e63acffb56137c73c1e89ab60c70dc9bef7e43b537375ca3dafd477ad70ef904`.
- All prerequisite dirt belongs to the supplied parent delivery. S7b2 changes
  remain unstaged/uncommitted, layered on that dirt. No staging, commit, tracker,
  push, PR, delegation, or delivery mutation was performed.
- No build, script write or HTTP asset request was made against the original
  `text-flow-design` worktree/server. All builds/checks used this target worktree.

## Delivery and owners

- New optional `@updf/text-flow/png-alpha` exports `pngAlphaShapes`; optional Images
  peer is pinned to the same exact version. `/png-shape` remains extraction-only,
  and `/sources` is unchanged, pure data. Defaults do not acquire PNG/Image/asset
  runtime imports. Selected integration acquires lookup/alpha inspection, not the
  loading session, transport, decoder, normalizer, or SVG parser.
- One owned resource-handler slot supplies the unique preparation contribution
  and prepared-token query. Numeric policy is captured immutably. Configuration
  never replaces a marker/compiler registration or installs mutable global limits.
- Private layout participation aliases retain one canonical compiler/capture owner.
  Distinct compiler families and copied handles still reject. The existing
  preparation descriptor owner carries the `participation-data` slot.
- Capture receives a phase-limited, source-bound work charger backed by layout's
  existing operation counter. Selected syntax parses/charges before suspension.
  Ordinary manual descriptors do not create URL requests. Floating threshold
  metadata is removed before ordinary Block style validation.
- Masks resolve through the selected Image service in either extension order.
  Every field still runs URI policy. The mask is retained before inspection;
  source and derived handles are charged/published by the existing stage writer.
  Metadata-only masks never become PDF XObjects. JPEG masks fail private PNG
  authentication; missing loading service fails at the shape occurrence.
- `pngAlphaInfo` authenticates the original PNG WeakMap identity before exposing
  frozen scalar metadata. No decoder, normalization, PNG certificate, core
  production, or native body-admission policy changed in S7b2.
- Private geometry WeakMap ownership and exact current-operation resource binding
  are checked before query metadata. Raw JSON/command-kind data cannot mint a
  geometry token. Repeated exact resource/threshold requests share one derived
  handle per session; signed zero cache identities remain distinct.
- Pixel/command ceilings are cumulative, lower-only 16,000,000/4,096. Pixels reserve
  before extraction using the pre-reservation allowance. Successful commands debit
  actual count; failure closes the operation. Zero remaining commands reject before
  another extraction even if its result might be empty. No contour cache/alpha plane
  survives globally; cross-render PNG cache hits still inspect a fresh shape.
- Retained geometry uses a deterministic logical payload cost: 42 header bytes
  (version/kind tags and five Float64 scalars), then one command tag plus Float64
  coordinates (17 bytes move/line, 1 close, 49 cubic). This is not peak JS heap
  accounting. Empty geometry costs 42; two retained rectangles cost 180. Exact byte
  boundary and boundary-minus-one cases are tested.
- `command-band.ts` is the sole native-command edge/projection owner; `path-band`
  retains syntax parsing separately. PNG projection uses directed rounding around
  each subtraction/division/multiplication/addition, using the existing binary64
  primitives, not a fit epsilon. Input/identity/quota domains remain exact. Native
  placement reports remain unchanged. Mask aspect stretches independently to the
  real Image painted rectangle; generic Block uses its border box.
- Transparent/threshold-one masks obstruct zero width without replacing the real
  positive-height visual. Holes/islands are retained but only outer side projection
  is used across the whole line-box/ink band. Path/custom visual URL masks reject
  before fetching. No center-lane, curve, margin, rotation/reflection or clip API.

One concrete bridge defect was found and fixed: a metadata-only floating Block's
descendant URL Image originally escaped capture and requested resolution after
seal. Metadata-only participation now declares its canonical body to the existing
capture walk and retains that walk's child handle during replacement. Child scopes,
requests and normalized occurrences are reused rather than recaptured.

## Exact checks and outcomes

Initial implementation target-worktree gates:

```sh
npm run lint
npm run typecheck
npm run format:check
```

All pass, including the full package build and structural code-principles checker.

Initial selected regression command, **218 passed / 0 failed**:

```sh
npx tsx --test packages/text-flow/test/*.test.ts packages/images/test/bridge*.test.ts packages/images/test/preparation-service.test.ts packages/layout/test/preparation*.test.ts packages/layout/test/visual-preparation.test.ts packages/layout/test/participation-markers.test.ts tests/consumer/png-alpha-graph.test.ts tests/integration/text-flow-graphs.test.ts
```

Risk-based additions cover exact/cache/signed-zero thresholds, independent concurrent
configurations, constructor ownership and duplicate handlers, masks with separate or
prebound visuals, service ordering/missing service, JPEG rejection, immutable capture,
syntax charging and phase revocation, private geometry rejection, command/pixel and
retained-byte boundaries, cross-render inspection, compiler aliases, exact dyadic
transformed-cell bounds at tiny/fractional/large scales, and actual native Image/text
rasters on both sides. The generic Block/descendant Image regression and existing
S4 backwards-ink/clearance suite pass. Browser bundler and unshaken Node CJS graph
checks passed; browser-runtime and new packed integration evidence was still missing
at that checkpoint. See the completed gates below.

## Initial incomplete full gate (retained history)

`npm test` was run once before the final added regressions: **1,859 tests, 1,825
passed, 34 failed**. The run reported widespread `Disk quota exceeded` / errno
`-122` during temporary npm installs, packing and fixture writes. `df -h` showed
`/tmp` tmpfs at 32G/36G used while the worktree filesystem had 1.6T available.
The CMR test also reported `missing raster ink: 4.`; its cause is not established
and is not claimed to be a quota failure or a baseline waiver. The failures remain
failures. Log: `/home/sprawl/.local/share/opencode/tool-output/tool_17d90ca92001mOkS0wnyL0bcLB`.
No unrelated temporary data was deleted or environment quota changed.

At that checkpoint code and selected regressions were delivered but not marked
implemented. No tracker mutation was authorized. Completion below addresses the
missing full, host, packed and paired-cost gates.

Code-principles self-check: cohesive source files under 400 lines, functions under
50 lines, nesting at most three, intent/invariant comments, exact-domain and native
certificate preservation, and risk-proportional tests checked. No approved principle
exceptions. The full-test checklist item was incomplete at that checkpoint.
This repository does not use Changesets; none was introduced.

## Completion assignment: scope and provenance

Fresh assignment starts at the same HEAD/branch/worktree above, with 98 modified
tracked paths, 223 untracked paths, 1,822 source entries, exact manifest hash
`8c84a1c584b5a950a001407ea6204f58ae0372206ef484d1a61b4009dcd46b8d`.
`artifacts/png-alpha-integration-final/before-source.json` freezes that delivery.
All inherited runtime implementation is unchanged by completion. This assignment
owns only this evidence update, the peer-aware `/png-alpha` public-entry condition
in `scripts/consumer/dual.ts`, three new `scripts/png-alpha-*.ts` proof/consumer/cost
files, two `tests/browser/png-alpha*.ts` proof files, and
`tests/consumer/types/png-alpha-template.ts`. No new features, numerical comparisons,
runtime guards, quotas, package dependencies or application migrations were added.
The inherited dirty/untracked scope remains caller-owned. Everything remains
unstaged/uncommitted; no Git delivery, tracker or delegation mutation occurred.

All new gate logs and cost/payload receipts live under the fresh ignored
`artifacts/png-alpha-integration-final/`. Large temporary installs and browser proof
PDFs live under target `artifacts/browser-png-test-tmp/`; exact proof paths are in
the gate logs. The supplied mkdtemp preload is inherited by npm subprocesses.
Node TMPDIR uses that shorter home-filesystem directory (the initial fresh long
TMPDIR failed tsx socket creation with EINVAL before compilation). Chromium alone
uses the explicitly authorized ignored `/home/sprawl/projects/updf/artifacts/s7-sockets`
for short sockets. No unrelated temporary data was removed or quota changed.
The supplied offline guard blocks external Node/browser requests; local reference
bytes come from `/tmp/opencode/text-flow-showcase-eevee.png`. The installed-consumer
resolver seal continues to reject ancestor-workspace package fallback.

The first new packed proof omitted the existing required geometry package, then
encountered a receipt-preload/isolation conflict, then correctly rejected the proof's
two floats in one Flow. Those setup errors were corrected without runtime changes:
pack the actual dependency closure, preload the receipt hook before ESM isolation,
and use two Flows in one operation. The root packed suite additionally exposed its
missing optional-peer filter for `/png-alpha`: this entry now requires both PNG and
Images in that profile, just as extraction already requires PNG. Fully selected
integration is exercised by the separate new packed consumer. A manual cost-control
fixture initially omitted `pathShapes()`; it now explicitly selects that handler.
One receipt write rejected an existing log filename after a completed command; the
runner now appends a timestamp instead of overwriting, and the gate was rerun.
The first combined showcase/browser command exceeded 240 seconds; no matching test
process remained, and longer serial reruns completed. Earlier failures remain logs,
not passes or production-code regressions silently waived.

## Completed validation

Run from the exact target worktree, serial build before tests, using
`node artifacts/png-alpha-integration-final/run.mjs '<command>'`. The runner records
the exact command, temp/preload environment, output and exit status in each log.
Browser settings additionally include `BROWSER_PNG_REFERENCE`, `PNG_SHAPE_REFERENCE`,
`TEXT_FLOW_SHOWCASE_PNG`, and a fresh `PNG_SHAPE_OUT` for extraction receipts.

| Exact command | Final result |
| --- | --- |
| `npm run typecheck` | pass, including full workspace build |
| `node_modules/.bin/tsx --test tests/integration/cmr.test.ts` | 4/4 pass |
| `npm run format:check` | pass |
| `npm run lint` | pass, including structural principles |
| `npm test` | 1,870/1,870 pass, zero skips/cancellations |
| `npm run build:browser` | pass |
| `npm run check:graphs` | pass |
| `npm run build:showcase` | pass |
| `npm run test:showcase` | 105/105 pass |
| `npm run test:browser` | 31/31 pass, zero skips/cancellations |
| `npm run test:consumer` | all 15 clean external tarball profiles pass |
| `node_modules/.bin/tsx scripts/url-images-consumer.ts` | pass |
| `node_modules/.bin/tsx scripts/image-cache-consumer.ts` | pass |
| `node_modules/.bin/tsx scripts/prepared-images-consumer.ts` | pass |
| `node_modules/.bin/tsx scripts/png-alpha-consumer.ts artifacts/png-alpha-integration-final/png-alpha-consumer-delivered.json` | pass |
| `node_modules/.bin/tsx scripts/png-shape-costs.ts artifacts/png-alpha-integration-final/costs.json` | pass |
| `node_modules/.bin/tsx scripts/png-alpha-costs.ts artifacts/png-alpha-integration-final/paired-costs-delivered.json` | pass |
| `npm run check:licenses` | pass |

CMR passed unchanged after the completed build, both alone and in two full suite
runs. The earlier `missing raster ink: 4.` failure is **not reproduced**, not proven
to have been quota-related or assigned an invented cause. No assertion, raster
threshold, PDF baseline, fixture, or production code was changed to get this result.

The new offline browser proof uses both a synthetic alpha PNG and the real local
512×512 Eevee bytes through `browserPngImages()`, actual `Source.url` masks and
native Image/text layout. Two occurrences in separate Flows share one derived
resource per operation. Three operations use thresholds 0, .15 and 1 with the same
cache/loader/format identities: one total fetch, the same owned PNG resource,
unchanged image-resource bytes, one cache entry, zero pending/consumer records.
Real-reference geometry is **2,505 / 2,545 / 0 commands**, charged
**34,611 / 35,163 / 42 bytes**; image resource stays **127,577 bytes**, cache
accounting **127,633 bytes**. Separate operations avoid exceeding the aggregate
4,096-command ceiling for distinct thresholds. All retain two positive-size native
image placements, including threshold one. qpdf accepts every complete PDF and
Poppler extracts all ten ordered text occurrences. A text-only painting of the
same native document coordinates is rasterized at 144 DPI and checked against the
actual normalized alpha plane: no red text pixel intersects an above-threshold
cell. Image nodes are removed only for this auxiliary raster oracle, not from the
complete proof PDFs. Ambient requests: zero. Final proof receipts/PDFs are at
`artifacts/browser-png-test-tmp/png-alpha-browser-rEj8Iv/`.

The new packed proof installs actual tarballs, not workspace aliases; checks shared
ESM/CJS factory identity, NodeNext/Bundler declarations without DOM or Node ambient
types, and rejects invalid typed limits/options. It renders three threshold
operations with two occurrences, one fetch and stable resource identity. Existing
root/no-Images/manual consumers still pass without selecting automatic integration.
The existing numerical, ownership, phase, capture, resource-budget, JPEG rejection,
extension-order and native letterbox/Block regressions all remain in the passing
full suite. No safety checks or constants were lifted.

## Corrected paired retained costs and payload (F2)

The earlier `png-alpha-integration-final/paired-costs-delivered.json` runtime
measurement is valid, but its **baseline attribution was wrong**: it used service
foundation `alpha-integration-s7b1/costs.json`, source
`aac549ef89a21066281e79d85e080993710b23fe1e0f931cbc65c7f05e6d35c0`, not completed S7b1.
That receipt and all historical logs remain unchanged; do not use its deltas as
S7b2 incremental costs. The earlier whole-milestone comparison is not repeated here.

Fresh `png-alpha-integration-fixed/paired-costs.json` uses completed S7b1
`alpha-integration-complete/costs.json` (28 rows / 14 profiles), source manifest
`e63acffb56137c73c1e89ab60c70dc9bef7e43b537375ca3dafd477ad70ef904`.
The script verifies the manifest digest and pins this historical cost receipt's
SHA256 `8d71f54c60ef79944fbc07a356dbb6deb82e8d58e349e94d6da0b5a7ec28156a`,
not merely its directory or matching row names. It checks all four shared profile
scripts against that manifest, row counts/names/minification flags against both
before receipts, and emits current receipt/source hashes. These are agreed frozen
before receipts, **not** a newly executed historical runtime reconstruction.

The fresh current cost-source manifest has 1,829 entries, hash
`d7ff5d61a08433c663ac2eeb0cfff3a07f139b852b4af7027e960095f3a04d1e` (before
final test-assertion and documentation corrections; runtime unchanged). Current costs SHA256:
`d0be984af4d3036552ce054609a2126262f77d0d6e3d17028087c2e7c0b27f79`.
Browser ESM ES2022 retained output, raw / minified / min-gzip (level 9):

| Existing profile | Completed S7b1 → fresh F1-corrected current |
| --- | --- |
| drawing | 73,533 / 38,812 / 13,236 → unchanged |
| ordinary text | 120,583 / 62,379 / 21,320 → unchanged |
| prepared font | 127,172 / 66,655 / 22,620 → unchanged |
| native JPEG | 85,733 / 45,369 / 15,685 → unchanged |
| authored render | 373,214 / 189,464 / 60,880 → 373,658 / 189,638 / 60,948 |
| atomic text-flow | 458,659 / 232,266 / 75,504 → 459,103 / 232,437 / 75,575 |
| layout measurement | 375,323 / 189,625 / 61,457 → 375,765 / 189,799 / 61,515 |
| ordinary prepared PNG | 405,272 / 206,249 / 66,801 → 405,915 / 206,495 / 66,910 |
| floating prepared PNG | 504,165 / 255,997 / 83,459 → 506,653 / 257,314 / 83,860 |
| ordinary prepared JPEG | 400,145 / 203,363 / 65,850 → 400,788 / 203,609 / 65,936 |
| floating prepared JPEG | 499,062 / 253,109 / 82,483 → 501,550 / 254,429 / 82,891 |
| cached URL PNG | 463,167 / 237,070 / 76,498 → 465,545 / 238,101 / 76,804 |
| native PNG | 25,107 / 13,305 / 5,141 → unchanged |
| manual command projection | 6,987 / 3,486 / 1,664 → 6,990 / 3,484 / 1,664 |

These default-path increases are real integration/capture/alias costs; absence of
PNG decoding in default graphs does not mean zero retained-size cost. Examples of
corrected S7b2 min/min-gzip deltas: authored render **+174/+68**, floating PNG
**+1,317/+401**, cached URL PNG **+1,031/+306**. The separate `fixOnly` fields compare
against old final `png-alpha-integration-final/costs.json` (SHA256
`27687823075d16c5aaf70d9686f3c1d4839498bad74aaf20c13593d08ab4c6d0`, source
`86376208133c2a9879792ba284a54323a2f82678c2b233f60a903a82b5045fb4`): respectively
**+32/+26**, **+27/+2**, **+35/+16**. Do not sum whole integration and fix-only deltas.

Fresh fully selected two-occurrence/three-operation portable consumer:
manual polygon + `pathShapes()` **602,204 / 307,353 / 99,988** versus automatic
URL + `pngAlphaShapes()` **605,199 / 309,085 / 99,718**. Difference:
**+2,995 raw / +1,732 min / −270 min-gzip**. This is a whole selected-feature
comparison, not a S7b1 delta or identical behavior at threshold one. Both actually
render with one fetch and unchanged 108-byte PNG / 164-byte cache accounting;
automatic geometry adds 180 / 180 / 42 logical bytes. No latency/peak-heap claim.

Fresh unshaken CJS inventories omit harness preloads: root 232 modules / 677,596
bytes; `/sources` 1 / 2,269; `/path` 236 / 684,852; `/png-shape` 63 / 139,384;
`/png-alpha` 237 / 704,595. Full browser/CJS graph tests enforce selected integration
without loader/cache/backend/decoder/normalizer/SVG parser, and default/extraction
entries without Images integration. The CJS inventories are not shaken bundle sizes.
Historical final `payload.json` records all-format emitted JS/declarations/maps and actual tarballs
for the ten-package selected consumer closure. Text-flow totals: **139,205 JS /
40,890 declarations / 272,339 all dist bytes**, pack **56,554 bytes**. These are
whole package payloads, not incremental/default consumer costs.

## Preservation, principles and audit handoff

`node artifacts/png-alpha-integration-final/preserve.mjs artifacts/png-alpha-integration-final/original-preservation.json`
passes: original **1,663 sources/status, 5,288 history, 80 dist**, PID **665048**
on **5182** unchanged. No original source/build/restart or live asset request.
Target historical source/cost/bridge receipts were not overwritten; new runtime
proofs and temporary installs are target-owned ignored artifacts.

Code-principles checklist: correctness and no avoidable unsafe patterns checked;
cohesive sources ≤400 lines, functions <50 lines, nesting ≤3; intent/invariant
comments; risk-based browser/native/packed/type additions; format/lint/typecheck/full
tests pass. No approved exception. No numerical/runtime changes in completion.
No Changeset for this existing unpublished workflow. Issue/tracker: N/A, unchanged.
Status: **implemented, ready for independent audit**, not verified. Auditor should
review the actual inherited S7b2 runtime delta plus this eight-path completion
allowlist, especially preparation/body retention, operation-local geometry authority,
directed projection, quota/resource charging, optional entry isolation and the
disclosed default-path costs. No additional feature slice is implied.

## Bounded audit correction: F1 runtime and F2 evidence

Issue N/A; same worktree/branch/base/HEAD. Entry state: 98 tracked modified,
229 untracked, 1,828 manifest entries, inherited final source hash
`86376208133c2a9879792ba284a54323a2f82678c2b233f60a903a82b5045fb4`.
Ownership is limited to `content-role.ts`, `preparation-content.ts`,
`participation.ts`, new `png-alpha-block-children.test.ts`, `png-alpha-costs.ts`
and this document; new ignored collectors/logs/receipts live only in
`artifacts/png-alpha-integration-fixed/`. No staged/committed files or tracker,
delivery, delegation, original-server or ambient asset-request mutations.

F1: metadata-only floating Block bodies lost their canonical Block parent when
captured and later consumed as independent roots. Both routes now use the same
private `checkBlockChildRole` helper in the existing role owner. Only an undefined
root parent falls back to `blockIdentity`; all deeper parent identities still go
through unchanged `checkRole`. No wrapper VNode, extra box, source/key/path rewrite,
new hierarchy rule, numeric coercion, normalization budget or core/paginator edit.
Root Block.Body/Header/Footer remain illegal outside Block. Real reserved slots
are Header/Footer, not Page/Flow regions or invented Before/After author APIs.

Seven regressions check plain/masked Body and all reserved-slot combinations,
complete native documents/placements/source keys, nested provider callbacks,
raw-data snapshots without freezing callers, deferred Row/Column provider shadowing,
child Image URLs, malformed later descendants and text/numeric/deep-parent rejection.
Opaque masks give exactly equal native documents in these spacer fixtures; no
epsilon or altered pixel oracle was introduced. Header/Footer callbacks stay late
and run once. Image fields are captured in mask-then-child order, each URI is
policy-checked, same URL fetches once, distinct URLs twice; total loader policy
calls are 3/4 including load-time checks. Publication is mask, derived geometry,
then distinct child image; only the child image is embedded/painted once. Existing
exact retained-byte, lifecycle, scalar, command/pixel, geometry-owner and projection
tests remain unchanged. No numerical, Source constructor, ResourceBudget or native
certificate policy changed.

All checks below use the fresh runner
`node artifacts/png-alpha-integration-fixed/run.mjs '<command>'`, from the exact
target cwd. Environment retains the supplied quota-aware temporary preload,
target ignored large temporary directories and short Chromium sockets. Browser
and showcase use cached local `TEXT_FLOW_SHOWCASE_PNG`/`BROWSER_PNG_REFERENCE` via
the supplied offline guard. Exact command/environment/status are in each fresh log.

| Exact command | Correction result |
| --- | --- |
| `npm run build -w @updf/layout` | pass |
| `node_modules/.bin/tsx --test packages/text-flow/test/png-alpha*.test.ts packages/layout/test/preparation*.test.ts packages/layout/test/participation-markers.test.ts` | 63/63 pass |
| `node_modules/.bin/tsx --test packages/text-flow/test/png-alpha-block-children.test.ts` | 7/7 pass, including final source-order assertions |
| `npm run format:check` | pass |
| `npm run lint` | pass, including structural principles |
| `npm run typecheck` | pass, full build included |
| `node_modules/.bin/tsx --test tests/integration/cmr.test.ts` | 4/4 pass |
| `npm test` | 1,877/1,877 pass, no skips/cancellations |
| `npm run build:browser` | pass |
| `npm run check:graphs` | pass |
| `npm run test:consumer` | 15 external tarball profiles pass |
| `node_modules/.bin/tsx scripts/png-alpha-consumer.ts artifacts/png-alpha-integration-fixed/png-alpha-consumer.json` | pass, fresh outfile |
| `node_modules/.bin/tsx scripts/url-images-consumer.ts` | pass |
| `node_modules/.bin/tsx scripts/image-cache-consumer.ts` | pass |
| `node_modules/.bin/tsx scripts/prepared-images-consumer.ts` | pass |
| `npm run build:showcase` | pass |
| `npm run test:showcase` | 105/105 pass |
| `npm run test:browser` | 31/31 pass, local Eevee alpha counts 2,505/2,545/0 retained |
| `node_modules/.bin/tsx scripts/png-shape-costs.ts artifacts/png-alpha-integration-fixed/costs.json` | pass |
| `node_modules/.bin/tsx scripts/png-alpha-costs.ts artifacts/png-alpha-integration-fixed/paired-costs.json` | pass, pinned completed baseline |
| `node_modules/.bin/tsx --test packages/text-flow/test/side-path.test.ts packages/text-flow/test/path-fix.test.ts packages/text-flow/test/rectangle-clearance.test.ts` | 33/33 pass |
| `node artifacts/png-alpha-integration-fixed/paginator-preservation.mjs` | pass, exact HEAD and inherited-manifest equality |
| `node artifacts/png-alpha-integration-final/preserve.mjs artifacts/png-alpha-integration-fixed/original-preservation.json` | pass: 1,663 sources, 5,288 history, 80 dist, PID 665048 unchanged |
| `npm run check:licenses` | pass |
| `git diff --check` | pass |

Retained failures: initial new-test policy expectations undercounted loader checks;
another malformed fixture lacked required Image dimensions; initial formatting
needed correction; final metadata-order assertion needed a test-only object type
cast. All were corrected and rerun, not production relaxations. Legacy
`node_modules/.bin/tsx scripts/text-flow-paginator-proof.ts` **fails**: it inserts
a provenance import into HEAD that already contains it, expecting a duplicate.
The helper was not changed or called passing. The stricter direct byte comparison
above proves paginator unchanged; a future helper cleanup is outside this slice.
CMR's earlier unknown `missing raster ink: 4.` failure did not recur; no raster
threshold/baseline changes and no invented cause/waiver. Historical receipts stay
read-only. Final source allowlist and hashes are collected separately, excluding
ignored artifacts, so evidence does not claim an impossible self-hash.

Code-principles self-check: all checklist items satisfied, no approved exceptions;
cohesive production files ≤400 lines, functions <50 lines, nesting ≤3, comments
explain intent, risk-based additions above, standard gates pass. No Changesets
workflow. Status **implemented, ready for independent re-audit**, not verified or
S7 complete. Auditor should verify both private parent-context sites and corrected
receipt/source binding; independent audit and all delivery decisions remain external.

## Historical Paginator proof correction (supplemental final receipt)

This separately authorized bounded tool correction supersedes the legacy-helper
failure disposition above, not the retained failure log. The initial failure was
a stale historical tool: HEAD already includes the provenance migration, so using
HEAD as its pre-change input inserted a duplicate import. It is now fixed, **not
waived**. No Paginator or other runtime source was edited, even temporarily.

Same cwd, branch and base/HEAD as above; issue N/A. Entry manifest: **1,829 files**,
SHA256 `0cf9ac45606cafa8e5a1edbcb1ac9661b3a7220ea216c944c1f3ce0605b0f491`.
Ownership is only `scripts/text-flow-paginator-proof.ts` and this appended evidence;
all other dirty/untracked source belongs to the parent delivery. Both remain
unstaged/uncommitted. No dependency, template, guard, threshold, runtime code path,
Git delivery, tracker or delegation changes were made.

The proof defaults to known pre-provenance revision
`882d6d38f432edcac97e962fbf446062c1483c3d`. Inspection with `git show` confirmed its
original `sourcePaths?.[offset]`, `sourceKeys?.slice(offset, fragment.nextOffset)`
and absence of a provenance import. This pin preserves the original migration
proof's meaning rather than treating today's HEAD as yesterday's source. An
optional first CLI argument selects a reference, but every input must still lack
the provenance import and contain each of the five original replacement anchors
exactly once. The exact original two reporting-site/import transformations are
unchanged. Full resulting bytes must equal the current relative Paginator file;
there is no AST normalization or allowance for other edits. The success message
names the actual baseline instead of falsely describing this comparison as HEAD
identity. Explicit `HEAD` rejects as `Invalid pre-provenance baseline HEAD:
provenance import`.

Fresh ignored evidence is under
`artifacts/png-alpha-integration-fixed/proof-correction/`. Run
`node artifacts/png-alpha-integration-fixed/proof-correction/collect.mjs checks`
recorded exact commands, cwd, stdout/stderr and exits in `checks.json`:

| Command (target cwd unless stated) | Result |
| --- | --- |
| `node_modules/.bin/tsx scripts/text-flow-paginator-proof.ts` | pass against pinned baseline |
| Absolute target `node_modules/.bin/tsx` and actual repository proof filepath, cwd `artifacts/paginator-proof-negative` | expected exit 1 at `Paginator edits exceeded the two provenance reporting sites/import` |
| `node_modules/.bin/tsx scripts/text-flow-paginator-proof.ts HEAD` | expected exit 1, clear invalid pre-provenance baseline rejection |
| `npm run format:check` | pass |
| `npm run lint` | pass, including unchanged structural principles |
| `npx tsc --noEmit` | pass; no build invoked |
| `git diff --check` | pass |

The fresh negative-control directory was verified absent under the target's
existing ignored `artifacts/` parent. Its relative
`packages/layout/src/paginator.ts` is a copy of current bytes with one unauthorized
trailing comment. Git ancestor discovery fetched the real pinned revision; the
actual repository script rejected the copied file at equality, not at Git/module
infrastructure. This bounded positive/negative proof covers the changed tool risk;
no permanent production test file was necessary.

Proof SHA256 before:
`2ec089b78e106b5120fa193749d9bc28f66a5bba97141c012f23962ebf25d748`;
after: `43fc06bfae482ea994d937bb633ed588f8f949da50e56ad7fac4ee5183e8b4aa`.
Actual Paginator SHA256 remains
`df161d66dd707e043be497aa66acf844a6bb9b6b8181753d260f98bee15d9b50`, also exactly
HEAD and the inherited completed S7b1 bytes (existing direct preservation proof).

`collect.mjs before` and `collect.mjs after` bind the complete sorted source
manifests, unchanged runtime-source hash and exactly these two changed paths in a
supplemental `delivery.json`; final source count remains **1,829**. The final hash
is in that receipt rather than self-embedded here. The historical six-path F1/F2
`png-alpha-integration-fixed/delivery.json` seal is immutable and checked unchanged;
it is supplemented, not rewritten. Completed-S7b1 F2 cost provenance and runtime
costs remain unchanged; no package/application build or cost regeneration was
needed. The already recorded 1,877/1,877 full suite is inherited evidence, not a
new run for this tool-only correction. No access that writes/restarts the original
worktree/server was made; original 1,663/5,288/80 and PID 665048 preservation stays
in force.

Code-principles: all checklist items checked; cohesive 37-line tool, eight-line
helper, no added control-flow nesting, no numerical/runtime contract changes,
risk-based controls and all scoped gates pass. No approved exception or weakened
gate. **Implemented; corrected S7b2 ready for independent Auditor**, not verified
or S7 complete. Auditor should inspect the exact unchanged transformation, pinned
baseline/anchor rejection, copied-file equality failure, supplemental two-path
manifest delta and immutable historical receipt alongside the pending F1/F2 audit.
