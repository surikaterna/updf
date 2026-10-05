# Resource and positioned-text contracts

Core owns generic resource identity, document-local interning, page/site bindings,
reservation order, validated numeric text output, operation lifetime, and `Tf`/`Tm`/
`Tj` formatting. Public narrow contracts are `@updf/core/resources` and
`@updf/core/pdf`; implementation plans and serializer internals are not exported.

`@updf/fonts` owns prepared static TrueType storage/profile checks, Helvetica
metrics, private opaque runs, committed CID registration, and PDF font definitions.
`@updf/text` owns measurement/wrapping/line envelopes/inline text, depending only
on core contracts and kernel arithmetic. Neither core nor text imports fonts.
Fontkit is an optional adapter peer, never required transitively by native text.

Applications explicitly bind resources, a text service, and providers. The same
font runtime must produce runs and provide their painting. Omission requires an
explicit service default; core never installs Helvetica or a font provider.
See [migration and composition](../migration/fonts-text.md).

All committed pages register resources and CIDs before collection closes. Painting
completion is lazy after closure and cached once per distinct binding. Joining
owned runs retains existing text/glyphs without metric recomputation or speculative
CID allocation. Measurement never allocates PDF references. Failures return no
partial PDF. Alpha remains a core drawing provider.

Only fonts used by committed text are emitted. Helvetica retains `/F1` naming when
used; drawing-only and prepared-only PDFs have no synthetic Helvetica resource.
The serializer still writes the whole-document resource dictionary on every page.
Resource aliases share identity. `limits.resourceBytes` counts unique private owned
bytes, including unused bindings, not mutable public metadata or runtime callbacks.
No global registry, additional numeric quotas, or JPEG integration is introduced.
