# JPEG images (private/unreleased v1)

JPEG support is optional: `@updf/jpeg` depends only on core. Core retains generic
XObject geometry/resource collection and has no JPEG parser import. Drawing-only,
Helvetica and measurement consumers do not load JPEG. JPEG-only documents need no
fonts/text or Fontkit. There is no PNG package, decoder peer, fetch or filesystem
loader in the library. Workspace/tarball imports below do **not** imply npm publication.

## Prepare, bind, place, render

```ts
import { render } from "@updf/core";
import { jpeg, jpegProvider, prepareJpeg } from "@updf/jpeg";

export function imagePdf(source: Uint8Array): Uint8Array {
  const photo = prepareJpeg(source);
  return render({ version: 1, pages: [{ width: 200, height: 160, children: [
    jpeg("photo", { x: 20, y: 20, width: 160, height: 120 }),
  ] }] }, { resources: { photo }, providers: [jpegProvider()] });
}
```

Preparation accepts genuine Uint8Array views from any realm with genuine nonshared
ArrayBuffer backing. Shared-backed views, Proxies and lookalikes reject; intrinsic
checks/copying do not execute caller getters or prototype callbacks. One bounded
copy becomes private owned storage. Input mutation afterward cannot change output.
The handle's frozen metadata is `{ kind: 'jpeg', width, height, components: 1 | 3 }`,
with dimensions in **pixels**. Public metadata cannot recreate private ownership.

Bindings stay outside document data. Resource IDs match
`[A-Za-z][A-Za-z0-9_-]{0,63}`. `jpeg(id, box)` returns an ordinary generic core
`XObjectNode` (`type: 'xObject'`, `resource`, `x`, `y`, `width`, `height`). Native
`<xObject resource="photo" ... />`, `h('xObject', props)` and `bind` work too.
Install the provider in both lowering/layout and rendering options when used there.

The box has positive explicit dimensions in **PDF points** (72/inch), y down from
the page/local top-left. The image stretches to the box. Pixels, JFIF density and
thumbnails do not set geometry; there is no auto aspect fit, DPI, EXIF orientation
or implicit clip. Core wraps normalized-unit-rectangle painting with a matrix and
isolated `q`/`Q`. Use `paintGroup` transforms/clips for rotation, reflection or
cropping; clipped data is still embedded, so clipping is not redaction.

## Reuse, layout and budgets

Reuse the same handle under aliases, placements and pages to embed one original
compressed DCT stream. Separately prepared equal bytes embed two objects. Provider
reuse is deterministic and operation-local; no PDF references or keys cross documents.
Unused images emit no objects. `resourceBytes` counts every unique supplied handle,
including unused images/fonts, once; `outputBytes` applies before the writer's binary
snapshot. `profile: 'service'` selects optional core budgets; preparation's fixed
8 MiB and 64,000,000-pixel checks apply independently even in trusted mode.

JPEG is an atomic native leaf. Fixed pages and reserved Flow header/footer regions
can contain positioned XObjects. For a Flow body use an existing declared-height
`FixedBlock` with native nodes: it defers intact to a fresh page or rejects oversize.
There is no layout `Image` component, inline image adapter, automatic pagination or
image fragmentation. Existing generic transformed/clipped box ink is conservative,
not decoded-pixel analysis. See [layout tests](../packages/jpeg/test/layout.test.ts).

## Supported data and trust boundary

The [exact package profile](../packages/jpeg/README.md#exact-v1-profile) is authoritative:
single-scan 8-bit baseline Huffman grayscale, or JFIF YCbCr 444/422/420 with all
components in frame order. Only permitted structural tables, COM and optional JFIF
APP0 are accepted; EXIF, ICC, Adobe, progressive/multiscan, CMYK/YCCK, non-JFIF color,
PNG and alpha are rejected. Source must end at EOI with no trailing padding.

Validation checks marker/table/reference and entropy **framing**, not entropy
coefficients, MCU counts or restart intervals. Structurally framed invalid entropy
can pass. It is not an entropy decoder or hostile-image sandbox, and these checks
do not bound viewer memory. PDF uses original DCTDecode bytes, DeviceGray/DeviceRGB,
8-bit components and ColorTransform 1 for YCbCr, without transcode or resampling.

`DocumentError` codes are `JPEG_DATA` (bad structure), `JPEG_PROFILE` (recognized
unsupported profile), source `TYPE`/`LIMIT` at `/source`, generic `RESOURCE` for
binding/provider failures, and existing geometry/key/budget codes. Generic resource
binding failures now use `RESOURCE` even in font-only maps; font-specific errors
remain unchanged. See package diagnostics for paths.

## Runnable checkout proof

From the worktree root after `npm run build` (qpdf and Poppler installed):

```sh
npx tsx scripts/jpeg-example.ts
qpdf --check artifacts/jpeg-example.pdf
pdfinfo artifacts/jpeg-example.pdf
pdffonts artifacts/jpeg-example.pdf
pdftoppm -r 72 -png artifacts/jpeg-example.pdf artifacts/jpeg-example
```

The host-side script reads the original MIT fixture, reuses one handle across two
pages and writes the PDF; host filesystem code is not a library dependency. Supply
your own input/output paths as its two arguments. Run `npm run test:consumer` for
clean external JPEG-only and mixed text/image proofs. Native tests additionally
sample asymmetric color regions under reflection, rotation and clip with qpdf/Poppler.
Fixture [generator/provenance](../tests/fixtures/jpeg/README.md) is development-only.
The existing showcase remains unchanged; this example demonstrates delivery without
adding a demo redesign or authorizing Pages/site generation/publication.
