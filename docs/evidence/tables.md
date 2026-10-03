# #28 bounded paged tables / TSX / showcase — local implementation evidence

Status: **implemented, ready for independent audit; not verified or released**.
Engineer is the integration owner; no delegation. The assignment confirms #26
measurement and #27 flow, including the private 32-local-ULP dyadic R1 remediation,
were each independently verified. Their original evidence/status wording is
preserved; [current roadmap](../roadmap/current.md) records the supplied status.
No tracker mutation, staging, commit, push, PR, merge, publication, deployment,
Pages activation/settings change or workflow dispatch was authorized or performed.

## Delivery identity and exact scope

- Cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
- Branch: `feature/measured-flow-tables`.
- Base and unchanged HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`.
- `pwd`, `git branch --show-current`, `git rev-parse HEAD` and `git worktree list`
  confirm that supplied isolated worktree. No other worktree was edited.
- Initial supplied cumulative delivery: **42 unstaged tracked files / 61 untracked
  files**. Final cumulative delivery: **42 unstaged tracked files / 82 untracked
  files**, including this evidence. No task commits or staged changes.
- `git rev-list --count ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD` = **0**;
  `git diff --cached --stat` is empty; `git diff --check` passes.
- Review the actual cumulative dirty delivery, not HEAD alone:
  `git status --porcelain=v1 -uall`, `git diff --name-only`, `git diff`, and
  `git ls-files --others --exclude-standard`. Read the untracked files explicitly.
  The inherited manifests are in [measurement](measurement.md) and [flow](flow.md)
  evidence; the exact #28 additions/edits are below.

Previously dirty tracked files additionally edited for #28 (16):

```text
.github/workflows/pages.yml
apps/browser-fonts/app.ts
apps/showcase/index.html
apps/showcase/src/demos.ts
apps/showcase/src/main.ts
biome.json
docs/architecture/packages.md
docs/native-api.md
package.json
readme.md
scripts/boundaries.ts
scripts/graph-check.ts
scripts/packed-consumer.ts
scripts/sizes.ts
tests/consumer/declarations.test.ts
tests/showcase/graph.test.ts
```

Previously untracked #26/#27 files additionally edited (6):

```text
docs/roadmap/current.md
packages/layout/README.md
packages/layout/package.json
packages/layout/src/blocks.ts
packages/layout/src/budget.ts
packages/layout/src/paginator.ts
```

New #28 files (21):

```text
apps/browser-fonts/table-proof.ts
apps/browser-react/vite.tables.config.ts
apps/showcase/src/optional-tables.ts
apps/showcase/src/table-controls.ts
apps/showcase/src/tables.ts
docs/evidence/tables.md
packages/layout/src/tables/index.ts
packages/layout/src/tables/ink.ts
packages/layout/src/tables/layout.ts
packages/layout/src/tables/measure.ts
packages/layout/src/tables/paint.ts
packages/layout/src/tables/producer.ts
packages/layout/src/tables/types.ts
packages/layout/src/tables/validate.ts
packages/layout/src/tables/vdom.ts
packages/layout/test/table-boundaries.test.ts
packages/layout/test/tables.test.ts
tests/browser/browser-tables.test.ts
tests/consumer/types/tables-template.tsx
tests/integration/tables.test.ts
tests/showcase/tables.test.ts
```

All other supplied #26/#27 paths are untouched by #28. In particular, no core,
measurement, fixed-text, numeric axis/binary64, font, SVG, legacy or fixture source
was changed. The lockfile and external dependency versions were not changed.
The numerical section of the layout README is retained; table semantics are
added separately. Archived roadmaps and previous evidence remain byte-preserved.

## Implemented boundary and private composition

The [layout README](../../packages/layout/README.md#optional-paged-tables-28)
defines the complete model, style inheritance, geometry, grid, reports and caps.

- Explicit optional ESM/types exports `/tables` and `/tables/vdom`; root flow
  exports remain table-free. Data APIs are `layoutTable`/`layoutTableUnknown` and
  `layoutTableFlow`/`layoutTableFlowUnknown`. Definitions are readonly ordinary data.
- One pure `Tables.Document` adapts standalone or mixed input to ordinary core
  JSX/factory nodes, using the same operation-owned resources and diagnostic
  context. Data/TSX output is byte-identical, including prepared mixed font faces.
- Minimum shared changes: export the **private** block preparer for mixed input;
  expose the existing private paginator within layout, its page index/fit predicate
  and atomic output method; add a generated-budget reservation method. No public
  paginator, plugin registry, source alias, second pagination or paint engine.
- All producers share the exact #27 cursor, compensated fit arithmetic, actual
  endpoint/progress checks, repeated templates, page creation and output budget.
  Tables charge generated node/text/command/work counts before invoking their
  private paint factory, copying fragments or snapshotting repeated headers.
- Column widths use compensated accumulation, strictly fit derived body capacity,
  and retain explicit native endpoints. Each cell uses the unchanged private
  derived-axis/32-ULP certificate at its local inset origin; translated endpoints
  are separately conditioned, never used to broaden rich measurement tolerance.
- Cells inherit table → column → cell → run settings per key. One #26 measured
  paragraph per cell; padding plus grid width reserves each content edge. Natural
  maximum cell height and optional positive row minimum determine atomic height.
- Header/first-row pairs are preflighted; continuation rows preflight fresh body
  minus repeated header. Oversize errors retain row paths. Empty tables, blank
  cells, header-only tables, exact fits, multiple tables and mixed prose preserve
  deterministic consumption and progress. Header copies never count as body rows.
- Native unstroked rect backgrounds and uniform butt/bevel line grids reuse core
  paint. Shared edges occur once. Outer line centers have a full-grid-width inset,
  containing true half-stroke and the existing conservative Frobenius envelope
  without endpoint-equality roundoff. Ink is preflighted with source paths before
  unchanged final core bounds checks. No global measurement/ink policy changes.
- All hard caps remain; configurable-budget #25 is not completed. No automatic
  columns, spans, nested tables, row splitting, widgets/formulas or border cascade.

## Showcase and delivery configuration

The dynamically imported inventory module displays its actual imported source.
Bounded controls cover 1–40 rows, compact/wide/intentional-oversize width presets,
header repetition and wrapped descriptions; status gives page/body-row/header
counts. Input stays data, source/status use plain text, and prior rich/flow/paint/
SVG controls remain. Mobile keyboard/labels, open/download fallback, Blob cleanup,
cancellation and readable optional-import failures reuse the existing site paths.

The manual-only SHA-pinned Pages workflow still calls `build:showcase`, compiling
layout **including tables** before the site. `/updf/` assets and complete project/
third-party notices remain. No deployment or live availability is claimed.

## Commands and outcomes

All commands ran in the exact cwd above on Node **v24.21.0**, unchanged HEAD plus
the dirty delivery described above. Final production/runtime scope was tested in
one sequential complete-gate run; later additions were tests, graph assertions,
size reporting and documentation only, with their relevant gates rerun.

| Exact command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts` | pass; inherited deprecation warnings, no lock/dependency change |
| `npm run format:check` | pass; **274 maintained files**, no formatter writes |
| `npm run lint` | pass; Biome checks **277 files** and ESLint principles/negative controls pass |
| `npm run typecheck` | pass; builds all native packages/examples and scoped legacy output, then strict repository types |
| `npx tsc --noEmit` | pass after final test/tool changes |
| `npm test` | final pass, **165/165**; supplied baseline 145 plus 18 table unit/boundary and 2 table PDF integration tests |
| `npx tsx --test packages/layout/test/tables.test.ts packages/layout/test/table-boundaries.test.ts` | focused pass before the final extra blank-header cap case; final full suite includes that case |
| `npx tsx --test tests/integration/tables.test.ts` | pass, **2/2**, qpdf/extraction/font inventory/raster |
| `npm run build:browser` | pass, **11 emitted-JS builds**, new tables target included |
| `npm run check:graphs` | pass; **11 closures**, exact internal inventories and no source aliases; data entries exclude VDOM, core excludes layout, root flow excludes tables, table paint positive control |
| `npm run test:browser` | pass, **6/6** actual Chromium tests, including prepared-font table Node/data/TSX byte parity and the unchanged **11 SVG references** |
| `npm run build:showcase` | pass; compiled core/layout/tables/geometry/SVG before Vite site |
| `npm run test:showcase` | pass, **14/14**; original 12 plus actual table download/source/controls/cleanup/failure/cancellation tests |
| `npm run test:consumer` | pass, **6 clean packed closures**; tables/VDOM added to existing layout closure; strict NodeNext/Bundler `types: []`, ES2022-only, no React/DOM/Node ambient rescue; root/data negative graph checks |
| `npm run check:licenses` | pass, **6 actual tarballs**; layout **87 files**; MIT ©2026 Surikat AB, no production font/test assets, preserved third-party notices |
| `npm run sizes` | pass; measured emitted/source/declaration and bundle costs below; not #32 completion |
| `qpdf --check artifacts/tables/tables.pdf` | pass; PDF 1.4, no syntax/stream encoding errors |
| `pdftotext -raw artifacts/tables/tables.pdf -` | pass; 3 headers, ordered unique Item 1–12, preceding/following prose |
| `pdfinfo artifacts/tables/tables.pdf` | pass; **3 pages**, **240×240 points**, **9,857 bytes** |
| `git diff --check` | pass |
| `npm run test:legacy` | expected inherited failure, exit 1, container `undefined.toString`; not a green gate |
| `npm run test:legacy:comparison` | pass equivalence; inherited full harness **18 passing / 1 pending / 6 failing**, unchanged failures/output digest |
| `npm audit --omit=dev --ignore-scripts` | pass, **0 production vulnerabilities** |
| `npx tsx scripts/audit-report.ts` | inherited full audit exit 1 reported, **45 findings** (8 moderate, 10 high, 27 critical); not fixed or waived |

The exact README example command also passed:

```sh
node --import tsx --input-type=module -e "import {tableExample} from './apps/showcase/src/tables.ts'; const {bytes,result}=tableExample('Inventory'); console.log(bytes.length,result.pageCount,result.consumedBodyRowCount);"
```

Output: `9857 3 12`. Integration tests additionally invoke qpdf, raw extraction,
pdffonts and 72-DPI pdftoppm on `artifacts/tables/fonts.pdf`; raster assertions
contain grid/background/colored font ink and match header-bearing pages, not the
final prose-only page. Showcase qpdf/extraction checks the actual browser download
`artifacts/showcase/updf-tables.pdf`, not a substituted Node-generated file.

### Development failures and Chromium attempts

Initial focused/full table tests exposed default miter/Frobenius stroke bounds at
zero margins; explicit butt/bevel paint and table-only border reservations fixed
them. A subsequent strict ink preflight caught floating endpoint equality at
nonzero origins; a documented full-width outer inset removed that dependency
without relaxing a tolerance. Compiler failures for unknown shape narrowing/paint
keys and a broad test literal were fixed. ESLint caught a 50-line producer and
unused test bindings; preflight extraction and explicit bindings fixed them.
Formatting/import/callback diagnostics were corrected through focused patches,
not broad ignores. A context-path expectation and a prepared raster expectation
initially assumed the wrong path/all pages had table headers; tests now assert
the actual run context and exact header-bearing count, with unchanged pixel criteria.
The first README `tsx -e` attempt selected CJS against ESM-only exports; it was
replaced with the explicit ESM command above, then rerun successfully.

**Both** complete `npm run test:browser` attempts passed **6/6**. The known
intermittent Chromium black SVG-reference behavior did not occur in this session.
No reference fixtures, thresholds, tolerances or golden hashes were changed to
hide a failure. Early green evidence was rerun after the runtime ink correction.

## Measured graphs, costs and preservation

Final module counts: core **33**, VDOM **36**, fonts **5**, measurement **18**,
root flow **36**, tables **41**, React example **75**, Fontkit **90**, prepared-font
browser **142**, geometry **33**, SVG **60**. Site initial closure has no layout/
table implementation; optional flow/table/SVG chunks have separate dynamic entry
edges, with a shared private layout kernel chunk. Flow's transitive closure is
still table-free. Packed graphs independently prove those package export seams.

- Core bundle: **44,693 / 13,716 gzip bytes** (unchanged).
- Measurement: **21,643 / 6,894 gzip bytes** (unchanged).
- VDOM: **50,045 / 14,321 gzip bytes** (unchanged).
- Flow: **49,168 / 14,423 gzip bytes** (private atomic composition seam added).
- Tables: **58,931 / 17,011 gzip bytes**, including shared core/layout closure.
- Table-only source / emitted JS / declarations: **22,815 / 18,670 / 6,278 bytes**.
- Site table chunk: **12.17 kB / 4.63 kB gzip**; private shared layout chunk:
  **10.01 kB / 3.78 kB gzip**. Core site entry: **63.47 kB / 21.26 kB gzip**.

`sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf docs/measurement.md docs/evidence/measurement.md docs/evidence/flow.md`:

```text
8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22  artifacts/cmr.pdf
cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4  artifacts/cmr-unicode.pdf
23025e3b41dc4eadb55ce1047a907819d6443f2732397ff24bd27278b083ecd6  docs/measurement.md
fc70df9c656051cc8647fa9a37e96c05dcd135409a4d666f962645414b2ed395  docs/evidence/measurement.md
4236a465a4c8e0e8cfdaa114551be07911f8d255395214bcb65bac0d64d293fd  docs/evidence/flow.md
```

## Universal code-principles self-check / handoff

- [x] Correctness validated; checked ordinary data/resources, finite geometry,
  progress, source paths and conservative stroke/actual endpoints. No unsafe `any`.
- [x] Defaults followed. Only the existing **file-specific Vite default-export
  convention** extends to `vite.tables.config.ts`; no broad/new size, complexity,
  measurement or lint waiver. Existing historical/generated/legacy exclusions
  remain, not modernization or a green legacy claim.
- [x] Cohesive production files ≤400 lines; functions ≤49, nesting ≤3, enforced
  by the unchanged ESLint principles and negative controls.
- [x] Comments explain only invariants/non-obvious border reservation intent.
- [x] Risk-proportional tests added: atomic/header pair progression, counts/order,
  styles/wrapping/padding/minima/blank cells, exact/20/21-page boundaries, malformed
  widths/shapes/getters, immutable ownership, context/resource identity, text/work
  amplification, private numerical conditioning, grid edge uniqueness, independent
  PDF/raster/font proofs, browser parity and real site controls/downloads.
- [x] Maintained native lint/typecheck/tests/build/graph/consumer/site gates pass.
  Inherited legacy and full audit failures remain explicitly reported.
- No Changesets workflow exists; packages remain private/unreleased, no version bump.
- Tracker unchanged. Local #28 status is **implemented**, not independently verified.

Auditor should independently review the **actual 42/82 dirty delivery** and the
43-file #28 delta, particularly the shared private budget/paginator seam, repeated
header amplification, native/local cell conditioning, full-width border reservation,
source paths and empty/prose-only page semantics. Rerun relevant graph/packed type,
browser/download and PDF/raster gates, confirm both fixed CMR hashes and preserved
documents, then decide verified/changes-requested through the authorized workflow.
No delivery mutation is part of this handoff.

## Auditor R1 — spatial grid evidence remediation

Status: **locally implemented, awaiting independent re-audit; not verified**.
The supplied audit reports 256 valid/44 oversized runtime probes and passing
165 native tests, 14 site tests, 11 graphs, 6 browser tests and 6 packed closures.
R1 is a **test gap, not an engine defect**: the old aggregate dark-pixel counter
also counted black text and still passed after the grid was removed. The earlier
implementation/evidence above is preserved as history; this section supersedes
its inventory grid-raster claim and the current test/delivery counts.

### Exact R1 delta and independent oracle

Only three files changed in this remediation:

```text
tests/integration/tables.test.ts       edited, previously untracked
tests/fixtures/table-raster.ts         new, untracked test-only helper
docs/evidence/tables.md                appended, previously untracked
```

No renderer, layout/measurement/numeric source, example/fixture definition,
configuration, dependency, golden/reference expectation or existing rendering
tolerance changed. The inventory PDF itself is byte-identical. The prepared-font
table raster remains at its original 72 DPI with its original color criteria.

The inventory PDF is now independently rasterized at **144 DPI**. Expectations
come from the known fixture, not emitted AST/placement inspection: 16-point
margins, one 14-point preceding paragraph, 140/68-point columns, a 24-point header,
four 38-point rows per page, and the documented 1-point outer-grid inset.

- Horizontal grid center y positions: first page **31, 54, 92, 130, 168, 205**;
  subsequent pages **17, 40, 78, 116, 154, 191**. Their x span is **17–223**.
- Vertical grid centers: **x=17, 156, 223**, checked separately for each of the
  five row segments/page. This gives **18 horizontal + 45 vertical = 63 edges**.
- Each edge must have expected blue-grid hue at a bounded **3×3-pixel midpoint
  neighborhood**, and at least **95% hue coverage** along its interior strip.
  Perpendicular allowance is only one raster pixel; two PDF points are excluded
  at the ends to avoid corner joins. Black/neutral text cannot satisfy the hue
  differences, and the light header background is outside the grid intensity band.
- **Six independent header background locations** check the known solid RGB
  color, with three neighboring pixels/location. Neutral text and whole-page
  containment are asserted separately; neither can substitute for grid coverage.
- Named regression subtests reject **129 altered raster copies**: grid erased
  on all three pages, each of the 63 edges completely removed, and each of the
  63 edges partially removed. Partial removal deletes the 10–40% interior span,
  leaving the midpoint intact, and must fail the **coverage** check at the named
  edge. Complete edge removal must fail its named midpoint check. All-grid removal
  uses the Auditor's broad `r < 200 && r < g && g < b` pixel selection; retained
  text/background assertions still pass while the grid assertion rejects.

### R1 checks and preservation proof

All commands below ran in `/home/sprawl/projects/updf/trees/measured-flow-tables`,
branch `feature/measured-flow-tables`, base/HEAD unchanged at
`ac60f80675a2042f2f6043bae51b541b85e7251f`.

| Exact command | R1 outcome |
| --- | --- |
| `npx tsx --test tests/integration/tables.test.ts` | pass, **4/4**, including two named negative-control subtests; real grid/background checks pass on all three pages |
| `npm run format:check` | pass, **275 maintained files**, no formatter writes |
| `npm run lint` | pass, **278 Biome files** plus unchanged ESLint code-principles gates |
| `npm run typecheck` | pass, complete build and strict repository types |
| `npm test` | pass, **167/167**; previous 165 plus two regression subtests |
| `qpdf --check artifacts/tables/tables.pdf` | pass, unchanged PDF 1.4 structure |
| `pdftotext -raw artifacts/tables/tables.pdf -` | pass, three headers and unique ordered Item 1–12, preceding/following prose unchanged |
| `git diff --check` | pass |

Both focused raster-test attempts passed 4/4. The first formatting check found
helper formatting; a subsequent lint check found import order. Focused patches
fixed them; final formatting/lint/typecheck/full tests pass. No raster threshold
was weakened to make a failing image pass.

Production-source fingerprint command, run **before and after R1**, with identical
result `f009b5283da5e230eee0e2439f9ce3c358f379d11e80a0a94fa51e8001d4ea53`:

```sh
sha256sum packages/core/src/**/*.ts packages/layout/src/**/*.ts apps/showcase/src/*.ts apps/showcase/src/*.tsx apps/browser-fonts/*.ts apps/browser-react/*.ts apps/cmr/src/**/*.ts apps/cmr/src/**/*.tsx apps/node/src/*.ts apps/node/src/*.tsx | sha256sum
```

Unchanged before/after SHA256 values additionally justify reusing the supplied
site/browser/graph/packed-consumer evidence for this strictly test-only change;
those gates were **not claimed rerun** for R1:

```text
4e59bbf9cd825bdfe13d8bc72516db5edf4a3047b5585a13b773cfae85440eb3  apps/showcase/dist/chunk-graph.json
37b7c6484ed60c7f5f911a0afbda35f47fbae4aca56ec3a8e61f716456222201  artifacts/module-graphs.json
0aebb542873bc79e4eb22dca010f349d7b65a8087c61852772607eb6b030eacd  artifacts/installed-graphs.json
6fc2830ec756cee2f0e16993f621606efaeb3500a876019cf7e9e991ef792427  artifacts/tables/tables.pdf
```

The two fixed CMR hashes and the measurement/flow document hashes listed above
were also rechecked unchanged. Legacy/full-audit evidence is retained, not rerun
or waived by a test-only remediation. Code-principles self-check passes all seven
items: cohesive bounded helpers, functions ≤49/nesting ≤3, no unsafe `any`,
intent-only comments, proportional spatial/negative tests and passing maintained
gates. **No new exception** or Changeset is needed.

Final cumulative delivery is **42 unstaged tracked / 83 untracked files**, with
no staged changes and **0 commits** above the supplied base. Confirm with
`git diff --name-only | wc -l`, `git ls-files --others --exclude-standard | wc -l`,
`git diff --cached --stat`, `git status --porcelain=v1 -uall` and
`git rev-list --count ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD`.
Tracker/delivery state remains untouched. Auditor should re-audit the three-file
R1 delta, independently rerun the spatial oracle and its whole/partial-edge
negative controls, and confirm unchanged PDF/source hashes before verification.
