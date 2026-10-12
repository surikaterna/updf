# Font URI loading — local validation, 2026-10-12

Separate worktree/branch: `trees/font-loading`, `feature/font-loading`, based
directly on develop `1e45aa935f88537217214f53bad66c6edf236951`. This slice contains
shared asset transport, the font loading entry and its showcase/tests/docs only.
It does not include the pending image, positioning, code-view or size-summary work.
No independent audit, merge, publication or deployment is claimed.

## Shared boundary

`@updf/assets` is a zero-dependency byte/HTTP(S) loader extracted from the image
transport design. The font adapter imports it from `@updf/fontkit/load`; the
synchronous Fontkit root does not. The image draft in `trees/showcase-code-views`
was separately adapted to the identical asset source (verified by `git diff
--no-index` of the `packages/assets/src` directories), removing its duplicated
fetch/stream/byte-copy implementation. Its 21 image/HTTP/browser/packed checks
passed after adaptation. Those image changes remain outside this font PR.

## Costs

`npx tsx scripts/font-load-cost.ts /home/sprawl/projects/updf/trees/restore-freight-design`
compared actual public browser ESM exports. The baseline worktree is at `25150f2`,
whose library source is the same as the develop merge base for these profiles.
Node 24.21.0, esbuild 0.28.2, ES2022, minified ESM, gzip level 9. Asset payloads,
showcase UI and PDF.js are not included. These are full consumer closures, not
additive package sizes or a runtime speed benchmark.

| Consumer | Raw bytes | Gzip bytes | Before gzip bytes |
| --- | ---: | ---: | ---: |
| Drawing | 35,701 | 12,326 | 12,326 |
| Helvetica text | 58,169 | 20,042 | 20,042 |
| Synchronous Fontkit text | 435,717 | 174,391 | 174,391 |
| Shared transport only | 5,212 | 2,086 | N/A |
| URI-loaded Fontkit text | 442,367 | 176,575 | N/A |

Font loading adds **2,184 gzip bytes (2.13 KiB)** over the existing Fontkit
consumer; transport alone is **2.04 KiB gzip**. The parser remains the dominant
optional cost. Graph checks prove no image codecs enter the font/transport paths
and no transport enters existing drawing, Helvetica or synchronous Fontkit paths.

## Executed checks

- `npm run format:check`, `npm run lint`, `npm run typecheck`: passed.
- `npm test`: **1,008 passed**, including transport, loader, packed declarations,
  ownership, cancellation, URI policy, HTTP, profile/size and real PDF checks.
- `npm run build:showcase` and
  `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase`: **78 passed**.
- `npm run test:consumer`: twelve external consumer closures passed.
- `npm run build:browser`, `npm run check:graphs`, `npm run check:licenses`: passed.
- `SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx scripts/font-uri-live.ts http://127.0.0.1:4210/updf/`:
  actual Google CDN Roboto request passed in Node and Chromium; PDF bytes matched,
  qpdf passed and Poppler extracted the loaded face name. The optional script is
  not part of deterministic CI.

Live sample: Roboto-Regular, 35,408 font bytes, 238 glyphs, installable rights;
SHA-256/provenance and Apache-2.0 link are in `docs/font-uri-loading.md`. No remote
font binary was committed. CI uses routed local OFL fixtures for deterministic
tests, including failed requests, CSS rejection, stale import cancellation, font
reuse, source/download parity and mobile reflow.

Code-principles checks passed without exceptions. No Changeset: this repository
does not use Changesets and native packages remain private/unreleased. The known
large optional Fontkit browser chunk warning remains informational. Loading does
not add CSS, WOFF/WOFF2, variable fonts, shaping or a malicious-font/SSRF sandbox.
