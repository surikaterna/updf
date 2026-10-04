# followup46 freight invoice implementation evidence

Tracker: **N/A**, user-approved follow-up; no issue created or mutated.
Owner: Engineer for this uncommitted slice; parent owns integration and audit/commit.
Worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
Branch: `feature/authoring-api`.
Base/HEAD: `96e29797e2e07c6e19b1ccfc945491d951758be5` (unchanged).
Initial state clean. No stage, commit, push, delegation or serving-unit changes.

## Visual acceptance and provenance

The private reference was viewed in memory only and used only to compare broad
visual proportions. No reference files, images, identifying paths, customer data,
payment numbers, logo or legal text were copied into this delivery. The fixture,
wordmark, contact text, notice, terms and financial literals were authored
independently. Artifacts and screenshots contain only original mock output.

The final independently rasterized PDF was inspected at 72 and 110dpi. Header
occupies y12–119, billing/notice y134–246, shipment heading/panels y256–395,
clear body gap y411–590, summary rule y591.89 and text y601–722, full-width
terms/payment region y740–802 (all in page points). This matches the approved
bands with readable genuine bold hierarchy and no text overlap. The summary
anchor is determined by the 238pt reserved footer, not body length. All four
tracks have gray headings; three shipment panels have equal-height pale fills,
charges remain white. Both billing panels are pale/bordered and 80pt minimum.

Pinned Liberation Fonts 2.1.5 archive digest and upstream OFL were checked before
copying Bold. The installed bold asset differed; the shipped unmodified upstream
face is reproducible and its hash/size are in `tests/fixtures/fonts/FREIGHT.md`.
Tests assert both exact font programs are embedded in the PDF. `pdffonts` reports
two CID TrueType Identity-H faces, embedded and Unicode-mapped. The renderer also
lists an unused built-in Helvetica resource; no mock text uses synthetic bold.

## Quality evidence

All commands run in the worktree above. Final results:

- `npm run format:check`: pass.
- `npm run lint`: pass (Biome and file/function/depth code-principles ESLint).
- `npm run typecheck`: pass, including the complete workspace build.
- `npm test`: pass (559 tests after the final wrapped-body addition; no skips).
- `npm run test:consumer`: pass, seven clean external package closures.
- `npm run check:licenses`: pass, actual seven tarballs; no font assets leaked.
- `npm run check:graphs`: pass, all twelve graphs; parser-free core retained.
- `npm run build:showcase`: pass; lazy freight assets and notices emitted.
- `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase`: pass, 53/53,
  no skips (existing 52 plus freight).
- `npm run build:browser`: pass.
- `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:browser`: pass, 10/10, no skips.
- `npx tsx scripts/freight-invoice-example.ts`: pass, 1 page, 850940 bytes.
- `qpdf --check artifacts/freight-invoice/updf-freight-invoice.pdf`: pass.
- `pdffonts artifacts/freight-invoice/updf-freight-invoice.pdf`: two embedded faces.
- `pdftoppm -png -r 110 artifacts/freight-invoice/updf-freight-invoice.pdf artifacts/freight-invoice/final`:
  pass, final manual visual inspection.
- `git diff --check`: pass.

Chromium: **152.0.7977.82 Arch Linux**. The user-deferred Chromium 154 SVG/#50
concern was not changed, skipped or weakened; no Chromium 154 rerun is claimed.
The persistent port4317 serving unit was not restarted or repointed. Validation
rebuilt the ignored showcase dist; parent owns its final post-audit refresh.

Earlier failed checks were corrected: unsupported fill property; fractional rule
reservation; stretch/height conflict; wrapped-text extraction assertion; import
ordering; upstream lowercase README; historical font README preservation. The
historical README is unchanged and no preservation assertion was weakened.

## Scope and next owner

New modules: five business runtime files, Node CLI, optional showcase loader,
four test/helper files, Bold fixture and separate provenance, this evidence note.
Existing files changed only for showcase registration/notices/graph ownership,
workspace dependency/build ownership and business showcase documentation.
Existing invoice/manifest/shared components, core/layout/API/PageBreak and
library package manifests are unchanged. No Changeset:
this checkout does not use Changesets and no package runtime was changed.

Universal checklist satisfied: correctness/unsafe-input validation; cohesive
files under400 lines; functions under50 lines and depth at most3; comments only
for intent/invariants; proportional tests and passing lint/tests. No code-principle
exception. The reproducible upstream Bold substitution is explicitly documented.

Status: **implemented**, ready for independent audit, not verified. All delivery
changes remain unstaged/untracked. Auditor should inspect actual files, font/OFL
and parser dependency notice completeness, independent arithmetic and signed
rounding, hard one-page overflow, region/negative-control sensitivity, lazy graph
ownership, unchanged invoice/manifest sources and complete Node/browser bytes.
Parent decides integration, commit and final served-dist refresh after audit.

## Bounded notice audit fix (2026-10-04)

Tracker remains **N/A**. The fix started from the HEAD/worktree above with 9
tracked modifications and 14 untracked files owned by the prior freight delivery;
all were preserved. Only `apps/showcase/vite.config.ts`,
`apps/showcase/index.html`, `tests/showcase/graph.test.ts` and this note were edited.
No engine, visual layout, font binaries, fixture data or dependency changes.

The notice emitter now copies installed `tslib/LICENSE.txt` byte-for-byte to
`notices/LICENSE.tslib`. Installed tslib 2.8.1 is a transitive runtime of
`@swc/helpers`, and `tslib.es6.mjs` appears in the actual optional freight graph.
The new regression walks that chunk's static import closure, derives installed
package roots from its module IDs, and compares every emitted package notice with
its installed source. It covers 12 actual packages, including tslib; it does not
substitute a new fixed dependency inventory for graph discovery. The existing
documented metadata/README fallback remains restricted to fontkit, dfa and brotli
and is also compared byte-for-byte. This is provenance coverage, not a new legal
sufficiency claim. Existing supplemental notices remain unchanged.

The HTML now distinguishes the parser-free initial entry from opt-in freight,
which loads Fontkit and the two licensed Liberation Sans regular/bold assets.

Commands rerun in this bounded fix:

- `npx tsx --test tests/showcase/graph.test.ts`: pre-rebuild negative control,
  2 pass / 1 expected failure: missing `notices/LICENSE.tslib` in the old dist.
- `npm run format:check`: pass.
- `npm run lint`: pass (Biome and code-principles ESLint); initial import-order
  failure was corrected before the final passing run.
- `npm run typecheck`: pass, including complete workspace build.
- `npm run build:showcase`: pass; emitted tslib notice; runtime JS chunk names
  and both font asset names unchanged from the pre-fix build.
- `SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test --test-concurrency=1 tests/showcase/graph.test.ts tests/showcase/freight-invoice.test.ts`:
  pass, 4/4, no skips; includes exact closure notices and freight Node/browser
  bytes, lazy loading, desktop/320px rendering and source assertions.
- `npm run check:licenses`: pass, all seven actual package tarballs.
- `npm run check:graphs`: pass, all twelve existing consumer graphs.
- `git diff --check`: pass.

The previously recorded full-suite and independent financial/visual/provenance
audit evidence is retained, not claimed as rerun here. A fresh full runtime suite
was unnecessary for this notice-only emitter and explanatory-copy change; the
risk-based addition directly detects the missing transitive notice and validates
all actual freight closure notices. No code-principles exception; cohesive files
under400 lines, functions under50 lines/depth at most3, intent-only comments and
all requested gates satisfied. Status: **implemented**, ready for focused
independent re-audit, not verified. No staging, commits, tracker mutations or
serving-unit refresh. Auditor should verify exact tslib license bytes and actual
closure coverage, preserved fallback semantics and corrected initial/opt-in copy.
