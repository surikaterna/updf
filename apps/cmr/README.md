# CMR application templates (private/unpublished)

`createCmrDocument(data)` returns pure native data. `renderCMR(document, options?)`
is an application convenience that explicitly installs Helvetica/text/provider
defaults. Those defaults do not exist in core. Unicode uses
`unicodeCmrOptions(font)` and `renderUnicodeCMR(font)` with an owned prepared font.
The prepared-only PDF does not emit unused Helvetica.

From the workspace root use `npm run build`, then
`node apps/node/dist/cli.js artifacts/cmr.pdf`. See root README for Unicode fixture
commands and [breaking migration](../../docs/migration/fonts-text.md).
