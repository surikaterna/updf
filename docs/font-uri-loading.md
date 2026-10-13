# Font URI loading and showcase

Private/unreleased implementation. Optional `@updf/fontkit/load` and experimental
`@updf/fontkite/load` adapt shared
`@updf/assets` byte/URI transport to the existing static TrueType preparer. Core,
Helvetica and synchronous `prepareFont` consumers do not import the transport;
the transport imports neither core nor font parsers/image codecs. Images can reuse
the same transport without coupling fonts to image-specific registration.

See the [font loader API](../packages/fontkit/README.md#optional-uri--byte-loading)
and [transport contract](../packages/assets/README.md). No font format expansion
is included: CSS, WOFF/WOFF2, variable, CFF, collections and color/bitmap fonts
remain unsupported. Fontkit is still optional and expensive compared with the
small transport wrapper. Font programs are separate payload costs.

Both adapters validate the complete custom `AssetLoader` contract: enumerable own
callable `resolve` and `load` properties, with no getter execution. Validation does
not call `resolve`; the loader owns URI resolution. Unstructured exceptions from
the actual `load` invocation become `FONT_LOAD`, while existing loader diagnostics
and subsequent byte/font-validation errors retain their own codes.
Before invoking a loader, both adapters require a string or genuine `Uint8Array`
source, rejecting other types with `TYPE` at `/font/source`. Cross-realm byte views
and Node buffers are accepted without reading caller property overrides; valid
sources are passed unchanged. URI policy and byte transport remain loader-owned.

## Showcase

Select **Load a font URI: Google Fonts / static TrueType**. The parser and loader
are loaded lazily; the first preview uses the existing bundled OFL Liberation
Sans fixture. Enter a direct TTF URI and press **Generate PDF**. Typing the URI
does not fetch. Unsubmitted URI drafts do not participate in validation of
title/size edits. Those edits reuse the active successfully generated font, not
a pending or failed replacement URI. A submission becomes active only after
loading and PDF generation succeed; failed URI replacements are retried only by
another explicit submission. One successful URI's bytes and up to two engine-keyed
prepared handles are cached. Reset restores the bundled sample and Fontkit; failed/unsupported loads
retain the last successful PDF/source. Superseded requests are aborted and late
lazy imports cannot initiate a stale font load.

The **Font engine** selector offers Fontkit (the unchanged default) and Fontkite
(explicitly experimental). An engine change prepares the **active** font bytes,
not an unsubmitted URI draft, so both engines see the same downloaded program.
Only the requested engine's module is imported; no automatic fallback is attempted.
Previously imported modules remain cached for the page session. In particular,
opening the demo with its default engine already loads Fontkit; later selecting
Fontkite does not unload it. Initial non-font demos remain parser-free.

After a failed engine change, ordinary title/size/resize updates retain the last
successful engine even if the dropdown still contains the failed proposal. Change
the selector or explicitly submit to try a new engine/URI pair. A failed module
download may require a page reload, depending on browser module-cache behavior.
The result source arguments and summary identify the actual successful engine.
The summary reports approximate preparation time (excluding module/font download
and PDF generation) or cached prepared-handle reuse. These are local observations,
not a benchmark or a guarantee that both backends support the same font formats.

Submitting an external URI contacts that origin. Browser CORS applies; credentials
are omitted, redirects reject, and the maximum font response is 4 MiB. Use trusted,
licensed assets. A browser demo is not an unrestricted server-side fetch endpoint.

The example uses the existing Paragraph/Span layout authoring model and explicit
prepared-font bindings. It introduces no text positioning, image wrappers or new
layout contracts. Those other workstreams are intentionally outside this PR.

## Default Google Fonts sample / provenance

- Direct CDN URI: `https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxP.ttf`
- Observed 2026-10-12: **35,408 bytes**, `Roboto-Regular`, **238 glyphs**,
  declared embedding rights **installable**. Static glyf TrueType; accepted by
  the unchanged font profile. Response advertised `Access-Control-Allow-Origin: *`.
- SHA-256: `466989fd178ca6ed13641893b7003e5d6ec36e42c2a816dee71f87b775ea097f`.
- Roboto upstream [Apache-2.0 license](https://github.com/googlefonts/roboto/blob/main/LICENSE).
  This is an externally fetched example, not a redistributed font binary in the
  package or repository. Font names/program notices are retained by full embedding.
  Users remain responsible for licensing any URI they submit.
- The local fallback uses the existing `tests/fixtures/fonts/LICENSE` OFL asset;
  its notice is already emitted in the showcase. No new font assets are committed.

The versioned CDN URL is an example, not an availability/integrity guarantee.
Deterministic CI intercepts remote requests with local licensed fixtures; a
separate live smoke check records actual CDN behavior without making CI depend
on Google being reachable.

## Validation

```sh
npm run typecheck
npx tsx --test packages/assets/test/*.test.ts packages/fontkit/test/load.test.ts
npm run build:showcase
SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx --test tests/showcase/font-uri.test.ts
```

Tests exercise URI and byte preparation, cancellation, redirect/size policy,
type declarations without ambient DOM types, PDF integrity/text extraction,
actual browser source/download parity, failure recovery and lazy module graphs.
The initial standalone font work was validated on develop; those historical results
are recorded separately in [the original evidence](evidence/font-uri-loading.md).
PR #76 was then stacked on PNG PR #75 to validate their combined showcase, build
and graph contracts. After #75 merged into develop at `3225bda`, #76 was retargeted
to develop. It now includes Fontkite and the merged selector, corpus/fuzzing and
tooling-review follow-ups (#77–#80). Current loader-contract validation is recorded
in [the contract-fix evidence](evidence/font-loader-contract-fixes.md); old counts
are not claims about the current PR. No publication or deployment is implied.
