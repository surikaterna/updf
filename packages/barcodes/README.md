# Optional native barcodes — implementation prototype

Private/unreleased `@updf/barcodes`, related to [Code 39 #30](https://github.com/surikaterna/updf/issues/30)
and [QR #31](https://github.com/surikaterna/updf/issues/31). This PR is for reviewing
API shape and implementation complexity, not closing the full roadmap or promising
universal printer/scanner compatibility. It does not depend on SVG authoring PR #68.

## Native TSX

```tsx
/** @jsxImportSource @updf/core */
import { Code39 } from "@updf/barcodes/code39";
import { QRCode } from "@updf/barcodes/qr";
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";

const pdf = render(lower(
  <document version={1}>
    <page width={480} height={360}>
      <Code39 value="SHIP-12345" x={36} y={36} moduleWidth={1} barHeight={48} maxWidth={408} />
      <QRCode value="https://example.com/ship/12345" x={36} y={120} moduleSize={3} />
    </page>
  </document>,
));
```

These are ordinary native components, not new intrinsic tags, React components, or
a barcode font. They emit a white background path and black native vector paths.
The QR helper merges consecutive dark cells horizontally; no raster resampling,
SVG markup, XML parser, canvas or DOM operation is involved. The package has no
root barrel: import the explicit subpath you need.

`examples/barcodes.tsx` is the runnable four-symbol version (including Mod-43).
After `npm ci --ignore-scripts` and `npm run build`:

```sh
npx tsx scripts/barcodes-demo.ts
qpdf --check artifacts/barcodes/demo.pdf
pdftoppm -png -r 144 -singlefile artifacts/barcodes/demo.pdf artifacts/barcodes/demo
npx tsx scripts/barcodes-cost.ts
```

Open `artifacts/barcodes/demo.pdf` or `demo.png`. PR CI also uploads these, plus
the emitted consumer bundles and module/size report, in `quality-evidence`.
No showcase deployment is necessary to inspect the prototype.

## Geometry helpers

```ts
import { code39 } from "@updf/barcodes/code39";
import { qrCode } from "@updf/barcodes/qr";

const tracking = code39("SHIP-12345", { moduleWidth: 1, barHeight: 48 });
const link = qrCode("https://example.com", { moduleSize: 2 });
// tracking.width / height include quiet zones. bars are local point rectangles.
```

Each returns an immutable `BarcodeSymbol` with `width`, `height`, and a deeply
frozen `bars` array of `{ x, y, width, height }`. Both entries export the
`BarcodeSymbol` and `BarcodeBar` types. There is no mutable cache or document
ownership inside the encoder.

### Code 39 profile

- Basic alphabet: digits, uppercase A–Z, space and `-. $/+%`. No automatic uppercase,
  extended ASCII translation, embedded start/stop `*`, or silent replacement.
- 1–80 payload characters. Start/stop characters are generated internally.
- `checksum: "none" | "mod43"`, default `none`. Mod-43 adds one check character;
  scanners must be configured consistently if the check character should be removed.
- `moduleWidth`: 0.25–10 points, default 1; `barHeight`: 1–1000 points, default 40.
- `wideRatio: 2 | 3`, default 3. Exactly one narrow intercharacter space.
- Horizontal quiet zones are each `max(10 × moduleWidth, 18 points)` and included
  in measured width. No human-readable caption is added; compose ordinary text
  separately so the encoder has no font dependency.

### QR profile

- QR Model 2, **printable ASCII only** (U+0020–U+007E), 1–192 bytes, byte mode.
  Lowercase URLs work. Unicode, control characters and binary input reject rather
  than receiving ambiguous encoding/ECI behavior.
- Error correction **M**, automatic version within 1–10, deterministic mask choice
  supplied by pinned `qrcode-generator@2.0.4` (MIT, no runtime dependencies).
- `moduleSize`: 0.25–10 points, default 2. Modules are square, with four white quiet
  modules on every side. The complete width equals height.
- No exposed version, mask, encoding, correction-level, logo or color controls in
  this first slice. The input cap bounds QR generation before expensive work.

### Placement, diagnostics and budgets

Both components accept their encoder options plus required `value`, `x`, `y`, and
optional `maxWidth`. Coordinates are finite nonnegative points, at most 1,000,000.
`maxWidth` is a positive finite point bound (at most 1,000,000), **not** a scale
request: a symbol that does not fit rejects. The helpers never squeeze modules,
truncate payloads or crop quiet zones. Width/height/style/children are not accepted
component props.

These are **fixed-document components**, not Flow/block/inline adapters. Callers
must place the complete measured rectangle inside the page and keep later artwork
and ancestor clipping/transforms from obscuring or distorting it. `maxWidth` only
checks local width; it cannot infer the surrounding page's remaining width/height.
Page-aware/flow integration is deliberately deferred, not claimed complete for #30/#31.

Invalid payload/options reject with `DocumentError` (`TYPE`, `VALUE`, `LIMIT`);
local width overflow uses `GEOMETRY`. Direct API paths begin `/barcode`; core may
attach the component's source path during lowering. Unknown fields, accessors,
non-enumerable/inherited option shapes, and explicit undefined options reject.
Input limits apply before encoding; generated paths and PDF output use existing
core operation budgets. Native TSX components remain trusted synchronous code,
not an execution sandbox or a new aggregate barcode-work budget.

Numerical policy: payload counts, module patterns, option ranges and ratios use
exact validation. Code 39 cursor arithmetic stays in bounded integer module units
until point conversion. Derived width fit uses shared `exceeds` at local operand
scale, not page coordinates or a blanket epsilon. Core retains final native
geometry certification; successful decoding does not waive geometric validation.

## Complexity and package cost

Code 39 consists of a small standard pattern table, optional checksum, one
integer-module traversal, and validation/component plumbing. Unlike legacy Code 39,
it does not combine encoding with SVG construction, width squeezing and style
fallbacks. The extra validation/tests make it more explicit, not necessarily fewer
total source lines than the permissive legacy component.

The QR wrapper is similarly small, but **it is not a small in-house QR encoder**:
the dependency's ESM source is 2,237 lines, including capacity tables, Reed–Solomon,
matrix placement, masking and output helpers. We consume only its matrix API, not
its SVG/HTML/canvas methods. Those attached methods are not all independently
tree-shakeable; the measured cost below includes what the actual bundler retains.
No QR algorithm was copied or reimplemented here.

`qrcode-generator` is an installed dependency of the barcode package, including
Code-39-only installs. It is **not imported by the Code 39 entry** or included in
its measured browser closure. This is bundle isolation, not installation isolation.
`@zxing/library@0.23.0` and `jsqr@1.4.0` (Apache-2.0) are independent **test-only
decoders**, never production package dependencies. Keep dependency license notices
when bundling.
`LICENSE.qrcode-generator` retains the full upstream MIT license (copyright 2009
Kazuhiko Arase, from the upstream repository's LICENSE); it ships in our tarball
and with the generated QR bundle artifacts, because the dependency's npm tarball
only carries the license reference in its source headers. The license gate pins
the permitted external runtime dependency, version and notice rather than
loosening the existing internal-dependency policy for other packages.

The upstream QR declarations mention a canvas renderer, so this package's own
build enables the DOM type library to check that dependency without suppressions.
Our emitted public declarations do not reference it. Clean packed consumers compile
and execute with **ES2022 only, no ambient DOM/Node/React**, in NodeNext and Bundler
modes. Node ESM/CommonJS share the canonical implementation; browsers use emitted ESM.

Measured with Node 24.21.0 and the locked esbuild, browser ESM, ES2022, minification,
whole-bundle gzip. Dynamic payloads are retained and executed in the graph tests.
These are fixture-specific costs, not release budgets or additive module weights.

| Consumer | Minified JS bytes | Gzip bytes |
| --- | ---: | ---: |
| Native TSX render/lower baseline, no barcode | 54,850 | 18,113 |
| Native TSX Code 39 PDF | 57,267 | 19,142 |
| Native TSX QR PDF | 77,849 | 26,519 |
| Code 39 geometry helper only | 3,304 | 1,673 |
| QR geometry helper only | 23,706 | 8,907 |

For these PDF fixtures the incremental cost is **1,029 gzip bytes for Code 39**
and **8,406 for QR**. Core-only retains neither barcode entry; Code 39 retains no
QR generator; neither barcode closure contains SVG, layout, fonts or the decoder.

## Validation and remaining decisions

- Actual PDFs pass qpdf, are rasterized by Poppler at 144–600 DPI, and decoded by
  independent ZXing Code39Reader and jsQR. Covers the Code 39 alphabet, maximum
  payload, minimum dimensions, both ratios, checksum, QR URL/maximum payload,
  white quiet zones over dark artwork, and blank-image negative controls.
- Chromium emits byte-identical PDFs to Node for the runnable TSX example.
- Malformed inputs, immutability, dimensions, explicit width rejection, generated
  path/output budgets, emitted graphs and offline empty-cache tarball installs are
  tested. These proofs are not hardware/printer certification.
- API decisions still open for review: whether this bounded profile is enough,
  naming, human-readable labels, Unicode/ECI, more QR correction levels, Flow/table
  adapters, and page-aware fit. Keep #30/#31 open during prototype review.
- No release, legacy API migration, automatic feature adoption in freight documents,
  or deployment is part of this PR. YOLO self-validation, not independent audit.
