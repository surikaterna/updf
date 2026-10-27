# S5b.2 slice 1: private generic visual preparation bridge

**Implemented, partial; ready for independent audit, not verified.** This slice
does not implement URL Images. `Image.src` validation is unchanged. There is no
loader, fetch, decoder, public asynchronous render entry, or new image syntax.
URL-looking strings occur only in trusted fake visual tests. Production Image
loading belongs to a fresh slice after this bridge is independently audited.

## Delivery and source baseline

- Issue: N/A. Integration owner: caller; implementation owner: this Engineer.
- Worktree: `/home/sprawl/projects/updf/trees/image-preparation`.
- Branch: `feature/image-preparation`.
- Base/HEAD: `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- Inherited S2/S3/S5a/S5b.1+R1 changes remain dirty and are not this slice's work.
  No staging, commits, pushes, PRs, tracker changes, or delegation occurred.
- The fresh pre-edit manifest is
  `artifacts/visual-preparation-bridge-before/source.json`: 1,686 source paths,
  including the newly introduced receipt helper, plus exact inherited Git status.
  This is the current target baseline, not the older 1,663-file original snapshot.
  Its initial serialized receipt hash is
  `092e15e817e6d694e22e57e38d737c4dab24dde057281980530615cd2132a101`.
- Every baseline file has a content-addressed, exclusive-create copy under
  `artifacts/url-images-before/source-hashes/`. Existing private-preparation
  receipts were not overwritten. The paired cost baseline was freshly collected
  before production edits, against the R1 fixed report, not pre-R1 code.
- The final exact 20-path slice inventory and before/after source digests are in
  `artifacts/visual-preparation-bridge-after/preservation.json`; `source.json`
  contains the complete delivered source/status inventory. These receipts, rather
  than the much larger HEAD diff, define this slice's ownership.
- Preservation checks read all original 1,663 source files, exact original dirty
  status, 5,288 historical files, 80 original distribution files, live PID 665048,
  and the original tailnet port-5182 response hashes. The source worktree is
  read-only. All builds and tests use the target's independent node_modules.

## Existing ownership, not another visitor

`blockComponent` associates its semantic identity with its adapter at definition.
`ownVisual` binds the component, semantic identity, adapter and capture definition
to one private preparation-owner identity. `defineVisual` returns that handle
internally. A private optional `prepare` callback binds the owned atomic visual
payload; it cannot replace the surrounding Block or participation configuration.
The callback is captured at definition, rather than reread after suspension.

`participationComponent` accepts an optional private owned visual base. It checks
actual component ownership and associates its marker with the same preparation
identity and original participation capture. Text-flow only passes the already
validated owned visual component. Block and Path markers retain their old route;
there is no Images import in text-flow or core/layout reverse dependency.

The existing normalizer's optional preparation hook selects the installed owned
descriptor using that identity before child scheduling. Ordinary visual capture
produces its real canonical Block props and owned child descriptor. Floating
capture produces its complete original `{props,data,body}`, including exclusion
source, side, dimensions and Block style. No measure callback locates resources.
There is no second JSX walker, component-name test, global plugin registry,
native producer eligibility registry, admission branch, or parallel layout engine.

The original semantic identity, authored key, path, scope and queued occurrence
remain intact. Captures are keyed by newly owned occurrence recipes, never reused
authored VNodes. Each occurrence owns its snapshot before the first await.
The existing core snapshot owner preserves owned resources, VNodes and content
handles, rejects unsafe descriptors without getters, and never freezes callers.
The optional core callback only exposes that same charged snapshot at the current
normalization depth; the R1 data-normalizer snapshot remains in place.

## Replacement authority and layout

The private descriptor still has `identity`, `capture`, `resolve`, and `replace`.
For mapped visuals, `capture` additionally receives an owned capture capability
with canonical props and atomic child props. The old test-leaf route still
requires an owned extension block. The narrow result union additionally accepts
an owned visual replacement token, never an arbitrary SemanticRecipe.

Only the coordinator's currently resolving exact resource/ID binding permits
`replaceVisualResource`. The token binds the capture owner and original queued
recipe. Consumption checks the exact occurrence, consumes once, and retains the
original recipe. Copies, forged captures, wrong IDs, foreign/reused tokens and
post-failure/post-seal captures reject before geometry. Every allocated capture
is invalidated on closure, even when capture failed before queue visitation.
No forgeable marker or resolved `src` property is inserted into authored data.

`authorBlock` and `participationSources` use the private resolved representation
only for the same operation. Ordinary visuals do not become participation
markers. Ordinary measurement retains the existing actual-size Block owner and
one visual measurement; float side/exclusion data remains unchanged. Child
content uses the original occurrence's `captureContent`/`scopedContent` owner.
Diagnostic adapter aliases match the prepared-resource control; there are no new
`/expanded` artifacts. No geometry or painting runs before seal.

Ordinary operations allocate no replacement maps: their optional resolved-state
tables remain uninitialized. They do pay the measured generic lookup/import cost.
The async token/driver module is parsed only by selected private preparation.

## Budgets and deliberate limits

The raw visual props and canonical capture each use the existing cumulative
snapshot ledger before suspension. Owned child descriptors are opaque terminals,
not copied again by a new walker. A boundary fixture consumes exactly **22 source
nodes/work units and 18 Unicode scalars**: one normalized occurrence, ten raw
snapshot occurrences and eleven canonical snapshot occurrences. A 21-node policy
rejects before descriptor capture, resolution or geometry. Publication retains
existing owned-resource byte accounting. Resolution adds only bounded wrapper
objects and the existing extension snapshot; no extra uncharged traversal or
new work counter is introduced. Native admission and selected-output preparation
remain mandatory and unchanged.

Participation still requires direct Flow siblings. This slice does not add floats
inside Flow.Body/Column, change multiple-compiler behavior, or repair the existing
synchronous floating-body provider-scope limitation. The new captured bridge
retains the original provider scope; its comparison control uses an explicit
child provider where the unprepared floating route otherwise loses that scope.
That existing limitation is follow-up work for the caller, not silently fixed here.

## Risk-based tests and gates

Ten new source tests cover ordinary/floating parity, original adapter path aliases
and keys, one measurement, shared owner selection, repeated VNode occurrences,
kept Block.Body and Row/Column bodies, caller mutation during await, provider
scopes, polygon exclusions/constraints, forged/copied/reused capabilities,
incorrect bindings, missing marker installation, duplicate preparation identity,
post-failure closure and exact source/work/Unicode boundary accounting. A PNG
fixture is decoded **before** capture; the fake resolver returns that owned handle
through the existing provider and matches prepared-control PDF bytes. No production
codec import was added. A new real-browser proof captures two reused occurrences
with zero transport requests. Existing phase/lifecycle and R1 regressions remain.

Commands run in the target through
`node_modules/.bin/tsx scripts/visual-preparation-receipts.ts run <command>`:

| Command | Result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including 400/49/3 AST structural gates |
| `npm run typecheck` | Pass, including all package/application builds |
| `npm test` | Pass; 1,697 tests, zero failures |
| `npm run build:browser` | Pass |
| `npm run check:graphs` | Pass |
| `npm run build:showcase` | Pass, target only |
| `npm run test:showcase` | Pass |
| `npm run test:browser` | Pass; 25 tests |
| `npm run test:consumer` | Pass; 15 packed consumer closures |
| `npm run check:licenses` | Pass |
| `node_modules/.bin/tsx scripts/text-flow-costs.ts --out artifacts/visual-preparation-bridge-after/shared --compare artifacts/visual-preparation-bridge-before/shared/report.json` | Pass; 16 libraries, 312 paired metrics |
| `node_modules/.bin/tsx scripts/resource-preparation-evidence.ts artifacts/visual-preparation-bridge-after artifacts/visual-preparation-bridge-before` | Pass; existing activated fake profile paired |
| `node_modules/.bin/tsx scripts/visual-preparation-evidence.ts` | Pass; new positive generic visual profile and ordinary module deltas |
| `node_modules/.bin/tsx scripts/visual-preparation-preservation.ts` | Pass; exact slice ownership and original preservation |

Logs append all attempts. Early iterations found type/function-size violations,
an ordinary-as-marker conversion bug, incorrect fixture expectations and missing
exact internal-import inventory entries; these were corrected, not waived. One
combined command timed out during showcase tests; no child check remained, and
the completed larger-timeout rerun is logged. No pending check is handed off.

## Paired retained and package costs

Fresh before/after reports retain identical inputs, lock, tools, conditions,
ES2022 target and level-9 gzip. Full inventories include JS, declarations, maps
and all other shipped files for all 16 libraries; package payload is not installed
dependency footprint. No runtime package was added. The historical shared report's
`newRuntimePackages` field names an older text-flow experiment, not this slice.

| Consumer | Raw before → after | Min before → after | Min gzip before → after |
| --- | ---: | ---: | ---: |
| Layout/browser | 371,434 → 371,997 | 187,759 → 187,989 | 60,847 → 60,917 |
| Layout/Node | 677,326 → 681,053 | 322,983 → 324,477 | 97,996 → 98,473 |
| Authored render/browser | 369,222 → 369,793 | 187,571 → 187,801 | 60,272 → 60,349 |
| Authored render/Node | 673,603 → 677,330 | 319,712 → 321,206 | 96,878 → 97,393 |
| Existing preparation/browser | 389,360 → 393,799 | 198,191 → 200,082 | 63,588 → 64,198 |
| Existing preparation/Node | 681,777 → 691,306 | 326,000 → 330,005 | 98,539 → 99,772 |

Drawing stays byte-identical. Browser ordinary text stays byte-identical; Node
ordinary text retains +4 minified bytes (-1 gzip). Ordinary layout/render parse
one additional generic module, `visual-preparation-state`: browser 218 → 219,
Node 234 → 235. Drawing/text parsed module counts do not change. The token module,
async driver, Images, PNG/JPEG and transport do not enter ordinary graphs.

| All-library payload | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Browser ESM JS | 899,026 | 907,322 | +8,296 |
| Browser ESM declarations | 362,157 | 366,025 | +3,868 |
| CommonJS JS | 1,036,732 | 1,046,507 | +9,775 |
| CommonJS declarations | 362,157 | 366,025 | +3,868 |
| Node facade JS | 16,102 | 16,177 | +75 |
| Node facade declarations | 3,930 | 3,930 | 0 |
| Packed tarballs | 760,348 | 765,977 | +5,629 |
| Unpacked tarballs | 4,193,261 | 4,230,782 | +37,521 |

The original generic visual profile below is retained as historical evidence,
not native-resource proof: it painted rectangles without consuming the binding.
Its input is superseded by the corrected native profile in the audit-fix section.
These historical activation costs were absolute, not paired API-input costs:

| Platform | Raw / gzip | Min / gzip | Parsed / retained |
| --- | ---: | ---: | ---: |
| Browser | 368,804 / 83,490 | 187,521 / 59,780 | 217 / 176 |
| Node | 666,468 / 123,550 | 318,364 / 95,869 | 223 / 223 |

That historical profile retains the private bridge and imports no Images, PNG/JPEG, assets, text-flow,
font parser or transport. These real micro-costs buy private occurrence-owned
semantic replacement while keeping optional async code out of default graphs;
they are neither waived nor presented as a timing or size improvement.

Code-principles checklist: correctness and capability boundaries tested; defaults
followed; cohesive files within 400 lines, functions under 50 lines, nesting at
most three; comments describe intent/invariants; proportional boundary/regression
tests; lint/tests pass. **No approved exceptions**, numerical changes, native
certificate changes, dependency changes or Changeset requirement. Auditor should
verify the exact manifest, token occurrence/lifetime authority, snapshot timing
and charges, original child scopes/paths, unchanged float configuration and native
admission, graph isolation, and the paired costs before authorizing actual loading.

## Narrow native-resource proof correction (S5b.2 slice 1 audit fix)

**Implemented, ready for focused independent re-audit; not verified.** Issue N/A;
same target worktree, branch and HEAD as above. Only six test/evidence files are
changed relative to the frozen previous `bridge-after/source.json`: the visual
cost input, browser test, three visual evidence/receipt/preservation collectors,
and this document. No production source, package configuration or dependency
changed. All inherited work remains unstaged; no Git/tracker/delivery mutation.
The fresh pre-fixture receipt is `visual-preparation-bridge-fixed/before/source.json`
(1,694 paths; receipt helper already had its output-directory override). Its
serialized receipt SHA-256 is
`b5e8c4fd658151cf9866c28c8763e59b575d1b95b5d2145a6f2c11b0e924bea4`.
Final ownership is compared to the earlier frozen **after** receipt, not the
older pre-runtime baseline. Earlier receipts and their hashes are preserved.

The synthetic resolver returns one fresh owned resource for an ordinary visual
and a right float. `replace` records each coordinator-returned binding ID;
the visual's captured preparation callback returns the actual handle and ID as
immutable owned construction data. Measurement checks the handle and captured ID
and emits `xObject` nodes with that ID, never a literal registry key or rectangle
substitute. Binding occurs during resolution; geometry waits until the prepared
handle returns sealed. Capture/child callbacks are not replayed at layout/render.
The existing S5b.1 fake Form provider pattern interns that exact resource and
defines the filled rectangle **inside the actual Form stream**. Core `render`
consumes the fixed layout result and its resolved stage options. Two provider
collections must occur; removing providers must throw a `RESOURCE` diagnostic.

`tests/browser/visual-preparation.test.ts` bundles the same input for Node and
Chrome. It asserts exact results/PDF-byte parity, one Form, two calls to the same
XObject name, and actual Form stream bytes. Both PDFs pass `qpdf --check`.
The resulting PDFs are 786 bytes (not asserted; the auditor's 804-byte control
used different names/geometry). Original counts/heights/resource-key assertions
remain, with preparation count, source paths, authored ordinary/floating keys and
left/right provider scopes added. The functional child legitimately contributes
one `/expanded` segment per original source path, not a replacement expansion.
Existing source tests of foreign-occurrence replacement are unchanged.

Chrome uses inline bundle injection: **zero network requests**, no test-host or
CDN request is needed. All context network routes abort, service workers are
blocked, and fetch throws in both hosts. No PNG decode, loader, live asset, or
actual URL request occurs. The full browser suite is intentionally not rerun.

Corrected evidence is appended under `artifacts/visual-preparation-bridge-fixed/`:
native PDFs/proof JSON, qpdf reports, four activated bundles/metafiles, input
SHA-256 in `visual-summary.json`, ordinary shared report, command logs, complete
final source/status receipt, and preservation receipt. The changed fixture now
includes float/text-flow, a provider and core rendering. Its activation costs are
**absolute changed-input costs**, not growth attributable to production changes:

| Platform | Raw / gzip | Min / gzip | Parsed / retained |
| --- | ---: | ---: | ---: |
| Browser | 478,680 / 108,862 | 242,868 / 78,061 | 251 / 222 |
| Node | 761,025 / 142,760 | 362,758 / 110,216 | 261 / 261 |

No Images, PNG/JPEG, assets or font parser module is imported. Fresh shared costs
compare against `bridge-after/shared/report.json`: all **312 paired metrics**,
consumer inventories and all 16 library inventories remain identical. Package
production source hash delta is zero; **2,647 target dist files** also retain
identical hashes after builds. Reuse of the prior 25-browser/15-packed-consumer/
105-showcase evidence is therefore intentional, not a claim of fresh execution.
No full showcase build or live source asset request was made in this correction.
The preservation collector rechecks all original 1,663 source files/status,
5,288 historical files, 80 original dist files, PID 665048, and both empty staging
areas without contacting the original live server.

Commands use `VISUAL_PROOF_OUT=artifacts/visual-preparation-bridge-fixed`
and `node_modules/.bin/tsx scripts/visual-preparation-receipts.ts run <command>`:

| Command | Result |
| --- | --- |
| `node_modules/.bin/tsx --test tests/browser/visual-preparation.test.ts` | Pass; offline Node/Chrome proof plus two qpdf checks |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including structural checklist gates |
| `npm run typecheck` | Pass, including target package builds |
| `npm test` | Pass; 1,697 tests, zero failures |
| `node_modules/.bin/tsx scripts/text-flow-costs.ts --out artifacts/visual-preparation-bridge-fixed/shared --compare artifacts/visual-preparation-bridge-after/shared/report.json` | Pass; 312 metrics unchanged |
| `node_modules/.bin/tsx scripts/visual-preparation-evidence.ts` | Pass; corrected absolute activation, unchanged ordinary graphs/inventories |
| `node_modules/.bin/tsx scripts/visual-preparation-preservation.ts` | Pass; six-file correction, zero runtime delta, original/target preservation |

Logs retain early fixture assertion corrections and one failed root-test attempt
that incorrectly overlapped a rebuilding typecheck (temporary missing dist files).
The sequential full-test rerun after build passes; failures are not waived.
Code-principles checklist: correctness/negative control tested; defaults followed;
six cohesive files, under 400 lines, functions under 50 lines, nesting at most
three; intent-only comments; risk-based native resource/network regression proof;
lint/tests pass. No approved exceptions, numerical changes or Changeset requirement.
Auditor should recheck the captured-ID-to-Form chain, missing-provider control,
offline exact parity, six-file manifest and unchanged 312 ordinary metrics before
authorizing any subsequent S5b.2 network-feature slice.
