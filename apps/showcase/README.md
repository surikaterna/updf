# Browser showcase (private/unpublished)

Use root `npm run build:showcase` and `npm run test:showcase`. Application helpers
`src/text-options.ts` and `src/layout-options.ts` explicitly compose optional fonts
and text while preserving lazy layout/adapters. Fontkit loads only for opt-in
freight. Core has no default font. See [migration](../../docs/migration/fonts-text.md)
and root README for rendering, notices, and non-deploying validation commands.
The optional [JPEG demo](../../docs/jpeg-images.md) demonstrates color/grayscale,
explicit sizing, reuse and clipping. The separate [PNG demo](../../packages/png/README.md)
adds color/grayscale alpha over white and blue, reflection, clipping and reuse of
one image/soft-mask pair. Both load their code/assets only when selected and retain
the last successful PDF/source if controls or asset loading fail. PNG preparation
uses native asynchronous compression/decompression streams with no decoder dependency.
No arbitrary uploads are accepted.
Current source does not identify the deployed revision; Pages
publishing is deferred and requires separate authorization after the docs sweep.
