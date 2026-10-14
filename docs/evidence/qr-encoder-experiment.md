# Dependency-free QR encoder size experiment

> Historical experiment snapshot on `f808a82`. The user subsequently authorized
> committing/pushing the work and retiring the old runtime path. The encoder has
> now moved into `packages/barcodes/src/qr-encoder/`; the factory bridge is removed.
> See [promotion evidence](qr-encoder-promotion.md) for current scope and measurements.
> The original local/uncommitted status and measurements below describe the experiment,
> not the subsequent delivery state.

## Status and scope

Local experiment on `feature/qr-encoder-experiment` in
`trees/qr-encoder-experiment`, based on barcode PR #82 revision
`f808a827aff89ca27925671a81083d49369d71c3`. The new work is uncommitted/unpushed;
PR #82 and its production barcode package are unchanged. Related roadmap issue
#31 remains open. This is YOLO implementation and self-validation, not independent
audit, a clean-room provenance claim, or ISO certification.

The runtime encoder is newly implemented under `scripts/qr-experiment/`:
`encoder.ts`, `profile.ts`, `codewords.ts`, `reed-solomon.ts`, `functions.ts`,
`mask.ts`, and `penalty.ts`. It imports only its own modules, not the QR dependency,
core/PDF, Node, DOM, SVG or decoders. The reference libraries are test/measurement
tools only. `compat.ts` bridges the exact calls made by the existing barcode
adapter so the bundle comparison retains its current validation/geometry/painting.

## Supported experimental profile

- QR Model 2, byte mode, printable ASCII only, versions 1–10.
- Correction levels M and H, real Reed–Solomon blocks/interleaving, all eight masks,
  BCH format/version information, timing/alignment/finder patterns and remainder bits.
- Automatic smallest fitting version, or an explicit bounded version for testing.
  Capacity reaches 213 bytes at 10-M and 119 at 10-H; the existing barcode adapter's
  192-byte/M profile is unchanged in the like-for-like comparison.
- Normal encoding evaluates all masks against all four penalty rules including
  function/format information; lowest score wins, with deterministic lowest-index ties.
  A forced mask exists for verification, not to skip mask evaluation by default.
- Immutable matrix and immutable function-module map. The map marks both light and
  dark reserved cells; it is groundwork for safe placement analysis, not logo support.
- No numeric/alphanumeric mode optimization, Unicode/ECI, versions 11–40, L/Q,
  multiple segments, logos, public package API or release packaging in this experiment.
  The measurement bridge is not a general qrcode-generator compatibility layer.

All encoder arithmetic is bounded exact discrete work: GF(256), integer module
positions, bit fields, counts and penalty scores. There is no approximate geometric
comparison and no added epsilon. Vector rendering stays in the existing native
PDF engine; no bitmap fallback or lower error-correction shortcut was used.

## Measured result

Node 24.21.0, TypeScript 5.9.3, esbuild 0.28.2, browser ESM/ES2022, minified, then
gzip of each complete bundle. Reproduce with `npx tsx scripts/qr-experiment/run.ts`.
The generated report records actual input modules and writes executable bundles.

| Consumer | Variant | Minified bytes | Gzip bytes |
| --- | --- | ---: | ---: |
| Existing QR geometry API | Original dependency | 23,706 | 8,907 |
| Existing QR geometry API | Stripped dependency | 17,326 | 6,543 |
| Existing QR geometry API | New encoder via bridge | 8,255 | **3,620** |
| Existing native TSX QR PDF API | Original dependency | 77,849 | 26,519 |
| Existing native TSX QR PDF API | Stripped dependency | 71,447 | 24,255 |
| Existing native TSX QR PDF API | New encoder via bridge | 62,263 | **21,100** |
| Matrix encoder alone, including M/H | New encoder | 5,106 | **2,274** |

Relative to the 18,113-byte native TSX PDF baseline, the QR increment drops from
8,406 to **2,987 gzip bytes** (about 64% smaller). It is **3,155 gzip bytes smaller
than the stripped dependency** in the complete PDF consumer, or 2,923 smaller in
the geometry-only consumer. Whole-bundle compression makes these deltas nonadditive.
The standalone encoder's 2,274 bytes must not be compared as if it included the
barcode adapter and renderer.

The stripped reference removes only the six output methods (SVG/HTML/data URL/
image/ASCII/canvas) and the unused encoding-map factory through a checked AST
transform in memory. The original package on disk is not edited. Its source license
notice is retained alongside generated reference bundles. The rewrite plugin
resolves the encoder import to our bridge instead: the module graph proves no
qrcode-generator runtime code remains. This measures the existing public barcode
consumer, not a precomputed/static QR shortcut.

## Correctness evidence

`npx tsx --test tests/integration/qr-experiment.test.ts` — **five pass**, covering:

- **160 exact matrix comparisons**: 10 versions × M/H × eight forced masks, each
  at maximum byte capacity with seeded printable ASCII payloads. The reference is
  pinned qrcode-generator 2.0.4 with only its private mask choice forced in memory;
  its framing, correction, placement and format logic remain unchanged.
- **332 exact matrix comparisons** over every supported payload length, M 1–213
  and H 1–119, with automatic version choice. Reference encoding is forced to the
  candidate's chosen mask so a legitimate scoring difference is not mistaken for
  a data/geometry difference. Each explicit version also rejects capacity+1.
- **25,992 mask-predicate comparisons** with pinned ZXing (8 × 57 × 57). Penalty
  totals match its independent implementation for all 160 forced matrices, and ten
  auto-mask cases select its minimum score across all eight candidates.
- **40 independently decoded vector PDFs**, qpdf checked and Poppler rasterized:
  maximum payload at every version/level, plus each with one deliberately flipped
  unprotected module. jsQR recovers the original data. This is a basic error-
  correction regression, not maximum-damage or arbitrary-logo tolerance evidence.
- Malformed inputs/levels/versions/masks reject before allocation, results are
  immutable and deterministic, and version 7's central alignment pattern is marked
  protected (a naive centered logo would cover it).

`npx tsx --test tests/browser/qr-experiment.test.ts` — **one pass**: Chromium and
Node agree on matrix contents and complete vector PDF bytes for M/H. The browser
graph contains no qrcode-generator. The measurement runner additionally executes
all emitted variants, checks four QR PDF payloads per variant through the independent
PDF raster decoder, and checks standalone bundled encoder results against source.

The rewrite may select different masks than the original dependency's default
heuristic. Exact forced-mask parity is established, not unconditional old/new PDF
byte identity. It does not create denser symbols by dropping a previously used
encoding mode: the existing prototype already uses byte mode exclusively.

## Runtime observation

Local warm microbenchmark, seven batches of 100 calls after 20 warmups; median
milliseconds per complete matrix generation. The new path includes the frozen
matrix/function-map result; the old path returns its own factory matrix object.

| ASCII bytes | Original | Rewrite |
| ---: | ---: | ---: |
| 16 | 0.275 ms | 0.232 ms |
| 95 | 1.020 ms | 0.613 ms |
| 192 | 2.138 ms | 1.317 ms |

This sample did not show a CPU penalty; it is not an application benchmark or a
general speed guarantee. Mask algorithms and return representations differ, and
the measurements are from one Node host, not a cross-browser performance campaign.

## Gates, provenance and next step

Passed: `npm run format:check`, `npm run lint` (including principles gates),
`npm run typecheck`, `npm test` (**1,124 pass**), the focused browser test,
`npx tsx scripts/qr-experiment/run.ts`, and `git diff --check`.
No suppressions or file/function-size exceptions. The existing historical
arithmetic negative-control test prints an intentional esbuild error in a passing
test. No full showcase rerun, hosted CI, independent audit, hardware scan campaign,
publication or deployment was performed for this local experiment.

QR constants/formulas are standard technical facts. Block parameters were checked
against the existing MIT qrcode-generator table; the reference tests use that
package. Explanatory references consulted: Thonky's QR tutorials on mask patterns,
data masking and format/version information (links below); no tutorial text/images
are redistributed. ZXing's Apache-2.0 mask utilities and jsQR are used only as
independent test tools. This is not a clean-room implementation claim.

- https://www.thonky.com/qr-code-tutorial/mask-patterns
- https://www.thonky.com/qr-code-tutorial/data-masking
- https://www.thonky.com/qr-code-tutorial/format-version-information
- https://github.com/kazuhikoarase/qrcode-generator

Recommendation: the size saving is material enough to justify a separately reviewed
production-hardening slice. Before replacing the dependency, audit the QR algorithm,
expand independent/randomized coverage, decide supported modes/levels/versions and
public error/profile contracts, and repeat the clean package/bundle/consumer gates.
Logo placement needs its own protected-pattern/occlusion contract and scan tests;
an H option plus one-bit recovery is not proof of logo safety.
