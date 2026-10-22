# Rectangular composition runtime slice

**Implemented; pending independent audit, not verified.** Issue: N/A. Integration
owner: Engineer. Worktree `/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`; base/HEAD both
`244c0932c733accace68b7d8fb85cdc8f851d4e8`. Delivery is unstaged/uncommitted.
No staging, commit, push, tracker mutation or delegation was performed.

## Delivered contract and limits

- Optional `@updf/text/composition` exports `createCompositionTextService` with the
  existing `TextServiceOptions`. It reuses the ordinary service's exact captured
  runtime/resolution closure. Ordinary `createTextService` has no compose callback
  and does not import the optional implementation.
- Core explicitly captures optional `TextService.compose` and its receiver at
  operation construction. Present malformed values/accessors reject synchronously.
  The seven existing callbacks retain their contracts. Composition input/output
  are own-data snapshots; finite fields, supported shape and opaque run presence
  are validated. Trusted callbacks remain trusted code, not a sandbox.
- Adapter `MeasureContext.composeText` and `composedText` use the active existing
  operation, its unchanged shared `TextServiceContext.budget`, bindings and origin
  path. Frames have readonly width/height/measurement/bands. Only the active owning
  operation authorizes their exact identity; copies, cross-operation frames and
  closed contexts fail. No session or second ledger/runtime was introduced.
- The existing ledger has a separately named cumulative `compositionWork`, bounded
  by `policy.nodes`: call attempts, input data visits and Unicode scalar visits
   before text allocation, plus every retained output data visit and Unicode scalar
   during output capture (including nested fields accepted by text validators).
  Failed attempts retain charges. Legacy `work()` meanings are unchanged.
  Existing source, text, generated-output and page limits still apply. Opaque
  prepared text is explicitly counted by the existing output scan as text.
- Core seals captured plans into durable immutable opaque `preparedText` payloads.
  Frame lifetime is short; emitted payload lifetime is deliberately not. Ordinary
  snapshots preserve only authorized payload identities through one additional
  identity predicate in the existing recursive copy owner. No new snapshot engine.
  Exact dimensions and every selected font's owned resource identity are checked
  on subsequent validation/measurement, including rendering returned layout output.
  JSON, copied/forged payloads and mismatched resource bindings reject.
- Native measurement reads captured fragments; it calls no text service. Existing
  rich-text collect/ink/paint helpers accept the common fragment geometry shape,
  and are reused without a second painter or reconstruction into richText nodes.
  Exhaustive native/VDOM dispatch and metadata include the new kind.
- Text composition calls existing `validateInput`, `rich`, atom/wrap/line owners
  once. Left alignment and explicit positive point lineHeight are required; existing
  whitespace/newline/empty-line/mixed-run/source/long-word semantics are retained.
  Bands are computed **after selection**, unioning the line box and actual ink.
  The existing line box contains the selected ascent/descent envelope; direct
  fragment painting consumes those same baselines, not remeasured native boxes.
  Out-of-frame occupancy rejects, never grows or clips the frame.
- Optional `@updf/text-flow` exports `textFlowAdapter` and typed `TextFlow`. Explicit
  extension installation is required. TSX accepts prepared `paragraphs` and
  `style={{ width: 240, maxHeight: 160 }}`; width may be omitted for available width.
  maxHeight is a ceiling, not reserved space. Actual atomic height, extent 1 and
  cached selected nodes use normal graph preparation and paginator admission,
  including deterministic retry/fresh-page/oversize behavior.

**Not implemented:** exclusions, contours, visuals/slots, interval callbacks,
arbitrary Paragraph/Span child parsing, CSS strings/float, preselection negotiation
or split pagination. This rectangle proves no future multi-interval contract.
Package usage and phased DX are in `packages/text-flow/README.md`.

### Numerical classification

Finite/sign domains, lineHeight, counts, quotas, authored width/region constraints,
payload/frame/resource identities and native dimension equality remain exact.
Derived height/ink/band containment uses the existing shared `exceeds`, with default
scale for upper endpoints and immediate line/fragment operands for lower-endpoint
cancellation. Stored geometry is not clamped. Existing native certificates and the
wrapper/baseline arithmetic are unchanged. Boundary tests distinguish one-successor
width identity from local roundoff in an occupied-band endpoint.

## Acceptance evidence

The focused 27-test suite includes the seven preserved prior-slice oracle tests
and 20 runtime tests:

- `packages/core/test/composition-runtime.test.ts`: missing/malformed capability,
  original callback receiver/capture, input/output capture, active ownership,
  cross-operation/copy/JSON rejection, durable output/resource mismatch, native
  data-to-VDOM parity, repeated/failing cumulative work and existing text limits.
- `packages/core/test/composition-boundary.test.ts`: malformed/async output,
  getters, exact width identity, finite domains, occupied-band roundoff versus
  real overflow and unsupported props.
- `packages/core/test/composition-capture-budget.test.ts`: 10,003-field input with
  nodes=2 reads only one sibling before LIMIT; nested 10,000-entry output record,
  array and string reject with nodes=200; failed captures retain charges and the
  next attempt cannot reach the callback or read siblings. Shared snapshot checks
  cover key order, null prototypes, freezing, hidden/symbol fields and cycles.
- `packages/text/test/composition-native-parity.test.ts`: every prior rectangular
  fixture for Helvetica and prepared Liberation Sans; exact reports and PDF bytes
  against original native richText. Prepared overhang and mixed fonts are included.
  Rendering after closure **with no text service at all** proves no remeasurement.
- `packages/text-flow/test/adapter.test.ts`: data/TSX parity, actual-height versus
  ceiling, explicit width, unsupported props/modes, lifecycle on success/failure,
  deterministic atomic retry, fresh page, oversize and repeated-occurrence limits.
- `tests/consumer/types/text-flow-template.tsx`: emitted external NodeNext/Bundler
  TSX execution and negative types for CSS strings, children and missing ceiling.
- `tests/integration/text-flow-graphs.test.ts`: emitted browser/Node graphs for all
  old consumers and the new positive control, plus dependency-edge negative controls.

The existing six-owner native driver assertions remain; their exact kind inventory
now includes preparedText, which has separate native/VDOM composition coverage.
No raster equivalence claim beyond byte-identical PDFs against the existing oracle.

## Validation (serial, actual delivered worktree)

```sh
npm run build -w @updf/core
npx tsx --test packages/core/test/composition-capture-budget.test.ts packages/core/test/composition-runtime.test.ts packages/core/test/composition-boundary.test.ts packages/text/test/composition-native-parity.test.ts packages/text/test/composition-parity.test.ts packages/layout/test/composition-contract.test.ts packages/text-flow/test/adapter.test.ts tests/integration/text-flow-graphs.test.ts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npx tsx scripts/text-flow-costs.ts --root /home/sprawl/projects/updf/trees/text-flow-design --out artifacts/text-flow/runtime-fixed --compare artifacts/text-flow/library-baseline/report.json
git diff --check
```

All pass after audit fix: focused 27 tests; full 1,407 tests, zero failures/skips; all 12 browser
graphs; 15 external tarball closures, including optional text-flow TSX execution.
Typecheck includes the complete package build. Browser build reports its existing
large-chunk warning, not a failure. Full tests deliberately emit a syntax diagnostic
for the historical arithmetic negative control; that test passes.

During development, checks caught a missing native VDOM type, a too-high quota-test
ceiling, a test-helper union annotation, lint/function-size issues, a misplaced TSX
negative directive and the old six-kind inventory expectation. Each was corrected;
the complete serial command chain above subsequently passed. No failure waiver.

Environment: Node v24.22.0, npm 11.19.1, TypeScript 5.9.3, esbuild 0.28.2.
`npm install --ignore-scripts --offline --no-audit --no-fund` added only the new
workspace link/manifest lock entries, no external dependency. Lock SHA-256:
`f2d0123364ef696d42c5281f27919b7687f958390eb6b5b00690a67e32efda5b`.

## Paired costs (first correction; superseded by final capture below)

Authoritative immutable baseline:
`artifacts/text-flow/library-baseline/report.json` (not overwritten).
Runtime capture: `artifacts/text-flow/runtime-fixed/report.json`, plus packed
tarballs, 24 raw/minified browser/Node consumer outputs and esbuild metafiles in
that directory. The harness preserves every old input/flag and adds one emitted
textFlow consumer, positive controls and addon-isolation assertions. 15 libraries,
206 comparison rows (188 previously paired plus 18 new absolute-cost rows).
Delta = current minus baseline; percentages are 100 × delta / baseline. New rows
have baseline/delta/percent **N/A**, not zero. JSON contains unrounded percentages.

### Audit-fix delta versus pre-fix runtime

Preserved pre-fix report: `artifacts/text-flow/runtime-current/report.json`.
Only core package payload changes: browser JS +950, CJS JS +1,012, browser maps
+928, tarball +146 and unpacked +2,890 bytes. Facades/declarations and every other
package are unchanged, including the new addon tarball at 4,832 bytes. Aggregate
changes versus pre-fix equal those core deltas.

Retained-consumer deltas versus pre-fix, **raw / minified / minified gzip** bytes:

| Consumer | Browser | Node |
| --- | ---: | ---: |
| Drawing | +811 / +386 / +45 | +945 / +435 / +62 |
| Ordinary text | +815 / +386 / +63 | +944 / +435 / +45 |
| Prepared font | +820 / +386 / +58 | +944 / +435 / +58 |
| JPEG | +811 / +387 / +57 | +945 / +435 / +61 |
| Layout | +815 / +386 / +59 | +947 / +438 / +56 |
| TextFlow | +820 / +386 / +52 | +947 / +438 / +53 |

### All existing package output and pack deltas (bytes)

Package-local output, **not retained dependency closure**. Each JS column is
browser ESM / Node facade / CJS. Each declarations column is the same ordering.
Other output is browser declaration maps; existing CJS metadata deltas are zero.

| @updf/package | JS delta (ESM / facade / CJS) | Declaration delta | Other delta | Tarball delta | Unpacked delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| assets | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| barcodes | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| core | +10,666 / +130 / +12,884 | +5,511 / 0 / +5,511 | +15,751 | +8,148 | +50,453 |
| fontkit | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| fontkite | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| fonts | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| geometry | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| jpeg | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| layout-boxes | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| layout | +673 / 0 / +686 | +228 / 0 / +228 | +851 | +291 | +2,666 |
| png | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| svg | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| tables | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |
| text | +2,261 / +141 / +2,553 | +2,341 / +78 / +2,341 | +2,835 | +1,987 | +12,951 |

| Changed package | Browser JS base → current | Tarball base → current | Unpacked base → current |
| --- | ---: | ---: | ---: |
| core | 144,059 → 154,725 (+7.40%) | 127,160 → 135,308 (+6.41%) | 741,281 → 791,734 (+6.81%) |
| text | 36,360 → 38,621 (+6.22%) | 30,083 → 32,070 (+6.61%) | 165,204 → 178,155 (+7.84%) |
| layout | 255,601 → 256,274 (+0.26%) | 184,375 → 184,666 (+0.16%) | 1,125,389 → 1,128,055 (+0.24%) |

**New package absolute costs, all deltas/percent N/A:** text-flow browser JS 1,708;
Node facade JS 158; CJS JS 1,874; declarations 723 / 66 / 723; browser declaration
map 2,094; CJS metadata 20; tarball 4,832; unpacked payload 12,863 bytes. This tiny
package payload excludes the core/layout/text/font closure used by a real feature.

Aggregate including the additional package: tarballs 625,017 → 640,275
(+15,258, +2.44%); unpacked 3,424,231 → 3,503,164 (+78,933, +2.31%);
browser JS 734,988 → 750,296 (+15,308, +2.08%); facade JS 12,082 → 12,511
(+429, +3.55%); CJS JS 847,163 → 865,160 (+17,997, +2.12%). Browser/CJS
declarations each 291,060 → 299,863 (+8,803, +3.02%); facade declarations
2,720 → 2,864 (+144, +5.29%). Installed dependency footprint is not measured.

### All old retained consumer costs

Each tuple is **raw / minified / minified gzip**, in bytes. Fixed level-9 gzip;
Node ESM facade closure includes CJS implementations. Raw gzip is also recorded
in JSON, but is not substituted for minified gzip here.

| Consumer/platform | Baseline | Current | Delta | Delta % (rounded) |
| --- | ---: | ---: | ---: | ---: |
| Drawing browser | 67,336 / 35,701 / 12,326 | 72,257 / 38,159 / 13,073 | +4,921 / +2,458 / +747 | 7.31 / 6.88 / 6.06 |
| Drawing Node | 115,994 / 55,295 / 17,884 | 128,732 / 61,408 / 19,554 | +12,738 / +6,113 / +1,670 | 10.98 / 11.06 / 9.34 |
| Ordinary text browser | 112,451 / 58,251 / 20,062 | 116,931 / 60,471 / 20,714 | +4,480 / +2,220 / +652 | 3.98 / 3.81 / 3.25 |
| Ordinary text Node | 247,859 / 118,580 / 37,094 | 261,572 / 125,180 / 38,929 | +13,713 / +6,600 / +1,835 | 5.53 / 5.57 / 4.95 |
| Prepared font browser | 119,035 / 62,526 / 21,370 | 123,518 / 64,745 / 22,022 | +4,483 / +2,219 / +652 | 3.77 / 3.55 / 3.05 |
| Prepared font Node | 247,849 / 118,615 / 37,116 | 261,560 / 125,215 / 38,963 | +13,711 / +6,600 / +1,847 | 5.53 / 5.56 / 4.98 |
| JPEG browser | 79,525 / 42,258 / 14,799 | 84,454 / 44,722 / 15,533 | +4,929 / +2,464 / +734 | 6.20 / 5.83 / 4.96 |
| JPEG Node | 136,850 / 65,797 / 21,231 | 149,588 / 71,910 / 22,945 | +12,738 / +6,113 / +1,714 | 9.31 / 9.29 / 8.07 |
| Layout browser | 348,257 / 176,803 / 57,121 | 357,010 / 181,295 / 58,341 | +8,753 / +4,492 / +1,220 | 2.51 / 2.54 / 2.14 |
| Layout Node | 622,806 / 297,535 / 90,466 | 637,229 / 304,440 / 92,305 | +14,423 / +6,905 / +1,839 | 2.32 / 2.32 / 2.03 |

**New feature consumer absolute costs (baseline/delta/% N/A):** browser
404,015 / 206,020 / 66,570; Node 670,410 / 320,161 / 97,718. This consumer performs
layout plus render with explicit Helvetica/service/provider bindings; it is not
equivalent to the old unpaginated layout-measure-only consumer.

**Shared native dispatch has a real cost.** Optional text composition implementation
and text-flow package are absent from every old consumer and all 12 ordinary
browser graphs, but core must recognize/validate/capture sealed native output and
layout must transport the capability. These common ownership, snapshot and native
dispatch changes are retained even by drawing/JPEG consumers. The tables above
measure that impact; this is not zero-cost optionality. No threshold exception or
runtime-latency improvement is claimed. Paired execution-time latency is not
established by these byte measurements and remains a separate measurement task.

## Self-check and independent handoff

### Bounded audit correction (2026-10-22)

Independent audit requested changes for eager record sibling capture and uncharged
nested output. The shared snapshot owner now consumes record descriptors lazily,
with one pending sibling continuation per active container, like its existing array
owner. It no longer validates/reads all sibling values or allocates a copy closure
per sibling before the composition visitor can reject. Descriptor-only consumption
also avoids Reflect.get and never invokes field getters. Own-key enumeration still
uses JavaScript's Reflect.ownKeys metadata list; this is not a sandbox or a bound
on engine enumeration internals/proxy traps or trusted callback allocations.
Core child copy work, retained output and sibling scheduling are budget-bounded.

Composition output now charges every captured value and each string scalar before
copying, including nested extras allowed by existing shared text validators. Opaque
run objects retain exact identity and are not traversed. No text-validator contract,
callback receiver/lifetime, numerical comparison, native admission or quota default
changed. The adapter quota regression explicitly asserts the formerly accepted
nodes=80 request now rejects, then checks one success/two-occurrence failure at
nodes=200. The 10,000-entry malicious-output tests also use nodes=200 and still
reject; no quota increase masks that attack.

This assignment changed only `core/data.ts`, `core/composition-output.ts`, the new
`composition-capture-budget.test.ts`, the adapter quota test and this evidence.
All pre-existing dirty delivery/spike/docs were preserved. Initial focused checks
first exposed stale built exports (fixed by rebuilding core), then the intentionally
tightened adapter quota expectation. The final complete serial gate chain passed
without waivers. Audit status is **implemented, pending independent re-audit**, not
verified; issue/tracker N/A. Auditor should replay the two reported attacks, review
the shared snapshot semantics and paired cost increase, and confirm cumulative
failure charges and opaque run ownership against the full dirty delivery.

Universal checklist: correctness and risk-based tests pass; defaults followed;
files cohesive and production source ≤400 lines; functions ≤49 lines, nesting ≤3;
comments explain invariants/intent/tradeoffs; lint/tests pass. **No approved
exception.** No Changeset: repository does not use Changesets and packages are
private/unpublished. No native certificate or runtime guarantee is build-optional.

The eight prior dirty paths were preserved. Only the two relevant cost-harness
files and the architecture/spike cross-references were updated within that prior
scope; prior oracle tests/fixtures and unrelated agent-map content were not changed.
New runtime code is in core ownership/capture/ledger/native wiring, text's private
service closure/composition subpath, layout's context/output scan, and text-flow.
Build/export/workspace/graph/consumer registrations and focused tests complete the
integration. Existing tracker state: N/A; readiness is implemented, pending audit.

Auditor should inspect the actual unstaged/untracked scope, challenge payload
durability versus operation closure, exact resource identity and output quotas,
confirm no optional composer in old emitted graphs, rerun enough gates, and check
report arithmetic against the preserved baseline. Broader proposal phases require
fresh assignments; this slice stops at atomic rectangular composition.

## Second HIGH audit correction: identity-terminal capture (2026-10-22)

**Implemented, pending fresh independent audit; not verified.** Issue/tracker N/A.
Same worktree, branch and base/HEAD as above. This bounded assignment changed only
`core/data.ts`, `core/text-capture.ts`, `core/prepared-text.ts`,
`core/composition-output.ts`, `composition-capture-budget.test.ts` and this evidence.
All prior 26 modified tracked paths and 27 untracked entries were preserved; no
stage, commit, push, tracker mutation or delegation. The initial dirty inventory is
unchanged in path membership; the cost report records expanded per-file Git status.

Snapshot now has a separate pre-copy visitor, invoked for **every occurrence**
before terminal recognition, assignment, container allocation or child copying.
The existing opaque predicate retains its previous semantics: owned resources and
authorized prepared payloads bypass it, preserving exact identity without inspecting
internals or exposing these values to incompatible opaque validators. Primitive,
opaque-run, ordinary-object and repeated-DAG occurrences all use that same visitor.
Input and output share `compositionCaptureVisitor`, charging each occurrence and
each string Unicode scalar. Failed charges remain cumulative; no quota increased.
Finite/domain checks, exact identities, native certificates and admission are
unchanged. Reflect.ownKeys metadata enumeration and trusted callback allocation
remain outside the bounded copier guarantee, as documented above.

Risk-based regressions cover both owned-resource and real authorized prepared
payload terminals: 10,000 leading input fields at nodes=2 read exactly one sibling
before LIMIT; 10,000 repeated output terminals at nodes=200 reject rather than
retain an uncharged array. Every failed case retries on the same operation and
checks no further reads/callbacks. Small successful output arrays preserve frozen
ownership and exact terminal identity. Shared snapshot checks prove visit ordering,
repeat-DAG accounting, identity bypass of opaque validation and zero child reads
when the pre-copy visitor rejects. Existing descriptor/cycle/deep iterative and
composition/parity/lifecycle suites remain passing.

### Final validation

```sh
npm run build -w @updf/core
npx tsx --test packages/core/test/composition-capture-budget.test.ts packages/core/test/composition-runtime.test.ts packages/core/test/composition-boundary.test.ts packages/text/test/composition-native-parity.test.ts packages/text/test/composition-parity.test.ts packages/layout/test/composition-contract.test.ts packages/text-flow/test/adapter.test.ts tests/integration/text-flow-graphs.test.ts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npx tsx scripts/text-flow-costs.ts --root /home/sprawl/projects/updf/trees/text-flow-design --out artifacts/text-flow/runtime-final --compare artifacts/text-flow/library-baseline/report.json
git diff --check
```

All final gates pass: focused 30 tests; full 1,410 tests, zero failures/skips;
12 browser graphs; 15 clean external tarball closures. Typecheck includes the full
build. An initial typecheck found missing test-only NodeDefinition narrowing before
accessing payload; corrected, then the entire serial gate chain passed. The browser
large-chunk warning and intentional historical-arithmetic negative-control syntax
diagnostic remain expected, not failed gates. Environment/lock unchanged.

### Authoritative final costs (bytes)

`artifacts/text-flow/runtime-final/report.json` contains all 206 comparison rows,
15 packed libraries and retained consumer outputs/metafiles. The immutable baseline
remains `artifacts/text-flow/library-baseline/report.json`; `runtime-current` and
`runtime-fixed` were also preserved. Installed footprint/latency are not measured.

Versus `runtime-fixed`, only core package payload changes: browser JS +235, CJS JS
+269, declarations +308 in each implementation format, browser maps +612,
tarball +378, unpacked +1,424; facades unchanged. All other package payloads,
including text-flow, are unchanged. The following final deltas use the original
library baseline, not the intermediate fix.

| Existing package | JS delta (browser / facade / CJS) | Declaration delta (same order) | Other delta | Tarball delta | Unpacked delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| core | +10,901 / +130 / +13,153 | +5,819 / 0 / +5,819 | +16,363 | +8,526 | +51,877 |
| layout | +673 / 0 / +686 | +228 / 0 / +228 | +851 | +291 | +2,666 |
| text | +2,261 / +141 / +2,553 | +2,341 / +78 / +2,341 | +2,835 | +1,987 | +12,951 |
| assets, barcodes, fontkit, fontkite, fonts, geometry, jpeg, layout-boxes, png, svg, tables | 0 / 0 / 0 | 0 / 0 / 0 | 0 | 0 | 0 |

Final core browser JS 154,960; CJS JS 188,388; facade JS 4,354; declarations
88,186 / 698 / 88,186; tarball 135,686; unpacked 793,158. Layout/text absolute
package costs remain those in the earlier table. **New text-flow absolute costs**
(baseline/delta/percent N/A): JS 1,708 / 158 / 1,874; declarations 723 / 66 / 723;
browser maps 2,094; CJS metadata 20; tarball 4,832; unpacked 12,863.

Aggregate baseline → final: tarball 625,017 → 640,653 (+15,636); unpacked
3,424,231 → 3,504,588 (+80,357); browser JS 734,988 → 750,531 (+15,543);
facade JS 12,082 → 12,511 (+429); CJS JS 847,163 → 865,429 (+18,266).
Browser/CJS declarations each 291,060 → 300,171 (+9,111); facade declarations
2,720 → 2,864 (+144). Exact percentages are in the JSON comparison.

Retained consumer tuples are **raw / minified / minified gzip**:

| Consumer/platform | Final | Delta versus original baseline |
| --- | ---: | ---: |
| Drawing browser | 72,390 / 38,225 / 13,100 | +5,054 / +2,524 / +774 |
| Drawing Node | 128,851 / 61,478 / 19,581 | +12,857 / +6,183 / +1,697 |
| Ordinary text browser | 117,063 / 60,537 / 20,744 | +4,612 / +2,286 / +682 |
| Ordinary text Node | 261,691 / 125,250 / 38,978 | +13,832 / +6,670 / +1,884 |
| Prepared font browser | 123,650 / 64,811 / 22,068 | +4,615 / +2,285 / +698 |
| Prepared font Node | 261,679 / 125,285 / 39,004 | +13,830 / +6,670 / +1,888 |
| JPEG browser | 84,587 / 44,788 / 15,580 | +5,062 / +2,530 / +781 |
| JPEG Node | 149,707 / 71,980 / 23,002 | +12,857 / +6,183 / +1,771 |
| Layout browser | 357,009 / 181,305 / 58,365 | +8,752 / +4,502 / +1,244 |
| Layout Node | 637,349 / 304,510 / 92,393 | +14,543 / +6,975 / +1,927 |
| New TextFlow browser | 404,017 / 206,030 / 66,600 | N/A |
| New TextFlow Node | 670,530 / 320,231 / 97,782 | N/A |

Code-principles checklist: correctness and risk-based coverage pass; cohesive
production files ≤400 lines, functions <50, nesting ≤3; comments explain intent
and invariants; format/lint/typecheck/tests pass. No approved exception or failure
waiver. No Changeset (repository does not use Changesets; private/unpublished).
Auditor should replay both terminal attacks, inspect pre-copy visit ordering and
unchanged opaque-validation semantics, check cumulative failures and exact identity,
then review the actual complete dirty delivery and final cost report. No broader
contract work was necessary; this assignment stops here for fresh audit.
