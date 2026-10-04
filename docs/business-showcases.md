# Runnable original business showcases (unreleased checkout)

## followup46: single-shipment freight invoice (tracker N/A)

Select **Original mock freight invoice** in the showcase. This is a separate
single-page business example; the existing invoice and manifest are unchanged.
The invented **Aster Wake Shipping** and **Copper Finch Logistics** contacts use
`example.invalid`. Every payment field is a non-operational placeholder. The PDF
explicitly says **MOCK - NOT FOR PAYMENT**. No private source imagery, logo,
customer data, bank details or legal wording is distributed.

```sh
npm run build
npx tsx scripts/freight-invoice-example.ts
qpdf --check artifacts/freight-invoice/updf-freight-invoice.pdf
pdffonts artifacts/freight-invoice/updf-freight-invoice.pdf
pdftotext -bbox artifacts/freight-invoice/updf-freight-invoice.pdf -
pdftoppm -png -r 110 artifacts/freight-invoice/updf-freight-invoice.pdf artifacts/freight-invoice/preview
npx tsx --test tests/integration/freight-invoice.test.ts
npm run build:showcase
SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase
```

The CLI writes the full PDF and application `validation.json`, accepting an
optional output directory. Node >=24, qpdf and Poppler are prerequisites.
`freight-invoice-data.ts`, `freight-invoice-calculations.ts`,
`freight-invoice-sections.tsx`, `freight-invoice.tsx` and
`freight-invoice-fonts.ts` own data, application arithmetic, visual sections,
composition and optional preparation respectively. The displayed source also
contains the real Node CLI and browser loader, with paths that must be preserved.

The constant heading is **Invoice**. The shared UI title field edits a secondary
description (maximum 40 characters, one line of input; long words wrap by code
point). Identical inputs produce identical Node/browser/download bytes. PDF.js
shows the full single page with an accessible label, including at 320px widths.

Composition uses only existing `Document`, `Flow`, `Row/Column`, `Block` and
`Paragraph` APIs: A4 portrait, 12pt margins, 112pt reserved header, paired billing
panels, four equal shipment tracks and a 238pt reserved footer. A weighted empty
column (2) beside the summary (3) places it in the right 60%. The large gap is the
unused measured body region above a real footer, not a spacer, manual XY, table
layout or imported background. A hard `limits.pages: 1` budget makes overfull
input fail rather than repeating financial totals. There is no repeat shipment UI.

Per-charge half-up VAT uses safe integer pence, with signed credits rounding away
from zero at ties. Net charges £16.35 at 0%, £218.40 at 20% and £32.75 at 20%
yield taxes £0.00, £43.68 and £6.55: net **£267.50**, VAT **£50.23**, gross
**£317.73**. This is demonstration policy, not legal/tax advice or engine formulas.

Both real Liberation Sans faces are prepared with `@updf/fontkit` and passed to
layout **and** rendering; bold is not synthesized. See
`tests/fixtures/fonts/FREIGHT.md` for pinned upstream provenance and OFL terms.
The parser is loaded only by the opt-in freight closure, never core, initial UI,
other demos or Plasma. Browser assets carry the OFL notice, installed dependency
licenses and upstream MIT declarations/metadata for distributions omitting a
standalone license, plus the Brotli decoder's Apache notice. Integral 14pt text
line heights, larger integral heading heights and 1pt rules avoid the known
fractional reservation limitation without changing the engine.

Independent literals, qpdf, font embedding bytes, Poppler word bounds/no-overlap,
raster fills/money borders/whitespace and realistic negative controls protect this
example. Wrapped description and shipment text preserve the bottom anchor;
overflow fails closed. See `docs/evidence/freight-invoice46.md` for executed gates.

## #46-A: invoice

This is an actual three-page invoice showcase, not a library invoice API, imported
PDF, or operational document. All entities, addresses, catalogue descriptions,
order references and dates were authored for this example. Contact addresses use
`example.invalid`. There are no customer assets, bank details, logos, or signatures.
The PDF says **MOCK / NOT FOR PAYMENT** on every page. The complementary #46-B
manifest below uses mixed portrait/landscape flow sections.

### Prerequisites and exact commands

Run from the repository root of this unreleased native branch, with Node >=24,
npm, qpdf and Poppler (`pdftotext`, `pdftoppm`). Install dependencies with `npm ci`
on a fresh checkout. The existing checkout may already have them installed.

```sh
npm run build
npx tsx scripts/invoice-example.ts
qpdf --check artifacts/invoice/updf-invoice.pdf
pdftotext -layout artifacts/invoice/updf-invoice.pdf -
pdftoppm -scale-to 1000 artifacts/invoice/updf-invoice.pdf artifacts/invoice/page
npx tsx --test tests/integration/invoice.test.ts
```

The CLI writes the **entire** PDF and `artifacts/invoice/validation.json`. An optional
directory argument changes both output locations. The JSON is application metadata
(fixed invoice/date/reference, currency, totals, item and page counts), **not a claim
that the native API supports PDF Info metadata**. No DOM, CDN, Fontkit or browser
is required by the Node generator.

For the actual browser UI and production-build harness:

```sh
npm run build:showcase
SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test --test-concurrency=1 tests/showcase/invoice.test.ts tests/showcase/live-demos.test.ts tests/showcase/graph.test.ts
```

The harness starts Vite preview and Chromium automatically. For manual use run
`npm exec -w @updf/showcase -- vite preview --host 127.0.0.1 --port 4173`, open
`http://127.0.0.1:4173/updf/`, and choose **Original mock invoice**.
Vite prints an alternate port if 4173 is occupied; use that printed URL instead.
The PDF title field edits the heading, not business amounts; this is a bounded predefined
example, not an arbitrary source-code editor. The displayed source includes the
actual template, shared components, calculation module and data fixture, labeled
with their paths; preserve those relative imports rather than treating the display
as a single self-contained module.

PDF.js previews every page as an accessible ordered canvas; the existing download
and open links share the same complete bytes. Download filename: `updf-invoice.pdf`.
The tests compare Node/browser/download bytes at desktop and 320px mobile widths,
check page order, ink, labels and horizontal containment, and save screenshots.

### Reusable authoring contracts

`examples/business/` is deliberately shared by Node and the lazy showcase:

- `invoice-data.ts`: data-only `InvoiceData`, `Address`, `InvoiceItem`, original fixture.
- `invoice-calculations.ts`: integer-cent business policy, not a library formula engine.
- `components.tsx`: application `AddressBlock`, `LabelValue`, `Section`, `Totals`,
  `SignatureArea`, and explicit `Theme` context, reusable for #46-B.
- `invoice.tsx`: business composition using native `Document`, `Flow`, `Row/Column`,
  `Paragraph/Span`, and optional native paginated `Table`.

The 36 rows model a three-batch workstation fit-out, with varied quantities, units,
prices and wrapping descriptions. Policy: sum goods, round a 5% invoice-level goods
discount half-up, add GBP 24.50 taxable shipping, then round 20% VAT half-up on that
base. Expected goods GBP 5155.20, discount GBP 257.76, base GBP 4921.94, VAT GBP 984.39,
grand total **GBP 5906.33**. Amounts are safe integer cents; unsafe inputs fail.
This mock VAT policy is not legal or accounting advice and is not a general tax engine.

Theme is an application provider whose values each component **reads and explicitly
applies**, not automatic CSS inheritance. Fonts explicitly use built-in Helvetica
(printable ASCII only); no font asset is shipped. A 14-point line height is explicit
for stable reservations; no typography/Unicode support beyond the native contract
is implied. Tables combine explicit code/quantity/unit/money columns with a flexible
description column. Addresses use Rows, not tables. Per-edge borders differentiate
addresses, table headers and totals. Reserved flow headers/footers use final
document-local `PageContext` counts. No hand-authored XY is used.

**Flow versus fixed form:** content is measured and paginated, complete rows remain
atomic, the table header repeats, and settlement follows the final row. A fixed form
would deliberately position boxes on prescribed pages and would need separate
overflow decisions; this example does not reconstruct/import PDFs. A coherent
invoice stays A4 portrait on all pages. The manifest demonstrates portrait/landscape
business flow rather than adding an artificial cover; the existing Mixed showcase
separately demonstrates mixed fixed/flow sections.

The regression oracle checks qpdf structure, Poppler row order and amounts,
page-local text bounds/header/footer geometry, and independently rasterized table
grid columns plus header/footer ink and clear margins. Blank raster negative
controls prove the checks fail on absent output, not just changed snapshots.
See `docs/evidence/showcases46-a.md` for executed gate outcomes and handoff state.

## #46-B: logistics manifest

The manifest is an original fictional morning dispatch from **Bracken Loop
Distribution**, dispatch hall C, carried by **Lantern Freight Cooperative**. All
sites, route names, goods, instructions and identifiers were invented for this
checkout. No customer assets, signatures, personal data, logos, or private PDF
content are used. Contacts are team mailboxes on `example.invalid`; dates and
depot-local time windows are fixed, not read from the current clock. Every page says
**ORIGINAL MOCK / NOT FOR TRANSPORT**. This is not a legal transport form,
dangerous-goods/customs declaration, delivery guarantee, or proof of receipt.

### Exact Node and browser commands

Use the same Node >=24, npm, qpdf and Poppler prerequisites above. All commands run
from the checkout/worktree root; `npm ci` is needed on a fresh checkout.

```sh
npm run build
npx tsx scripts/invoice-example.ts
npx tsx scripts/manifest-example.ts
qpdf --check artifacts/manifest/updf-manifest.pdf
pdftotext -layout artifacts/manifest/updf-manifest.pdf -
pdftoppm -png -scale-to 1000 artifacts/manifest/updf-manifest.pdf artifacts/manifest/preview
npx tsx --test tests/integration/invoice.test.ts tests/integration/manifest-business.test.ts tests/integration/manifest.test.ts
npm run build:showcase
SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test --test-concurrency=1 tests/showcase/invoice.test.ts tests/showcase/manifest.test.ts tests/showcase/live-demos.test.ts tests/showcase/graph.test.ts
```

`scripts/manifest-example.ts [output-directory]` writes the entire
`updf-manifest.pdf` and `validation.json`: fixed reference/date/title,
section/consignment order, page count and integer per-line/group/grand totals.
This is application validation metadata, not PDF Info authoring or independent
verification. Tests provide independent expected values and PDF checks.

For manual browser use:

```sh
npm exec -w @updf/showcase -- vite preview --host 127.0.0.1 --port 4173
```

Open the printed `/updf/` URL (default `http://127.0.0.1:4173/updf/`) and select
**Original mock manifest** or **Original mock invoice**. The manifest lazy adapter
executes the same template/data/calculations as Node; no DOM is needed for the
generator and no server generates the PDF. Displayed source includes all four
runtime business modules plus `invoice-data.ts`, used **only for the shared Address
type**. Preserve those paths/imports; it is not one paste-and-run file.
Dependencies are `@updf/core` (including native VDOM/JSX runtime), `@updf/layout`
and `@updf/tables`; the UI separately uses PDF.js and its worker for preview.
No React, Fontkit, raster logos, geometry or SVG adapter is required by either
business example. These APIs belong to the unreleased private **2.0.0-poc.0
checkout**, not released legacy 0.4.15 or a published manifest package.

The browser returns exactly the Node bytes for an identical heading, previews all
11 pages using each page's actual dimensions, and downloads `updf-manifest.pdf`.
The default CLI heading differs from the UI's `Hello portable PDF` on purpose.
Desktop and 320px mobile tests compare full link/download bytes, all preview labels
and orientation ratios, keyboard generation/source focus, latest-title updates,
resize, URL cleanup and pagehide/pageshow restoration. Downloads are not preview
images or first-page-only documents.

### Composition and application policy

`manifest-data.ts` holds readonly interfaces and a deeply frozen fixture:
48 consignments in three 16-row routes. Six freight families, four receiving sites,
varied counts/gross masses, four statuses, four slots and wrapped special
instructions demonstrate realistic load-sheet density. `manifest-calculations.ts`
validates safe integer counts/grams, rejects empty routes and duplicate identifiers,
and reconciles loaded pallets plus **additional loose cartons**. A loaded pallet's
mass includes its support and contents; contents are not counted as loose cartons.
Each loaded pallet or loose carton is one handling package. Kilograms are displayed
to three decimals without floating-point business arithmetic. This is application
policy, not a generic engine formula or logistics model.

Expected route totals: R1 **1,672,500 g**, R2 **1,822,500 g**, R3 **1,972,500 g**.
Each route has 62 loose cartons, 15 loaded pallets and 77 handling packages. Grand
total: **48 consignments, 186 cartons, 45 pallets, 231 packages, 5,467,500 g**.

`manifest.tsx` composes three declarative Flow sections in one Document:

1. Portrait A4 dispatch summary (page 1), AddressBlock and Row/Column composition.
2. Landscape A4 consignment flow (pages 2–10), flexible goods/instructions track
   beside explicit identifier/site/count/mass/slot/status tracks; atomic rows and
   repeating route-specific table headers. R2 starts on page 4 after R1; R3 on page 7
   after R2. Route starts can share pages; order remains continuous.
3. Portrait A4 reconciliation and unsigned acknowledgment (page 11).

All sections reserve repeating headers/footers; final document-local PageContext
counts are 1/11 through 11/11. Shared Section, LabelValue, Totals and SignatureArea
are reused without table-for-layout or manual XY. Totals accepts an optional note;
its default GBP note and invoice bytes remain unchanged. Theme is provided, read
and explicitly applied to text, Span highlights and per-edge borders. Absolute
`pt(14)` line height preserves the audited workaround for fractional reservation
precision; no engine fix is included.

This is reusable flow, not fixed-form reconstruction. New data may change page
counts/ranges; each flow section still starts its own page. No artificial fixed
cover or unsupported table row/column span API is used. Independent tests check
every row's counts/mass/slot/status, all identifiers/order, route section breaks,
orientation sequence, qpdf validity, Poppler text bounds and all-page raster
grid/header/footer/boundary probes. Selective header/footer/grid erasure must fail.
Small invoice regressions also preserve deep-frozen input and selective raster
negative coverage from the A audit. See `docs/evidence/showcases46-b.md` for the full
#46 acceptance mapping and actual gates.
