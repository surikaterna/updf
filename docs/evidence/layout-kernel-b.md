# Layout kernel — Slice B atomic boxes, PDF Row and live TUI

## Delivery identity and scope

- Objective: one independent host-neutral atomic box kernel with **real PDF Row
  and TUI consumers**; not an inert foundation or a generic renderer.
- Issue: **N/A**. No tracker mutations authorized or performed.
- Cwd/worktree: `/home/sprawl/projects/updf/trees/layout-kernel`.
- Branch: `feature/layout-kernel`; base and unchanged HEAD:
  `e96d2741f8d4a5f3086e6b95ff61a5967db7e7f1`.
- Original B implementation received clean; bounded measured-leaf repair received
  the existing **22 tracked + 17 untracked** manifest and preserved it. All delivery changes below are owned by Slice B,
  unstaged/uncommitted. No staging, commit, push, nested delegation, PR, tracker,
  other-worktree or Formbar mutation.
- Completed: boxes/source views, numeric authority extraction, shared prepared
  placement, PDF paint/metadata consumption, terminal stack/footer/measurement
  integration, ES-only pack proofs, dependency fences, profiles and regressions.
- Intentionally **not implemented**: Slice C fragment/pagination kernel, CSS,
  intrinsic/font measurement, generic VDOM compiler, paint or Formbar changes.
  Existing PDF fragment/provider/page/reservation/painting protocols remain host-owned.

## Contract and numerical authority

The public distinct entry is `@updf/layout-kernel/boxes`:

- `layoutBoxes({root, view, width, limits?, exactInlineEdges?, measure?})`.
  `width: number` is canonical, not a constraints object.
- Generic callbacks: `id`, `path`, `style`, `childCount`, indexed `childAt`,
  opaque `content`. Each source field is read once; metadata/styles are snapshotted
  into validated operation-owned state, not a copied host tree. Cycles/repeated
  source references and duplicate stable IDs reject. Host callback/proxy exceptions
  retain identity, without a sandbox claim.
- Readonly `BoxStyle`: row/column (default column), border-box width/height/min/max,
  positive grow and basis **0 only**, nonnegative gap and four edge paddings,
  start/center/end/stretch alignment. Fixed width and grow/basis conflict. Grow/basis
  on root/column children, non-start column alignment and stretch/child-height
  conflicts reject. Row bounds use the existing allocator, not a new allocation policy.
- Content is leaf-only. Measurement receives the authoritative content width and
  returns own data `{height}` (finite/nonnegative). Empty boxes need no measure.
  Insets reserve space only. Row max/column compensated sum plus gaps/insets and
  final clamps reject actual truncation/native geometry overflow without epsilon.
  Stretch changes owned box height without another measure; nested alignment sees
  the stretched height in the single top-down placement pass.
- Frozen preorder records and explicit `childIndices`: direct children are **not**
  assumed contiguous. `left/top` are parent-content-relative, root `(0,0)`.
  Output allocations/contexts/arrays are frozen, caller content is retained by
  reference and never frozen. `childStart/childCount` address `childIndices`.
- Default budgets: nodes 100000, depth 1024, child calls 99999, measurements 100000.
  Nodes/depth require positive safe integers; zero child/measure budgets are valid.
  Iterative traversal/height/placement passes have linear node/edge work; existing
  track resolver complexity is unchanged. Counters precede over-budget callbacks.
  Reported `counts` are node/callback counts, **not heap allocation measurements**.
- Opt-in exact inline edges are absolute binary64 allocation/inset sums in units
  of `2^-1075`. The default omits extra exact-edge metadata. Projection to integer
  cells belongs to the terminal, not the engine.
- Own-record descriptor policy matches A: ordinary/null-prototype records,
  enumerable own data properties, unknown/undefined/accessor rejection, inherited
  optional fields absent and missing own required fields rejected. Opaque source
  nodes themselves remain trusted host objects, accessed only through callbacks.

Parent-approved numerical authority change (not a principles waiver):

1. `core/src/measurement/arithmetic.ts` is now **reexport-only** from public
   `/arithmetic`. The original `MetricSum`, `sum`, `exceeds` source is byte-identical
   in kernel; a regression compares it to the exact assigned Git base.
2. Derived-axis/materialized-start bodies move into kernel `/geometry`; alignedTop
   preserves its arithmetic and strict native-addition certificate with explicit
   inset arguments and start/center/end mapping. The layout axis/placement facades
   translate only known `LayoutInputError`; other exceptions are not relabeled.
3. **Core now depends explicitly on the kernel package.** Kernel still has zero
   runtime/peer/optional/dev dependencies and ES-only declarations (`types: []`).
   Core import inventory allows **only** `/arithmetic` from its arithmetic facade;
   root/boxes/geometry/numeric imports are forbidden for core.

## Actual production integration

`viewBox` is the narrow prepared-row entry: final width/height, edge insets,
gap/alignment, indexed resolved child sizes and path. It snapshots sizes (maximum
100000), never allocates/re-solves tracks or measures, and returns the same frozen
placement representation as the shared internal `placeResolved` routine used by
`layoutBoxes`. Prepared fit retains the existing metric `exceeds` precondition;
generic boxes remain strict. There is no second Row x/alignment algorithm.

PDF Row preparation retains the current compiler's resolved Column widths/heights
and stretch behavior. `rowProducer` stores its frozen placement. Fragment selection
and content-line scheduling both consume actual owned offsets: old horizontal
MetricSum loops and old alignedTop implementation are removed. Complete selected
Column heights must equal prepared heights, rather than recomputing placement from
fragment results. Missing owned placement/source fails TYPE, not a fallback.
The existing inset `sum([origin, inset, offset])` association and subsequent paint
transforms are preserved. No source glyph rebasing, clip wrapper, provider/context,
reservation/budget/page callback or child request contract was introduced.

The live terminal uses `layoutBoxes` over lightweight root/row/cell/footer wrappers
referencing the validated actual host snapshot rows/source nodes. It does not copy
the FSX tree. ASCII text validation/wrap stays adapter-owned. Its measure callback
uses floor(exactEnd)-floor(exactStart), and rendering uses those **same allocation
edges**. Kernel owns row max, column stack and footer position; the old adapter
`y += max(row heights)`/place loop is gone. Rasterization still requires integer
cells and rejects clipping/overlap. `intervals.ts` remains only the existing
independent allocation/projection characterization utility, not the live renderer
dependency path; live profiles contain no interval helper or PDF dependencies.

Read-only Formbar is clean at `/home/sprawl/projects/formbar`, pinned revision
`4fc67c225ef9af80dd2345852df3b884e62656eb`. No build/install/edit there. All four
literal hidden/shown × 32/80 bodies and all **274** live width/state projections
remain unchanged. No wrap/position change or silent text loss needed justification.

## Before/after evidence and honest costs

Before editing, ran `npx tsx scripts/layout-kernel-baseline.ts` and
`npx tsx scripts/kernel-profile.ts`: the A controls matched exactly. The immutable
`--baseline` arithmetic loader reconstructs the original core bundle from the
assigned Git blob (only arithmetic moved), matching the pre-edit hash. It does
not ship a second arithmetic implementation. Both before/after raw bundles, gzip
inputs and full resolved/metafile graphs are retained under ignored
`artifacts/layout-kernel-b/core-{before,after}/`.

| Public core-text consumer | Before | After |
| --- | --- | --- |
| Raw / gzip bytes | 39,516 / 13,984 | 39,516 / 13,985 |
| Bundle SHA-256 | `00664c963c61a7017a1fdbadcafc3c6564df43814223b5fc1344621c2e751b21` | `d4f77fda0ba7aa58bb7c8f1391ee155873a81e0cbec0fe28f0b7bbcfa7e893b0` |

Raw bundle size is unchanged; gzip grows **one byte**, and minified bundle hash
changes. **PDF hashes are unchanged**:

- Core text: `07175eea062e0b7e4ce412840d86ad6d65a51faa6e6a081bc4ee8a0d1056ee6a`.
- Fixed CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
- Real Row geometry: `83c3e00d2ed01e1d26721c315b6ae35a9346da3cd97f6ee89af8f7bc09f60a2e`.
- Freight: `fb0e28599369c2eccd401bd236fadcb0399de3480385e2e80fde56014381c58c`.

Core's resolved and packed runtime graphs now include exactly kernel
`dist/arithmetic.js`, not box/allocator/geometry modules. We do **not** claim
kernel absence from a core installation: a clean core-only closure explicitly
installs the whole kernel tarball. Current `npm pack --dry-run --json` measures
**25,970 compressed / 102,911 unpacked bytes**, **75 files** for that additional
installed package, including declarations/maps/docs/license. This is package cost,
not runtime retained cost or filesystem blocks. Kernel has no further dependencies.

`npx tsx scripts/box-profile.ts` uses neutral public emitted entries, esbuild
minified ESM and Node gzip. It retains per-scope raw/gzip/metafile plus full inputs,
positive retained controls and installed inventory under
`artifacts/layout-kernel-b/standalone/`:

| Standalone scope | Raw / gzip bytes |
| --- | --- |
| Allocator + numeric, before = after | 4,575 / 1,991 |
| Empty box view (no measure) | 14,219 / 5,358 |
| Measured row view | 14,392 / 5,419 |

All three resolve only kernel files and have **zero externals**. Empty/measured
boxes retain positive placement and box engine controls. Unused prepared `viewBox`
resolves from the boxes barrel but has zero retained bytes in generic box bundles.
Allocator root resolves/retains no box/arithmetic/geometry code. No heap/CPU claim
is made from byte counts; no heap/CPU profile was performed.

Live profile (`FORMBAR_ROOT=... node scripts/tui-layout-proof/profile.mjs`) retains
raw/gzip/metafiles, resolved/retained graphs and external version inventories under
`artifacts/layout-kernel-b/profile/`:

| Scope | Slice A raw / gzip | Slice B raw / gzip |
| --- | --- | --- |
| Source allocator | 4,553 / 1,975 | 4,553 / 1,975 |
| Formbar compiler/host bridge | 198,549 / 58,329 | 198,549 / 58,329 |
| Terminal adapter + kernel | 8,138 / 3,398 | 18,537 / 6,939 |
| Combined runtime CLI | 207,289 / 61,591 | 217,730 / 65,067 |
| Separate bundling bootstrap | 3,082 / 1,554 | 3,109 / 1,580 |

Bridge cost remains separate; it uses the existing Formbar app-private compiler
bridge, not a newly public reusable bridge. Third-party dependencies remain
external/excluded from these runtime bytes: `@scheman/core@2.0.0`,
`ajv-formats@3.0.1`, `ajv@8.20.0`, `kuery@2.1.1`, `@kalada/core@0.6.0`,
`@kalada/syntax@0.1.0`, `@kalada/provider-routing@0.1.0`, `@arbitre/core@0.3.1`,
`react@19.2.6`; resolved paths/import kinds/versions remain in the report.
Node/esbuild bootstrap dependencies are separately disclosed. Terminal graph
asserts positive box placement/allocator bytes and zero resolved/retained uPDF
core/layout/fontkit modules, without a false whole-install tree-shaking claim.

## Exact checks and outcomes

The original B gate inventory below is retained as historical evidence; the repair
reruns and explicitly reused gates are identified in the next section.
All commands below run in the assigned worktree unless Formbar is explicitly
read-only. No required threshold, test inventory or gate script was weakened.

| Command | Outcome |
| --- | --- |
| `npm install --ignore-scripts --no-audit --no-fund` | Pass; lock delta only approved core → kernel edge |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, Biome + authoritative code-principles ESLint |
| `npm run typecheck` | Pass; kernel → core → layout ordered full build and TypeScript |
| `npm test` | **652/652**; baseline 636 + 16 B risk-based regressions |
| `npm run test:consumer` | **Eight** clean tarball closures; ES-only kernel NodeNext/Bundler empty/measured views, own-property probes and runtime fences |
| `npm run check:licenses` | Eight actual licensed tarballs; kernel 75 files, layout 391 |
| `npm run build:browser` | All **12** builds; existing optional font-demo chunk-size warning only |
| `npm run check:graphs` | All 12; strict core arithmetic-only kernel inventory |
| `npm run build:showcase` | Pass, ordered builds and showcase TypeScript/Vite |
| `npm run test:browser` | Final fresh **10/10** actual Chromium/Node/SVG tests |
| `npm run test:showcase` | Final fresh **56/56** (300s combined-command timeout) |
| `npm run sizes` | Pass with existing generated PDF prerequisites |
| `npx tsx scripts/layout-kernel-baseline.ts --baseline` | Pass; reconstructs exact original core bundle hash; retains control artifacts |
| `npx tsx scripts/layout-kernel-baseline.ts` | Pass; all native PDF hashes unchanged; arithmetic-only core graph |
| `npx tsx scripts/kernel-profile.ts` | A allocator remains 4,575 / 1,991; no host dependencies |
| `npx tsx scripts/box-profile.ts` | Pass; three standalone profiles and full installed package inventory |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown` | All four literal live proofs unchanged |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs` | **4/4**, 274 live projections |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs` | Pass, positive engine controls, no resolved/retained PDF/font dependencies |
| `git diff --check` | Pass |
| `git -C /home/sprawl/projects/formbar status --short`; `git -C /home/sprawl/projects/formbar rev-parse HEAD` | Clean; unchanged pinned revision |

Initial new-code formatting/function-length/negative-fixture type failures were
fixed and rerun, not waived. Packed graph initially matched the bare filename
`geometry.js`; it now rejects the actual forbidden geometry package rather than
kernel certificate math. Immutable baseline esbuild filter initially rejected
the unsupported Unicode flag; corrected, then exact control hash reproduced.

Browser risk: two earlier `npm run test:browser` attempts, while other heavy
checks were running, failed only the SVG logo raster (9/10). The same unmodified
SVG test passed alone; all ten passed under a serialized diagnostic command
`npx tsx --test --test-concurrency=1 tests/browser/*.test.ts tests/svg-reference/browser.test.ts`.
The **unchanged authoritative** `npm run test:browser` then passed 10/10 twice,
including the final rebuilt delivery with no overlapping heavy checks. No test,
browser setting, threshold or gate concurrency was changed. Contention is a
suspected cause, not a demonstrated root cause; Auditor should watch this risk.
No running or abandoned asynchronous checks remain.

Real PDF regressions remain authoritative: all alignments, fractional insets,
top/middle/bottom/stretch, #51 strict page edges, complete child requests/context
lifetimes, independent qpdf/Poppler bbox/text/raster and wrong-alignment/missing
border/removed-clip negative controls. Same Row bytes mean no extra clip groups.

## Delivery manifest and code-principles self-check

**22 tracked unstaged files + 18 untracked files**, no staged/committed changes.
Generated ignored dist/PDF/profile/metafile artifacts are evidence, not delivery.

Tracked modified:

```text
package-lock.json
package.json
packages/core/package.json
packages/core/src/measurement/arithmetic.ts
packages/layout-kernel/README.md
packages/layout-kernel/package.json
packages/layout-kernel/test/graph.test.ts
packages/layout/src/axis.ts
packages/layout/src/content-line-containers.ts
packages/layout/src/protocol.ts
packages/layout/src/row-producer.ts
scripts/boundaries.ts
scripts/consumer/graphs.ts
scripts/consumer/kernel.ts
scripts/graph-check.ts
scripts/layout-kernel-baseline.ts
scripts/packed-consumer.ts
scripts/tui-layout-proof/bundle.mjs
scripts/tui-layout-proof/profile.mjs
scripts/tui-layout-proof/profile.ts
scripts/tui-layout-proof/terminal.ts
tests/consumer/types/kernel-template.ts
```

Untracked:

```text
docs/evidence/layout-kernel-b.md
packages/layout-kernel/src/arithmetic.ts
packages/layout-kernel/src/box-layout.ts
packages/layout-kernel/src/box-operation.ts
packages/layout-kernel/src/box-placement.ts
packages/layout-kernel/src/box-prepared.ts
packages/layout-kernel/src/box-style.ts
packages/layout-kernel/src/box-types.ts
packages/layout-kernel/src/boxes.ts
packages/layout-kernel/src/geometry.ts
packages/layout-kernel/test/box-properties.test.ts
packages/layout-kernel/test/boxes.test.ts
packages/layout-kernel/test/measured-bounds.test.ts
packages/layout/src/row-placement.ts
packages/layout/test/row-placement.test.ts
scripts/box-profile.ts
scripts/consumer/kernel-box-properties.ts
scripts/tui-layout-proof/box-bridge.ts
```

- [x] Correctness validated: exact extraction byte comparison, unchanged 3000-case
  allocator oracle, complete fragment size enforcement, production PDF/live TUI
  controls, strict descriptor/quota/cycle/identity/geometry tests and pack fences.
- [x] Strong defaults; no approved code-principles exception. Approved dependency
  edge is explicitly recorded above, not disguised as an exception or absence.
- [x] Cohesive production files under 400 lines; new box/layout operation files
  separate contract/style/operation/placement/measurement responsibilities.
- [x] Functions under 50 lines and nesting at most three, enforced by ESLint.
- [x] Comments explain invariants/preconditions/host boundaries, not routine code.
- [x] Risk-based tests: 19 additions (16 original B + three measured-leaf repair tests) covering shared placement, nested stretch,
  exact-edge carry, snapshots/opaque ownership, once-only callback reads, own and
  inherited/accessor handling in isolated workspace/packed processes, invalid
  metadata/limits, zero budgets, depth-3000 traversal, cycles/duplicate IDs,
  exception identity, strict truncation, and selected/prepared PDF height mismatch.
  Repair cases cover root/nested auto/explicit/max-clamped fractional native bounds,
  equivalent child geometry, top/bottom insets, genuine fits/truncation and final stretch with one measure.
- [x] Formatting, lint, typecheck, full tests and all required gates pass.

No Changeset: this repository does not use Changesets. No publishing authorized.

## Bounded measured-leaf native vertical bounds repair

Objective/issue: fix the audit's opaque-leaf native vertical bounds gap; **N/A**.
Same cwd/branch/base/HEAD as above, no Git/delivery/tracker mutations. The exact
repair-only changed manifest is:

- `packages/layout-kernel/src/box-layout.ts` (existing untracked B production file).
- `packages/layout-kernel/test/measured-bounds.test.ts` (new, three regression tests).
- `docs/evidence/layout-kernel-b.md` (existing untracked evidence, refreshed).

The operation retains the validated actual measured height independently of the
border-box height. In the top-down placement pass, **after parent stretch**, it
certifies `sum([paddingTop, 0]) + measuredHeight <= finalHeight - paddingBottom`,
matching the authoritative child inset/start association and native endpoint.
The natural-height check remains intact; nothing shrinks, remeasures, rounds up,
or borrows an epsilon. A `0.5` leaf with bottom padding `0.2` and auto/explicit/max
height `0.7` now rejects `GEOMETRY`, just as equivalent child geometry does.
Quotas, source/input getter policy, counts and opaque ownership are unchanged.
Only kernel production changed; PDF `viewBox`/prepared placement and policy did not.

Fresh repair validation (all pass, no asynchronous checks outstanding):

| Exact command | Repair outcome |
| --- | --- |
| `npm run build -w @updf/layout-kernel` | Pass |
| `npx tsx --test packages/layout-kernel/test/*.test.ts packages/layout/test/*row*.test.ts tests/integration/rows*.test.ts` | **55/55**, kernel + real PDF Row |
| `npm run format:check && npm run lint && npm run typecheck && npm test` | All pass; **655/655** = prior 652 + three repair regressions |
| `npm run test:consumer && npm run check:graphs` | Eight clean packed closures and all 12 graphs pass |
| `npm run build:browser && npm run check:graphs && npm run check:licenses` | 12 fresh builds/graphs; eight licensed tarballs; existing optional chunk warning only |
| `npx tsx scripts/layout-kernel-baseline.ts --baseline && npx tsx scripts/layout-kernel-baseline.ts && npx tsx scripts/kernel-profile.ts && npx tsx scripts/box-profile.ts` | Exact baseline/core/PDF hashes preserved; affected costs refreshed above |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown && FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs && FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs` | Four literal proofs unchanged; **4/4**, 274 projections; fresh live cost/graph evidence |
| `git diff --check` | Pass |
| `git -C /home/sprawl/projects/formbar status --short && git -C /home/sprawl/projects/formbar rev-parse HEAD` | Clean, unchanged pinned revision |
| `node --version && npm --version && npm ls --depth=0` | Node **24.21.0**, npm **11.19.0**; installed version inventory confirmed |
| `npx esbuild --version` | **0.28.2** |

Tool versions: TypeScript **5.9.3**, tsx **4.23.15**, Biome **2.4.13**,
ESLint **10.11.0**, Vite **7.3.6**, Playwright **1.55.1**. Live external versions
remain the exact separately disclosed inventory above.

Cost deltas against the audited pre-repair B: empty **+194 raw/+37 gzip**,
measured **+194/+38**, terminal **+194/+41**, combined **+194/+42**;
tarball **+157 compressed/+622 unpacked**, still 75 files. Allocator
**4,575/1,991**, core **39,516/13,985** (original baseline gzip 13,984),
bridge and bootstrap costs are unchanged. All four PDF hashes above reproduced.

Prior independent **10/10 browser** and **56/56 showcase** evidence is reused,
not represented as newly run tests; showcase build and sizes are also historical.
This repair changes only the generic `layoutBoxes` implementation. PDF Row imports
`viewBox` in `packages/layout/src/row-placement.ts`, whose prepared path calls
unchanged `placeResolved`, never `layoutBoxes`/`positionBox`. Browser graphs may
resolve `box-layout.js` through the boxes barrel; resolution is not execution or
retention. Fresh public emitted-entry kernel regressions exercise the new strict
check, live TUI exercises the affected generic engine, and fresh PDF Row/full tests
plus identical native PDF baseline hashes confirm the normal prepared PDF path.
No browser/showcase host code or shared prepared placement changed. The previously
documented SVG contention risk remains, not waived or relabeled as a fresh pass.

Additional fresh retained-path certificate **passed**: public PDF layout exports
retain positive prepared/placement bytes, retain zero generic box-layout bytes and
contain no new measured-leaf diagnostic. Exact command:

```sh
node --input-type=module -e 'import assert from "node:assert/strict"; import {build} from "esbuild"; const result=await build({stdin:{contents:"export * from \"@updf/layout\";",resolveDir:process.cwd()},bundle:true,write:false,metafile:true,format:"esm",platform:"neutral",minify:true}); const output=Object.values(result.metafile.outputs)[0]; const inputs=Object.entries(output.inputs); assert.ok(inputs.some(([path,info])=>path.endsWith("/box-prepared.js")&&info.bytesInOutput>0)); assert.ok(inputs.some(([path,info])=>path.endsWith("/box-placement.js")&&info.bytesInOutput>0)); assert.ok(!inputs.some(([path,info])=>path.endsWith("/box-layout.js")&&info.bytesInOutput>0)); assert.ok(!result.outputFiles[0].text.includes("Measured content exceeds box content region")); console.log("Public PDF layout bundle: prepared/placement retained; generic box-layout and new measured-leaf check absent.");'
```

Status: **implemented, ready for independent audit**, not verified. All B
acceptance complete; C remains separate and intentionally pending. Auditor should
review the entire unstaged/untracked manifest against the exact base, independently
validate numerical preconditions and shared placement/inset association, strict
record/quota boundaries, terminal edge identity, installed-vs-retained costs and
the browser contention risk. Parent retains integration/delivery ownership.
