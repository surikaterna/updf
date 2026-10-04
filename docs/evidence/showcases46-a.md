# #46-A runnable invoice — Engineer handoff

Date: 2026-10-04. Status: **implemented for independent audit**, not verified,
released, committed or deployed. GitHub #46 remains **OPEN**; tracker mutations
were expressly prohibited. The overall issue is not complete: manifest #46-B is next.

## Reusable delivery state

- Objective: original realistic mock invoice, actually runnable in Node and the lazy
  browser/mobile showcase, shared data-only application composition and independent PDF checks.
- Cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Base and unchanged HEAD: `d3a1a056c50fb1f8fc61ff3fbd677952486b15c6`.
- Initial state clean. Engineer owns all changes listed below; no other owner's
  dirty files existed. Integration owner remains the caller/parent.
- No new commits, staged files, pushes, tracker mutations or nested delegation.
  Delivery consists entirely of unstaged tracked changes and untracked source/docs/tests.
- Modified: `apps/showcase/index.html`, `apps/showcase/src/{demos,main}.ts`,
  `biome.json`, `package.json`, `tsconfig.json`, `readme.md`,
  `tests/showcase/{graph,live-demos}.test.ts`.
- New: `examples/business/{components.tsx,invoice.tsx,invoice-data.ts,invoice-calculations.ts}`,
  `apps/showcase/src/optional-invoice.ts`, `scripts/invoice-example.ts`,
  `tests/integration/invoice.test.ts`, `tests/showcase/invoice.test.ts`,
  `docs/business-showcases.md`, and this evidence file.
- Generated artifacts/build outputs remain ignored, not delivery files.

## Completed acceptance / intentionally remaining

The invoice has 36 ordered, variable-quantity/price/unit line items with wrapped
original descriptions for a three-batch workstation fit-out. Seller Morrow
Deskworks and buyer Juniper Workshop are fictional; all contact domains end in
`example.invalid`. Dates are fixed. No banks, customers, signatures, logos, raster
assets or private PDF content are included. Every page says MOCK / NOT FOR PAYMENT.

Shared AddressBlock, LabelValue, Section, Totals and SignatureArea use measured
Row/Column and Paragraph/Span, with per-edge borders. Theme is explicitly read and
applied by components. Optional tables use explicit money/code/quantity tracks and
a flexible description track. All pages use explicit A4 portrait dimensions,
Helvetica, reserved repeating regions and final PageContext document-local counts.
No manual XY, formula engine or new library primitive was added.

Application policy and independent expected integer-cent values reconcile:
goods 515520, discount 25776, shipping 2450, taxable base 492194, VAT 98439,
grand total **590633** (GBP 5906.33). Tests cover half-up rounding and unsafe inputs.
Rows occupy pages 1–3 in ranges 1–12, 13–29, 30–36; settlement follows row 36.

The CLI writes the full PDF plus application `validation.json` (not PDF Info
metadata; the current API has no such authoring contract). Browser lazy loading,
displayed multi-file source, accessible ordered PDF.js canvases, matched open/link
bytes, `updf-invoice.pdf` filename, desktop/mobile downloads, edits/resize,
cleanup and restoration are exercised by the existing expanded harness.

Remaining: independently audit A, then assign B's manifest. A coherent invoice is
all A4 portrait; B is the intended landscape/mixed-size business showcase. No
artificial fixed cover was added. Docs explain fixed-form versus flow, unreleased
checkout prerequisites, exact commands and reusable module dependencies.

## Commands and outcomes

Environment: Node `v24.21.0`, system Chromium `152.0.7977.82` (Arch Linux),
qpdf `12.4.1`, Poppler `26.08.0`. Existing dependencies were used; `npm ci` is the
documented fresh-checkout prerequisite, not an installation performed in this run.
All commands below ran in the cwd above:

| Command | Final result |
| --- | --- |
| `npm run typecheck` (includes `npm run build`) | PASS, full workspace build + no-emit typecheck |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome + ESLint, including shared examples |
| `npm test` | PASS 551/551, no skips |
| `npm run test:consumer` | PASS seven clean packed external closures |
| `npm run check:graphs` | PASS all 12 browser module graphs |
| `npm run build:browser` | PASS |
| `npm run test:browser` | PASS 10/10 using default system Chromium, no skips |
| `npm run build:showcase` | PASS |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase` | PASS 51/51, no skips |
| `npx tsx scripts/invoice-example.ts` | PASS, 3 pages / 65932 bytes, PDF + validation JSON |
| `qpdf --check artifacts/invoice/updf-invoice.pdf` | PASS, no syntax/stream errors |
| `pdftotext -layout artifacts/invoice/updf-invoice.pdf -` | PASS, inspected all-page amounts/order/footer text |
| `pdftoppm -scale-to 1000 artifacts/invoice/updf-invoice.pdf artifacts/invoice/page` | PASS all-page raster generation |
| `npx tsx --test tests/integration/invoice.test.ts` | PASS 2/2, qpdf + Poppler text/geometry + 72dpi raster oracles |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test --test-concurrency=1 tests/showcase/invoice.test.ts tests/showcase/live-demos.test.ts tests/showcase/graph.test.ts` | PASS 4/4 on final runtime sources |
| `git diff --check` | PASS |

Manual preview command smoke: `timeout 3s npm exec -w @updf/showcase -- vite preview --host 127.0.0.1 --port 4173`
started successfully at `http://127.0.0.1:4186/updf/` because 4173–4185 were occupied;
the explicit timeout then terminated it (expected 124, not a suite failure).
No existing server was stopped. Tests use automatically allocated preview ports.

The invoice integration test independently checks page sizes, all text stays inside
insets, page-local repeated header/footer locations, all 36 codes exactly once in
order, quantities/unit prices/line amounts and explicit expected totals. Poppler
rasters check seven grid columns, repeated-region ink and clear top/bottom margins;
blank-raster negative controls must fail. This is not a byte snapshot-only test.
Desktop/mobile screenshots were viewed and show the three complete pages without
horizontal overflow: `artifacts/showcase/invoice-{desktop,mobile}.png`.

Artifact identity:

- Default CLI PDF SHA256: `6d76aae52353eea96d1d1c877d8558483f01ef757c9c70dc663d4cdb70df722c`.
- `validation.json`: `fc82fc2205c8f4457a8c4146d02b113bb47057c0ed55e93372129f0aceb3f49e`.
- Desktop **and** mobile downloaded PDF (heading `Hello portable PDF`):
  `fcc5336965933188ce0ebcc503f61d89306e8cfa440606570aef0496e22bf450`.
  These match Node generation with that heading; the CLI default heading differs intentionally.

## Findings / code-principles self-check

All checklist items satisfied: correctness validated; no unsafe bypass; cohesive
files below 400 lines; functions below 50 lines; nesting at most three; comments
explain intent/policy; risk-based tests added for money, pagination, independent
PDF oracles and browser/mobile lifecycle; authoritative format/lint/tests pass.
No approved code-principles exceptions were needed. This project does not use
Changesets, and no publishable package runtime changed.

Development failures were corrected, not waived: TSX eval used CJS export resolution
(replaced with the actual ESM CLI); unsupported object padding changed to documented
per-edge props; an unchecked test array element gained a guard; source formatting
and imports were fixed. The shared optional-table chunk made an old direct-chunk
assertion invalid; it now verifies the optional table entry's **static closure** and
still rejects eager engine/optional leakage.

Observed existing-engine concern: font-size 9 with ratio lineHeight 1.4 caused a
materialized fragment-reservation error. The example deliberately uses absolute
`pt(14)` consistently; no precision engine fix was attempted. Caller may assign a
separate linked investigation if desired; no issue was created without authorization.
The existing `main.ts` cognitive-complexity warning (16 vs recommended 15) appeared
in full Biome diagnostic output; the authoritative error-level lint and ESLint pass,
and this assignment only added invoice routing to `showSource`, not renderExample.

Browser build retains its existing >500kB Fontkit demo warning. #50 remains OPEN
for Chrome 154's SVG signature raster mismatch; that browser was not rerun here.
System Chromium 152 passes 10/10 with the existing thresholds. No skips, threshold
relaxations, blind retries or browser-gate waivers were added.

Auditor: inspect both unstaged **and untracked** files at this unchanged HEAD;
independently review fixture originality, business policy/totals, shared component
contracts, lazy source dependency truthfulness, geometry/raster checks, downloaded
bytes and mobile accessibility. Then hand back to the integration owner. B and any
engine precision investigation require fresh bounded assignments.
