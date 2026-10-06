# Build a reusable PDF template efficiently

## 1. Choose fixed geometry or flow

Use a core `DocumentDefinition` for known forms and explicitly positioned pages.
Supported native drawing leaves include `richText`, `rect`, `line`, `path`,
`paintGroup` and `xObject`; there is no old `type: "text"` or `kind: "plain"` form.
Core is a drawing/serialization backend, not an automatic content paginator.

For variable-length prose or rows, use current layout `Document`/`Flow`,
`Paragraph`/`Span`, `Row`/`Column`, and optional `Table`, or their data constructors,
then `layout(content, options)` and `render(result.document, options)`.
`layoutFlow` is removed. Read [documents](../documents.md), [rows](../rows.md) and
[tables](../tables.md) for width allocation, atomic rows, repeated headers and
reserved final regions. Do not simulate pagination with unbounded page heights,
absolute-position hacks or repeated trial shrinking. Explicit page breaks suit
known forms; let Flow split complete measured lines for variable content.

## 2. Keep data, template and host composition separate

Define readonly business input types; validate external JSON in the host before
calling the template. Calculate amounts/totals with explicit business rules and
prepare date/locale strings there. Never evaluate input strings as template code.
Use one pure `data -> document` function (or trusted synchronous VDOM component)
and one render adapter; no filesystem access, fetch or server loading in the template.
Reuse styles/components instead of copying generated painting commands.

The [complete typed notice](../../examples/agents/notice.ts) is a small fixed-page
example: `createNoticeDocument(data, measure)` returns a `DocumentDefinition`;
`createNoticeRenderer()` composes reusable resources, measurement and rendering.
It validates its nonempty ASCII fields and date *format*, not calendar validity;
the caller must validate actual dates. It rejects excessive content rather than
silently truncating it. For real paginated business data, reuse the existing
[invoice and manifest](../business-showcases.md), including their integer-cent and
integer-gram calculations, rather than extending this notice into a table engine.

## 3. Bind resources once and measure available width

The notice creates one caller-owned `fontRuntime()`, explicit `NoticeFont` resource,
`createTextMeasurer({ runtime })`, full `createTextService({ runtime })` and paired
`fontProvider(runtime)`. Standalone measurement takes only
`{ resources, measurer, profile, limits? }`, not render options. Its input is
`{ width, height?, paragraphs }`; natural height is `consumedHeight`.
The notice measures at width 515 points, then positions exactly those paragraphs
using the measured height on a 595 × 842 point page with 40-point margins.

Every paragraph supplies `runs`, `defaultStyle` (explicit font ID, point font size,
normalized RGB), numeric `lineHeight`, `align`, `whiteSpace` and `breakLongWords`.
Run overrides support mixed font/size/color within one paragraph, not HTML or raw
PDF operators. Bold requires a real separately bound face. There is no synthetic
bold, shaping, automatic font fallback, kerning or automatic line-height guess.
Helvetica here is explicitly selected and limited to printable ASCII + LF.
For custom static glyf TrueType, prepare trusted bytes once with the optional
[Fontkit adapter](../../packages/fontkit/README.md); measure the selected face,
check glyph coverage and font embedding rights. Preparation grants no asset license.

Bind the same resources/runtime/providers to lowering or layout **and** final
rendering. A service `defaultFont` can support flow styles; it does not fill a
missing font in standalone measurement paragraphs. Do not recreate fonts per page.
Cache prepared fonts/JPEG handles across renders in the host, but never cache
document-local PDF references globally. Resource IDs live in the document; owned
handles live outside it. Fixed AST data can roundtrip through JSON; opaque prepared
handles and private measured text runs are not a persistent JSON template format.

JPEG is optional: prepare once, bind an ID and `jpegProvider()`, then place an
`xObject` box in points. To preserve aspect ratio at chosen width `w`, set
`height = w * pixelHeight / pixelWidth` from validated metadata. Metadata never
sets placement automatically. See [exact supported profile](../jpeg-images.md):
no PNG, alpha or automatic EXIF orientation correction is promised. No decoder
is loaded for the notice. Font/JPEG preparation is structural/trusted preparation,
not a hostile-input decoder sandbox; components/providers are trusted code too.

## 4. Run the proof and inspect the actual PDF

From the workspace root with Node 24+, installed checkout dependencies, qpdf and
Poppler (see [setup](../../readme.md#run-the-checkout)):

```sh
npm run typecheck
npx tsx scripts/agent-template-example.ts
qpdf --check artifacts/agents/notice.pdf
pdfinfo artifacts/agents/notice.pdf
pdftotext -layout artifacts/agents/notice.pdf -
pdftotext -bbox artifacts/agents/notice.pdf artifacts/agents/notice-bbox.html
pdffonts artifacts/agents/notice.pdf
pdftoppm -scale-to 1000 -png -singlefile artifacts/agents/notice.pdf artifacts/agents/notice
npx tsx --test tests/integration/agent-authoring.test.ts
npx tsx scripts/check-current-docs.ts
npm run format:check
npm run lint
npm test
```

The CLI only writes local ignored artifacts; generation itself performs no IO.
Expect one page and extracted `Document notice`, `NOTICE-001`, `2026-10-06`,
`Example Customer`, and `requested documents`. The integration test checks these,
page-local text bounds, repeat rendering, wrapping, unchanged frozen input and
invalid-data/overflow rejection. Inspect the PNG for spacing and clipping; byte
equality alone does not establish visual correctness. Prepared TrueType extraction
uses ToUnicode, not OCR. For tables also check repeated headers, row order, totals,
available regions and all page boundaries; for images inspect aspect and orientation.
No tagged-PDF/accessibility conformance is claimed.

## 5. Treat diagnostics as feedback, not something to suppress

Fix the reported JSONPointer path: `TYPE`/`KEY` usually mean an invalid schema;
`GEOMETRY`/`BOUNDS` mean a bad box; `FONT_RESOURCE`/`RESOURCE` indicate bindings;
`JPEG_PROFILE` indicates an unsupported image profile. Measurement can report
`TOKEN_OVERFLOW`, `VERTICAL_OVERFLOW` or `FONT_INK`. Correct explicit data,
constraints or supported options rather than hiding errors, clipping content,
waiving thresholds or falling back to removed APIs.

The example uses `profile: "service"` in measurement and rendering. Optional
page/node/text/path/resource-byte/output-byte budgets are useful defense in depth,
not comprehensive CPU/memory limits or a sandbox. Exact caps, repertoire and
parser limitations are in [native contracts](../native-api.md) and
[measurement](../measurement.md). Keep source review, extracted-content assertions,
geometry checks and visual inspection together when changing a template.
