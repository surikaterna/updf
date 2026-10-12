# Browser showcase (private/unpublished)

Use root `npm run build:showcase` and `npm run test:showcase`. Application helpers
`src/text-options.ts` and `src/layout-options.ts` explicitly compose optional fonts
and text while preserving lazy layout/adapters. Fontkit loads only for opt-in
freight or the font-URI demo. Core has no default font. See [migration](../../docs/migration/fonts-text.md)
and root README for rendering, notices, and non-deploying validation commands.
JPEG library support has a separate [Node example](../../docs/jpeg-images.md), not a
new showcase demo. Current source does not identify the deployed revision; Pages
publishing is deferred and requires separate authorization after the docs sweep.

## Font URI demo

Select **Load a font URI**. The first preview uses bundled Liberation Sans;
enter a direct static TTF URI and press Generate PDF to fetch it. Typing never
fetches, reset returns to the bundled sample, and cancellation/errors retain the
last successful PDF/source. The suggested Google Fonts Roboto URL is a direct
TTF, not a Google Fonts stylesheet. CSS, WOFF/WOFF2 and variable fonts reject.
See [loading, provenance and validation](../../docs/font-uri-loading.md).
