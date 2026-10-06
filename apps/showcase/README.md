# Browser showcase (private/unpublished)

Use root `npm run build:showcase` and `npm run test:showcase`. Application helpers
`src/text-options.ts` and `src/layout-options.ts` explicitly compose optional fonts
and text while preserving lazy layout/adapters. Fontkit loads only for opt-in
freight. Core has no default font. See [migration](../../docs/migration/fonts-text.md)
and root README for rendering, notices, and non-deploying validation commands.
JPEG library support has a separate [Node example](../../docs/jpeg-images.md), not a
new showcase demo. Current source does not identify the deployed revision; Pages
publishing is deferred and requires separate authorization after the docs sweep.
