# Resource providers: current seam and extraction target

PR #61 introduces a **private resource-collection pipeline**, not an optional
fonts package or a finalized public extension API. `core/content.ts` still
imports `fontAt` from `../fonts/provider.js`: that is an internal directory in
`@updf/core`, not an external package. The import is transitional coupling, not
the target dependency direction.

## Ownership map

Paths below are relative to `packages/`.

| Current path / responsibility | Target owner | Slice |
| --- | --- | --- |
| `core/src/core/document-resources.ts`, `resource-types.ts`, `pdf-writer.ts`, `serialize.ts`: collection, bindings, reservations and generic PDF objects | Lean core backend; serializer/engine already have no concrete font-implementation imports (content still does) | PR #61 private seam, then lifecycle extraction |
| `core/src/fonts/`: preparation, metrics, Helvetica, encoding, CIDs and font PDF definitions | Optional fonts package | Lifecycle + painter extraction |
| `core/src/core/plan.ts`, `measurement/`, VDOM and validation: prepared fonts/glyphs and text measurement orchestration | Font-specific work in fonts; text layout and host adapters upstream of backend | Lifecycle + painter extraction |
| `core/src/core/content.ts`: positioned text commands via `fontAt` | Generic backend painting seam accepting positioned text, encoded payloads and resource handles; font-specific painting/encoding owned by provider | Painter extraction |
| `core/src/core/default-resources.ts`: installs font and alpha providers; current render entry points choose these defaults | Explicit composition outside lean backend | Defaults + JPEG migration |
| `fontkit/src/`: adapter currently depends on core font contracts | Fontkit → fonts, never fonts → Fontkit | Coordinated consumer migration |
| `layout-kernel/src/`: generic geometry/arithmetic | Kernel, unchanged; no font dependencies | No extraction work |
| `layout/src/` and current core text-layout/measurement helpers | Layout/text layout wraps, fits and orchestrates upstream using host-supplied font metrics | Host-contract migration |
| `core/src/painting/alpha.ts`: generic graphics-state resources | May stay built in as a resource consumer; no separate alpha package required | Retain resource seam |
| Future JPEG decoding/embedding and existing layout adapters | Optional JPEG consumer of resource/painting seam; adapters stay with layout | Defaults + JPEG migration |

## Three follow-ups, not delivered here

1. **Lifecycle and ownership.** Move font preparation/metrics and PDF font
   definitions to fonts while replacing font-specific plan/measurement/VDOM
   dependencies with a generic measured contract. Speculative measurement may
   reuse metrics and stable resource identity; final CID registration and PDF
   references must remain document-local and derive only from committed content.
   The current collection visits all pages before deferred font encoding, but
   prepared fonts and glyph runs still live in core-owned plans and measurements.
2. **Painter extraction.** Eliminate `fontAt` from core content generation through
   provider-owned painting/encoding payloads and the generic measured contract.
   Moving files alone does not remove that accessor dependency. The lean backend
   accepts positioned text, encoded payloads and resource handles, without
   concrete font-provider imports or measurement orchestration. These are design
   responsibilities, not decided public text types or exact API signatures.
3. **Defaults and JPEG.** Move default resource selection into explicit composition
   outside the backend, then use the seam for optional JPEG support with existing
   layout adapters. Removal acceptance includes **all** consumers: layout defaults,
   showcase, browser/Node/CMR examples, Fontkit, tests and exports. Update graph and
   consumer gates together; the backend must have no concrete font/default imports.
   Breaking changes are embraced: no permanent compatibility fallback or dead
   default path is required. Current built-in defaults are transitional.

The current serializer deliberately writes one whole-document resource dictionary
on every page and retains unconditional Helvetica `/F1` for byte-compatible
staging. Only-used-font and per-page dictionaries are future output-policy
decisions, not delivered optimizations. Fonts are **not** optional in the current
core bundle. The caller's `b70f8f5` baseline measured **+749 gzip bytes**; this
clarification makes no new bundle measurement or future savings claim.
