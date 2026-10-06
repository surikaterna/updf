# `@updf/jpeg`

Private, unreleased `2.0.0-poc.0`; workspace/tarball usage, not a published npm package.
Full MIT license: Copyright (c) 2026 Surikat AB. No publication/deployment is authorized.

## Public root inventory

| Export | Kind | Contract |
| --- | --- | --- |
| `prepareJpeg(source: Uint8Array): JpegResource` | value | Own one private copy and structurally validate the exact profile below |
| `jpeg(resourceId: string, box: Box): XObjectNode` | value | Ordinary generic core leaf; point geometry validates during the operation |
| `jpegProvider(): ResourceProvider` | value | Explicit portable provider with operation-local interning |
| `JpegResource` | type only | Core `OwnedResource` identity with frozen JPEG metadata; compressed bytes stay private |
| `JpegMetadata` | type only | `kind: 'jpeg'`, pixel `width`/`height`, `components: 1 | 3` |

These are the complete public exports; there are no public subpaths or default export.
See the [guide and runnable example](../../docs/jpeg-images.md).

Optional synchronous, browser-portable baseline JPEG resources. The only
runtime dependency is `@updf/core`; no decoder, font/text package, filesystem,
fetch, Buffer or asynchronous loader is included.

```ts
import { render } from "@updf/core";
import { jpeg, jpegProvider, prepareJpeg } from "@updf/jpeg";

// Host supplies bytes (for example, a browser file input's Uint8Array).
export function imagePdf(source: Uint8Array): Uint8Array {
  const photo = prepareJpeg(source);
  return render({
    version: 1,
    pages: [{ width: 200, height: 160, children: [
      jpeg("photo", { x: 20, y: 20, width: 160, height: 120 }),
    ] }],
  }, { resources: { photo }, providers: [jpegProvider()] });
}
```

## Ownership and placement

`prepareJpeg(Uint8Array)` checks the source type and size before making one
private compressed-byte copy. Genuine Uint8Array views from any realm are
accepted only with genuine non-shared ArrayBuffer backing; SharedArrayBuffer
views are rejected even if their prototypes are changed. Internal-slot checks
and copying do not read caller properties or traverse caller prototypes.
It returns
an opaque `OwnedResource` identity with frozen metadata
`{ kind: 'jpeg', width, height, components: 1 | 3 }` (dimensions in pixels).
Mutating the input afterward cannot change output; compressed bytes never
escape through the handle.

`jpeg(id, box)` returns ordinary core `{ type: 'xObject', resource: id, ...box }`
data. IDs follow core's named-resource grammar: a letter followed by up to 63
letters, digits, underscores or hyphens. Geometry is explicit positive width
and height in PDF points, positioned from the top left. It stretches the image;
pixel dimensions, JFIF density and thumbnails do not set its size or aspect.
No DPI, EXIF orientation, automatic aspect fitting or implicit clip is applied.
Use existing `paintGroup` transforms/clips for rotation/reflection/cropping.
Native JSX `<xObject resource="photo" ... />`, `h('xObject', props)` and
`bind('xObject', props)` use this same generic core path.

Install `jpegProvider()` explicitly for each operation. A provider is reusable;
keys and PDF references are operation-local. Aliases and pages share one image
stream per handle; separately prepared identical bytes are not deduplicated.
Unused images allocate no PDF objects, but core `resourceBytes` counts all
supplied owned identities once, including unused images and fonts.
`outputBytes` is checked by the typed writer before its binary snapshot.

JPEG is an atomic native leaf. Existing layout `FixedBlock` reserves a declared
height and can move it to the next page intact or reject oversize; this package
does not provide inline adaptation, image pagination or fragmentation. Ink is
the conservatively transformed/clipped box, not pixel analysis or auto-crop.

## Exact v1 profile

- SOI at byte zero, exactly one 8-bit baseline sequential Huffman SOF0 and one
  SOS, terminal EOI with no trailing bytes/padding.
- Grayscale: component ID 1, sampling 1×1, optional JFIF.
- Three components: **JFIF YCbCr only**, IDs/order 1,2,3; Y sampling 1×1, 2×1
  or 2×2 (444/422/420), Cb/Cr 1×1. One scan includes all components in frame
  order, `Ss=0, Se=63, Ah=Al=0`.
- Before SOS: SOF0, DQT, DHT, COM, optional single DRI, optional single JFIF
  APP0 **immediately after SOI**. JFIF 1.00–1.02, units 0–2, positive densities,
  exact `14 + 3*thumbnailWidth*thumbnailHeight` payload. Density/thumbnail
  placement is ignored.
- DQT: 8-bit IDs 0–3, 64 nonzero values per definition; no duplicates. DHT:
  DC/AC IDs 0–3, nonempty bounded counts, no duplicates, oversubscribed trees
  or all-ones codes; DC categories 0–11, AC EOB/ZRL or run 0–15 and size 1–10.
  Referenced quantization and Huffman tables must be defined before the scan.
- DRI: exactly two payload bytes (zero disables restarts). Entropy framing
  accepts FF00 stuffing and marker fill FFs; repeated FF stuffing is rejected.
  Restarts require nonzero DRI, start at RST0 and cycle, with nonempty entropy
  between restarts and before EOI. Other scan markers are rejected.
- Source at most **8 MiB**, positive 16-bit dimensions, at most **64,000,000
  pixels**. No configurable JPEG quota subsystem or decoded pixel allocation.

All other APP markers are rejected, including EXIF, ICC and Adobe APP14.
Progressive/arithmetic/lossless/extended/12-bit/multiscan/CMYK/YCCK,
non-JFIF three-component JPEG and other formats (including PNG) are unsupported.

This is **structural validation, not an entropy decoder or hostile-image
sandbox**. It cannot prove coefficient validity, MCU counts or restart interval
correctness. Deliberately invalid but structurally framed entropy can pass.
These input limits do not guarantee bounded downstream viewer memory.

## PDF and diagnostics

Original compressed bytes pass through exactly once per used handle in an
Image XObject: 8 bits/component, DeviceGray or DeviceRGB, DCTDecode; YCbCr uses
`DecodeParms << /ColorTransform 1 >>`, grayscale has no transform parameter.
No transcode, RGB conversion, resampling, alpha, mask or ICC is introduced.

Failures are core `DocumentError` diagnostics: `JPEG_DATA` for invalid
structure, `JPEG_PROFILE` for recognizable unsupported profiles, `TYPE`/`LIMIT`
for source checks at `/source`. Core geometry/bounds/keys use their existing
codes and leaf paths; missing/wrong/unclaimed/conflicting XObjects use
`RESOURCE` at the leaf's `/resource`. Invalid generic resource bindings use
`RESOURCE` at `/resources/<escaped-id>`; byte quotas use `LIMIT` there.
Font-specific diagnostics remain `FONT_RESOURCE` and their existing codes.
