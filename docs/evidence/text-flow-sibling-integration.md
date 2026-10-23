# Sibling integration: real Block/Paragraph vertical slice

**Latest: R1 whole-sibling validation audit fix locally implemented; re-audit pending.**
The final vertical-integration section supersedes historical stop/unfinished notes
below. The caller independently verified the source/state prerequisites (1,478
tests) before authorizing this final assignment, including provenance-only edits.
Issue: N/A. Engineer is integration owner. Worktree:
`/home/sprawl/projects/updf/trees/text-flow-design`; branch `feature/text-flow-design`;
base and unchanged HEAD `882d6d38f432edcac97e962fbf446062c1483c3d`.
No delegation, tracker mutation, staging, commit, push or PR occurred.

## Historical stop boundary (resolved by final assignment below)

The requested real Block/ordinary Paragraph sibling float is **not implemented**.
The explicit instruction to stop before editing Paginator was reached:

- `paginator.ts:197–215` records `item.sourceKeys?.slice(offset, fragment.nextOffset)`.
- `paginator.ts:114` indexes `item.sourcePaths?.[offset]` for oversized diagnostics.
- Those offsets must now count retained scalars/visuals/breaks, not sibling metadata.
  A grouped float plus two Paragraphs cannot use those indices to recover original
  sibling keys/paths. Padding metadata to scalar extent is not an acceptable fix.
- `PreparedBlock` currently has no range-to-provenance resolver. Its existing
  metadata arrays cannot express this mapping compactly. ContentLine source paths
  alone do not repair top-level placement keys or oversized diagnostics.

Paginator is untouched. The caller must decide whether to authorize a **generic**
producer range/offset provenance resolver and its two Paginator call sites, keeping
admission, selection, cursor and commit order unchanged. This is a permission
boundary, not proof that integration is impossible. Audit this partial first if
desired; a fresh bounded assignment should own further integration.

Deferred: participation ownership/capture/Flow validation/compiler hook; marked
real Block facade; generic declared child assembly; paragraph kernel descriptors,
full-operation candidate enumeration and nonthrowing width-blockage probe;
composite extent/checkpoint mapping and mismatch rejection; left/right policy,
two affected Paragraphs, crossing line inclusion, float-alone fallback, full-width
tail and multipage continuation; paint-once/native descendant failure/defer tests.
There is deliberately no misleading sibling fixture or consumer claiming that API.
Existing atomic TextFlow, rectangles and edge profiles remain unchanged.

## Actual generic API

The optional text operation capability now supports:

```ts
const source = operation.prepareInline(paragraph, visuals, width, height, path);
const { offset, extent } = operation.inlinePosition(source, path);
const resumed = operation.resumeInline(source, offset, path);
const selected = operation.selectInline(resumed, { width }, path);
const result = selected && operation.selectedInline(selected, path);
// result: measured, width, startOffset, nextOffset, continuation
```

- Existing selector units remain the source owner. Chunks weigh `atoms.length`;
  undefined hard breaks and the terminal each weigh one. Discarded collapsed
  whitespace weighs nothing; retained whitespace still counts, even when wrapping
  discards it from a painted line. Empty paragraphs have extent one. This is neither
  UTF-16 reporting coordinates nor line counts.
- Prefixes are prepared once for optional inline sources, with safe-integer sum
  rejection and one existing feature-work charge per unit. Ordinary wrapping does
  not prepare prefixes. Direct resume binary-searches prefixes, charges every
  comparison, forks the cursor and clears its width cache; it does not replay lines.
- Resume accepts token boundaries, scalar boundaries only with codePoint breaking,
  and terminal extent. Invalid/fractional/nonfinite/out-of-extent positions and
  offsets inside indivisible tokens reject. Atomic visuals count once.
- Source/selection handles remain frozen operation-owned WeakMap identities;
  snapshots and lifetime checks retain their existing owners. Queries do not commit
  source progress. Widths, cursor domains and source identities remain exact.
- Omitted maxHeight selects one actual line without a host height ceiling. Present
  maxHeight retains exact finite/nonnegative validation and existing approximate
  nominal-height fit. Explicit undefined rejects. Native certificates are unchanged.
- The private rich Paragraph bridge forwards positions/resume/start/end offsets,
  restricts handles to its source, and continues to reuse original reporting,
  background, visual and painting closures. No second font/wrap/paint owner exists.

`FragmentState` additionally offers private typed `read(slot)` / `write(slot, value)`.
`fragmentSlot<T>()` creates an opaque identity. Writes replace one checkpoint per
slot, not a history indexed by source offsets. Fork/adopt are copy-on-write across
both channels; existing bigint spacer methods are unchanged. Checkpoints must be
frozen data, including nested object values; accessors/mutable nested data and Maps
reject. The slot registry and slot map allocate only when slots are used. Existing
Paginator/selectStack transaction owners are unchanged; no sibling producer yet
uses this channel or defines SiblingCheckpoint.

## Frozen inputs, preservation and costs

Before runtime edits:

```sh
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-integration-before --compare artifacts/text-flow/sibling-prereq-fixed-vs-before/report.json
npm exec -- tsx scripts/text-flow-integration-evidence.ts
```

All **222 metrics match**. The new before manifest freezes 1,513 source hashes,
exact dirty state/revision/tools/inputs and 327 historical artifact hashes. The
collector itself was added before freezing; inherited start was 21 modified tracked
and 37 untracked files. Node v24.22.0, npm 11.19.1, TypeScript 5.9.3, tsx 4.23.15.
Historical artifacts are never overwritten. The new final collector replaces the
old hardcoded prerequisite collector for this slice, asserts preservation of all
historical hashes and unchanged tools/inputs/lock, and records all delivered hashes.

Seven inherited paths changed: `content-inline-selection.ts`, `fragment-state.ts`,
`inline-selection-types.ts`, `inline-selection.ts`, `wrap-selector.ts`, its test,
and `scripts/boundaries.ts`. Added: source-index and fragment-slot owners, their
source-position/state tests, two integration evidence scripts and this document.
Final evidence separates inherited-path edits and added paths. All earlier dirty
work is preserved. Core, Paginator, layout-boxes, fonts, painting algorithms and
addon policy have zero changes relative to this slice's frozen start.

Fresh paired consumer deltas (minified bytes / gzip bytes):

| Existing consumer | Browser | Node |
| --- | ---: | ---: |
| Ordinary text | +1,187 / +369 | +1,433 / +440 |
| Prepared font | +1,187 / +389 | +1,433 / +435 |
| Layout | +1,893 / +641 | +2,487 / +819 |
| TextFlow | +2,297 / +768 | +2,891 / +938 |
| Rectangle TextFlow | +2,297 / +769 | +2,891 / +940 |
| Profile TextFlow | +2,297 / +769 | +2,891 / +937 |
| Drawing and JPEG | 0 / 0 | 0 / 0 |

Generic layout seam growth: ESM/CJS JS +2,328/+2,590, declarations +962 per
format, pack +1,845 compressed/+10,041 unpacked. Text generic source-position
growth: ESM/CJS JS +3,216/+3,465, declarations +942 per format, pack
+2,019/+13,196. Core and addon emitted/pack deltas are zero. Generic selector
methods/source-index code and slot validation are retained in ordinary graphs;
this is a real shared-owner byte cost, not zero tax. Optional inline-selection and
rich bridge modules remain absent from ordinary retained consumers; no float
policy modules exist. The prefix and slot registry/maps do not allocate in ordinary
use. No runtime-speed claim or installed-dependency-size claim is made.

`sibling-integration-vs-before` and `-vs-library` have identical final metrics.
The latter includes all inherited changes, not just this partial. Both retain all
old consumer inputs unchanged; reports contain every raw/min/gzip metric, emitted
file inventory and pack payload. The lack of a sibling consumer is an explicit
remaining acceptance item, not a successful feature cost measurement.

## Validation

Final runtime checks ran sequentially in the worktree above:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including AST principles |
| `npm run typecheck` | PASS, package builds and TypeScript |
| `npm test` | PASS, 1,473 tests; zero failures/skips |
| `npm run build:browser` | PASS, 12 builds; nonfatal chunk-size warning |
| `npm run check:graphs` | PASS, 12 inventories |
| `npm run test:consumer` | PASS, 15 external closures/declarations |
| `npm run test:browser` | PASS, 18 tests; zero failures/skips |
| `git diff --check` | PASS |

Earlier failures were not waived: non-ASCII tests initially used Helvetica and
were moved to the scalar selector test rather than relaxing font validation;
assignment-expression lint and a deliberately invalid optional-field test type
were fixed. An earlier combined gate command timed out after 240 seconds during
browser tests. One standalone rerun failed unchanged SVG-authoring raster output
(17/18 passed). Two subsequent complete browser runs passed, including the final
all-gates run with a sufficient deadline. SVG code and thresholds are unchanged;
intermittent raster behavior remains a concern, not an approved CI exception.

Focused command (initially 17 passing tests; final full suite also includes the
added safe-integer overflow test):

```sh
npm exec -- tsx --test packages/text/test/inline-position.test.ts packages/text/test/inline-selection.test.ts packages/text/test/wrap-selector.test.ts packages/layout/test/inline-selection.test.ts packages/layout/test/fragment-state.test.ts
```

Risk-based additions cover empty/collapsed/preserved spaces, consecutive/trailing
hard breaks, surrogate versus UTF-16 coordinates, atomic visual units, direct
long-word resume at changing widths, terminal consumption, exact invalid offsets,
indivisible boundaries, repeat queries/source ownership/lifetime, index preparation
once, measured comparison charges and safe-integer overflow, slot identity,
lookahead isolation/replacement/adoption, nested mutability and coexistence with
bigint spacers. Existing rich background/visual/source and ordinary parity tests
remain green. The direct surrogate resume test observes two work charges for two
binary-search comparisons; preparation charges one per unit once. No zero-work or
unmeasured integration performance claim is made.

Cost and parity commands:

```sh
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-integration-vs-before --compare artifacts/text-flow/sibling-integration-before/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-integration-vs-library --compare artifacts/text-flow/library-baseline/report.json
npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/sibling-integration-vs-before/parity.json artifacts/text-flow/edge-profile-vs-before/parity.json
npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/sibling-integration-vs-before/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json
npm exec -- tsx scripts/text-flow-integration-result.ts
```

PASS: paired costs/preservation; 162 strict composition output/diagnostic/work
cases and 216 wrapper parity cases. Timings are observations, not paired speed
evidence. Final hashes live in `sibling-integration-vs-before/evidence.json`.

Code-principles self-check: cohesive files under 400 lines, functions under 50,
nesting at most three; comments for invariants/intent; risk-based tests and all
final gates pass. No approved/requested exception. No Changeset: repository does
not use Changesets. No claim of full integration acceptance or independent audit.

Auditor: review this partial against the frozen manifest, especially width-cache
reset/direct cursor legality, retained whitespace versus painted spans, work
charging, source ownership, and checkpoint immutability/copy-on-write. Caller:
decide generic provenance authorization before assigning integration continuation.

## Source/state audit fixes (latest; implemented, not verified)

Issue N/A; same worktree/branch/base/HEAD as above. Engineer owns this bounded fix.
Starting state: 22 modified tracked / 44 untracked files, all preserved. No staging,
commit, push, PR, tracker mutation or delegation occurred. The two must-fix attacks
and authorized ordinary-retention optimization are addressed. Actual float policy,
Core, Paginator, provenance, native lifecycle/admission/order, fonts, layout-boxes,
numerical tolerances, quotas and addon code have **no source changes in this fix**.

### Checkpoint data and adoption ownership

- `fragment-slot.ts` reuses core `dataRecord` / `dataArray` before reading values.
  Symbols (keys and values), accessors, callbacks/functions, class instances,
  nonordinary array prototypes, sparse/extra array properties and mutable nested
  objects reject. No getter executes. Supported checkpoints are frozen ordinary
  records (including null prototypes) and dense ordinary arrays, with primitive
  data leaves other than symbols/functions. Bigint leaves remain supported.
- Frozen opaque inline continuation handles are ordinary empty records: the exact
  identity is retained, not cloned or rebranded. Their operation/source/lifetime
  validation remains with their existing owners when consumed. There is no generic
  exemption for arbitrary frozen classes, maps, functions or mutable handles.
- Traversal is iterative and visits each distinct object once, so sharing and
  frozen cycles terminate without recursive stack growth. A 10,000-deep cyclic-tail
  regression passes. Slots are a private code-owned producer checkpoint channel,
  not an arbitrary user-data ingestion API; no independent user-controlled budget
  is introduced here. Callers must retain owned bounded data/handles, not raw user
  graphs. Existing input snapshots and cumulative feature/kernel budgets remain
  mandatory and unchanged. No guessed quota or unlimited user-facing path is added.
- `FragmentState` maps and family token are ECMAScript private fields, not TS-only
  properties. Adoption checks a genuine private brand and the same fork-family
  identity before reading either map. Fakes, prototype clones, proxies, unrelated
  real states and externally supplied map aliases reject; fake getters never run.
  This applies equally to typed checkpoints and the inherited bigint channel.
- Family identity is the root state itself (no extra token allocation per fork).
  Nested descendants and sibling candidate forks in the same transaction family
  may adopt; direct-parent-only admission would unnecessarily constrain nested
  stack/Row selection. Fork families do not add generation invalidation: choosing
  an accepted candidate remains the existing host transaction owner's job. Writes
  replace maps copy-on-write, including writes after adoption. No public map alias
  or constructor parameter exposes family identity.

### Optional indexing and retained ordinary output

`indexed-selector.ts` is statically selected only by optional `inline-selection`.
It binds one immutable prefix array to the existing selector's cursor/fork seam.
The ordinary selector exposes that seam only inside the private text modules;
it has no prefix field, prepare/query/resume methods or source-index import.
There is still exactly one grouping, tokenization, chunking and line-wrap policy.
`source-index.ts` itself is unchanged: legal offsets, binary-search comparison
charges, overflow validation and exact scalar identity remain its existing owner.
Resume forks the same selector and clears the same width cache before selection.
The optional wrapper allocates only when that capability is selected; ordinary
measurement gains no new geometry, counter, field, allocation or index algorithm.

Graph checks now inspect emitted module bodies and bundled behavior, not just
filenames, with opt-in positive controls on both browser and Node bundles. The
new exhaustive differential covers **2,500 sources / 14,198 offset probes**, four
widths per legal position, both whitespace and long-word policies, surrogates,
hard breaks and atomic visuals. It compares direct indexed resume to an independent
linear cursor lookup feeding the same sole nonindexed wrapping policy. Existing
preparation-once, comparison charges, width-cache reset and operation tests pass.

Fresh paired deltas against **`sibling-integration-before/report.json`**, min/gzip:

| Existing consumer | Browser | Node |
| --- | ---: | ---: |
| Ordinary text | **0 / 0** | **0 / 0** |
| Prepared font | **0 / 0** | **0 / 0** |
| Layout | +823 / +321 | +1,237 / +429 |
| TextFlow | +2,478 / +836 | +3,242 / +1,118 |
| Rectangle TextFlow | +2,478 / +838 | +3,242 / +1,120 |
| Profile TextFlow | +2,478 / +837 | +3,242 / +1,117 |
| Drawing and JPEG | 0 / 0 | 0 / 0 |

All ordinary/prepared **raw as well as min/gzip metrics are zero incremental**.
Ordinary min/gzip absolute sizes are 61,271/21,046 browser and 126,982/39,566 Node.
The fix removes the unfixed ordinary +1,187/+369 browser and +1,433/+440 Node.
Generic checkpoint validation/authentication remains a real retained layout cost;
the optional wrapper also increases opted-in TextFlow cost versus the unfixed
partial by +181/+68 browser and +351/+180 Node. This is not a zero-cost claim for
layout or optional consumers, nor a runtime-speed or installed-dependency claim.

Layout ESM/CJS JS deltas versus the original before are +2,933/+3,243;
declarations +937 per format; pack +2,086 compressed / +11,551 unpacked. Text
ESM/CJS JS deltas are +3,757/+4,056; declarations +2,063 per format; pack
+3,002/+17,968. Core/addon and all other package emitted/pack deltas are zero.
The optional split increases package payload while eliminating ordinary retention;
reports retain both effects rather than treating tree shaking as package savings.
Addon sibling integration is still **not implemented** and has no cost fixture.

### Final evidence, checks and handoff

New artifacts: **`artifacts/text-flow/sibling-state-fixed-vs-before/`**. `start.json`
freezes 1,520 source hashes (including the collector added before freezing) and
2,137 historical artifact hashes. Every source hash in the preceding delivery's
`sibling-integration-vs-before/evidence.json` matches that frozen start. Final
`evidence.json` authenticates all historical hashes, unchanged inputs/tools/flags/
lock, no removed inherited source, and an explicit changed-path allowlist. It
records all final source hashes, changed/added path bytes and SHA-256, paired costs
against the original before and unfixed partial, and actual unstaged/untracked state.
Old manifests/reports/artifacts were never overwritten. `report.json` contains all
222 metrics, emitted inventories, tarball payloads and browser/Node retained graphs.

Changed inherited paths in this fix: layout `fragment-slot.ts`, `fragment-state.ts`
and `test/fragment-state.test.ts`; text `inline-selection.ts`, `wrap-selector.ts`
and `test/wrap-selector.test.ts`; `scripts/boundaries.ts`, `text-flow-costs.ts`;
`tests/integration/text-flow-graphs.test.ts`; this document. New paths:
`packages/text/src/indexed-selector.ts`, `packages/text/test/indexed-selector.test.ts`,
`scripts/text-source-index-graph.ts`, `scripts/text-flow-state-evidence.ts`. The last
was created before freezing and is accordingly listed as changed by that manifest.

Final runtime gate ran serially: `npm run format:check`, `npm run lint`,
`npm run typecheck` (includes `npm run build`), `npm test`, `npm run build:browser`,
`npm run check:graphs`, `npm run test:consumer`, `npm run test:browser`,
`git diff --check`: **all PASS**. Full tests: **1,478**, no failures/skips;
12 browser builds/inventories; 15 external consumer closures; 18 browser tests,
no failures/skips. Nonfatal build chunk-size warning remains unchanged.

Additional exact commands (same cwd, run sequentially):

```sh
npm exec -- tsx scripts/text-flow-state-evidence.ts --freeze
npm exec -- tsx --test packages/text/test/indexed-selector.test.ts packages/text/test/inline-position.test.ts packages/text/test/inline-selection.test.ts packages/text/test/wrap-selector.test.ts packages/layout/test/inline-selection.test.ts packages/layout/test/fragment-state.test.ts tests/integration/text-flow-graphs.test.ts
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-state-fixed-vs-before --compare artifacts/text-flow/sibling-integration-before/report.json
npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/sibling-state-fixed-vs-before/parity.json artifacts/text-flow/edge-profile-vs-before/parity.json
npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/sibling-state-fixed-vs-before/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json
npm exec -- tsx scripts/text-flow-state-evidence.ts
```

PASS: 25 focused tests; 162 strict composition output/diagnostic/work parity cases;
216 wrapper output/error parity cases; cost/source/artifact assertions. Earlier
lint failures (type-only import, fourth nesting level in the new differential)
were fixed, not waived. A later evidence assertion caught +92 raw ordinary bytes
from an explanatory emitted comment; removing only that comment restored exact
raw metrics too. A full package rebuild and focused/graph checks passed afterward;
no runtime logic changed after the final full gate. Formatting/lint were rechecked
after the final document/evidence updates.

Code-principles self-check: all checklist items satisfied; cohesive sources under
400 lines, functions under 50, nesting at most three; intent/invariant comments;
proportional attack, ownership, deep-graph and differential regressions; lint/tests
pass. No approved/requested exception; no Changeset (repository does not use it).
**Implemented, not verified.** Remaining acceptance for this fix: independent audit.
Auditor should verify attacks and exact handle identity, same-family nested
transactions, private map nonaliasing, work/cache parity and ordinary emitted
behavior/bytes against the frozen before. Further actual-float/provenance work
requires a fresh authorized assignment, not continuation of this fix.

## Final vertical integration (preceding assignment; implemented, not independently verified)

Issue N/A. Integration owner: Engineer. Worktree/branch/base/HEAD remain exactly
those recorded above. Starting delivery state was **22 tracked modifications and
48 untracked files**, inherited and preserved. The caller independently verified
the two prerequisites before this assignment. No delegation, Git staging/commit,
push, PR, delivery or tracker mutation is authorized or performed.

### Actual public API and selection

`createTextFlow(existingCapability)` now returns **`{ Block, participation }` in
addition to the unchanged `TextFlow` and `textFlowAdapter`**. The README contains a
complete real TSX example. Put the exact opaque handle on `Flow.participation` and
use `<f.Block style={{ width: 72, height: 96, float: "left", ... }}>` followed by
ordinary Paragraph/Span siblings. No second installer/service or global registry
is introduced. Local identity ownership is checked before ordinary normalization;
foreign factories, structural copies and uninstalled/nested markers reject.

- One direct-body float per Flow. Left/right and default/explicit rect only;
  explicit positive finite dimensions must fit the body. Margins/auto alignment
  reject. Flow.Body, contours, gaps/top offsets, multiple floats and nonparagraph
  wrapping are intentionally unsupported. Ordinary Block constraints, children,
  decoration slots, colors/borders and painting remain with existing owners.
- Consecutive ordinary non-kept rich Paragraphs participate. Nonparagraphs, kept
  Paragraphs, Rows and page breaks terminate the affected sequence. A second marker
  explicitly rejects, even after a barrier. Later content remains ordinary.
- Composite extent is **one actual visual occurrence plus the real paragraph
  source extents**. Scalar/atomic/break/terminal positions are width-independent;
  there are no line-index cursors or character-sized provenance arrays. Frozen rich
  bridges retain original sources, styles, backgrounds, visuals and paint closures.
- An addon-owned full fragment operation enumerates actual lines at reduced width
  across Paragraphs until the first line reaches/crosses the float bottom. Every
  provider call resumes the same owned source at its exact local offset and selects
  one actual line without a fabricated height bound. Width-only native contracts,
  candidate purity, kernel work limits and source-handle lifetimes remain intact.
- A charged nonthrowing first-unit probe precedes each side candidate call. Only
  width-blocked word/visual units return false; generic errors/quota failures are
  never caught as fallback. A blocked unit is not consumed; the positive-height
  float can stand alone, then the same source resumes at full width. Repeated
  probes and rejected selections do not refund work.
- Initial selection completes the real Block through its existing owner. Its
  actual resolved height is reserved even if text ends earlier; maxWidth's resolved
  width owns both the exclusion origin and interval. A group that cannot fit the
  remaining region returns none and moves intact. A fresh-body oversize fails via
  the standard bounded diagnostic. Subsequent fragments use full width only, even
  mid-Paragraph/on later pages; they never repaint/restart the float.
- Each producer has a typed frozen source-offset checkpoint. Only a selected end
  is written to the candidate request state. Existing Paginator fork/adopt remains
  the commit owner **after actual native placement**; rejected lookahead is pure.
  Natural metrics use actual complete selections and metric sums, not fake heights,
  Row/whole-Column selection or a parallel admission path.

### Generic seams and preservation

Layout owns optional participation capture and normalized block/rich-paragraph
descriptors; the addon owns all float policy. The ownership WeakMap is lazy and
only the explicitly installed handle is consulted. Ordinary layout imports no
addon, optional inline bridge or composite policy. A private declared-child helper
routes through existing iterative preparation/resolvePaint. Selected lines from
each paragraph are joined by forwarding their original metric/emission/painting
owners; the original paragraph painter keeps **all backgrounds before glyphs**,
including tight leading. No normalizer, painter or box-measure algorithm is copied.

Compact frozen source intervals map offsets/ranges back to original authored body
indices, keys and paths. Paginator has exactly the two authorized reporting edits
and one helper import. `scripts/text-flow-paginator-proof.ts` asserts the **entire
file** equals HEAD plus those exact replacements: admission, selection, cursor,
preparation, native paint, state adoption and control ordering remain byte-identical.
Absorbed paragraph positions retain zero-extent compiler entries solely to preserve
indices of later controls; these entries never select a fragment, paint, reserve
height or consume the composite's source. No zero-height float fragment is emitted.
No-hook ordinary report arrays/default paths retain their original semantics.

Core, fonts, image/path/native-painting engines, layout-box algorithms, numerical
tolerances/certificates and quotas are unchanged relative to this assignment's
freeze. Numeric changes distinguish exact domains/source/width identity from
derived band occupancy using existing local-scale metric comparisons; native
certificates and native placement remain exact. `@updf/layout-boxes/fragmentation`
is an explicit addon dependency on the already-present version. The lock changes
only that dependency edge. The private layout seam has explicit package/importer
inventories. Biome now includes the previously omitted addon package.

### Validation and risk-based tests

Final runtime gates are run **serially**, in the exact worktree above:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npm run test:browser
git diff --check
```

Focused new tests exercise actual TSX left/right with two Paragraphs, whole-stream
Poppler text equality and valid PDF output, once-only float and late decoration
painting, full-width/multipage tails, intact near-bottom defer, fresh-body oversize,
short content, full-body-width/word-blocked fallback, Span/background/inline visual
source-coordinate reports, barriers, invalid domains and ownership, repeat/fork/
adoption/closed operations, compact mixed scalar/sibling provenance, malformed
later-child rejection before any paint, tight-leading background order, adjacent
float heights, fractional margins/origins and resolved maxWidth. Probe tests retain
cumulative repeated-query charges and propagate quota errors. The real styled
public consumer additionally has exact Chromium/Node placement and PDF-byte parity.

Earlier failed checks were fixed, not waived: frame-local fit offset; key loss in
an expanded functional wrapper (replaced by owned semantic capture); test fixtures'
constructor-key metadata, inline stroke and inconsistent region occupancy; text
extraction line whitespace; numeric test line-height ratio versus `pt()`; strict
optional typing/ES2022 array API; and new functions' AST length limits. No native
algorithm, tolerance, quota or test threshold was relaxed.

### Fresh paired evidence and costs

Before runtime edits, `sibling-final-before/start.json` froze **1,524 source hashes
and 2,221 historical artifact hashes**. Its fresh report matches **all 222** metrics
in `sibling-state-fixed-vs-before/report.json`. Old reports/manifests remain intact.
First-pass integration reports are retained at `sibling-final-vs-before/` and
`sibling-final-vs-library/`; final post-self-check/document payload reports live
under **`final/` in each directory**, without overwriting the first passes.
Each final report includes **230 metrics** (the extra eight are the new real styled
sibling consumer), full emitted inventories, tarball payloads and retained graphs.
Library comparison includes inherited historical work, not just this assignment.

The original consumer input strings/tools/flags remain paired; the new consumer
really lays out and serializes a styled two-page PDF at initialization. New consumer
cost is absolute, not an invented delta against an absent baseline. Ordinary text,
prepared-font, drawing and JPEG retain zero incremental raw/min/gzip bytes against
the fresh before. Shared layout and old addon consumers have **nonzero** costs;
the expanded factory retains sibling policy in old addon consumers as well. No
zero-tax, runtime-speed or installed-dependency-size claim is made. `final/summary.json`
records exact deltas, execution/text/PDF hash and the inclusive library comparison.
Final source/artifact hashes and changed/added paths are recorded separately by
`scripts/text-flow-final-evidence.ts` after the final gates.

Code-principles self-check: correctness-first bounded changes; cohesive production
files <=400 lines, functions <50 and nesting <=3; intent/invariant comments;
proportional attack, boundary, reporting, PDF and browser regressions. No approved
exception. No Changeset: this repository does not use Changesets. Independent
Auditor should review the actual frozen-start delta, especially source/checkpoint
purity, conditional preparation, rich painting/background order, compact provenance,
normal no-hook preservation and measured generic/addon retention. No delivery is
authorized; the stopping point is local implementation ready for independent audit.

### Final recorded outcomes

All commands in the serial gate list above **PASS** on the final runtime delivery:
format; Biome and AST principles; typecheck including the complete package build;
**1,503 tests**, no failures/skips; **12 browser builds and inventories**;
**15 external packed closures**, now including actual sibling TSX execution and
NodeNext/Bundler declarations; **19 browser tests**, no failures/skips; diff check.
The unchanged Vite chunk-size warning is nonfatal, not an approved exception.
The first packed sibling fixture initially fit one page; its multipage assertion
failed, and its input was lengthened before the successful complete serial rerun.
No runtime or test threshold was changed to waive that failure. The final PDF-proof
script was added afterward; typecheck, lint and diff checks passed again for it.
The preservation allowlist also records formatting-only changes to inherited addon
tests caused by including the formerly omitted package in Biome. Their behavior is
unchanged. The final manifest, not all inherited Git dirt, defines this slice's
exact changed/added paths; an initial strict allowlist assertion caught the adapter
test formatting before these validation-scope edits were explicitly recorded.

Final incremental consumer deltas versus the fresh before, **minified / gzip bytes**:

| Existing consumer | Browser delta | Node delta |
| --- | ---: | ---: |
| Ordinary text | 0 / 0 | 0 / 0 |
| Prepared font | 0 / 0 | 0 / 0 |
| Drawing / JPEG | 0 / 0 | 0 / 0 |
| Layout (generic shared seam) | +1,570 / +566 | +3,400 / +1,146 |
| Atomic TextFlow | +13,634 / +4,327 | +13,256 / +3,981 |
| Rectangle TextFlow | +13,634 / +4,327 | +13,256 / +3,977 |
| Profile TextFlow | +13,634 / +4,322 | +13,256 / +3,979 |

The real styled sibling consumer's **absolute** min/gzip bytes are
**233,463 / 75,723 browser**, **353,778 / 108,356 Node**. Existing addon deltas
include both shared generic changes and their retained new sibling policy; they
are not attributed entirely to core/layout. Core emitted output and pack deltas
are zero relative to the fresh before. Layout ESM/CJS JS grows +7,848/+10,673,
declarations +5,520 per format, pack +7,262 compressed/+43,844 unpacked. Addon-owned
ESM/CJS JS grows +11,600/+12,462, declarations +2,679 per format, pack
+9,038/+48,331. Optional text-probe JS grows +385/+401, declarations +198 per format,
pack +212/+1,729. Raw ordinary/prepared/drawing/JPEG metrics also remain identical.
All inclusive historical library deltas remain in the separate library report;
they are not represented as incremental changes in this table.

Additional exact commands, all **PASS** (run sequentially):

```sh
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-final-vs-before/final --compare artifacts/text-flow/sibling-final-before/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-final-vs-library/final --compare artifacts/text-flow/library-baseline/report.json
npm exec -- tsx scripts/text-flow-final-cost-summary.ts
npm exec -- tsx scripts/text-flow-paginator-proof.ts
npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/sibling-final-vs-before/final/parity.json artifacts/text-flow/edge-profile-vs-before/parity.json
npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/sibling-final-vs-before/final/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json
npm exec -- tsx scripts/text-flow-pdf-proof.ts
```

Composition parity: **162** strict output/diagnostic/work cases; wrapper parity:
**216** cases. Timings are recorded observations, not speedup evidence. The styled
consumer executes a **5,658-byte, two-page PDF** with exact full-stream extraction;
qpdf reports no syntax/stream errors. PDF SHA-256:
`e666b44f4b56cc5927bd40e7905967404d762aebd0438f243dd8147a17b83779`.
Artifacts: `sibling-final-vs-before/final/{report.json,summary.json,parity.json,wrap-parity.json,pdf-proof.json,siblings.pdf}`;
`sibling-final-vs-library/final/report.json`; frozen-start/delivery manifests:
`sibling-final-before/{start.json,result.json}`. The result manifest authenticates
all delivered source hashes, changed/added path bytes, every new evidence artifact,
all 2,221 preserved historical hashes, unchanged protected owners, exact branch/HEAD,
unstaged/untracked counts, and the sole explicit lock dependency edge. It is written
after documentation and final checks; no historical manifest is overwritten.

**Implementation acceptance is complete locally. Remaining: independent audit.**
All known checks/processes have completed; no background validation is handed off.
Changes remain unstaged/uncommitted, with inherited work preserved. No tracker
exists for this assignment (N/A), and none was mutated. The Auditor should use the
frozen-start manifest rather than treating all inherited dirty files as this slice.

## R1 whole-sibling validation audit fix (latest; implemented, re-audit pending)

Objective: restore the ordinary terminal-auto-margin contract when participation
is installed, with or without a float. Issue N/A; Engineer owns this bounded fix.
Cwd `/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`, unchanged base/HEAD
`882d6d38f432edcac97e962fbf446062c1483c3d`. Starting state was 33 modified tracked /
69 untracked files, preserved. No staging, commit, push, PR, tracker mutation or
delegation. The preceding 1,503-test evidence remains historical, not overwritten.

### Existing validation owner, not new policy

Previously `participationSources` converted each singleton independently, allowing
a nonterminal kept Block with `marginTop: "auto"` to appear terminal to the existing
owner. Installing participation alone incorrectly accepted the invalid body. A
nonterminal ordinary Block barrier after a float had the same defect.

`packages/layout/src/participation.ts` now captures marker props/data first, builds
ordinary Block recipes with those captured props, then calls **`convertBlocks` once
for the complete sibling array**. Its existing `scheduleBlocks` / `checkAutoBody`
owner validates order before conversion tasks, addon compilation or singleton
preparation. Raw virtual-marker flags are never passed to the ordinary validator.
Original nodes retain paths, keys and indices; captured addon data remains paired
by the same index. Paragraph author metadata retains its original conversion owner.

Narrow review of `content-normalize.ts` and `block-compiler.ts` found the whole-array
validation in these entry points is the terminal-auto-margin contract:
`checkAutoBody` for normalized authored/data siblings and recursive
`checkAutoDataBody` for compiler data. Data Block recipes already normalize through
`blockIdentity`, so the restored whole-array conversion covers public data too.
Nested conversion and singleton preparation still invoke their existing validators;
there is no copied predicate, extra normalization pass or new validation policy.
No other source owner was changed. Core, Paginator, addon production policy, native
admission/painting, numerical comparisons, quotas and lock are byte-preserved from
the frozen final delivery. The Paginator proof still passes unchanged.

Eight risk-based actual-layout regressions in
`packages/text-flow/test/sibling-validation.test.ts` cover both public h and data:
installed/no-float rejection, a float elsewhere with a nonterminal auto-margin
barrier, and valid terminal controls with/without a float. Invalid cases compare
the complete diagnostics to ordinary Flow (`VDOM_HIERARCHY`, exact authored path,
"Auto top margin requires the terminal body sibling"). Valid controls lay out on
one 200x100 zero-margin page with the 10-point terminal Block at **y=90**.

### Fresh evidence and costs

New collector `scripts/text-flow-sibling-validation-evidence.ts` first authenticated
every source hash in `sibling-final-before/result.json`, then froze **1,545 source
hashes and 2,661 historical artifact hashes** before runtime edits. Its final
allowlist permits only participation, this document, the collector, and the new
validation test. Final evidence checks all inherited sources remain, all historical
hashes match, cwd/branch/HEAD are unchanged and nothing is staged. No old final
report, manifest, PDF or parity artifact is overwritten.

New artifacts under `artifacts/text-flow/`:

- `sibling-validation-fixed-vs-before/{start.json,report.json,summary.json,parity.json,wrap-parity.json,siblings.pdf,evidence.json}`
- `sibling-validation-fixed-vs-library/report.json`

The fix-only report compares to **`sibling-final-vs-before/final/report.json`**,
not an earlier partial. Summary also computes total integration deltas against
`sibling-final-before/report.json`; the separate library report includes inherited
historical costs. Both fresh reports have identical 230 current metrics and the
same tools/flags/input strings as the preceding final. Retained raw browser bundles
for layout and all four addon fixtures were inspected: `participationSources`
contains the complete-array `convertBlocks(ordinary, operation)` path. This is a
real retained generic seam cost, not a claim of zero tax or runtime improvement.

Minified / gzip bytes (browser; Node):

| Consumer | R1 fix-only delta | Total integration delta vs fresh before |
| --- | ---: | ---: |
| Ordinary text, prepared font, drawing, JPEG | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 |
| Layout | +64 / +23; +64 / +26 | +1,634 / +589; +3,464 / +1,172 |
| Atomic TextFlow | +64 / +19; +64 / +11 | +13,698 / +4,346; +13,320 / +3,992 |
| Rectangle TextFlow | +64 / +18; +64 / +11 | +13,698 / +4,345; +13,320 / +3,988 |
| Profile TextFlow | +64 / +19; +64 / +11 | +13,698 / +4,341; +13,320 / +3,990 |
| Real sibling consumer | +64 / +16; +64 / +12 | Absolute: 233,527 / 75,739; 353,842 / 108,368 |

Raw ordinary/prepared/drawing/JPEG metrics are also unchanged. Fix-only layout
ESM/CJS JS grows +264/+264, declarations zero, pack +151 compressed/+790 unpacked.
Total integration layout JS is +8,112/+10,937, declarations +5,520 each, pack
+7,413/+44,634. Core and every non-layout package have **zero fix-only** emitted/pack
delta; addon policy payload and prior addon/text costs remain exactly as previously
reported. Inclusive library costs are kept separately, not described as fix-only.

The new styled sibling PDF remains **5,658 bytes, two pages**, exact SHA-256
`e666b44f4b56cc5927bd40e7905967404d762aebd0438f243dd8147a17b83779`.
qpdf reports no syntax/stream errors; Poppler extraction equals the preceding
full expected text stream, not a nonempty-output assertion.

### Checks and safe stopping point

All runtime gates ran serially and passed: `npm run format:check`, `npm run lint`
(Biome and AST principles), `npm run typecheck` (full build), `npm test` (**1,511**,
zero failures/skips), `npm run build:browser` (**12** builds), `npm run check:graphs`
(**12** inventories), `npm run test:consumer` (**15** external packed closures),
`npm run test:browser` (**19**, zero failures/skips),
`npm exec -- tsx scripts/text-flow-paginator-proof.ts`, `git diff --check`.
The unchanged Vite chunk-size warning is nonfatal. The first chain stopped at a
new test-helper type error (`unknown[]` instead of public `BlockContent[]`); it was
fixed, then the entire chain passed. No validation threshold was relaxed.

Additional exact commands, all PASS in the cwd above:

```sh
npm exec -- tsx scripts/text-flow-sibling-validation-evidence.ts --freeze
npm exec -- tsx --test packages/text-flow/test/sibling-validation.test.ts
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-validation-fixed-vs-before --compare artifacts/text-flow/sibling-final-vs-before/final/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-validation-fixed-vs-library --compare artifacts/text-flow/library-baseline/report.json
npm exec -- tsx scripts/text-flow-sibling-validation-evidence.ts --summary
npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/sibling-validation-fixed-vs-before/parity.json artifacts/text-flow/edge-profile-vs-before/parity.json
npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/sibling-validation-fixed-vs-before/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json
npm exec -- tsx scripts/text-flow-sibling-validation-evidence.ts
```

Focused tests: 8 PASS; composition parity: 162 strict output/diagnostic/work cases;
wrapper parity: 216 cases. Format/lint/diff are rechecked after this documentation;
final evidence is then written once. Code-principles checklist: correctness checked;
defaults followed; cohesive source <=400 lines; functions <50, nesting <=3;
intent/invariant comments only; proportional regression tests; lint/tests pass.
No approved exception, no Changeset (repository does not use Changesets).

**R1 implemented, not verified.** No further known implementation acceptance is
open in this bounded slice; independent re-audit remains mandatory. Current
limitation: single direct-body float and the documented policy restrictions above
are unchanged; this fix does not broaden float support or claim final audit
approval. Auditor should compare the new frozen start/evidence (rather than all
Git dirt), check exact diagnostic parity and valid terminal/float layout, and
authenticate cost/PDF/history preservation. All work remains unstaged/uncommitted;
no asynchronous checks are outstanding. Final Git scope is 33 tracked modifications
and 71 untracked files, including the two new R1 test/evidence files.
