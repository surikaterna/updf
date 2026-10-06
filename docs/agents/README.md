# PDF authoring for coding agents

Start here for the **private, unreleased workspace checkout**, not an npm registry
installation. This is a navigation map, not an agent policy or an AI plugin.
Read the smallest relevant contract, adapt a working template, then check the PDF.

## Why this engine fits source-driven work

- Typed declarative documents and pure TS/TSX components make geometry, content and
  resource IDs inspectable. Parameterize and diff source instead of editing binary
  PDFs. The renderer validates schemas and bounds; TypeScript alone cannot do that.
- Measurement uses the explicitly selected real font runtime before painting.
  Coordinates and sizes are PDF points, not CSS or browser-dependent layout.
  Native generation synchronously returns `Uint8Array` in Node and browsers without
  Chromium. Chromium is used by browser tests/showcase screenshot tooling, not PDF generation.
- Optional packages keep drawing-only consumers free of font parsing, JPEG parsing,
  tables and SVG. Install capabilities in the application's composition, not via a
  global plugin. See the [actual dependency graph](../architecture/packages.md).
- Reusable templates and fixed, caller-formatted data enable reproducible checks.
  Same prepared inputs can be rendered and compared; this is not a blanket promise
  about `Date`, `Intl`, platform formatting or arbitrary trusted component code.
- Structured diagnostics identify failing data paths. Text extraction, bounding
  boxes and raster inspection let agents test the result programmatically. They do
  not mean an agent automatically understands visual quality or accessibility.

## Choose one entry point

| Task | Read / reuse next |
| --- | --- |
| First typed template and validation loop | [Authoring workflow](pdf-authoring.md), [runnable notice source](../../examples/agents/notice.ts) |
| Known fixed form or coordinate drawing | [Core inventory](../../packages/core/API.md), [CMR application](../../apps/cmr/src) |
| Variable content and pagination | [Document/Flow contract](../documents.md), [Paragraph/Span](../inline.md) |
| Bounded side-by-side content | [Row/Column constraints](../rows.md) — not CSS flex parity |
| Repeated table headers / invoices | [Tables](../tables.md), [working invoice/manifest](../business-showcases.md) |
| Custom TrueType fonts | [Font composition](../migration/fonts-text.md), [Fontkit example](../../apps/node/src/optional.ts) |
| Logo / image resource | [JPEG profile and executable example](../jpeg-images.md) |
| Exact API or package ownership | [Current native contracts](../native-api.md), [package architecture](../architecture/packages.md) |

The [root checkout commands](../../readme.md#run-the-checkout) are authoritative.
Use current guides and public inventories first, not the whole historical evidence
tree. Legacy is separate and is not the recommended starting point for new native
templates. The Pages showcase is a demo, not a published generated API-reference site.
