# Private resource and positioned-text painting seams

The resource pipeline and painting capability are private implementation contracts,
not a public plugin API or an optional fonts package.

## Current ownership

- `core/document-resources.ts` owns document-local interning, resource ownership,
  page/site bindings, reservation order, and painting completion. A painting binding
  references an owned resource of the capability's category; it is not another PDF
  resource. Rebinding the same site/slot to a different binding is rejected.
- `core/text-paint.ts` owns the typed `Font` painting capability and PDF `Tf`, `Tm`,
  and `Tj` formatting. It accepts a site, numeric position/size, and page resources,
  without prepared-font or glyph contracts. Its payload is a PDF literal or hex
  string, never a name. Content has no concrete font-provider import.
- `fonts/provider.ts` owns font usage, committed CID registration, and glyph/string
  encoding. Font resources carry no encoding accessor payload. Stable per-site
  bindings and usage state reset on provider initialization for each document.
- Alpha continues to use ordinary page resource resolution, unchanged.

All committed pages register resources and CIDs before collection closes. Painting
completion is **lazy after closure**, cached once per distinct binding across
shared sites/pages and repeated serialization. Both result and payload are frozen.
This avoids eagerly materializing every encoded run before the output-byte budget
can reject an early command. Successful painting retains its encoded payload for
the lifetime of this document resource collection; it does not allocate CIDs or
PDF references. A completion failure aborts the serialization operation, which
returns no partial PDF. There are no new quotas or implicit clips.

## Remaining extraction work (not delivered here)

Prepared fonts and glyph runs still live in core-owned plans, measurement, validation,
and VDOM. Preparation, metrics, Helvetica, CIDs, and PDF font definitions still
reside in `packages/core/src/fonts/`. Moving these responsibilities to an optional
fonts package requires a separate generic measured contract and coordinated
Fontkit/layout/host consumer migration. Layout-kernel is unchanged.

`core/default-resources.ts` and current render entry points still install concrete
font/alpha defaults. Explicit composition and future JPEG integration are separate
slices, not compatibility fallbacks added here. No public exports change.

The serializer still writes one whole-document resource dictionary on every page
and retains unconditional Helvetica `/F1` for byte compatibility. Per-page and
only-used-font policies remain future decisions. Fonts are **not optional** in
the current bundle; this seam alone makes no optional-font savings claim.
