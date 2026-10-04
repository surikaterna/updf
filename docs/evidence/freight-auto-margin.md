# Freight showcase migration to #53 auto margin

Objective: migrate the original freight financial footer to a single measured
terminal body summary and demonstrate natural multipage variable charges.
Tracker **N/A**, user-authorized ad-hoc follow-up to #46/#53; no new issue or
tracker mutation. Engineer status: **implemented**, ready for independent audit,
not verified.

## Delivery state and manifest

- Cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Base and unchanged HEAD: `b1155b5561d864550625a0134ca6a018bbfa1d9e`.
- Initial state clean; all changes below owned by this Engineer slice. Parent owns
  integration, independent audit, authorized commit and final post-commit refresh.
- No staging, commits, push, nested delegation or service configuration mutations.
- 13 tracked files modified, unstaged; 3 new files untracked:

| Scope | Files |
| --- | --- |
| Composition/sections | `examples/business/freight-invoice.tsx`, `examples/business/freight-invoice-sections.tsx` |
| Application policy/presets | `examples/business/freight-invoice-calculations.ts`, `examples/business/freight-invoice-data.ts` |
| CLI | `scripts/freight-invoice-example.ts` |
| Lazy UI registration/loading | `apps/showcase/index.html`, `apps/showcase/src/demos.ts`, `apps/showcase/src/main.ts`, `apps/showcase/src/optional-freight-invoice.ts` |
| Existing tests | `tests/integration/freight-invoice.test.ts`, `tests/integration/freight-pdf-checks.ts`, `tests/showcase/freight-invoice.test.ts` |
| Current usage docs | `docs/business-showcases.md` |
| New tests/evidence | `tests/integration/freight-auto-margin.test.ts`, `docs/evidence/freight-auto-margin-before.tsx.txt`, this file |

Ignored generated PDFs/JSON/rasters are under `artifacts/freight-invoice/`,
`artifacts/freight-original/`, `artifacts/freight-extended/` and `artifacts/showcase/`.
Showcase dist was rebuilt and is visible through the existing port4317 preview.
No engine, general flex API, invoice/manifest, font bytes/OFL notices, dependencies,
parser ownership, package manifests or historical evidence were changed.
No Changeset: this project does not use Changesets; this is application-example work.

## Actual before / after

`freight-auto-margin-before.tsx.txt` is the complete original public mock template
from the base revision, not a private PDF. Byte equality was checked with:

```sh
git diff --no-index docs/evidence/freight-auto-margin-before.tsx.txt <(git show b1155b5561d864550625a0134ca6a018bbfa1d9e:examples/business/freight-invoice.tsx)
git diff -- examples/business/freight-invoice.tsx
```

The small main-template change is exactly:

```diff
-import { Document, Flow, layout, PageSize } from "@updf/layout";
+import { Block, Document, Flow, layout, PageSize } from "@updf/layout";
-import { FreightBilling, FreightFooter, FreightHeader, FreightShipment } from "./freight-invoice-sections.js";
+import { FreightBilling, FreightHeader, FreightShipment, FreightSummary } from "./freight-invoice-sections.js";
-  // A repeating financial footer is safe only with a hard one-page operation budget.
-  const options = { resources, limits: { pages: 1 } };
+  const options = { resources };
           <FreightShipment data={data} />
+          <Block keepTogether style={{ marginTop: "auto" }}>
+            <FreightSummary data={data} />
+          </Block>
         </Flow.Body>
-        <Flow.Footer height={238}>
-          <FreightFooter data={data} />
-        </Flow.Footer>
       pageCount: result.pageCount,
+      chargeCount: data.charges.length,
```

The section rename does not otherwise redesign the summary. This uses #53's
terminal normal-flow Block contract, not general CSS/flex. Its own natural height
is measured; there is no financial footer reservation, giant spacer, fixed-height
wrapper, artificial PageBreak or raised operation budget. Bounded defaults remain.

## Acceptance and visual findings

The repeating 112pt header retains final PageContext counts. Body endpoint is A4
height minus bottom margin: **829.8897637795277pt**.

| Preset | Charges | Pages | Shipment outer box | Summary outer box | Literal net/VAT/gross pence |
| --- | --- | --- | --- | --- | --- |
| original | 3 | 1 | y256, h139, page1 | y617.8897637795277, h212, page1 | 26750 / 5023 / 31773 |
| extended | 8 | 2 | y256, h289, page1 | y537.8897637795277, h292, page2 | 37900 / 6733 / 44633 |

Original header, billing and shipment positions/hierarchy remain unchanged. The
summary moves down **26pt** from the old reserved-footer origin 591.89; terms and
payment move with it, eliminating the old 26pt unused footer tail. Genuine bold,
blue Invoice heading, right-hand net/money hierarchy, original fictional contacts,
three-panel shading and charge boxes remain. All three final 72dpi PNGs were
visually inspected; no clipping or body/summary overlap was observed. No private
PDF was read or copied in this migration.

Eight real charge rows make shipment bottom545 plus summary292 exceed body829.89.
Shipment fits a fresh body; summary moves once intact to page2 and bottom-aligns.
No extra empty page occurs. Each charge occurs once in the shipment and once in
the net reconciliation. Exactly one Invoice Total and payment-placeholder section
appear, only on the final page. Headers say Page1 of2 and Page2 of2.

Application policy accepts 1–20 charges, explicitly not an engine feature. It
preserves integer pence, signed half-up per-charge tax and safe net/tax/gross checks
per charge and in aggregate. Literal extended taxes are
`[0,4368,655,840,370,0,750,-250]`; the original literal oracle is unchanged.
The extended data includes a 0% customs service and signed credit. Extreme
count-valid tall shipment content rejects `VERTICAL_OVERFLOW: Atomic Row exceeds
a fresh page`; no clip/split fallback. Summary remains explicitly kept.

Tests additionally compare both auto-margin PDFs byte-for-byte with independently
positioned ordinary-flow controls (no auto-margin in the control template), then
run real qpdf/Poppler checks on wrong-top, displaced duplicate and overlap PDFs.
Identical overprints were initially suppressed by Poppler; the duplicate negative
control offsets its second copy by3pt so actual duplicate ink is observable.
Selective raster erasures reject missing money/summary/terms/order rules. Variable
counts and wrapped charge labels change measured summary height while preserving
the body-bottom endpoint; placement assertions do not retain the old y592 anchor.

Desktop/320px tests compare full Node/browser/link/download bytes for both presets,
render all pages, check labels/A4 aspect ratios (extended), runtime counts, actual
source modules, title-description edits, Blob lifecycle and lazy-font failure
recovery. Invoice remains the heading; UI counts are from generated metadata.

## Commands and outcomes

All commands run in the worktree above. Final outcomes, zero skips:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS Biome and code-principles ESLint |
| `npm run typecheck` | PASS, includes complete workspace build |
| `npm test` | PASS **617/617**, baseline614 plus3 focused tests |
| `npm run test:consumer` | PASS seven external tarball closures |
| `npm run check:graphs` | PASS all12 graphs |
| `npm run check:licenses` | PASS seven actual tarballs, no font-asset leakage |
| `npm run build:browser` | PASS; existing large-chunk warning only |
| `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:browser` | PASS **10/10** |
| `npm run build:showcase` | PASS, final actual sources/notices emitted |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase` | PASS **56/56**, baseline54 plus2 tests |
| `npx tsx --test tests/integration/freight-invoice.test.ts` | Focused failures corrected; covered by final full pass |
| `npx tsx --test tests/integration/freight-auto-margin.test.ts` | PASS independent control and real negative PDFs |
| `npx tsx scripts/freight-invoice-example.ts` | PASS default: 1page, 850940bytes |
| `npx tsx scripts/freight-invoice-example.ts artifacts/freight-original original` | PASS 1page, 850940bytes, PDF+validationJSON |
| `npx tsx scripts/freight-invoice-example.ts artifacts/freight-extended extended` | PASS 2pages, 858877bytes, PDF+validationJSON |
| `qpdf --check artifacts/freight-original/updf-freight-invoice.pdf` | PASS |
| `qpdf --check artifacts/freight-extended/updf-freight-invoice.pdf` | PASS |
| `pdftoppm -png -r 72 artifacts/freight-original/updf-freight-invoice.pdf artifacts/freight-original/final` | PASS, inspected1page |
| `pdftoppm -png -r 72 artifacts/freight-extended/updf-freight-invoice.pdf artifacts/freight-extended/final` | PASS, inspected2pages |
| `git diff --check` | PASS |

Chromium: `152.0.7977.82 Arch Linux` (`/usr/bin/chromium --version`). No known
#48 black-SVG/Chromium154 failure occurred; no retry/skip/threshold weakening for it.
Earlier local development failures were corrected, not waived: oversized diagnostic
code assumption, replacing the wrong NET token, invisible identical duplicate
overprint, generate function line count, and returned value from a forEach callback.

`curl -fsS -o /dev/null -w 'preview4317 HTTP %{http_code}\n' http://127.0.0.1:4317/updf/`
returned HTTP200. A Chromium152 Playwright smoke at that same URL, viewport320×812,
selected both presets and compared fetched Blob bytes against
`freightInvoiceExample(resources, "Hello portable PDF", freightPreset(preset))`:
original1canvas/850933bytes, extended2canvases/858870bytes, exact equality.
Default CLI description deliberately differs from the shared UI description.
The service was not restarted/repointed; parent still owns post-commit refresh.

## Self-check and next owner

Universal checklist satisfied: correctness and safe arithmetic validated; defaults
followed; cohesive production files under400lines; functions under50lines and depth
at most3; comments explain intent; risk-proportional tests above; lint/tests pass.
**Approved exceptions: none.** No package runtime or dependency changes.

Acceptance complete; no implementation blocker or remaining feature work. Auditor
should independently inspect the actual unstaged/untracked manifest, arithmetic,
atomic pagination/negative-control sensitivity, actual source parity, visual change
of26pt, preserved optional graph/notices and unchanged generic invoice/manifest.
Parent decides authorized integration/commit and final served-dist refresh.
