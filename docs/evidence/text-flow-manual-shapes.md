# S3 manual shapes — engineering completion

## P2 must-fix follow-up — current delivery

Issue N/A. **Implemented; pending independent re-audit, not verified.** This
section supersedes the earlier completion results below without rewriting their
artifacts or the original `manual-shapes-before` baseline.

Worktree `/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`, base/HEAD unchanged at
`fbf2f78fd59635c6b965f2a707f35508dc1e4392`. Entry dirty state was 70 tracked
unstaged/26 untracked inherited S2+S3 paths. Delivery is 70 tracked unstaged/27
untracked, 1,626 source paths; nothing staged or committed. This assignment owns
only nine changed/new paths relative to the prior final source seal: four addon
runtime files, one regression test, three evidence collectors and this document.
No tracker, delegation, delivery, protected app dist, core/layout/text, geometry,
numerical or selection changes were made in this follow-up.

### Fixes and regression boundary

- `source-capture.ts` validates records before inspecting fields, then uses the
  existing `ownDataValue` owner for tags and required payloads. Prototype fields
  cannot provide missing tags, URLs, path data or polygon points. Optional fill
  rules default only on own omission; explicit undefined/null still reject.
  This also makes forged omission agree with the pure builder's omission default.
- `path-entry.ts` captures own `style`, `d`, `fill` and optional `fillRule` before
  use. Missing required fields retain source-specific diagnostics. The existing
  builder TypeError conversion remains bounded to descriptor conversion.
- `component-owner.ts` validates the original authored style with the existing
  data-record owner before metadata extraction. Floating metadata, required
  width/height and default children use own data reads. Metadata removal copies
  only validated own fields, without destructuring inherited getters. The layout
  Block owner still owns style-key and decoration validation; no copied style
  validator was introduced. Pure `sources.ts` options were already own-checked
  and remain byte-unchanged, with no core or feature imports.
- `handlers.ts` captures every configuration, including both empty-option routes,
  into a frozen null-prototype record. Neither missing-handler lookup nor duplicate
  detection sees `Object.prototype`. Callback identities and member-call `this`
  semantics are unchanged; unknown/copied handles still reject.
- `own-source-handlers.test.ts` adds ten regressions covering inherited values and
  getters, required Path fields/dimensions, hostile records, omission-only defaults,
  null-prototype authored sources, reused syntax data, all empty-config routes,
  duplicate detection and fake handles. Prototype descriptors are restored exactly
  in synchronous `finally` blocks; the test file runs in its own Node test worker.
  Invalid boundaries return structured diagnostics and inherited callbacks/getters
  execute zero times. Existing configuration snapshot tests remain unchanged.

### Fresh checks on the fixed runtime

All commands ran from the exact worktree above. Logs are under
`/tmp/opencode/updf-s3-fixed-*.log`.

| Command | Outcome |
| --- | --- |
| `npm run build -w @updf/text-flow` | Pass |
| `npx tsx --test packages/text-flow/test/own-source-handlers.test.ts packages/text-flow/test/manual-shapes.test.ts packages/text-flow/test/sources.test.ts` | **18/18 pass**, ten new tests |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including AST principles |
| `npm run typecheck` | Pass, full package builds and root TypeScript |
| `npm test` | **1619/1619 pass**, prior 1609 plus ten |
| `npm run build:browser` | Pass; existing large-chunk warning only |
| `npm run check:graphs` | Pass, all 12 profiles |
| `npm run test:consumer` | Pass, 15 external tarball closures and declaration/ownership checks |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s3-fixed-showcase-20261023-a npm run build -w @updf/showcase -- --outDir /tmp/opencode/updf-s3-fixed-showcase-20261023-a` | Pass, new isolated output only |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s3-fixed-showcase-20261023-a npm run test:browser` | **22/22 pass** |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s3-fixed-showcase-20261023-a npm run test:showcase` | **105/105 pass**, standalone 600-second tool allowance |
| `npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/manual-shapes-fixed/costs --compare artifacts/text-flow/manual-shapes-before/costs/report.json` | Pass, fresh build and 286 metrics |
| `npx tsx scripts/text-flow-manual-summary.ts` | Pass, same flags/inputs/tool identity, isolated CJS load graphs, fixed-vs-prior-final comparison |
| `npx tsx scripts/text-flow-manual-parity.ts` | Pass, **24 frozen browser/Node pairs** |
| `npx tsx scripts/text-flow-manual-evidence.ts` | Pass, protected state and source-scope seal |
| `npx tsc --noEmit` | Pass, final collector/test source |
| `git diff --check` | Pass |

Initial focused-test fixture errors (missing Flow settings and mixed source/built
handler identity owners) were corrected before the passing run, not waived. The
first showcase run was terminated by the 200-second tool timeout; the standalone
rerun completed with zero failures/cancellations. No checks remain running. The
prior clean source-only `npm ci`/typecheck receipt is preserved, not claimed as a
fresh clean-install run; this follow-up does not change the source API or imports
of the pure descriptor entry.

### Fixed retained costs and preservation

Collectors now default to `manual-shapes-fixed` (optional
`TEXT_FLOW_MANUAL_OUT` override). Prior `manual-shapes-final` artifacts remain
untouched. New `summary.json` records the full 286-metric delta against that prior
final, alongside the original dirty-S2 comparison. Eleven old profile inputs are
unchanged; Path's same-content canonical API migration remains explicitly disclosed.
All four new profiles retain their absolute-cost-only status (254 old + 32 new).

Relative to prior S3 final, every non-addon emitted metric and ordinary consumer
bundle is zero-delta, as is `/sources` on both platforms (1310/599 browser min/gzip,
1993/891 Node). No new ordinary-graph feature retention or core/seam cost is hidden.
New validation adds 968 browser-ESM JS bytes, 1170 CJS JS bytes, 483 tarball bytes
and 3005 unpacked payload bytes, all in `@updf/text-flow`; declarations/facades
are unchanged. These are package payloads, not installed dependency footprints.

| Profile | Browser min / gzip | Node min / gzip | Fix-only min / gzip delta (browser; Node) |
| --- | ---: | ---: | --- |
| sibling rectangle | 235380 / 76402 | 361727 / 110519 | +267 / +89; +481 / +151 |
| canonical Path | 245135 / 80235 | 376713 / 115892 | +324 / +110; +610 / +207 |
| manual path descriptor | 219886 / 71137 | 347841 / 105810 | +324 / +102; +610 / +181 |
| polygon descriptor | 219889 / 71138 | 347844 / 105809 | +324 / +103; +610 / +180 |
| syntax + geometry | 221070 / 71625 | 349220 / 106484 | +324 / +113; +610 / +180 |

Frozen parity preserves all eleven other profile charge sequences. Path retains
the previously disclosed single identity group and **5838-to-5857-byte PDF**
difference, with identical extracted text and both page rasters, not exact PDF
bytes. No geometry or selection semantics changed. Existing URL no-I/O/unsupported
resolution and work-budget tests still pass. Entry-isolated CJS graphs and bundled
browser/Node graphs still exclude all core/layout/text/geometry/assets runtime from
`/sources`; unshaken loader flags are unchanged.

`manual-shapes-fixed/preservation.json` seals all 1,626 current source hashes and
the exact dirty state, and restricts changes against the prior final source seal
to the nine owned paths. It checks all **4826 historical hashes**, **80 live dist
files**, lock, exact PID **665048** command and both tailnet HTTP fingerprints.
The served dist was never rebuilt/restarted. `final.patch` includes tracked scope;
the hash manifest also covers untracked implementation/tests. Original before/final
seals are retained separately.

Code-principles checklist: correctness validated; defaults followed; cohesive files
under 400 lines; functions <=49 lines and nesting <=3; intent-only comments;
risk-based tests added; lint/tests pass. **No approved exceptions.** No Changesets
workflow. Remaining acceptance is independent re-audit of the actual dirty scope,
especially own-field diagnostics/zero getter calls, frozen configuration identity,
and the fixed cost/source seal. Engineer status is implemented, never verified.

---

Issue: N/A. **Implemented; ready for independent audit, not verified.** The final
sections below supersede the historical draft checkpoint retained at the end.
S2's independent verification and all historical seals remain unchanged.

## Final delivery and ownership

- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/HEAD:
  `fbf2f78fd59635c6b965f2a707f35508dc1e4392` (unchanged).
- Assignment entry: 68 tracked unstaged and 20 untracked paths, inherited S2 plus
  S3 draft. Final delivery: 70 tracked unstaged and 26 untracked paths, including
  inherited work. No staged changes, new commits, delivery/tracker mutations or
  delegation. Engineer owns only the authorized S3 completion delta; inherited S2
  work is preserved, not reattributed.
- `artifacts/text-flow/manual-shapes-final/preservation.json` records every current
  source hash, exact dirty state, changed-since-S2 paths and protected-state results;
  `final.patch` captures the tracked delivery. This includes untracked implementation
  and tests, not just committed HEAD. The original S2-entry manifest remains at
  `manual-shapes-before/manifest.json`.

## Completed contract

Central `textFlow({ handlers: [pathShapes(), shapeSyntax()] })` reuses S2's ordinary
service and owned operation initialization. Generic feature lookup delegates to the
same capability owner, including retry, recursion and lifetime checks. Configuration
is captured once; text selection is requested only for affected Paragraph siblings.
Geometry-only ordinary Paths and lone floats work without fonts or a text provider.

`Source.url`, `Source.path` and `Source.polygon` produce immutable plain data, with
strict recapture after VDOM snapshots. The `/sources` entry imports no core, geometry,
assets, text or font runtime. Builders throw bounded `TypeError`s, while document
consumption reports sourced diagnostics. Fill rules default only on omission;
explicit undefined/null rejects. Polygons use flat finite numeric pairs, at most
8190 coordinates, and the existing polygon normalization (no generated path strings).

Optional strings accept matching quoted `path(...)`/`url(...)`, matching-quote and
backslash escapes, and finite numeric `polygon(...)`. Units, nesting, nonfinite
coordinates, bare path strings, `rect`, old untagged objects and
`path(evenodd, ...)` reject. URL resolution/extraction remains explicitly unsupported
and performs no I/O. No alpha extraction, center wrapping or text inside holes is
claimed. S4 clearance and the protected numerical/shape algorithms are unchanged.

`/path` exports `Path`, `pathShapes` and Path prop types; the retired factory is not
aliased. Active consumers, type fixtures, browser assertions, packed-consumer script,
cost fixture and both allowed showcase source files use the central route. Historical
factory strings in frozen evidence and the historical S1 comparison driver describe
that historical API, not current runnable imports. `/atomic` remains the separate
owned-capability compatibility contract.

### Generic semantic identity fix

`packages/layout/src/participation.ts` now keeps multiple marker identity/capture
pairs in each existing owner. The existing identity-to-owner table is reused;
each marker captures its own raw props exactly once. Handles are not marker
identities, copied handles reject, and two actual owners remain conflicting.
Both value and parent roles map recognized owned markers to the existing Block
identity for hierarchy checks. Original normalized nodes, paths, keys, raw values
and normalized decoration children survive unchanged; whole-array `convertBlocks`
still owns body-order/auto-margin validation.

Ordinary Path, floating Path and floatable Block are direct semantic components,
not functions returning a marker envelope. There is no `/expanded` provenance,
second normalization, new box engine, installed service registry, alternate painter,
or double capture. Block decorations and unknown-attribute rejection remain with
the existing owners. Generic two-marker tests cover distinct captures, authored
keys/paths, nested Block roles, missing installation, conflicting owners, forged
handles and non-overwriting identities. Existing Path/parser/color and deferred
decoration assertions were preserved, not weakened.

Path first probes its empty retained Block for resolved min/max dimensions, then
the normal compiler prepares that same completed Block with its native child.
An unused intermediate complete-preparation call was removed. Rectangle-only
Blocks skip the geometry probe entirely and retain S2's exact charge sequence.
Default Path geometry is normalized once, then shared by painting and exclusion;
an independent override normalizes independently. Source work is charged before
parsing, proven with a rejected-work test that observes zero parser calls.

## Runtime parity and intentional Path structure change

`npx tsx scripts/text-flow-manual-parity.ts` passes **24 browser/Node frozen-bundle
pairs**. Eleven unchanged profiles have exact output/PDF, provenance and cumulative
charge sequences. The Path profile keeps the same authored content but intentionally
migrates the factory/service pair to the central installer.

**Path is not byte-identical to the old fixed-root visual:** retaining the actual
Block adds exactly one identity `paintGroup` around its unchanged native Path.
The sample PDF grows from 5838 to 5857 bytes. The parity script asserts that precise
single envelope, then exact equality of all remaining native data, placements,
keys, paths and ranges. Both original PDFs pass qpdf, have identical extracted text
and byte-identical Poppler rasters for both pages, on both bundle platforms.
This is an explicit retained-Block representation cost, not a geometry/clearance
change or a claim of exact PDF bytes. Auditor should inspect this intentional
model consequence rather than accepting a blanket parity waiver.

`manual-shapes-final/parity.json` records both full charge sequences and a compact
list of changed Path counters: retained-Block preparation, native/group/output
validation and PDF serialization. Geometry/selection work is not bypassed. Raw
descriptor/syntax parsing overhead for new profiles is separate from the frozen
same-content comparisons. No baseline artifacts were rewritten.

## Final checks (serial, from the exact worktree above)

| Command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including AST code-principles |
| `npm run typecheck` | Pass, including every package build and root TypeScript |
| `npm test` | **1609/1609 pass** |
| `npm run build:browser` | Pass; existing Vite large-chunk warning only |
| `npm run check:graphs` | Pass, all 12 build profiles |
| `npm run test:consumer` | Pass, 15 external tarball closures, NodeNext/Bundler declarations and mixed-loader ownership |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s3-showcase-final-20261023-c npm run build -w @updf/showcase -- --outDir /tmp/opencode/updf-s3-showcase-final-20261023-c` | Pass, isolated output only |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s3-showcase-final-20261023-c npm run test:browser` | **22/22 pass**, including current Path/sibling Chromium parity and actual showcase PNG/Path pixels/PDFs |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s3-showcase-final-20261023-c npm run test:showcase` | **105/105 pass**, standalone final-source rerun |
| `node /tmp/opencode/updf-s3-clean-build-final.mjs` | Pass: source-only copy, `npm ci --ignore-scripts`, full `npm run typecheck`; no generated outputs copied |
| `npx tsx scripts/text-flow-manual-parity.ts` | Pass, 24 frozen runtime pairs with the exact Path representation difference above |
| `npx tsx scripts/text-flow-manual-evidence.ts` | Pass: protected history/dist/lock/PID/HTTP hashes |
| `git diff --check` | Pass |

Earlier integration/type/inventory failures were corrected, not waived. Two combined
browser-plus-showcase commands exhausted their aggregate tool timeouts; subsequent
standalone showcase runs completed with no cancelled tests. No asynchronous checks
are left running. The clean-copy receipt is in `manual-shapes-final/clean-build-complete.json`.

## Retained cost evidence

Exact command:
`npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/manual-shapes-final/costs --compare artifacts/text-flow/manual-shapes-before/costs/report.json`.
Then `npx tsx scripts/text-flow-manual-summary.ts` checks lock/tool identity and
records current and frozen-tarball unshaken CJS closures. All 15 package JS,
declaration, facade and tarball inventories plus raw/min/gzip browser/Node bundles
are retained in the report. The old **254 metrics** remain; four new profiles add
32 absolute-cost metrics (**286 total**). Eleven old inputs are byte-identical;
only Path intentionally changes API imports/installation while keeping content.

Selected minified consumer costs (bytes / gzip bytes):

| Profile | Browser current | Browser delta | Node current | Node delta |
| --- | ---: | ---: | ---: | ---: |
| drawing | 38812 / 13236 | 0 / 0 | 63350 / 20080 | +156 / +20 |
| ordinary text | 62379 / 21318 | 0 / 0 | 131811 / 40843 | +361 / +77 |
| ordinary layout | 184909 / 59839 | +42 / +14 | 317247 / 96222 | +392 / +110 |
| sibling rectangle | 235113 / 76313 | +3946 / +1216 | 361246 / 110368 | +7299 / +2014 |
| canonical Path | 244811 / 80125 | +4858 / +1404 | 376103 / 115685 | +9179 / +2611 |
| sources only (new) | 1310 / 599 | N/A | 1993 / 891 | N/A |
| manual path descriptor (new) | 219562 / 71035 | N/A | 347231 / 105629 | N/A |
| polygon descriptor (new) | 219565 / 71035 | N/A | 347234 / 105629 | N/A |
| syntax + geometry (new) | 220746 / 71512 | N/A | 348610 / 106304 | N/A |

The generic lookup/identity tax is small but nonzero; it is not hidden as a zero-cost
claim. Ordinary graphs have no text-flow business implementation. The rectangle
root excludes geometry/path/syntax; sources-only CJS and browser graphs contain no
core/layout/text/geometry/assets. The shared geometry handler intentionally retains
the existing parser module for polygon consumers; no polygon-parser-free claim.
Node import facades still share CJS identities rather than providing genuine Node
ESM tree-shaking. Unshaken load paths/counts/bytes, their frozen-tarball comparisons,
all input hashes and every package delta are in `manual-shapes-final/summary.json`.

All-library totals: browser ESM JS 859895 (+17562), CJS JS 992129 (+19426),
declarations in each 347597 (+5563), facade JS 15176 (+295), facade declarations
3488 (+138), compressed tarballs 728469 (+12315), unpacked payload 4021408 (+76584).
These are emitted/package payloads, **not installed dependency footprint**.

## Preservation and code-principles handoff

The final seal checks all **4826 historical artifact hashes**, all **80 live showcase
dist files**, the package lock, exact PID 665048 command and both HTTP fingerprints.
The served dist was never rebuilt or restarted. Final isolated preview build is
`/tmp/opencode/updf-s3-showcase-final-20261023-c`; no live delivery is implied.

- Correctness: focused regressions, root suite, native PDF/raster oracles, frozen
  same-content comparisons and real browser/package checks pass.
- Defaults/cohesion: only authorized S3 work plus preserved inherited S2; the sole
  new layout production change is generic multi-marker participation. No normalizer,
  numerical policy, painter or native admission rewrite. No approved principle exceptions.
- Size/complexity: production files <=400 lines, functions <=49 lines, nesting <=3;
  enforced by passing AST gate. Comments explain invariants/tradeoffs.
- Risk-based tests: multi-marker capture/roles/ownership, immutable hostile builder
  inputs, syntax rejection, configuration snapshot/duplicates, lazy geometry-only
  flow, parse sharing/pre-parse quota rejection, existing keys/diagnostics/deferred
  decorations, mixed ordinary/floating barriers and static package isolation.
- Lint/tests pass. No Changesets workflow exists or was introduced.
- Remaining: independent Auditor review, especially raw child/role preservation,
  lifecycle/config identity, retained-Block Path grouping/charges and emitted cost
  interpretation. S3 is **implemented**, never claimed independently verified.

---

## Historical draft checkpoint (superseded; not current status)

The following records the prior incomplete assignment, including its real failures.

## Worktree and preserved baseline

- Cwd: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/HEAD:
  `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- Entry ownership: inherited S2, 55 tracked unstaged and 11 untracked paths.
  No staging, commits, delivery, tracker changes, or delegation are authorized.
- Fresh pre-edit manifest: `artifacts/text-flow/manual-shapes-before/manifest.json`.
  It hashes all 1,610 tracked/nonignored source paths (including the 66 inherited
  dirty paths and lock), 4,826 historical artifact paths, and 80 showcase dist files.
  It records tools, PID 665048 and HTTP fingerprints. The baseline patch is saved
  alongside it. Source archives were optional and were not created.
- `npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/manual-shapes-before/costs`
  completed the current package build and fresh baseline cost report. No after-cost
  comparison is claimed. Existing central seals were not rewritten.

## Draft scope

The draft adds internal generic feature lookup sharing capability initialization;
pure immutable Source builders; descriptor recapture; owned handler configuration;
optional bounded syntax; Path/handler exports; a single shared participation marker;
lazy text selection; and retained-Block Path preparation. Some current consumers,
fixtures and the two permitted showcase source files have migrated. The atomic
entry is unchanged. Showcase dist and the preview process were not rebuilt/restarted.

The public factory removal is **not integrated**: several consumers still import
`createPathTextFlow`. Do not publish or treat the current worktree as passing.
Builders deliberately use native `TypeError`, avoiding a core/parser import;
document consumption converts invalid descriptor arguments to sourced diagnostics.
URL descriptors perform no I/O and runtime resolution remains unsupported.

## Concrete blocker: shared semantic authoring identity

`participationComponent` currently records one semantic identity/capture per owner.
Calling it twice overwrites the owner marker, so this draft instead has ordinary
components return the single marker with a metadata envelope. The existing
normalizer expands such components at `/expanded`, does not retain the outer key,
and cannot normalize Block decoration children nested inside that envelope.

The focused regression command below proves that this is not an acceptable
implementation: `central-registration.test.ts` gets sourcePath
`/document/children/children/0/expanded` instead of the original authored path;
`side-path.test.ts` gets `null` instead of key `path`; `path-fix.test.ts` diagnostic
paths acquire `/expanded`; `sibling-policy.test.ts` invokes a late decoration
callback zero times instead of once. These assertions were not relaxed.

A fresh bounded assignment needs a decision/authorization for the smallest generic
semantic alias/capture mechanism that preserves authored source paths, keys and
ordinary children while sharing one participation owner. It must not add a second
normalizer, callback registry, painter or installed global configuration. This
checkpoint stops before changing layout participation or core semantic authoring;
the approved core feature lookup alone cannot fix these failures.

## Validation so far

- `npm run build -w @updf/core && npm run build -w @updf/text-flow`: initial run
  failed on explicit undefined optional data; after correcting it,
  `npm run build -w @updf/text-flow` passed. Both packages had built successfully
  before the focused tests below; subsequent formatting is nonsemantic.
- `npx tsx --test packages/core/test/operation-extension.test.ts packages/text-flow/test/sources.test.ts packages/text-flow/test/central-registration.test.ts`:
  7 tests passed; central registration could not load its retired factory import.
  That test import was subsequently migrated to a private legacy-comparison fixture.
- `npx tsx --test packages/text-flow/test/manual-shapes.test.ts`: 3/3 passed,
  including two ordinary Paths without any fonts/text provider and missing central
  installation/handler failures.
- `npx tsx --test packages/text-flow/test/manual-shapes.test.ts packages/text-flow/test/central-registration.test.ts packages/text-flow/test/side-path.test.ts packages/text-flow/test/sibling-policy.test.ts packages/text-flow/test/path-fix.test.ts packages/text-flow/test/rectangle-clearance.test.ts`:
  **39 passed, 15 failed**. The failures above are real acceptance failures, not
  waivers. Eight native Path raster/PDF checks passed, including qpdf and complete
  text extraction; rectangle all-remaining-source clearance cases also passed.
  New raster outputs use `artifacts/text-flow/manual-shapes-runtime/`, not the
  historical entry-isolation output path.
- Scoped `npx biome format --write ...` completed, `git diff --check` passed,
  and `npm run format:check` passed (1,240 files).
- Initial `npm run lint` failed on a type-only Block import, since corrected;
  a second run exposed scanner nesting, corrected by extracting coordinate-pair
  scanning. Final `npm run format:check`, `npm run lint` (including code-principles),
  `npm run build -w @updf/core`, `npm run build -w @updf/text-flow`, and
  `git diff --check` all passed.
- Final `npx tsx --test packages/core/test/operation-extension.test.ts packages/text-flow/test/sources.test.ts packages/text-flow/test/manual-shapes.test.ts`:
  **10/10 passed**. This does not replace or waive the 15 integration failures.

Full typecheck, full test, browser, graph, packed-consumer, isolated clean build,
showcase and after-cost gates remain unrun; no full-source native/browser parity
or final package closure claim is made. No asynchronous checks are left running.

## Remaining acceptance / code-principles

Fix the identity blocker first. Then finish consumer/type/graph migrations,
configuration/lifetime and syntax adversarial tests, exact source diagnostic and
charge parity, mixed ordinary/floating Path barriers and parse-count proof,
parser-free sources CJS/ESM checks, new cost profiles and paired reports, preserved
baseline comparisons, all requested gates and final evidence/seal.

Risk-based tests were added for immutable builders, malicious coordinate arrays,
generic lookup lifecycle/retry/recursion, lazy geometry-only Path and configuration
capture. Correctness and lint/tests checklist items are **incomplete**. No approved
principle exceptions, no Changesets workflow introduced, and no implementation or
verification status transition is claimed. See the fresh checkpoint JSON for exact
delivered hashes/status and preservation results; its scope includes all inherited
and S3 unstaged/untracked work, not only committed HEAD.
