# Runnable original business showcases (unreleased checkout)

## #46-A: invoice

This is an actual three-page invoice showcase, not a library invoice API, imported
PDF, or operational document. All entities, addresses, catalogue descriptions,
order references and dates were authored for this example. Contact addresses use
`example.invalid`. There are no customer assets, bank details, logos, or signatures.
The PDF says **MOCK / NOT FOR PAYMENT** on every page. #46-B's manifest is the next
bounded assignment; it is not implemented here.

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
invoice stays A4 portrait on all pages. Mixed-size/landscape business documents are
reserved for #46-B rather than adding an artificial cover here; the existing Mixed
showcase already demonstrates mixed fixed/flow sections.

The regression oracle checks qpdf structure, Poppler row order and amounts,
page-local text bounds/header/footer geometry, and independently rasterized table
grid columns plus header/footer ink and clear margins. Blank raster negative
controls prove the checks fail on absent output, not just changed snapshots.
See `docs/evidence/showcases46-a.md` for executed gate outcomes and handoff state.
