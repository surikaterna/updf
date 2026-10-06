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
export, not every field of the fonts-owned result.

Private, unreleased `2.0.0-poc.0`. Optional public Fontkit preparation of static
single-face glyf TrueType into fonts-owned PreparedFont handles. Core dependency
is exact; Fontkit ^2.0.4 is an optional peer, pinned to 2.0.4 for adapter development.
Importing this adapter requires the peer; all other native entries work without it.
No font assets, Node/Buffer or parser types are exposed in declarations.
No shaping, subsetting or malicious-font sandbox is promised.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB.
No publication is authorized. Fontkit's own distribution retains its own notices.
