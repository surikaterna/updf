# Browser showcase (private/unpublished)

Use root `npm run build:showcase` and `npm run test:showcase`. Application helpers
`src/text-options.ts` and `src/layout-options.ts` explicitly compose optional fonts
and text while preserving lazy layout/adapters. Fontkit loads only for opt-in
freight or when selected in the font-URI demo; Fontkite loads only when explicitly
selected in that demo. Core has no default font. See [migration](../../docs/migration/fonts-text.md)
and root README for rendering, notices, and non-deploying validation commands.
The optional [JPEG demo](../../docs/jpeg-images.md) demonstrates color/grayscale,
explicit sizing, reuse and clipping. The separate [PNG demo](../../packages/png/README.md)
adds color/grayscale alpha over white and blue, reflection, clipping and reuse of
one image/soft-mask pair. Both load their code/assets only when selected and retain
the last successful PDF/source if controls or asset loading fail. PNG compression
uses fflate; its MIT notice is emitted with the site. No arbitrary uploads are accepted.
Current source does not identify the deployed revision; Pages
publishing is deferred and requires separate authorization after the docs sweep.

## Font URI demo

Select **Load a font URI**. The first preview uses bundled Liberation Sans;
enter a direct static TTF URI and press Generate PDF to fetch it. Typing never
fetches, reset returns to the bundled sample, and cancellation/errors retain the
last successful PDF/source. The suggested Google Fonts Roboto URL is a direct
TTF, not a Google Fonts stylesheet. CSS, WOFF/WOFF2 and variable fonts reject.
See [loading, provenance and validation](../../docs/font-uri-loading.md).

The **Font engine** selector defaults to Fontkit, preserving the existing demo.
Fontkite is an explicit experimental alternative, not an automatic fallback.
Engine changes prepare the active font from the same downloaded bytes, ignoring
unsubmitted URI drafts. Only successful preparation **and PDF generation** activate
the new URI/engine pair. Failures retain the previous PDF, source and active font;
title/size/resize edits continue to use that active pair. Reset restores the bundled
sample and Fontkit. The bounded cache holds one URI's bytes and at most one prepared
handle per engine, never a failed replacement.

The summary shows the actual engine and either approximate preparation time
(excluding module download, font transport and PDF layout) or prepared-handle reuse.
Each engine has a separate lazy entry; selecting both during a session naturally
keeps both imported modules in the browser cache. Opening the font demo normally
loads the default Fontkit backend; changing to Fontkite cannot undo that download.
This is not a library-level engine registry or a change to other demos' defaults.
