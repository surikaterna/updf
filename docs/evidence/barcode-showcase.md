# Barcode showcase synchronization before merging #82

Follow-up from `97f917bd150ec3dd35398edef58668cc7fb91194`, in
`trees/qr-encoder-experiment` on `feature/qr-encoder-experiment`. The user requested
current showcases, then an authorized merge after validation. Git/PR history records
the actual delivery revision and merge state. This work does not authorize a Pages
deployment or npm release.

## Changes

The standalone four-symbol PDF was already current, but the interactive browser
catalog did not expose either barcode API. It now has **21 examples**, including
separate lazy Code 39 and QR entries:

- Code 39 payload, narrow-module width, bar height, ratio and optional Mod-43.
- QR printable-ASCII payload, module size and explicit M/H correction. H capacity
  errors do not silently lower correction or truncate text. URL payloads are encoded
  as data, not requested over the network.
- Both generate captioned native-TSX vector PDFs, with existing font/text helpers
  only for page captions. Actual template/helper source and captured arguments are
  shown for the downloaded result. No SVG, bitmap or external QR encoder is used.
- Controls are bounded for the fixed 480×600-point demo page. The 432-point content
  width rejects oversized Code 39 symbols rather than squeezing them. Maximum QR
  demo size fits clear of the captions/footer; quiet zones remain intact.
- Existing debounce, reset, error retention, Blob ownership and stale-result guards
  are reused. No new asynchronous asset loader or global cache was added.
- The selector, metadata, package/build dependencies, practical-limits copy and
  showcase/API documentation now agree. The prior 19-example inventory is updated.

The shared dispatcher only extracts its existing flow branch into a helper to stay
within the function-size gate when adding the barcode branches; flow behavior is
unchanged and its full browser tests still pass.

## Evidence

| Exact command | Outcome |
| --- | --- |
| `npm run format:check` | pass |
| `npm run lint` | pass, including file/function/depth gates |
| `npm run typecheck` | pass, full workspace build and type checks |
| `npm test` | **1,129 pass**, zero failures/skips/cancellations |
| `npm run build:showcase` | pass, includes barcode package build |
| `npm run test:showcase` | **101 pass**, full suite, real Chromium |
| `git diff --check` | pass |

The two new Node integration tests decode the actual captioned Code 39/QR showcase
PDFs through independent decoders and test invalid/oversized/page-unsafe controls.
Three browser tests cover exact Node/download parity, actual source text, checksum
and M/H changes, capacity/character/width failures, previous-result retention, Reset,
320px layout, no payload fetches, and delayed module completion after switching away.

Production graph tests prove neither encoder is in the initial entry; Code 39 does
not reach QR; the QR demo uses the local encoder; and the complete showcase graph
contains no qrcode-generator, ZXing or jsQR runtime. Existing graph/notice/base-path
checks still pass. The full suite includes font URI/engine selection, PNG/JPEG,
freight, layout/tables/SVG, source views, mobile behavior and plasma lifecycle checks.

Reviewed generated screenshots: `artifacts/showcase/code39-desktop.png` and
`artifacts/showcase/qr-mobile.png`. CI retains screenshots and downloadable PDFs in
its browser evidence artifact. These are source/build validation, not evidence that
the public Pages site has been updated.

## Handoff limits

YOLO self-validation, not independent audit. No principles exceptions or numerical
policy changes; demos use the existing barcode geometry contract. No Changeset is
needed for these private application/test/docs updates. Barcode Flow integration,
logos, Unicode QR profiles, PDF417 and hardware certification remain out of scope.
Hosted CI must pass on the final head before the authorized merge.
