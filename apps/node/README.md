# Node examples (private/unpublished)

Build with root `npm run build`; run `node apps/node/dist/cli.js artifacts/cmr.pdf`
or `node apps/node/dist/server.js`. Text examples use application-owned
`src/text-options.ts`, binding Helvetica and pairing a text service/provider runtime.
Prepared font examples select their bound IDs; Fontkit decoding is opt-in and needs
its external peer. Core drawing calls require no font/text composition.
See [migration](../../docs/migration/fonts-text.md) and the root README for complete sources.
