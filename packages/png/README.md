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
