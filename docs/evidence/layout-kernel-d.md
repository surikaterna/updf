# Slice D — optional real-kernel playground execution manifest

## Delivery identity and ownership

- Objective: one bounded public-data → kernel geometry → DOM/SVG → native PDF slice,
  with optional finite-region fragmentation; not an editor product.
- Issue: **N/A** (caller-assigned Slice D; no tracker mutations authorized).
- Worktree/cwd: `/home/sprawl/projects/updf/trees/layout-kernel`.
- Branch: `feature/layout-kernel`.
- Base and unchanged HEAD: `a10864a806a80e1c6f305cfcd6ce5bc92e2cc3ba`.
- Starting state: clean. Engineer-owned delivery: new `apps/layout-playground/`,
  workspace-only `package-lock.json` additions, and this new evidence file.
- At implementation handoff, no stage/commit/push/PR/deploy, nested delegation, other
  worktree edits, or tracker mutation had occurred. No persistent service started;
  existing 4317 service untouched.
- Status at implementation handoff: implemented; lockfile unstaged, app/evidence
  untracked. Generated app `dist/` and `artifacts/` plus root verification artifacts
  are ignored, not delivery source. The independent audit and local commit are recorded
  below; no push, PR, merge, or deployment is authorized.
- Root manifest is unchanged: its existing `apps/*` workspace glob registers the app.
  `npm install --package-lock-only --ignore-scripts` added only the new app workspace
  record and workspace symlink record (12 lines); no external dependency changes.
  The focused lockfile diff was checked before the local commit.

## Implemented acceptance

Public `layoutBoxes` consumes a typed readonly view over actual source records.
Box row/column and PDF Helvetica paragraph/atomic-row presets, supported geometry
controls, readonly source/usage/metadata, SVG selection and keyboard source buttons
are implemented. Parent-content-relative B positions and explicit padding insets
are projected once for SVG/metadata/PDF. B counts and original box records remain
inspectable. Fractional/empty geometry and unsupported ASCII/control characters
produce code/path errors; no rounding, evaluation, or unsafe HTML is used.

The PDF preset measures once per selected-width computation and retains immutable
public lines/baselines/fragments/original UTF-16 spans. Export reconstructs nonempty
accepted lines at the same width, Helvetica 14pt/18pt/left alignment; blank lines
reserve geometry without text. It checks reconstruction with public measurement,
then uses public core render, which validates **and remeasures native text**. It does
not remeasure the whole paragraph, rerun placement/pagination, or invoke private APIs.
Whitespace and hard LF coverage are tested against the original source, including
empty and trailing paragraphs; line-index ranges are explicitly distinguished from
original-string UTF-16 spans. PDF row text labels are intentionally omitted rather
than inventing unmeasured labels.

Canvas mode places the paragraph and actual B row through a normal B column with
full natural height. Pagination dynamically loads C only after selection. One
operation uses fixed-width prepared line units and one actual-height extent-1 atomic
row; fresh unique regions use zero initial height and finite constant geometry.
It stops on done, blocked, or page cap, never retries an identical blocked region,
and closes in `finally`, including failed/stale computations. Default cap is 8;
hard cap 20. Monotonic operation budgets: attempts 21, sourceReads 40, sourceVisits
200, measurements/unitsExamined/providerUnits 1000, outputFragments 2000.
Cap/blocked prefix stays visible as INCOMPLETE, counts/known blocked dimensions are
inspectable, and PDF download is disabled. Page count is the actual selected regions.
No automatic headers/final contexts (#55) are claimed.

Pages are **not A4**: selected region dimensions plus a 20-point explicit margin on
each side. Default PDF fixture uses width 260, region height 108, gap/padding 8,
start alignment, and the README/UI default paragraph. It accepts two physical
300×148pt pages. The row is 70pt high and appears intact on page two below the final
paragraph lines. Width 260.5 is a tested invalid input; cap 1 gives an incomplete
prefix; region height 18/page cap 20 reaches the known 70pt blocked atomic row.
The failure screenshot records the fractional-width case.

Generation-token/debounce handling prevents late PDF imports/results from replacing
newer boxes state. Invalid input retains the last valid geometry with aria-live error
and disabled download. Labels, keyboard selection, 320px layout, and the explicitly
labeled intentional canvas pan container are exercised in real Chromium.

## Advisory follow-up — fresh gates (2026-10-04)

Caller reports prior D audit VERIFIED and this small SVG follow-up independently
verified. Starting dirty scope was the existing untracked app/evidence and unstaged
12-line lockfile addition.
Only `src/inspect.ts`, `test/browser/playground.test.ts` (both within the app), and
this manifest changed in the follow-up; the rest of audited D was preserved.

Selectable box and line rectangles now use SVG `pointer-events="all"`, covering
their unpainted allocated interiors without changing geometry or PDF output.
Content outlines/text remain non-interactive; children stay above parents. The new
browser test uses actual bounding-box center coordinates, checks unselected fill
and `elementFromPoint` source IDs before clicking, and asserts selected metadata.
It covers boxes A, paginated row-A and line-0, near-outline hits, keyboard selection,
reserved blank-line allocation, and unchanged selection on outside page margins.

| Fresh command | Outcome on current follow-up code |
| --- | --- |
| `npm run build -w @updf/layout-playground` | Pass; 72 modules; graph below refreshed |
| `npm run test -w @updf/layout-playground` | **7/7 pass**, including native PDF geometry/negative oracles |
| `npm run test:browser -w @updf/layout-playground` | **5/5 pass**, including new coordinate hit regression and existing graph/PDF-byte parity checks |
| `npx biome check --diagnostic-level=error apps/layout-playground` | Pass; format/import/lint, 21 files |
| `npx eslint apps/layout-playground` | Pass; code-principles lint |
| `npx tsc --noEmit` | Pass; strict workspace/app/test typecheck, no root rebuild |
| `git diff --check` | Pass |
| `git diff --exit-code HEAD -- packages/core packages/layout packages/layout-kernel` | Pass; engine packages unchanged |

Regression first failed on original code: A center hit returned no source ID.
Intermediate test failures were corrected: PDF child is `row-A`, not `A`; wait for
debounced blank-line rendering; stroke-inclusive bounding boxes require near-edge
coordinates inside the allocation rather than outside a dashed stroke gap. Final
full browser run passed. Ephemeral test previews/Chromium closed; no persistent
service started. Root 687 tests, full root gates, profiles and visual inspection
below are **historical prior-D evidence, not rerun or newly claimed for this fix**.

## Prior D gates and outcomes (2026-10-04; historical)

All commands ran in the worktree above with the same HEAD plus the described
uncommitted delivery. Full test/gate invocations used tool timeout **600000ms**.

| Command | Final outcome |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts` | Pass; workspace registration only |
| `npm run build -w @updf/layout-kernel` | Pass |
| `npm run build -w @updf/core` | Pass |
| `npm run test -w @updf/layout-playground` | **7/7 pass**, separate app suite |
| `npm run build -w @updf/layout-playground` | Pass; app-local `dist/`, 72 transformed modules |
| `npm run test:browser -w @updf/layout-playground` | **4/4 pass**, system Chromium, ephemeral loopback preview closed |
| `npm run format:check` | Pass |
| `npm run lint` | Pass; Biome and ESLint code-principles enforcement |
| `npm run typecheck` | Pass; includes root build plus strict app/test typecheck |
| `npm test` | **687/687 pass**, unchanged A–C/root suite; does not include app tests |
| `npm run build:browser` | Pass; existing browser fixtures freshly rebuilt in this assignment |
| `npm run check:graphs` | Pass against those fresh existing fixture graphs, not a claim of inherited A–C evidence |
| `npm run check:licenses` | Pass; existing package tarballs' full project MIT notices retained |
| `npx tsx scripts/kernel-profile.ts` | Pass; allocator 4575 raw / 1991 gzip bytes, zero externals |
| `npx tsx scripts/box-profile.ts` | Pass; emptyBox 14219/5358, measuredRow 14392/5419, zero externals |
| `npx tsx scripts/fragment-profile.ts` | Pass; C 11306/4277, boxes+C 21879/7772, zero externals |
| `git diff --check` | Pass |
| `git diff --exit-code HEAD -- packages/core packages/layout packages/layout-kernel` | Pass; production source/packages unchanged |

`npx biome check --write --diagnostic-level=error apps/layout-playground` was used
only for app-local formatting/import organization. `npx eslint apps/layout-playground`
and `npx tsc --noEmit` also passed during incremental validation. No expected-size
files or thresholds were modified. Existing optional browser-font fixture build
emitted its >500kB chunk warning; that is not a playground chunk or a failed gate.

Earlier development failures were resolved, not waived: incorrect test PDF header
expectation (actual native output is 1.4), subtractive baseline cancellation in the
host reconstruction check (now checks reprojected equality), assumed three rather
than actual two fixture regions, kernel graph `.ts` vs emitted `.js` matching,
Chromium executable convention, select accessible names, disabled FormData fields,
strict optional-property typing, and function/nesting limits. Default Poppler bbox
deduplicated coincident negative text: adding raw extraction makes the actual
duplicated-line negative PDF fail the oracle as intended.

## Built graph and actual evidence

App-local `dist/chunk-graph.json` captures emitted module identities, static/dynamic
edges and positive code byte counts. Fresh follow-up build observed JS chunks:

| Role | File | Modules | Bytes (raw plugin code) |
| --- | --- | ---: | ---: |
| Boxes entry | `assets/index-MKZwYCWM.js` | 23 | 25425 |
| Lazy PDF | `assets/pdf-oMoTl0I5.js` | 38 | 41498 |
| Lazy pagination | `assets/pagination-Bj9fNQAz.js` | 6 | 9312 |

Entry has no static imports; its module graph includes neither core nor C. Real
browser request capture confirms no core/PDF/C chunks in boxes mode, C loads after
box pagination selection, and PDF canvas loads PDF but **not C**. Finite PDF
pagination subsequently requests C. No PDF.js/React/Fontkit assets or external
runtime packages appear in this app graph. Static notice byte comparison confirms
`dist/notices/LICENSE` is identical to root `LICENSE`; source app also owns LICENSE.

App-local generated artifacts (actual, not fictional screenshots):

- `selected-pages.pdf`, `browser-selected.pdf`, and their bbox HTML/first-page PNGs:
  qpdf check/page count, Poppler bbox and raw source order/counts, accepted word
  positions; browser downloaded bytes equal Node export byte-for-byte.
- `selected-pages-atomic.ppm` and `selected-pages-atomic-view.png`: 72dpi native edge
  oracle and viewed second-page raster. Checks actual rectangle edges at accepted
  B positions and separation from final paragraph lines.
- Native negative PDFs: `displaced-line`, `duplicated-line`, `skipped-line`,
  `missing-row`, `displaced-row`; all fail their intended geometry/count/raster
  oracle while remaining real renderable PDFs.
- `mobile-controls.png`, `mobile-pagination.png`, `invalid-width.png`: actual 320px
  Chromium captures. Controls and geometry screenshots visually inspected; actual
  PDF first/second-page raster inspected. SVG glyphs are **illustrative**, not the
  Helvetica font proof; independent PDF bbox/raw/raster tests supply that proof.

Port 4318 was verified available by a loopback bind probe that immediately closed.
Availability is only at that check time: README's strict-port dev command must still
be run only with parent authorization and a fresh availability check. No interactive
dev server or background check remains running.

## Code-principles self-check / audit handoff

- Correctness: public APIs only; frozen source/snapshot/projection; incomplete exports
  rejected; no unsafe HTML/eval; production kernel/core/layout unchanged.
- Defaults: cohesive files below 400 lines, functions below 50, nesting at most 3;
  passing authoritative ESLint/format/type/test gates, no blanket exemptions.
- Comments: intent-only. Configuration-only local `noDefaultExport` suppression is
  justified for Vite's required default config export, matching the established
  workspace Vite convention; no universal-principles exception or production rule
  waiver. No additional exception approval was requested or claimed.
- Risk tests: separate 7 Node + now 5 browser tests for reconstruction,
  original-source coverage, immutable accepted prefixes, bounded operations,
  geometry, real PDF negatives, lazy imports, control changes, byte parity,
  accessibility/mobile and supersession; the fifth browser test covers SVG allocated
  hit areas and event layering. No engine tests were changed.
- Changeset omitted: private optional app, no publishable package/runtime API change.

Caller reports independent verification of the full app and SVG follow-up: 7 Node and
5 Chromium browser tests passed, including native PDF negative controls and the SVG
allocated-hit-area regression; build, lint, typecheck and geometry/byte invariance
checks passed. The caller reports no pending audit claim. This is an audit outcome
provided by the caller, not an independent audit performed by the delivery agent.
Nothing remains assigned for implementation. Broader editors, arbitrary code, PDF
viewer engines, Box JSX, automatic headers/final contexts and production changes were
intentionally not implemented.
