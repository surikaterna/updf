# Public block-unit provider migration — implementation evidence

Issue: N/A. Production bridge changes, required automated gates and paired
dirty-entry render/trace evidence are complete: this batch is **implemented, ready
for independent Auditor**, not independently verified. This is not whole-flow
closure or either user-2 FINAL pass. No delivery/tracker/Git
mutation is authorized or performed.

## Entry and ownership

- Worktree: `/home/sprawl/projects/updf/trees/flow-admission`.
- Branch: `feature/flow-admission`.
- Entry/base and unchanged HEAD: `b70da49ace00c19a8e570b4fc783806dffd6931c`.
- Entry contained 63 inherited unstaged/untracked paths. Parent delivery manifest
  SHA-256 `b2881c9f985d9df036bf4e6d53c0c6c8bf9af19e1e410ba98c7ebf244b176541`
  and state SHA-256 `8cfa9b45fa8d8f9aca3102bde99a91015afa29824606c7f2cce2c5470bd58a88`
  matched before editing.
- `artifacts/provider-units/entry.json` captures entry Git state and hashes for
  every tracked and inherited dirty file, including previously owned callback
  tests. `partial-state.json` records this batch's exact entry/current hash delta.
  Artifacts are ignored evidence, not new public tooling. All changes are
  unstaged/untracked; no other worktree was touched.

## Partial source changes

Public exports/types now use `BlockUnitRequest { offset, extent, width }`,
`BlockUnit { end, height, nodes }`, and `MeasuredBlock.next`. Old type exports and
runtime measured `fragment` acceptance are removed, without aliases or fallback.
The measured-source helper owns one finite-default kernel operation per extension
lifetime and one fixed-width prepared source per checked occurrence. It charges
monotonic source/provider work, reserves cumulative tentative output and ancestor
state before snapshotting, adopts only the selected prefix, and paints charged
per-unit native groups. `adapterCall` accepts the `next` stage; existing error
mapping is otherwise unchanged. All three existing lifetime finally blocks close
the operation. Reentrancy still enters the existing kernel guard.

Canonical tables return one painted row per next query; their private `selectRows`
loop and unused row-type import are deleted. Empty bodies retain measured
decorations, extent one, source extent zero and empty source keys. Existing shared
edge coordination remains outside the selected decorated fragment. Application
charts/SVG and public test providers/consumer templates have been migrated; the
new templates contain old-type deletion and request-shape compile controls.
At that partial checkpoint packed-consumer validation had **not** run; final
continuation results below supersede that limitation.

The private `PreparedBlock.fragment` bridge remains intentionally. Existing
paragraph/stack/container/nested producers remain capacity-aware private paths.
The B1 native source-admission session remains unwired; no actual-frame projection
or origin-zero substitute was introduced. Kernel A/B1, arithmetic, Paginator,
budget, reservation, decoration and certificate implementations are unchanged.

## Resolved checkpoint: zero-height native output validation

Run:

```sh
npx tsx --test --test-name-pattern="zero-height node-heavy" packages/layout/test/measured-source.test.ts
```

The intended regression supplies zero-height units containing eight empty native
paint groups with a cumulative generated-node limit of 20. It expects LIMIT on
the third callback before more snapshot work. Instead, the first unit fails with
GEOMETRY / "Expected positive number". `LayoutOperation.validateFixed` constructs
a synthetic page with the exact unit height (`packages/core/src/core/layout-operation.ts`,
`validateFixed`); page validation rejects zero height, even with empty ink.

The caller resolved this without expanding core ownership: legal zero-height
units have `nodes: []`. Nonempty zero-height native payloads, even empty groups,
remain unsupported by the existing positive native validation-region contract.
No positive-height substitution, validation bypass, clamp or bounds weakening was
made. The invalid test was replaced by distinct empty-zero-height progress/frozen
query/prefix coverage and explicit nonempty-zero-height GEOMETRY rejection before
publication. Existing shared finite defaults still bound zero-height work.

The cumulative-output regression now uses height one and capacity 100, with eight
empty native groups per unit plus the real placement wrapper. Limit 20 admits
two units/18 nodes; the third callback fails specifically `Generated nodes`, not
source preflight. Only three descriptor probes occur on that third callback,
before further snapshotting, and the caller's budget remains unadopted. Controls
admit two units at limit 20 and three units at the default 1000-node policy.

## Checks and observed coverage

All commands run in the exact worktree above. Subprocess checks use only:

```sh
unshare --user --map-root-user --mount sh -c 'mount --bind "$PWD/artifacts/provider-units/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/provider-units/npm-cache"; COMMAND'
```

No host configuration, tool installation, external cleanup or asynchronous check.
`gates.py` captures actual subprocess exit codes, not just shell-wrapper success.

| COMMAND | Result |
| --- | --- |
| `python artifacts/provider-units/capture.py` | PASS: parent pins, 63 paths, entry hashes |
| `npx tsx --test packages/layout/test/extensions.test.ts packages/layout/test/fixed-admission.test.ts packages/layout/test/fixed-admission-effects.test.ts packages/layout/test/uniform-margin-admission.test.ts packages/tables/test/*.test.ts` | dirty-entry baseline 146 pass, 0 fail |
| `npm run build` | dirty-entry serial build PASS |
| `node artifacts/provider-units/cost.mjs before` | dirty-entry raw/min/gzip profile captured |
| `npm run typecheck` | final partial PASS: full serial workspace build plus root tsc |
| `npm run format:check` | final partial PASS |
| `npm run lint` | final partial PASS, including strict AST code-principles gate |
| `npx tsx --test packages/layout/test/*.test.ts packages/tables/test/*.test.ts` | final partial 492 tests: 491 pass, 1 fail (blocker above) |
| `node artifacts/provider-units/cost.mjs partial` | partial profile captured, not final delivery evidence |

Final logs and exit codes are in `artifacts/provider-units/gates.json` and the
named log files. Initial exploration caught an exact-optional cleanup error,
unsupported-key expectations (KEY, not TYPE), fixed-width mismatch expectation
(VALUE, not GEOMETRY), test source-work quota set too low, and a Biome assignment
expression. These were corrected; the zero-height validator failure is not waived.

Risk-based additions prove frozen exact-three-field queries, different selected
prefixes with identical provider queries, exact width rejection before callbacks,
selected-budget/state adoption versus rejected lookahead, monotonic work,
callback mutation isolation, intentional eager lookahead quota errors, finite
defaults shared across two occurrences, closure and caught-reentrancy poisoning,
and structured callback error identity. Existing source-path/ownership/table
border/decorations/empty-head/foot/nested-normal regressions pass. Existing public
atomic/split actual-height admission still yields two pages at the numerical edge.

## Partial micro-costs

Bundled from the built dirty entry and current partial source, same esbuild
browser/ESM export profiles. Raw/minified/gzip bytes, respectively:

| Profile | Entry | Partial | Delta |
| --- | --- | --- | --- |
| Full layout | 322447 / 166061 / 52789 | 325707 / 167610 / 53228 | +3260 / +1549 / +439 |
| Table consumer | 336859 / 173850 / 55410 | 339601 / 175161 / 55775 | +2742 / +1311 / +365 |
| Fixed geometry/layout | 308925 / 158539 / 50518 | 312149 / 160082 / 50942 | +3224 / +1543 / +424 |

Each nonempty selected unit introduces one real, charged native placement group.
The new prefix-budget test measures two units as four nodes (two authored rects
and two placement wrappers), matching final emission. No net-negative cost,
timing speedup, PDF-byte identity or full render-preservation claim is made.

## Continuation changes and final automated gates

Active API/README/block/contributor/content-role/flow-contract docs now describe
the public unit bridge and explicitly retain private PreparedBlock.fragment,
paragraph/stack/container/nested capacity paths and unwired B1. Historical evidence
was not edited. Added controls cover next-stage Promise/obsolete keys, exact
width/ancestry cache identity and independent occurrence descriptors/origin rebasing,
closed-lifetime preparation, operation-reference release, table private-selection
import and capacity erasure boundaries, and Node/Chromium public-unit PDF parity.
The query width remains the measured region width even when natural width is one.
No inline request shape or public content-kind escape was introduced.

The recorded active source search excludes dist/node_modules and finds removed
public type names only in two intentional `@ts-expect-error` consumer controls.
Canonical `packages/tables/src` has no old callback, fit-loop or capacity fields.
`source-inventory.json` separately records legitimate private host capacity use:
the measured-unit selector bridge, paragraph/content producer, paginator,
stack/container/decorated/nested scheduling and internal B1 projection/scan. Those
are remaining host responsibilities, not public provider ABI escape hatches.

All final commands below use the namespace wrapper above and run serially through
`python artifacts/provider-units/gates.py final`. Actual exit codes and full logs
are in `final-gates.json` and `final-*.log`; there are no asynchronous checks.

| Command | Final result |
| --- | --- |
| `npm run typecheck` | PASS, full serial build then root tsc |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including strict AST principles |
| `npx tsx --test packages/layout/test/*.test.ts packages/tables/test/*.test.ts` | 496 pass, 0 fail |
| `npm test` | 1274 pass, 0 fail |
| `npm run test:consumer` | 14 external tarball closures, NodeNext/Bundler and load-order controls pass |
| `npm run build:browser` then `npm run check:graphs` | PASS, in this order |
| `npm run test:browser` | 18 pass (17 existing plus public-unit parity), 0 fail |
| `npm run build:showcase` then `npm run test:showcase` | PASS, 101 tests |
| `node artifacts/provider-units/cost.mjs final` | PASS, same captured entry profiles/tools |

The root tests include real qpdf/Poppler table header/body/grid/shared-strip
regressions with missing/doubled/displaced controls and the historical 63-edge
raster oracle. No raster thresholds or arbitrary padding changed. Earlier
continuation failures were formatting, an assertion for removed ABI JSDoc, and
the new cache test's index-signature typing/function size; all were corrected.

Final raw/minified/gzip bytes versus the captured built dirty entry:

| Profile | Final | Net delta |
| --- | --- | --- |
| Full layout | 325836 / 167702 / 53248 | +3389 / +1641 / +459 |
| Table consumer | 339730 / 175253 / 55796 | +2871 / +1403 / +386 |
| Fixed geometry/layout | 312278 / 160174 / 50962 | +3353 / +1635 / +444 |

This is real positive overhead: shared finite kernel ownership, eager immutable
capture and tentative per-unit budget/state forks replace the table's fit loop.
One prepared source/descriptor per occurrence and one finite operation per lifetime
are allocated; each examined unit owns its captured payload/forks. Only selected
forks are adopted. There is no new global registry. Wrappers count as emitted nodes,
including the tested 18-node two-unit control. No micro-cost-free or speedup claim.

## Resolved paired-render harness failures

`artifacts/provider-units/render-compare.mjs` attempted a paired dirty-entry
header/body/grid PDF and trace comparison using the captured built entry bundles.
Their private ownership domains correctly reject current font resource handles;
serialized document substitutes also correctly reject. A bounded harness recovery
of unchanged entry installer/document constructors got past descriptor ownership,
but native-only table cells still require text service during table style
normalization (`FONT_RESOURCE`). The harness was stopped, not bypassed or fixed by
runtime changes. Those attempts did not pass and remain historical artifacts.
The replacement harness below resolves resource identity by composition, not by
relaxing validation. Its first external-cell attempt incorrectly returned the new
`end` field to the old ABI and correctly failed KEY. The harness now supplies old
`status`/`nextOffset` versus new `end` only in that local fixture provider.

## Completed paired dirty-entry render, native and source evidence

Run from the worktree above, using the same private namespace/disk-backed temporary
directory and cache as all prior gates:

```sh
unshare --user --map-root-user --mount sh -c 'mount --bind "$PWD/artifacts/provider-units/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/provider-units/npm-cache"; node artifacts/provider-units/paired-check.mjs'
```

PASS. The driver runs `node artifacts/provider-units/paired-render.mjs` and
`node artifacts/provider-units/paired-assert.mjs` serially. Commands, actual zero
exit codes and logs are in `paired-check.json`; no checks remain running.
`paired-provenance.json`, `paired-comparison.json`, per-arm module metafiles and
per-fixture trace/text/PDF/PPM files retain the detailed local proof. These ignored
artifacts are historical provenance, not prerequisites for portable normal gates.

`paired-build.mjs` reconstructs baseline compiled modules with esbuild virtual
onLoad substitution. All ten changed pre-existing production source files have
their recovered blob SHA-256 checked against actual `entry.json` hashes, not just
against HEAD. Unchanged runtime dependencies retain captured dirty-entry bytes,
including inherited A/B1/uniform fixes. All six baseline raw/minified export
profiles reproduce the physically captured before bundles **byte-for-byte**, not
merely equal sizes; their hashes, raw/minified/gzip bytes and source pins are saved.
This is not a clean `b70da49` baseline. Newly added current measured-source code is
absent from the baseline dependency graph.

Each arm bundles the same fixture closure with one actual core resource/operation/
layout-operation owner, layout extension/producer owner, text service, fonts runtime
and canonical table adapter. Metafile assertions check those owners. Within that
closure, each run creates its own `createHelvetica()`, `fontRuntime()`,
`fontProvider(runtime)` and `createTextService({ runtime, defaultFont: "Helvetica" })`.
No owned resource, adapter, measurement or author object crosses arms; immutable
input values are independently constructed. Actual canonical `table`/`Table`,
public document/flow/layout and final core render run in that same bundle.
No runtime workaround, metric substitute, global callback, forged table identity,
manual page bypass or production/test edit was used.

Fixtures use ordinary fractional geometry (80.25pt columns, 9.5pt text, 3.25pt
padding, 0.75pt shared borders), with positive spare page capacity, not a boundary
fixture. The grid case includes repeated visible header/footer, nine keyed body
rows and an external measured native rectangle cell. The context case uses actual
deferred JSX header/footer callbacks reading sealed PageContext/FragmentContext.

| Fixture | Pages per arm | Native nodes entry → current | Exact 144dpi raster / text bbox |
| --- | --- | --- | --- |
| Header/body/footer shared grid + native cell | 3 | 186 → 198 | PASS / 58 words |
| Empty | 1 | 1 → 1 | PASS / 0 words |
| Header only | 1 | 18 → 18 | PASS / 4 words |
| Deferred final-context header/footer | 3 | 210 → 222 | PASS / 60 words |

All eight PDFs were freshly regenerated, nonempty, `qpdf --check` clean and page
counts checked with `qpdf --show-npages`. `pdftotext -bbox` word contents/coordinates
are exact; its empty-document "no word list" message is expected. All eight page
pairs are byte-identical PPM output from `pdftoppm -r 144`: zero differing pixels,
no new threshold/tolerance or raster waiver. PDF bytes intentionally differ where
group structure differs; PDF-byte identity is not the contract.

Parsed result placements compare exactly: sourceIndex, sourcePath, sourceRange,
sourceKeys, pageIndex and boxes. Both nonempty fixtures progress through ranges
`[0,4)`, `[4,8)`, `[8,9)` in legal unit order, with no lost/repeated source rows;
keyed rows preserve `row-0` through `row-8`. Empty/header-only source ranges stay
empty. Exact native comparison flattens translation-only groups, retaining every
leaf, page, accumulated origin and effective clip; unsupported group attributes
or nontranslation transforms fail the harness. Actual PDF rendering independently
confirms those coordinates through the existing pipeline.

Grid paint groups are 129 → 141; context groups 141 → 153, with identical leaf
counts/geometry. The expected +12 in each is fully accounted: nine per-row
placement wrappers and nine per-row table edge-report groups replace three
range-placement wrappers and three range edge-report groups: `2 × (9 − 3)`.
No wrapper is hidden from the reported final native counts. All six final
header/footer context observations compare exactly, including page numbers/count,
flow/section values and fragment index/count/first/last.

The external atomic cell trace measures once in both arms at width 72.25 and the
same source path. Its old callback receives offset/width and capacity/fresh fields
(8.25/8.25/true); the current callback receives exactly offset 0, extent 1, width
72.25. Both select the same legal unit. Table source-unit order is checked through
actual placements; old capacity decisions and new unit callbacks are **not claimed
to be exactly callback-equivalent**.

Fresh PDF SHA-256 values (full logs and byte counts in `paired-comparison.json`):

| Fixture / arm | SHA-256 |
| --- | --- |
| Grid / entry | `723525a6f7664febdd1d7775daeb14098c24f957fc2d66f2c3e4a2f300a16799` |
| Grid / current | `6258583e940f75426d381838e019e542e1a032f46c41198a38f35ab59f83a68a` |
| Empty / both | `294b1e64f36da537b83f9112744225322deeeb9ebc29c603cd51536b1b4b26f6` |
| Header only / both | `30d239c5a975fc555a3021c7c7c90881aab75c290f057e2d2e4c717b00525338` |
| Context / entry | `93c2851250b290e3e1703a2097e3048a074640439da8ded49190dcce7e8cd462` |
| Context / current | `fbb3754af227c4bb9a9dccbedd4b8409f4021ada6b0c18d29f68ac30fec82e89` |

## Acceptance, preservation and next owner

Automated gates, ABI controls, active docs, paired costs and paired render/source
acceptance are complete. Independent Auditor should review the actual 51-path
entry-relative batch within 108 total dirty paths, including inherited ownership.
Only this evidence document and ignored provider-unit evidence additions changed
in this completion slice. `python artifacts/provider-units/completion-state.py`
asserts every runtime/test/instruction byte against the frozen final checkpoint,
and regenerates `final-state.json`. It retains the exact prior manifest as
`final-state-precompletion.json` (SHA-256
`58bd4ef7f8485c554dfbfaf7c72c4271ff1973698b81b51a092b63bd27476160`).
The original entry/partial manifests, source inventory and prior gates are retained.
Final documentation format and `git diff --check` pass; full suites were not
replayed for this evidence-only slice because all checked source/test bytes remain
identical. Full private-flow refactor and both FINAL closure passes remain pending;
no delivery is authorized.

Code-principles self-check: final format/lint/AST pass; files are cohesive and
under 400 lines, functions under 50, nesting at most three, intent-only comments.
Risk tests added as above; **all final automated tests pass**. No approved principle or CI
exception. The private host fragment bridge is the architect-approved migration
boundary, not a public compatibility shim or a completed flow migration.

## Independent audit H1 — callback receiver capability boundary fixed

The independent audit found that the member call `descriptor.callback(request)`
bound the private descriptor as `this` for ordinary strict non-arrow providers.
That exposed mutable engine authority, including operation, lifetime and tentative
budget/state/capacity, despite the frozen three-field query. Earlier query-shape
tests alone did not establish the required boundary; the prior completion record
above is historical and superseded by this H1 correction.

`measured-source.ts` now captures `const callback = descriptor.callback` and calls
`callback(request)` inside the same `adapterCall("next", ...)`. No replacement
receiver, service allocation, Reflect/call invocation, descriptor freezing, field
stripping, ABI/type change or global callback registry was added. Source providers
receive only source queries, **no mutable engine capability** through a host-bound
receiver. Authored closures over legitimate bounded measurement services remain
supported. Work charging, synchronous error-stage/origin mapping, eager quota
validation, health/reentrancy and lifecycle ordering remain unchanged.

Two dedicated regressions use unbound ordinary functions with erased TypeScript
`this: unknown`, not arrows: `measured-cache.test.ts` exercises the actual public
`defineBlockAdapter` → document/flow → layout path; `measured-source.test.ts`
exercises the direct CJS bridge, including lookahead. Both assert `this ===
undefined` and a frozen query with exactly offset/extent/width, return valid
positive-height empty units, and check retained receivers after operation close.
This proves receiver non-disclosure, not collection of all authored closure data.
The existing structured callback-error identity and reentrancy tests still pass.

All following commands used the private namespace/TMPDIR/cache wrapper above.
`python artifacts/provider-units/h1-checks.py` (then `resume`) records actual exits
and logs in `h1-gates.json`; every completed gate exits 0:

| Command | Post-H1 result |
| --- | --- |
| `npm run typecheck` | PASS, including full serial build before tests |
| `npx tsx --test packages/layout/test/measured-source.test.ts packages/layout/test/measured-cache.test.ts packages/layout/test/flow-admission-*.test.ts packages/layout-boxes/test/fragment-*.test.ts` | 101 pass, 0 fail |
| `npm run format:check`; `npm run lint` | PASS, including AST principles |
| `npm test` | 1276 pass, 0 fail (two new tests) |
| `npm run test:consumer` | 14 external packed closures pass; existing ESM/CJS/types controls unchanged |
| `npm run build:browser`; `npm run check:graphs`; `npm run test:browser` | PASS; full browser 18 pass, 0 fail |
| `node artifacts/provider-units/cost.mjs final` | PASS, rebuilt current dist |
| `node artifacts/provider-units/paired-check.mjs` | PASS; all eight page pairs freshly raster/text/native/source checked, all eight PDFs qpdf-clean |
| `python artifacts/provider-units/h1-mutant.py` | old member call: both tests fail, exit 1; restored plain call: both pass, exit 0 |

The mutant changes only ignored ESM/CJS dist call targets and restores their exact
bytes in `finally`; source remains fixed. Initial test setup placed extensions on
layout options rather than flow and failed typecheck; corrected before passing.
The first gate wrapper timed out during browser tests, confirmed stopped, then
browser/cost/pairs were rerun to completion. The first mutant summary parser
expected TAP but received spec output; explicit TAP resolved that harness-only
failure. No check remains outstanding. Prior 101-test showcase evidence is reused,
not counted as rerun: its sources are unchanged; root, packed and browser gates
exercise the affected public provider runtime freshly.

Current raw/minified/gzip bytes are full layout **325869 / 167706 / 53249**, table
consumer **339763 / 175257 / 55798**, fixed geometry **312311 / 160178 / 50961**.
H1 versus pre-H1: +33/+4/+1, +33/+4/+2, +33/+4/−1 respectively. Net versus physical
dirty-entry baseline: +3422/+1645/+460, +2904/+1407/+388, +3386/+1639/+443.
All six reconstructed baseline profiles still match physical before bytes exactly.

`final-state-pre-h1.json` preserves the audited manifest SHA-256
`9ccc578dbceebf130c60f997fd4f7642982075eee7a9f61a1823dabda97135cd`.
`h1-state.py` asserts only this document, measured-source and the two named test
files differ from that snapshot, and refreshes current `final-state.json` with
source/test/evidence hashes. All other inherited A/B1/legacy/uniform and batch
bytes are preserved. Issue N/A; implemented, **not verified**, pending fresh bounded
H1 and integration audit. Full private-flow refactor and both FINAL passes remain
pending. Code-principles checklist passes with no approved exceptions; no staging,
commit, push, PR, issue mutation or other-worktree writes.
