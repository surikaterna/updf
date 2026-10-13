# Barcode implementation prototype (#30 / #31)

> Historical evidence for the first prototype at `f808a82`. The external QR runtime
> path described below has since been retired in the PR follow-up. See
> [encoder promotion evidence](qr-encoder-promotion.md) for the current implementation,
> dependency graph, API and measurements. The original results are retained as history.

Worktree `trees/barcodes`, branch `feature/barcodes`, based on merged develop
`e8888c7680aa6c96bfce0b8df766ea1affb62fcc`. YOLO implementation and self-validation,
not independent audit. No merge, release or deployment is part of this slice.

## Scope and implementation choices

- New private `@updf/barcodes/code39` and `/qr` entries, geometry helpers and ordinary
  native TSX components. No changes to legacy Code 39, core painting, pagination,
  layout APIs, SVG PR #68 or freight-document defaults.
- Code 39 uses a standard pattern table and bounded integer-module geometry. QR
  uses pinned MIT `qrcode-generator@2.0.4`, not a new handwritten QR implementation.
- Shared native painting preserves quiet zones with an opaque white background.
  Local `maxWidth` rejects rather than shrinking. Geometry stays font/SVG-free.
- Public profiles and explicit deferred decisions are in
  [the package README](../../packages/barcodes/README.md). Fixed-page placement is
  implemented; Flow/inline integration and automatic page-fit are not claimed.
- The numerical change is new barcode geometry: exact bounded input/module checks,
  shared relative arithmetic for derived local width containment, existing core
  native geometry certification. No unit epsilon, suppression or policy rewrite.
- Upstream QR declarations include a canvas signature, so the package's build-only
  lib includes DOM. Public declarations are checked without ambient DOM/Node/React.
  This is an explicit integration choice, not a runtime DOM dependency or a waived
  portable-consumer check.
- License tooling permits only this package's exact QR dependency/version, checks
  its MIT metadata and absent transitive dependencies, and checks the complete
  upstream notice in the actual barcode tarball. QR consumer artifacts also carry
  that notice. Other packages' dependency policy is unchanged.

## Validation

Toolchain: Node 24.21.0, npm 11.19.0, TypeScript 5.9.3, esbuild 0.28.2,
qpdf 12.4.1, Poppler 26.08.0. Tests use existing system Chromium. The pinned decoders
are test-only ZXing 0.23.0 (Code 39) and jsQR 1.4.0 (QR), independent of the encoders.

| Command | Outcome |
| --- | --- |
| `npm run format:check` | pass, new package included in Biome scope |
| `npm run lint` | pass, including file/function/depth gates |
| `npm run typecheck` | pass, including full package build |
| `npm test` | 1,119 pass |
| `npx tsx --test packages/barcodes/test/*.test.ts tests/integration/barcodes.test.ts tests/consumer/barcodes-*.test.ts tests/browser/barcodes.test.ts` | 11 pass |
| `npm run test:consumer` | twelve existing clean external closures pass; barcode closure additionally covered in root tests |
| `npm run check:licenses` | fifteen package tarballs pass, including barcode QR notice |
| `npm run build:browser && npm run check:graphs` | pass, twelve existing emitted fixture graphs |
| `npx tsx scripts/barcodes-demo.ts` | generated four-symbol native TSX PDF |
| `qpdf --check artifacts/barcodes/demo.pdf` | pass |
| `pdftoppm -png -r 144 -singlefile artifacts/barcodes/demo.pdf artifacts/barcodes/demo` | rendered and visually inspected PNG |
| `npx tsx scripts/barcodes-cost.ts` | generated dynamic consumer bundles, module graphs, costs and QR notice |
| `git diff --check` | pass |

Coverage includes maximum payloads, the complete supported alphabets, minimum
module sizes, Code 39 ratios/checksum, quiet zones over dark artwork, invalid
values/options/accessors, immutable deterministic geometry/PDFs, width rejection,
native path/output quotas, and blank-raster negative controls. Each decoding test
consumes an actual qpdf-checked PDF rasterized by Poppler, not the encoder matrix.
The Node/Chromium example PDFs are byte-identical. Clean barcode consumers install
local tarballs offline with an empty cache, compile native TSX under NodeNext and
Bundler with ES2022-only libs, execute, and verify canonical ESM/CommonJS identity.

An initial ZXing QR detector failed the full-printable-ASCII raster fixture with
NotFoundException in its grid sampler. The authoritative QR tests use independent
jsQR detection/decoding, which passes that same unmodified symbol plus the other
fixtures. No fixture was removed, no pure-symbol bypass was used, and the encoder
was not changed to satisfy the detector. This is why successful fixture decoding
is not a claim of universal scanner interoperability.

The build reports the existing >500 kB optional font-browser chunk warning; it is
not a barcode dependency leak or a new regression threshold. The root suite's
historical arithmetic negative control intentionally prints an esbuild diagnostic
inside a passing test. No fresh full showcase matrix or hardware-scanner campaign
is claimed locally; hosted CI exercises the full existing browser/showcase gates.

## Measured complexity/cost

See README for the complete reproducible table. With equivalent native TSX
render/lower entry shape, Code 39 adds 1,029 whole-bundle gzip bytes over the
18,113-byte baseline; QR adds 8,406. Standalone geometry helpers measure 1,673 and
8,907 gzip bytes respectively. These are measurements, not #32 budget acceptance.

The QR adapter is short because the dependency owns its 2,237-line matrix/encoding
implementation. Code 39 is implemented locally with a small table/traversal.
Neither feature reaches SVG, layout, fonts or test decoders; Code 39 does not reach
the QR generator. Installing the barcode package does install the QR dependency;
subpath bundle isolation is not package-install isolation.

Both roadmap issues remain OPEN for review of the bounded profile and deferred
placement/API decisions. No Changesets setup exists; packages remain private and
unreleased. Code-principles defaults pass without suppressions or size exceptions.
