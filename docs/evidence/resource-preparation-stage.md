# S5b.1 private resource preparation stage

S5b.1 implements the private **capture → suspend → resolve test resources → seal →
same-State layout** proof. It is ready for independent audit, not independently
verified. S5b.2 remains pending: no public URL/Image API, asynchronous render API,
loader, networking implementation, or codec integration was added.

**R1 audit correction:** mutable data-recipe outputs are now privately snapshotted
at resolution, before suspension. The final section below supersedes the original
S5b.1 ownership, counter and cost claims where noted. Independent re-audit is pending.

## Revision, source fidelity and ownership

- Worktree: `/home/sprawl/projects/updf/trees/image-preparation`.
- Branch: `feature/image-preparation`.
- Base and HEAD: `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- Issue: N/A. Integration owner: parent/caller. No tracker mutations, staging,
  commits, pushes, PRs or deployment.
- The inherited baseline is the complete 1,663-file working source from
  `/home/sprawl/projects/updf/trees/text-flow-design`, including its 81 modified
  tracked files and 64 untracked files. These are not all S5b.1 changes.
- `/tmp/opencode/updf-s5b1-fidelity/source-manifest.json` has SHA-256
  `6d0819762f20d5fe169d819d541b37d8a15a3c233f03091267dc31d573312477`.
  The sibling snapshot contains the original archive, patch and status inventories.
- `scripts/resource-preparation-preservation.ts` checks every original source
  digest and exact original Git status, plus 5,288 historical files, 80 original
  showcase distribution files, the original preview PID 665048, and the two
  previously sampled HTTP responses on port 5182. All writes/builds/previews in
  this assignment are confined to the target or `/tmp/opencode`.
- The definitive changed/added path inventory and final source digests are in
  `artifacts/private-preparation-after/preservation.json`. Review this inventory
  against the inherited manifest, not only the much larger diff from HEAD.

## Shared owners and boundaries

`core/vdom/normalize.ts` remains the only expansion/normalization visitor. Its
private captured-child handles retain normalized occurrences, original keys and
paths, provider scopes, and deferred expansion depth/cycle lineage in the same
State. Captured reads reject foreign/closed operations, rerun hierarchy guards
in authored order, and charge actual validation work without charging source
objects or executing components again. The shared children read uses own data
descriptors rather than inherited `children` getters.

The optional layout coordinator declares Document, Flow, Flow.Body, Block.Body
and Column child ownership. Block, Row, Paragraph and Span descendants use the
existing normalizer's regular traversal. Document/Flow/body/Column consumers read
the owned captured results; they do not normalize the authored tree again.
Deferred Column content retains its existing `captureContent`/`scopedContent`
operation identity and lifecycle.

Private preparation controls belong to the existing State lifetime. Capturing
permits existing component text measurement/font/style resolution, but forbids
native geometry, visual measurement and operation-extension initialization.
Suspension and the sealed waiting state reject escaped operation and measurement
methods with `MEASUREMENT_CONTEXT`. Only synchronous `layoutPrepared` enters the
sealed-layout phase. Closure is terminal, and handles are consumed before layout
starts: success and failure both prevent retries. No provider frame is held
across an await; normal synchronous scope restoration finishes before resolution.

`core/internal-preparation` contains the optional synchronous factory;
`layout/internal-preparation` contains the optional async driver. Their Node
import/require facades share the canonical CommonJS ownership implementation.
Ordinary render/layout graphs do not import either entry or the async queue,
descriptor selection or cancellation driver. `internal-drawing` is unchanged.

## Test-resource contract

`definePreparationResource` creates a trusted private descriptor selected through
the existing owned operation-extension option. It is not a native body-admission
registry. A declared semantic test leaf captures strict test props; the driver
resolves requests sequentially in authored request order while the State is
suspended. A result must be an existing owned resource. Its semantic replacement
must be an existing owned extension block, still subject to normal adapter,
geometry, quota, whole-selected-graph preparation and native admission checks.

The binding writer retains the caller's initial resource IDs and identities.
Initial font/text capability consumers see the immutable initial view. Generated
`PreparedN` IDs skip existing resource and metadata names, preserve the existing
resource-ID grammar, and reuse the first ID for an already bound owned identity.
Each new identity is charged using `ownedResourceBytes` and the existing
`resourceBytes` policy before publication. Sealing publishes the final immutable
view; lazy operation capabilities initialize only afterwards and see that view.
Component resource metadata remains the immutable initial snapshot throughout.

`layoutPrepared` returns the fixed document/result together with the completed
serialization options. Core's existing serializers still resolve resources and
validate the original selected provider capabilities. A real native Form
XObject test proves generated mapping, deduplication and final PDF serialization.
A separate test prepares PNG bytes **before** capture, returns that owned handle
from the test resolver, and proves the unchanged Images/PNG provider path sees
the generated binding and matches an ordinary control PDF byte-for-byte.

Native AbortSignal and validated own-data structural abort capabilities are
supported without importing assets. Pre-abort prevents component capture;
pending abort closes the operation, races the unresolved promise, removes the
listener, and prevents installation/publication. Late promise completion is
consumed without a later outcome. Resolver/ownership/resource-budget failures
close contexts and publish no document/options/PDF.

## Deliberate limits

- Discovery covers the declared layout roles, not arbitrary adapter props,
  final-page regions or FragmentContext callbacks. A selected test request
  encountered by semantic normalization after seal fails with sourced `PHASE`
  diagnostics and does not invoke its resolver. Existing prepared handles remain
  valid in those late paths. Semantic resource leaves in fixed native Page trees
  remain invalid under the existing native hierarchy contract.
- The test-resource replacement is block-only. This does not establish a public
  inline URL/resource grammar or an asynchronous image API.
- Host-owned geometry/pagination/painting does not run before seal. Explicit
  component text measurement is allowed. Trusted user callbacks and resolvers
  are not sandboxed; they can allocate their own memory or invoke independent
  renders. No rollback of callback effects is promised.
- Unsupported late requests may be discovered during layout after other valid
  geometry/painting work. No PDF is published on that failure, but no universal
  zero-historical-paint-calls claim is made.
- No new asset/resource work counter was introduced. Capture and layout share
  existing source/depth/cycle/work ledgers and retained-resource accounting.
  Resource queue entries are allocated only for already charged normalized
  occurrences. Arbitrary resolver allocations are outside that retention bound.

## Risk-based proof and validation

This section and the original paired-cost tables below retain the original S5b.1
receipts. Fresh R1 commands and deltas are recorded in the final section; the old
`private-preparation-before` and `private-preparation-after` receipts are preserved.

Regression coverage includes two occurrences of the same VNode with separate
provider scopes, Block.Body and deferred Column bodies, original source keys and
paths, baseline source counts, authored guard ordering, cumulative validation
work, actual component text measurement/default style selection, literal/control
PDF equality, immutable metadata/aliases, generated-ID collision and identity
reuse, final-map lazy capability initialization, forged/copied/foreign/closed
handles, one-shot failure, cycles/depth/node limits, abort/listener cleanup,
resolver rejection and resource-byte exhaustion, late adapter/header requests,
Node import/require identity, prepared PNG and manual FloatPath parity, and a
real browser private-stage proof with no transport or codec in its graph.
Deterministic listener/late-promise checks are used; no nondeterministic WeakRef
or garbage-collection claim is made.

All commands below run in the target. Final gate logs and generated evidence are
under `artifacts/private-preparation-after/`.

| Command | Result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including code-principles AST checks |
| `npm run typecheck` | Pass, including full package/application build |
| `npm test` | Pass: 1,676 tests, zero failures; 21 additions over the 1,655-test baseline |
| `npm run build:browser` | Pass |
| `npm run check:graphs` | Pass |
| `npm run build:showcase` | Pass; target only |
| `npm run test:browser` | Pass: 24 tests, including private preparation and existing image/showcase coverage |
| `npm run test:consumer` | Pass: 15 external tarball closures |
| `npm run check:licenses` | Pass |
| `node_modules/.bin/tsx scripts/text-flow-costs.ts --out artifacts/private-preparation-after/shared --compare artifacts/private-preparation-before/shared/report.json` | Pass: 16 libraries, 312 matched metrics |
| `node_modules/.bin/tsx scripts/resource-preparation-evidence.ts` | Pass: ordinary/activated graph and cost evidence |
| `node_modules/.bin/tsx scripts/resource-preparation-preservation.ts` | Pass: original source/status/history/dist/preview preservation |

The baseline probe in `/tmp/opencode/updf-s5b1-baseline-probe.mjs` and
`artifacts/private-preparation-before/baseline-probe.json` records the old
two-then-four replay and await-lifetime behavior. It is historical diagnostic
evidence, not the new stage regression suite. Earlier implementation checks
found a test measurement fixture error, code-size/lint violations, a test regex
escape error, and three missing seam-inventory entries. These were fixed and
the applicable final gates rerun; none is a waiver.

## Paired cost and principles

`shared/report.json` retains identical before/after profile source, lock digest,
tool versions, browser/Node conditions, ES2022 target and raw/minified/level-9
gzip settings. `summary.json` contains ordinary deltas and the new activated
profile's absolute costs. No runtime package or dependency was added. The
historical shared collector's `newRuntimePackages` label describes its older
text-flow experiment, not this assignment; the stage summary reports none.

The optional stage factory/binding writer were separated from `internal-drawing`
after paired evidence showed unnecessary CommonJS retention. Ordinary graphs
still pay the measured generic normalization/scope/phase seam cost; no zero-cost
or invented size target is claimed. All shipped JS, declarations, maps and other
files remain in the 16-library tarball inventories. JS/declaration subtotals are
not the installed dependency footprint; maps/vendor/extractor payloads are not
silently subtracted from packed/unpacked totals.

Selected final matched consumer costs, in bytes (gzip is the minified bundle's
level-9 gzip; the report also retains raw-bundle gzip):

| Profile | Raw before → after | Min before → after | Min gzip before → after |
| --- | ---: | ---: | ---: |
| Layout/browser | 368,755 → 371,345 | 186,529 → 187,719 | 60,383 → 60,831 |
| Layout/Node | 671,809 → 677,238 | 320,214 → 322,943 | 97,217 → 97,978 |
| Authored render/browser | 366,523 → 369,135 | 186,339 → 187,531 | 59,838 → 60,252 |
| Authored render/Node | 668,086 → 673,515 | 316,943 → 319,672 | 96,064 → 96,858 |
| Drawing/browser | 73,536 → 73,536 | 38,812 → 38,812 | 13,236 → 13,236 |
| Drawing/Node | 133,431 → 133,431 | 63,350 → 63,350 | 20,080 → 20,080 |

All-library emitted and tarball totals:

| Payload | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Browser ESM JavaScript | 875,278 | 898,005 | +22,727 |
| Browser ESM declarations | 353,837 | 361,970 | +8,133 |
| Canonical CommonJS JavaScript | 1,009,965 | 1,035,623 | +25,658 |
| Canonical CommonJS declarations | 353,837 | 361,970 | +8,133 |
| Node facade JavaScript | 15,615 | 16,102 | +487 |
| Node facade declarations | 3,738 | 3,930 | +192 |
| Packed tarballs | 744,270 | 759,730 | +15,460 |
| Unpacked tarballs, including maps/other shipped files | 4,094,897 | 4,189,455 | +94,558 |

The new activated test-only profile has no before counterpart:

| Platform | Raw / gzip | Min / gzip | Parsed / retained modules |
| --- | ---: | ---: | ---: |
| Browser | 388,678 / 88,014 | 197,830 / 63,462 | 225 / 184 |
| Node | 680,852 / 127,331 | 325,536 / 98,358 | 232 / 232 |

That profile resolves one fake owned Form identity for two authored occurrences;
it imports no assets, PNG/JPEG, Images, optional text-flow or font parser. The
ordinary profiles parse none of the preparation entries/drivers, and separate
fresh CommonJS tests check unshaken module loading, not just shaken output.

Code-principles self-check: correctness and risk boundaries tested; cohesive
files at most 400 lines, functions under 50 lines, nesting at most three;
comments explain invariants/tradeoffs; no numerical policy or native-certificate
changes; no approved exceptions. No Changeset is required for these unpublished
private coordination entries. Independent audit should verify actual source
ownership, no-replay scope/ledger behavior, cancellation/phase closure, lazy
final bindings, and the matched package/graph evidence before S5b.2 work begins.

## R1: own mutable data outputs before suspension

Objective: fix the Auditor's retained caller-alias MUSTFIX, without URL features,
layout/geometry changes, or a new accepted-data grammar. Worktree, branch, HEAD
and base remain those listed above; issue N/A. All fix changes are unstaged or
untracked; nothing was staged, committed, pushed, or changed in a tracker.

The ordinary data resolver can return `props` that alias its input, including a
plain `{type: "block", style: {height: 5}, children: [...]}` or a legacy spacer or
fixed block. Freezing those props at seal froze a caller's block and left nested
styles/emission data mutable. Copying at seal would also capture await-time
mutations, not the original occurrence. Six new document tests reproduced the
unfixed behavior (the synchronous ownership control passed): caller freezing,
spacer/fixed height drift to 65, shared occurrence drift, and absent early
descriptor/quota rejection. The fix was temporarily disconnected for that probe,
then restored before all final gates. No production behavior was waived.

`preparationControls` installs an optional State-owned `captureRecipe` callback.
The existing normalizer invokes it immediately after `DataRecipe` returns and
before resource selection or child scheduling. It copies only props, retaining
the semantic identity, path, occurrence scope and keys with the existing owners.
The copier is the existing core data snapshot, through VDOM's existing trusted
VNode/ContentHandle opaque guards. Owned resources and native leaf payloads retain
their existing core identities. No second data walker or external alias ownership
marking was added. Plain callbacks remain unsupported ordinary data; existing
owned executable capabilities stay opaque. Seal no longer freezes caller props.

Every snapshot occurrence, including opaque terminals, is charged before copying
or assignment. Depth checks use the current expansion depth plus the escaped
property path depth. The existing State source-node ledger and work ledger remain
cumulative; strings consume the existing Unicode-code-point ledger. Repeated DAG
references copy per occurrence, without memoization or refunds. A raw parent's
copied descendants may be copied again when their own data recipe resolves: that
is real additional capture work, deliberately charged. No quotas were increased.
One direct two-occurrence fixture now consumes 19 source/work units (three normal
walk occurrences plus eight snapshot occurrences each), and four Unicode scalars.
Owned-VNode-only source accounting remains unchanged. Ordinary synchronous data
normalization does not invoke this copier or acquire these extra charges.

Eleven new tests cover block/spacer/fixed mutations during the first resolver,
between two sequential resolutions, after seal and before the first microtask;
native fixed painting data; shared raw objects under provider/Column occurrences
with different captured heights and painted backgrounds; opaque resource, VNode
and ContentHandle identity; exact repeated-terminal charges; caller mutability;
getters/prototypes/symbols/cycles; breadth/depth/Unicode exhaustion before later
callbacks; closed contexts and no queued resolution after failed capture. Existing
abort/late-completion and native Form/PNG serialization tests also pass. No native
geometry or painting is newly allowed before seal.

### Fix-only inventory and fidelity

The exact ten-path delta against the original S5b.1 delivered source hashes is
`artifacts/private-preparation-fixed/fix-manifest.json`, including before/after
SHA-256 values and an aggregate `fixHash`. Its owner allowlist is:

- `packages/core/src/vdom/{data,normalize,preparation,state}.ts`;
- `packages/{core,layout}/test/preparation-data.test.ts`;
- `scripts/resource-preparation-{auditfix,evidence,preservation}.ts`;
- this evidence document.

The optional visitor argument merely forwards to the existing copier. The two
existing evidence scripts gained explicit output/baseline arguments so old
receipts are never overwritten. The new auditfix helper retains serial command
logs and checks the exact fix-only source inventory. The new preservation receipt
still checks all 1,663 original source files and status, 5,288 historical files,
80 original distribution files, PID 665048 and both prior HTTP response hashes.
The original source worktree was never written or built.

### Fresh R1 checks

All commands ran serially in the target, through
`node_modules/.bin/tsx scripts/resource-preparation-auditfix.ts <command>`.
Logs are under `artifacts/private-preparation-fixed/`; repeat runs append rather
than erase failed attempts.

| Command | Result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including all code-principles AST checks |
| `npm run typecheck` | Pass, including full target package/application build |
| `npm test` | Pass: 1,687 tests, zero failures; 11 additions over S5b.1 |
| `npm run build:browser` | Pass |
| `npm run check:graphs` | Pass |
| `npm run test:browser` | Final pass: 24/24 |
| `npm run test:consumer` | Pass: 15 external tarball closures |
| `npm run check:licenses` | Pass |
| `node_modules/.bin/tsx scripts/text-flow-costs.ts --out artifacts/private-preparation-fixed/shared --compare artifacts/private-preparation-after/shared/report.json` | Pass: 16 libraries, 312 matched metrics |
| `node_modules/.bin/tsx scripts/resource-preparation-evidence.ts artifacts/private-preparation-fixed artifacts/private-preparation-after` | Pass: ordinary and activated graph/cost pairs |
| `node_modules/.bin/tsx scripts/resource-preparation-preservation.ts artifacts/private-preparation-fixed` | Pass: original source/status/history/dist/preview preserved |
| `node_modules/.bin/tsx scripts/resource-preparation-auditfix.ts` | Pass: exact fix-only ownership inventory |

An initial browser run passed 23/24: the unchanged SVG-only raster oracle failed
despite passing PDF byte parity. Its isolated rerun and the full serial rerun
passed without code changes; both attempts remain logged. An early new test used
the wrong escaped-context method, and initial test typings needed correction;
neither is a waiver. Showcase build/test commands were **not** freshly rerun:
the unchanged target showcase distribution from the prior S5b.1 build was reused
by the passing fresh browser suite. No source-worktree distribution was touched.

### Incremental R1 costs, not zero-cost claims

The fresh fixed collector is paired against the preserved original S5b.1
`private-preparation-after` report (not the older pre-stage report). Inputs,
lockfile, tool versions, conditions, ES2022 target and level-9 gzip match. Full
inventories include every shipped map/declaration/other file for all 16 libraries.
`summary.json` has ordinary/package deltas and `activatedDeltas` for the same
positive preparation profile; none of these fixed profiles is merely called new.

| Profile | Raw before → fixed | Min before → fixed | Min gzip before → fixed |
| --- | ---: | ---: | ---: |
| Layout/browser | 371,345 → 371,434 | 187,719 → 187,759 | 60,831 → 60,847 |
| Layout/Node | 677,238 → 677,326 | 322,943 → 322,983 | 97,978 → 97,996 |
| Authored render/browser | 369,135 → 369,222 | 187,531 → 187,571 | 60,252 → 60,272 |
| Authored render/Node | 673,515 → 673,603 | 319,672 → 319,712 | 96,858 → 96,878 |
| Preparation/browser | 388,678 → 389,360 | 197,830 → 198,191 | 63,462 → 63,588 |
| Preparation/Node | 680,852 → 681,777 | 325,536 → 326,000 | 98,358 → 98,539 |

The ordinary source-field condition and snapshot visitor forwarding have a small,
real retained cost: e.g. +40 minified bytes for ordinary layout/render. Drawing
and browser ordinary-text profiles remain byte-identical; Node ordinary text
retains +40 minified bytes (+18 gzip). No new parser, fetch, codec, dependencies
or optional preparation driver enters an ordinary graph. Across all libraries,
browser JS is +1,021 bytes, CJS JS +1,109, browser/CJS declarations +187 each;
Node facade JS/declarations are unchanged. Core alone accounts for the +618
packed/+3,806 unpacked bytes (146,297 → 146,915 packed;
859,208 → 863,014 unpacked). Layout package payload is unchanged. Total tarballs
are 759,730 → 760,348 packed and 4,189,455 → 4,193,261 unpacked. Runtime copying
cost is limited to preparation's data recipes, not claimed free or benchmarked
as a timing improvement.

Code-principles self-check: all checklist items satisfied; no approved exceptions,
numerical comparison changes or Changeset requirement. Implementation is ready
for independent re-audit, **not verified**. Parent/Auditor should verify recipe
boundary timing, caller non-freezing, preserved opaque/semantic identity and
occurrence paths/scopes, cumulative quotas, terminal failure closure, and the
fix-only manifest plus both cost baselines. S5b.2 and public URL/render APIs remain
unimplemented and outside this assignment.
