# @updf/fontkit

## Public API inventory

The root exports only `prepareFont`, defined in `src/index.ts`; its JSDoc is
emitted with declarations. It returns `@updf/fonts`' `PreparedFont`, not a Fontkit parser
object. Install the optional Fontkit peer before importing this adapter; importing
core alone never loads it. Conditional loading can keep the parser out of paths
that do not need raw-font preparation:

```ts
import type { PreparedFont } from "@updf/fonts";
async function prepareTrustedFont(bytes: Uint8Array<ArrayBuffer>): Promise<PreparedFont> {
  const { prepareFont } = await import("@updf/fontkit");
  return prepareFont(bytes);
}
```

Use trusted, licensed static single-face glyf TrueType (at most 4 MiB). The
adapter copies input bytes, validates structural/embedding-rights metadata, and
returns a fonts-owned prepared font using core's generic handle identity, with frozen
metadata and privately copied program bytes; no close step is needed.
Embedding rights checks do not grant a license. Failures use core `DocumentError`.
TTC/WOFF/CFF, variable, color and bitmap fonts are rejected. This is fonts' simple
LTR profile: no shaping, bidi, fallback or subsetting. It is not a hostile-font
sandbox and byte limits are not CPU limits. This inventory covers the single
root export, not every field of the fonts-owned result.

## Optional URI / byte loading

`@updf/fontkit/load` exports `loadFont(source, options?)` and `LoadFontOptions`.
It uses the codec-free `@updf/assets` transport, not an image package or decoder.
It accepts either a genuine Uint8Array (including Buffer/views) or a URI string
and always returns a Promise of the same owned `PreparedFont` as `prepareFont`.
The synchronous root does not import the loading implementation.

```ts
import { createAssetLoader } from '@updf/assets';
import { loadFont } from '@updf/fontkit/load';

const loader = createAssetLoader({
  fetch: globalThis.fetch,
  allowUri: uri => new URL(uri).origin === 'https://fonts.gstatic.com',
});
const font = await loadFont(
  'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxP.ttf',
  { loader, signal },
);
const local = await loadFont(trustedTtfBytes); // no loader or network needed
```

Font loading tightens the transport limit to **4 MiB**, even if its configured
asset loader permits more. Stricter caller limits remain in force. Native fetch
requests omit credentials and reject redirects; URI policy, CORS, cancellation,
and the shared transport's bounded streaming behavior apply. See
[@updf/assets](../assets/README.md) for the full policy and server SSRF caveats.

**Use a direct static TTF file URL, not a Google Fonts CSS stylesheet URL.**
Modern Google Fonts CSS often points to WOFF2/subset/variable files, which this
profile does not support. Loading does not add CSS parsing, family/weight
selection, shaping, fallback, subsetting, or new font formats. Unsupported formats
retain `FONT_FORMAT`, with a direct-file hint. Embedding-rights/profile errors
remain authoritative; fetching a file does not grant permission to embed it.

`FONT_LOAD` reports transport/abort failures; `TYPE`, `VALUE`, `LIMIT` and existing
font diagnostics remain in use. Load and bind the font before synchronous layout,
using the usual `fontRuntime`/`fontProvider`/text-service options. Font bytes are
not stored inside JSON document data. Each load is independent; retain the handle
explicitly for reuse. Preparation is synchronous CPU work, not preemptible by an
AbortSignal or a hostile-font sandbox.

Private, unreleased `2.0.0-poc.0`. Optional public Fontkit preparation of static
single-face glyf TrueType into fonts-owned PreparedFont handles. Core dependency
is exact; Fontkit ^2.0.4 is an optional peer, pinned to 2.0.4 for adapter development.
Importing this adapter requires the peer; all other native entries work without it.
No font assets, Node/Buffer or parser types are exposed in declarations.
No shaping, subsetting or malicious-font sandbox is promised.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB.
No publication is authorized. Fontkit's own distribution retains its own notices.
