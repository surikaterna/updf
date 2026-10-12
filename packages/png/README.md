# @updf/png (private/unreleased)

Optional synchronous PNG support, parallel to `@updf/jpeg`. Core does not import
this package or its MIT-licensed `fflate@0.8.2` compression dependency. No fonts,
JPEG parser, Node built-ins, canvas, fetch or filesystem APIs are needed. ESM,
CommonJS and browser exports follow the native workspace packaging contract.
This package has not been published.

## Public API

```ts
import { render } from "@updf/core";
import { png, pngProvider, preparePng } from "@updf/png";

export function imagePdf(source: Uint8Array): Uint8Array {
  const logo = preparePng(source);
  return render({
    version: 1,
    pages: [{ width: 200, height: 160, children: [
      png("logo", { x: 20, y: 20, width: 160, height: 120 }),
    ] }],
  }, { resources: { logo }, providers: [pngProvider()] });
}
```

- `preparePng(source: Uint8Array): PngResource` makes a private input copy,
  parses and decodes it, and owns recompressed color and optional alpha planes.
  Input mutation cannot change the resource. Genuine cross-realm Uint8Array
  views are accepted; shared-backed views, proxies and lookalikes reject.
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

## Exact initial profile

Accepted: PNG signature, non-interlaced 8-bit grayscale (0), RGB (2), indexed (3),
grayscale+alpha (4), RGBA (6); compression/filter methods 0; all five row filters;
PLTE and tRNS where legal; consecutive IDAT chunks; terminal IEND without padding.
Indexed samples expand to RGB, tRNS expands to alpha, and alpha remains straight
(not premultiplied). Palette indices and transparency samples are range checked.
Chunk CRCs, zlib Adler-32 and exact decoded scanline length are checked.

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
and 64 MiB decoded scanlines (including filter bytes). Inflate uses a fixed-size
output buffer, with an extra sentinel byte to detect excess decoded data.
These are exact integer/domain limits, not approximate geometry comparisons.
They bound decoded storage, not total peak memory or CPU time; preparation is
synchronous and is **not a hostile-input sandbox**. Compression syntax validation
is delegated to fflate, not an independent exhaustive DEFLATE validator.

`resourceBytes` conservatively charges original source length plus retained
compressed color/mask bytes once per unique handle, including unused bindings.
It is a rendering budget, not a preparation CPU limit. Core `outputBytes` and
optional service-profile limits apply normally.

`DocumentError` codes at `/source`: `TYPE` for invalid input views, `LIMIT` for
preparation limits, `PNG_DATA` for invalid structure/checksums/samples/scanlines,
`PNG_PROFILE` for unsupported profiles or chunks. Core uses `RESOURCE` for
missing/wrong/forged bindings or providers and its existing geometry/budget codes.

## Validation

From the worktree root:

```sh
npm run typecheck
npx tsx --test packages/png/test/*.test.ts tests/consumer/png*.test.ts
```

Fixtures are generated in tests with Node zlib (not the production compressor),
using original synthetic pixel values under the project MIT license. Tests cover
filters, color types/transparency, malformed data, ownership, deduplication,
budgets, browser graphs/runtime, clean packed ESM/CommonJS and qpdf/Poppler output.
The lazy browser showcase includes original RGBA and grayscale+alpha samples,
explicit 96–192pt sizing, reuse, reflection and clipping. White/blue backgrounds
expose full, partial and zero opacity; browser and Node outputs are byte-equal.
Actual source and fixture provenance are displayed. Invalid controls or failed
asset requests retain the previous PDF/source and can be retried or reset.
The showcase caches only successful fixture bytes. Requests time out after ten
seconds and are aborted when superseded, reset, or left behind by a demo switch;
late lazy imports cannot start an obsolete request. This fixture-only browser
loader is not part of the synchronous PNG package API.

```sh
npm run build:showcase
SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test tests/showcase/png.test.ts
npx tsx --test tests/integration/png-showcase.test.ts
```

No upload UI, publication or deployment is included.
