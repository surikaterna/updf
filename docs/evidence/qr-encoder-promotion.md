# QR encoder promotion and dependency retirement

Follow-up to barcode PR #82 from `f808a827aff89ca27925671a81083d49369d71c3`,
implemented in `trees/qr-encoder-experiment` on `feature/qr-encoder-experiment`.
The user authorized committing/pushing the experiment and retiring the old runtime
path. Git/PR history records the delivery revision. No merge or release is implied.

## Delivered scope

- Promoted the seven dependency-free encoder modules into
  `packages/barcodes/src/qr-encoder/`, compiled through the normal browser ESM and
  canonical Node CJS/facade build. No new public encoder subpath or compatibility
  factory is introduced.
- `qrCode()` and `<QRCode />` now call only the local encoder. The old runtime
  import/dependency and experiment factory bridge are removed. The package returns
  to ES2022-only build types; the old dependency's DOM-declaration workaround is gone.
- The package depends only on internal UPDF libraries. qrcode-generator is a pinned
  root **dev-only reference**, absent from installed packed consumers and emitted
  production graphs. It cannot be selected as an alternate production backend.
- `errorCorrection: "M" | "H"` is available in both public APIs. Default M retains
  the 192-byte profile; H accepts at most 119 bytes within version 10. Both reject
  unsupported/control/Unicode input. There is no silent correction downgrade,
  arbitrary version/mask override, logo overlay or bitmap rendering path.
- The full dependency-free encoder accepts internal capacities of 213 at 10-M and
  119 at 10-H for differential verification. Its broader internal M bound does not
  change the public 192-byte limit.
- The demo includes both M and H QR codes. Size is derived from module size;
  stronger correction can enlarge the symbol. The unchanged native painting,
  quiet-zone and width-fit contract does not squeeze modules to compensate.

## Reference isolation and provenance

The old adapter is frozen in `tests/fixtures/qr-baseline/qr.ts.txt`, verified against
`f808a82:packages/barcodes/src/qr.ts` with SHA-256
`24f65bee700a18f4d177c599cbb615a30afa1762dd5e5e9c244c6e04cdab4034`.
The cost harness checks its hash, transpiles it in memory and uses unchanged shared
checks/painting/symbol helpers. It does not access Git or the network at test time.
The dev reference's MIT notice moved to that fixture and accompanies generated
historical bundles; it is no longer a production barcode-package notice.

Production encoding is newly implemented standard QR arithmetic, not a wrapper
around the old dependency. Standard block parameters and format/mask rules were
checked against references as described in the [experiment record](qr-encoder-experiment.md).
This is not a clean-room claim or formal ISO audit. Independent test tools are not
an independent review of our implementation.

## Current measurements

Node 24.21.0, TypeScript 5.9.3, esbuild 0.28.2, browser ESM, ES2022, minification
and whole-bundle gzip. Public consumers use actual emitted package exports, not
source aliases. The standalone encoder row deliberately measures its private
emitted module and has no external runtime graph.

| Consumer | Original | Stripped reference | Current |
| --- | ---: | ---: | ---: |
| QR geometry helper, minified | 23,706 B | 17,326 B | **7,959 B** |
| QR geometry helper, gzip | 8,907 B | 6,543 B | **3,474 B** |
| QR PDF consumer, minified | 77,849 B | 71,447 B | **61,946 B** |
| QR PDF consumer, gzip | 26,519 B | 24,255 B | **20,961 B** |

The encoder alone is 5,106 minified / 2,271 gzip bytes. The native TSX baseline is
18,113 gzip bytes, making QR's current increment **2,848 bytes**, down from 8,406
(5,558 fewer bytes, about 66%). Code 39 remains unchanged at +1,029 gzip bytes.
These are scoped measurements, not #32 thresholds or generated-PDF file-size goals.
The earlier experiment included a factory bridge and has slightly different sizes;
its original figures remain explicitly historical.

## Verification

- 160 maximum-capacity exact matrix cases: versions 1–10 × M/H × eight masks.
- 332 exact automatic-version matrix cases: all M payload lengths 1–213 and all H
  lengths 1–119. Explicit versions also reject capacity+1.
- 2,048 additional seeded exact matrix cases vary version, level, mask, length and
  printable payload. Total **2,540 exact reference comparisons**.
- 25,992 independent mask-predicate comparisons, all 160 complete penalty scores,
  and independent minimum-score selection checks.
- Forty qpdf-checked, Poppler-rasterized vector PDFs independently decoded by jsQR:
  twenty maximum-capacity version/level cases and twenty with one deliberately
  flipped unprotected module. This does not establish arbitrary-logo tolerance.
- Public M/H API limits, unknown/undefined correction options and getter rejection;
  emitted TSX PDFs decode at multiple DPIs. Protected function metadata remains
  internal; a central version-7 alignment pattern is explicitly covered.
- Public QR component PDF bytes are repeated and compared for every raster case.
  Width-fit regressions distinguish exact finite/positive maxWidth input validation
  from the project's relative derived-geometry containment policy: one rounding ULP
  is accepted, meaningful local overflow and invalid domains reject. The Copilot
  summary's request for universally exact derived-width comparison is not adopted
  because it conflicts with the documented numerical policy.
- Chromium/Node agree on matrices and PDF bytes. New mask choices may differ from
  the old dependency; no blanket old/new PDF-byte identity is asserted.
- Clean packed consumers install offline with a fresh cache and compile/execute
  NodeNext/Bundler TSX with no ambient DOM/Node/React and no qrcode-generator or
  decoder installed. ESM/CommonJS identity is preserved, including correction H.

Exact checks run:

| Command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | pass |
| `npm run format:check` | pass |
| `npm run lint` | pass, including code-principles gates |
| `npm run typecheck` | pass, full package build and root checks |
| `npm test` | **1,127 pass**, no failures/skips/cancellations |
| `npx tsx --test packages/barcodes/test/*.test.ts tests/integration/barcodes.test.ts tests/integration/qr-experiment.test.ts tests/consumer/barcodes-*.test.ts tests/browser/barcodes.test.ts tests/browser/qr-experiment.test.ts` | **20 pass** |
| `npm run check:licenses` | fifteen tarballs pass; internal-only runtime dependency policy restored |
| `npm run test:consumer` | twelve existing clean consumer closures pass; barcode closure additionally in root tests |
| `npx tsx --test tests/browser/barcodes.test.ts tests/browser/qr-experiment.test.ts` | two pass |
| `npm run build:browser && npm run check:graphs` | twelve fixture graphs pass |
| `npx tsx scripts/qr-experiment/run.ts` | historical/current bundles executed, decoded and measured |
| `npx tsx scripts/barcodes-cost.ts` | current consumer measurements pass |
| `npx tsx scripts/barcodes-demo.ts` | updated M/H demo generated |
| `qpdf --check artifacts/barcodes/demo.pdf` | pass |
| `pdftoppm -png -r 144 -singlefile artifacts/barcodes/demo.pdf artifacts/barcodes/demo` | preview generated |
| `git diff --check` | pass |

The existing font-browser large-chunk warning remains, and the existing historical
arithmetic negative control prints an intentional esbuild diagnostic inside a
passing test. No full local showcase/browser matrix or hardware-scanner campaign
is claimed. Updated hosted CI remains required before merge.

## Principles and remaining limits

Input domains and QR arithmetic use exact bounded integer/bit/finite-field checks.
Local barcode width containment continues to use the shared arithmetic policy;
no tolerance rewrite, suppression, oversized file/function exception or runtime
dependency exception was introduced. No Changesets setup; packages stay private.

This is YOLO self-validation, not independent audit. #30/#31 remain open for review
of the bounded profiles and deferred Flow/page-fit/label/Unicode/logo decisions.
PDF417 or other symbologies are not implemented here. They can reuse native
rectangle/path painting, placement validation and decoder-based evidence, but
need their own encoding/layout/error-correction contracts.
