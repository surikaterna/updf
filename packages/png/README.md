# @updf/png (private/unreleased)

Optional asynchronous PNG preparation with native compression streams. Core does
not import this package. There is no third-party compression dependency or fallback.
No fonts, JPEG parser, Node built-ins, canvas, fetch or filesystem APIs are needed. ESM,
CommonJS and browser exports follow the native workspace packaging contract.
This package has not been published.

## Public API

```ts
import { render } from "@updf/core";
import { png, pngProvider, preparePng } from "@updf/png";

export async function imagePdf(source: Uint8Array): Promise<Uint8Array> {
  const logo = await preparePng(source);
  return render({
    version: 1,
    pages: [{ width: 200, height: 160, children: [
      png("logo", { x: 20, y: 20, width: 160, height: 120 }),
    ] }],
  }, { resources: { logo }, providers: [pngProvider()] });
}
```

- `preparePng(source: Uint8Array, options?: PreparePngOptions): Promise<PngResource>`
  copies and parses the input before the first suspension, then asynchronously
  decodes and recompresses the color and optional alpha planes. There is no
  synchronous preparation API. Input mutation cannot change the resource. Genuine cross-realm Uint8Array
  views are accepted; shared-backed views, proxies and lookalikes reject.
- `PreparePngOptions` accepts only an optional `signal: PngSignal`, structurally
  compatible with native AbortSignal without DOM/Node ambient declarations.
  Cancellation rejects without publishing a resource and closes active streams.
- `PngResource` is opaque owned identity with frozen `PngMetadata`:
  `{ kind: 'png', width, height, components: 1 | 3, alpha: boolean }`.
  Dimensions are pixels, components describe the decoded color plane, and
  alpha indicates an alpha channel or tRNS declaration (even if fully opaque).
- `png(resourceId, box)` produces an ordinary core `XObjectNode`. The explicit
  positive box dimensions are PDF points. Placement stretches the image with
  top-left/y-down geometry; no DPI, aspect fitting or implicit clipping occurs.
- `pngProvider()` binds prepared PNG handles to PDF Image XObjects. Install it
  during both lowering/layout and rendering when using those APIs.

Native `<xObject resource="logo" ... />`, `h('xObject', props)`, `bind`, groups,
transforms and clips all use the existing core contract. For Flow use an atomic
declared-height `FixedBlock`; no new layout Image component or fragmentation is
introduced. Clipping is not redaction: the complete image is still embedded.

## Platform and async contract

Preparation requires both native `DecompressionStream("deflate")` and
`CompressionStream("deflate")`. PNG uses zlib-wrapped DEFLATE, not `deflate-raw`.
Supported native APIs: Chrome/Edge 80+, Firefox 113+, Safari/iOS 16.4+, including
workers; the workspace uses Node 24. Unsupported hosts reject with `PNG_PLATFORM`
rather than silently loading a polyfill. See [MDN compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API).
These are native API introduction versions, not a whole-showcase browser baseline;
the ES2022 application and its cancellation UI can require newer browser versions.

Await preparation in the host/loader before binding the resource. Layout and
rendering of an already prepared handle remain synchronous. Rendering the same
handle is deterministic, but compressed PDF bytes from separately prepared images
are not a cross-runtime/version identity contract: native encoders may differ.
The decoded pixels, mask, geometry and PDF semantics remain equivalent.

## Exact initial profile

Accepted: PNG signature, non-interlaced 8-bit grayscale (0), RGB (2), indexed (3),
grayscale+alpha (4), RGBA (6); compression/filter methods 0; all five row filters;
PLTE and tRNS where legal; consecutive IDAT chunks; terminal IEND without padding.
Indexed samples expand to RGB, tRNS expands to alpha, and alpha remains straight
(not premultiplied). Palette indices and transparency samples are range checked.
Chunk CRCs and exact decoded scanline length are checked by the adapter; native
DEFLATE decoding validates zlib framing and Adler-32, including truncated/trailing data.

An optional sRGB declaration is accepted. Text/time/physical-density chunks
(`tEXt`, `zTXt`, `iTXt`, `tIME`, `pHYs`) are CRC-checked but otherwise discarded
without interpretation or decompression. Unknown chunks, ICC (`iCCP`), gamma
(`gAMA`), chromaticities (`cHRM`), EXIF and APNG animation chunks are rejected,
as are Adam7 and 1/2/4/16-bit samples. There is no color-management conversion;
PDF uses DeviceGray/DeviceRGB. Convert unsupported images on the host first.

PDF output uses lossless FlateDecode color streams and, when present, a separate
8-bit DeviceGray `/SMask`. The PNG container and metadata are not embedded.
Repeated aliases, placements and pages share one image/mask pair per handle;
separately prepared equal bytes remain separate identities. Unused handles emit
no objects. A provider is reusable, deterministic and operation-local.

## Optional 16-bit normalization eligibility

`@updf/png/normalization` separately exports
`preparePngNormalization(source, { signal? })`. It validates **only 16-bit**,
non-interlaced grayscale, RGB, grayscale-alpha and RGBA PNGs. This optional profile
also accepts the specific gamma/chromaticity declarations below; native preparation
does not. Indexed 16-bit PNGs, ICC, APNG,
unknown chunks and nonstandard methods still reject; this is not a browser fallback
for arbitrary PNG profiles. Optional truecolor PLTE and full-range 16-bit tRNS
samples are allowed where legal. All source CRCs, ordering, zlib/Adler framing,
exact decoded scanline length and every row filter are validated before return.
The same source/chunk/pixel/read limits apply; the 64 MiB scanline bound includes
**two bytes per sample**. Validation inflates bounded scanlines, but does not
unfilter pixels, allocate color/alpha planes or invoke an encoder.

Optional singleton `gAMA` (4 bytes) and `cHRM` (32 bytes) must precede both PLTE
and IDAT, in any order relative to each other or `sRGB`. All integers are exact
big-endian PNG four-byte unsigned integers (0…2147483647). Eligibility additionally
requires positive gamma and, for each white/red/green/blue xy pair, x in 0…100000,
y in 1…100000 and x+y ≤ 100000. **These are conservative profile restrictions,
not a complete normative PNG validity predicate**, gamut test or conversion engine.
With `sRGB`, any gamma must be exactly 45455 and any chromaticities must be exactly
`[31270,32900,64000,33000,30000,60000,15000,6000]`; neither companion is required.
Contradictions reject `PNG_DATA` regardless of declaration order, even though a
browser might ignore lower-priority declarations. Length, CRC, duplicate, placement
and high-bit integer failures also use `PNG_DATA`; zero gamma or out-of-profile xy
coordinates use `PNG_PROFILE`. No metadata is stripped before original validation.
See [PNG Third Edition](https://www.w3.org/TR/2025/REC-png-3-20250624/), §3,
§5.6, §11.3.2.1–2, §11.3.2.5 Table 17 and §4.3 precedence.

The result is a frozen `{ bytes, metadata }` record. `bytes` is a fresh,
caller-owned `Uint8Array` copied **before the first suspension**. The property is
readonly; its elements are **not immutable**. Frozen metadata describes the source:
`{ kind: 'png', width, height, bitDepth: 16, colorType: 0 | 2 | 4 | 6, alpha }`.
It is not `PngMetadata`, a `PngResource`, a resource-budget charge or a paint
certificate. No native 16-bit decoding or browser conversion is implemented.

A future normalizer must validate privately and decode **that returned copy**, not
the original caller input after an await. It must not trust an externally mutated
result, and any converted 8-bit output must still pass ordinary `preparePng` before
publishing a native resource. The root PNG entry does not re-export this capability;
ordinary `preparePng` still rejects 16-bit IHDRs immediately, as before. Neither
entry invokes image/canvas/browser host APIs. The normalization entry reuses native
compression-stream platform requirements, strict options and cancellation behavior.
Any future browser conversion promises browser-rendered 8-bit RGBA with alpha
preserved and no resizing, not bit-exact 16-bit samples, lossless conversion or
cross-engine pixel identity. Color declarations remain in the validated snapshot.

## Limits and errors

Before allocation/decompression: 8 MiB source, 4096 chunks, 16,000,000 pixels,
and 64 MiB decoded scanlines (including filter bytes). Decompressed chunks are
checked against the exact expected scanline length before copying/retaining them.
Each compressed plane is capped at twice its uncompressed length plus 1024 bytes;
both stream directions allow at most 65,536 reads. Input is fed in 1 KiB writes,
and output is drained concurrently to avoid backpressure deadlocks.
These are exact integer/domain limits, not approximate geometry comparisons.
They bound adapter-retained storage, not native internal buffering, total peak
memory or CPU time. Pixel reconstruction is synchronous between stream operations
and cannot be preempted by an AbortSignal. This is **not a hostile-input sandbox**.

`resourceBytes` conservatively charges original source length plus retained
compressed color/mask bytes once per unique handle, including unused bindings.
It is a rendering budget, not a preparation CPU limit. Core `outputBytes` and
optional service-profile limits apply normally.

`DocumentError` codes at `/source`: `TYPE` for invalid input views, `LIMIT` for
preparation limits, `PNG_DATA` for invalid structure/checksums/samples/scanlines,
`PNG_PROFILE` for unsupported profiles or chunks, `PNG_ABORT` for cancellation,
and `PNG_PLATFORM` for missing/failed native compression capabilities. Malformed
options use `TYPE` at `/options` or `/options/signal`. Core uses `RESOURCE` for
missing/wrong/forged bindings or providers and its existing geometry/budget codes.

## Validation

From the worktree root:

```sh
npm run typecheck
npx tsx --test packages/png/test/*.test.ts tests/consumer/png*.test.ts
```

Fixtures are generated in tests with the separate Node zlib API,
using original synthetic pixel values under the project MIT license. Tests cover
filters, color types/transparency, malformed data, ownership, deduplication,
budgets, browser graphs/runtime, clean packed ESM/CommonJS and qpdf/Poppler output.
The lazy browser showcase includes original RGBA and grayscale+alpha samples,
explicit 96–192pt sizing, reuse, reflection and clipping. White/blue backgrounds
expose full, partial and zero opacity; browser and Node outputs are compared as
qpdf-normalized objects/decoded streams, with independent PDF.js/Poppler pixel checks.
Negative controls prove that compression differences are accepted but changed
pixels are not. Native codec availability, stream limits/cleanup and cancellation
are tested alongside exact source-plus-compressed-plane resource accounting.
Actual source and fixture provenance are displayed. Invalid controls or failed
asset requests retain the previous PDF/source and can be retried or reset.
The showcase caches only successful fixture bytes. Requests time out after ten
seconds and are aborted when superseded, reset, or left behind by a demo switch;
late lazy imports cannot start an obsolete request. This fixture-only browser
loader is separate from the PNG byte-preparation API; cancellation also covers
asynchronous image preparation after the fixture download finishes.

```sh
npm run build:showcase
SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test tests/showcase/png.test.ts
npx tsx --test tests/integration/png-showcase.test.ts
```

No upload UI, publication or deployment is included.

## Measured native-codec cost

Node 24.21.0 / esbuild 0.28.2, minified ES2022 browser ESM, gzip level 9:

| Consumer | Previous fflate implementation | Native async implementation | Saving |
| --- | ---: | ---: | ---: |
| Three PNG API exports and their retained dependencies | 8,730 B gzip | 4,983 B gzip | 3,747 B (3.66 KiB) |
| Complete minimal PNG-to-PDF consumer | 19,485 B gzip | 15,636 B gzip | 3,849 B (3.76 KiB) |

These include the native stream adapter, bounds, cancellation and platform checks;
they are not additive package sizes. No image payloads or showcase UI are included.
Baseline PNG source: `960e9d4` (also present unchanged in font stack `aade3cb`).
Reproduce with `npx tsx scripts/png-cost.ts [built-baseline-worktree]`.
# Optional alpha inspection

`@updf/png/alpha` exports `readPngAlpha(resource, options?)` for exact owned
prepared-PNG handles. It returns frozen intrinsic width/height metadata with either
`kind: "opaque"` (all 255) or `kind: "alpha"` and an independently owned, mutable
`bytes: Uint8Array`. Options are a structural `signal` and a lower-only `maxPixels`
(default/ceiling `alphaLimit = 16_000_000`). Omit absent options/fields; explicit
undefined/null is invalid. Inspection performs one additional bounded soft-mask
inflation, not source/RGB decoding, and changes neither resource accounting nor PDF
bytes. It does not retain raw alpha on the resource. The ordinary root does not
import/re-export this leaf. See [S7a contracts and evidence](../../docs/evidence/png-alpha-shapes.md).
