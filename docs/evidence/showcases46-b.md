# #46-B original logistics manifest — Engineer evidence

2026-10-04. **Implemented, ready for independent audit; not verified, released or
deployed.** GitHub #46 remains **OPEN**. Tracker/delivery mutations were prohibited;
the parent owns integration and subsequent lifecycle changes. #46-A's audited
invoice is preserved. This evidence maps the combined invoice/manifest acceptance,
not a claim that the issue has been independently closed.

## Reusable delivery state

- Objective: realistic original data-only logistics manifest, reusable business
  composition, mixed-page Node/browser/mobile showcase, independent PDF validation.
- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Base and unchanged HEAD: `87195dace73b4341f487f8c0273cc0384c9790af`.
- Initial state clean. Engineer owns all changes below; no pre-existing dirty files
  or other owner's changes were overwritten. Parent remains integration owner.
- No nested delegation, new commits, staging, push, PR, tracker or delivery mutation.
  All changes are **unstaged tracked edits or untracked delivery files**.
- Tracked edits: `apps/showcase/index.html`, `apps/showcase/src/{demos,main}.ts`,
  `examples/business/components.tsx`, `tests/integration/invoice.test.ts`,
  `tests/showcase/{graph,live-demos}.test.ts`, `docs/business-showcases.md`, `readme.md`.
- New files: `examples/business/{manifest.tsx,manifest-data.ts,manifest-calculations.ts}`,
  `apps/showcase/src/optional-manifest.ts`, `scripts/manifest-example.ts`,
  `tests/integration/{manifest-business.test.ts,manifest.test.ts,manifest-expected.ts,manifest-pdf-checks.ts}`,
  `tests/showcase/manifest.test.ts`, and this evidence file.
- Generated PDFs, JSON, rasters, screenshots and builds are ignored artifacts, not
  source delivery. No library primitives, dependencies, assets or legacy/historical
  source changed. The only shared runtime change is an optional Totals note with its
  existing invoice default preserved.

## Full #46 acceptance map

| Issue/user requirement | Actual implementation and evidence |
| --- | --- |
| Original sanitized invoice and manifest, no private/customer content | A: Morrow Deskworks / Juniper Workshop, 36 original equipment lines. B: Bracken Loop Distribution / Lantern Freight Cooperative, 48 original consignments, four fictional receiving sites, six freight families and three named circuits. Team mailboxes on `example.invalid`, fixed dates, no logos, signatures, personal data, customer PDFs or assets. Every invoice page says MOCK / NOT FOR PAYMENT; every manifest page says ORIGINAL MOCK / NOT FOR TRANSPORT. |
| Data-only business input and reusable application components | Both templates receive readonly data and reuse AddressBlock, LabelValue, Section, Totals, SignatureArea. Manifest fixture is deeply frozen; A now has a persisted frozen-input regression. Node and browser use the same deterministic modules. |
| Reusable measured flow, mixed pages, repeated regions, fonts and context | Invoice stays three A4 portrait pages. Manifest uses three Flow sections in a Document: portrait summary, nine landscape consignment sheets, portrait acknowledgment. Explicit Helvetica and absolute `pt(14)` defaults; Theme is read and explicitly applied, not magic CSS. Final PageContext footers count/order all 11 pages. No manual XY or table-for-layout. |
| Paragraph/Span, flexible table tracks, ordinary borders | Manifest addresses/totals use Row/Column; freight table combines explicit tracks with a weighted goods/instructions track. Atomic rows vary from three to five wrapped goods/care lines. Repeated route-specific table headers, per-edge header/status/address/totals borders and Care Span background highlights use existing APIs. No unsupported table row/column spans are claimed. |
| Business calculations are application-layer examples | A: safe integer cents and half-up discount/VAT policy, grand total 590633 cents. B: safe integer grams/counts, one handling package per loaded pallet or additional loose carton; pallet mass already includes contents/support. No double counting, formula engine, legal transport form or receipt guarantee. |
| Runnable exact Node commands, full PDF and validation JSON | Documented CLI commands executed. A: 3 pages / 65932 bytes. B: 11 pages / 156052 bytes. Each CLI writes the whole PDF plus application JSON; JSON is not PDF Info metadata or independent verification. |
| Browser/mobile PDF.js, truthful source/dependencies and downloads | Lazy optional-manifest entry; displayed source equals current template, shared components, calculations and fixture, plus invoice-data for the shared Address type only. Production graph proves invoice fixture/template not executed in manifest closure and no Node/React/Fontkit/SVG/geometry dependency. Complete bytes match Node at desktop/320px widths, filename updf-manifest.pdf, all-page labels/orientation ratios, keyboard generation/source focus, resize/latest title, URL cleanup and restoration pass. Existing shared preview preserves downloadable bytes when PDF.js transfers its input. |
| Page order, text, totals and rendered output verified | Independent literal expected per-row count/mass arrays, group/grand values, qpdf structure, Poppler text/order/page-local bounds, all-page raster boundary/grid/header/footer/highlight checks. Selective erased header/footer/grid/highlight negatives plus corrupted ID/footer/mass/geometry controls fail as expected. A's independent invoice oracles remain green with selective erasure added. |
| Flow versus fixed form, accurate unreleased status and provenance | docs/business-showcases.md explains flow first, fixed form as a separate overflow/positioning choice, no import/reconstruction or artificial fixed cover. Explicit application Theme, module prerequisites, Node/browser commands and private unreleased 2.0.0-poc.0 versus released legacy 0.4.15 are documented. README links both. |

### Actual manifest values and order

Grand totals: **48 consignments, 186 loose cartons, 45 loaded pallets, 231 handling
packages, 5,467,500 grams (5467.500 kg)**. Each route contains 16 consignments,
62 cartons, 15 pallets and 77 packages. Route masses: R1 1,672,500 g;
R2 1,822,500 g; R3 1,972,500 g. All 48 line values have independent literal expectations.

Actual orientation sequence: **P, L, L, L, L, L, L, L, L, L, P**.
Portrait sizes are 595.275591 × 841.889764 points; landscape reverses those axes.
Summary page 1 contains no consignment rows; pages 2–10 contain identifier ranges
**001–006, 007–012, 013–017, 018–023, 024–029, 030–034, 035–040, 041–046, 047–048**.
R2 starts on page 4 after CN-016; R3 on page 7 after CN-032. Page 11 reconciles the
entire load and explicitly supplies no signature/approval. The section breaks are
measured flow boundaries, not manually forced table-page slices.

## Commands and outcomes

All commands ran in the worktree above. Environment: Node **v24.21.0**, system
Chromium **152.0.7977.82** (Arch Linux), qpdf **12.4.1**, Poppler **26.08.0**.
Dependencies were already installed; documented `npm ci` remains the fresh-checkout
prerequisite, not an installation performed during this assignment.

| Exact command | Outcome |
| --- | --- |
| `npm run typecheck` | PASS, includes full `npm run build` plus no-emit typecheck; rerun on final runtime/test sources |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome error-level check and ESLint code-principles gates |
| `npm test` | PASS **555/555**, no skips; final runtime/test sources |
| `npm run test:consumer` | PASS seven clean packed external closures |
| `npm run check:graphs` | PASS all 12 browser module graphs |
| `npm run check:licenses` | PASS actual tarball MIT licenses and required third-party notices |
| `npm run build:browser` | PASS; existing Fontkit demo >500kB advisory retained |
| `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:browser` | PASS **10/10**, no skips, including SVG raster reference; no black-logo failure or blind retry |
| `npm run build:showcase` | PASS; rerun on final manifest source |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase` | PASS **52/52**, no skips; final manifest source |
| `npx tsx scripts/invoice-example.ts` | PASS 3 pages / 65932 bytes, unchanged invoice PDF identity |
| `npx tsx scripts/manifest-example.ts` | PASS 11 pages / 156052 bytes, full PDF + validation JSON |
| `qpdf --check artifacts/manifest/updf-manifest.pdf` | PASS, no syntax/stream errors |
| `pdftotext -layout artifacts/manifest/updf-manifest.pdf -` | PASS; all-page extracted text inspected |
| `pdftoppm -png -scale-to 1000 artifacts/manifest/updf-manifest.pdf artifacts/manifest/preview` | PASS all 11 PNGs |
| `npx tsx --test tests/integration/invoice.test.ts tests/integration/manifest-business.test.ts tests/integration/manifest.test.ts` | PASS **6/6**, actual PDFs + 72dpi raster oracles |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test --test-concurrency=1 tests/showcase/invoice.test.ts tests/showcase/manifest.test.ts tests/showcase/live-demos.test.ts tests/showcase/graph.test.ts` | PASS **5/5**; full final showcase suite also covers these tests |
| `git diff --check` | PASS |

The browser build/reference gates, consumer closures and tarball licenses ran before
the final application-only wrapping/highlight refinement; their input library and
browser-reference sources were unchanged. Final typecheck, lint, workspace tests,
business PDF oracles, showcase build and full showcase tests were rerun afterward.

Manual command smoke:
`timeout 3s npm exec -w @updf/showcase -- vite preview --host 127.0.0.1 --port 4173`
started at `http://127.0.0.1:4186/updf/` because ports 4173–4185 were occupied;
the explicit timeout stopped only this preview (expected timeout, not a failed gate).
No existing server was terminated. Browser harnesses used allocated preview ports.

Visually inspected representative Poppler pages 1, 2, 4, 10 and 11 and the mobile
showcase screenshot; varied wrapped care text, clear borders, readable repeated
regions and mixed orientations are present. Automated raster oracles cover every
page. Ignored evidence paths: `artifacts/manifest/preview-*.png`, `page-*.ppm`,
`artifacts/showcase/manifest-{desktop,mobile}.png` and matching downloaded PDFs.

### Artifact identities (SHA256)

- CLI manifest PDF: `0eb3aa720e9fbde5133dd85bc8bdbc20dfb50d0b4c203c2c66a7c2fcdd46998c`.
- CLI validation JSON: `20165e933bdc926afa8f3ee28c8490f6d9ca0e3034ecdab449bb926df958d241`.
- Desktop **and mobile** manifest downloads, heading `Hello portable PDF`:
  `81f6d6bdb61bf65dd89d6072f191f525c5b5e14b9d3b9f5bcc8643b534393d14`.
  Browser tests compare these complete bytes with Node using the identical heading.
- CLI invoice PDF: `6d76aae52353eea96d1d1c877d8558483f01ef757c9c70dc663d4cdb70df722c`,
  identical to the audited A evidence. Invoice calculations/template/fixture were not edited.

## Code-principles self-check / concerns

- [x] Correctness validated, no unsafe bypass or relaxed oracle.
- [x] Defaults followed, no new approved code-principles exception needed.
- [x] Cohesive files, production source below 400 lines.
- [x] Functions under 50 lines and nesting at most three, enforced by ESLint.
- [x] Comments explain intent/invariants, not code narration.
- [x] Risk-based tests cover integer mass/count overflow, duplicate IDs/routes,
  frozen input/determinism, actual PDF totals/order/geometry/raster, source truth,
  browser byte parity and mobile lifecycle; small authorized A-audit regressions persist.
- [x] Format, lint, typecheck, tests and relevant build/package gates pass.

No Changesets workflow exists here and no publishable package runtime changed.
Development errors (routing/oracle function line count and iterable callback lint) were
corrected, not waived. No engine fix was attempted: the existing audited absolute
`pt(14)` workaround remains documented. Caller-approved Chrome 154/#50 deferral
remains unchanged; this assignment used passing Chromium 152, not a new waiver.
No unrelated issue was created and no blocker remains for independent audit.

## Auditor / parent handoff

Audit the **unstaged and untracked** delivered files at the unchanged HEAD, not just
`git diff --stat`. Confirm original fixture provenance and load-count convention,
all expected values, atomic wrapped rows/route transitions, Span highlights and
per-edge borders, all-page orientation/header/footer bounds, source dependency
truthfulness, Node/browser/full-download bytes and mobile cleanup/accessibility.
Confirm invoice hash/default behavior remains preserved. The parent decides
integration and authorized tracker/delivery steps; Engineer makes no merge/release
claim. Safe stopping point: #46-B is complete for audit, with no remaining scoped
implementation or running asynchronous checks.
