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

Only fonts used by committed text are emitted; drawing-only and prepared-only PDFs
have no synthetic Helvetica resource. Unused bindings do not allocate PDF names.
The serializer still writes the whole-document resource dictionary on every page.
Resource aliases share identity. `limits.resourceBytes` counts unique private owned
bytes, including unused bindings, not mutable public metadata or runtime callbacks.
No global registry or additional numeric quotas are introduced.

Native resource-site policy lives with the six [node owners](native-nodes.md).
The document driver traverses pages/descendants once and invokes the applicable
collection phase. Rich-text fragments retain the actual painting-site identity;
XObjects retain their measured owned handle and resource path. Groups have no
collection handler, and all pages still register before lazy painting completion.

## Core-owned names

Providers return `ResourceDefinition<T>` to `collection.intern(slot, identity, create)`:
exactly own data fields `category`, `phase`, `payload`, and `reserve`. Provider keys
are not accepted, including inherited keys; accessor fields and extra properties
reject with `RESOURCE` at `/resources`. Categories use the typed PDF name byte
domain (Latin-1, including escaped and empty names), not a format whitelist.
Core returns a fresh shallow-frozen `Resource<T>` with a readonly `key`. Payloads
are not deep-frozen, so committed CID accumulation can continue across pages.
`reserve` is called with the core record as its receiver; provider capability
callbacks separately retain their original receiver as described above.

Names are assigned on successful new interning, in initializer order followed by
page/node/text-fragment traversal and provider callback order. Reuse of a slot and
identity reuses the record/name; another slot does not deduplicate that identity.
Each document/category has its own counter: currently Font `F1…`, ExtGState `GS1…`,
XObject `X1…`, and other categories `R1…`. These are private PDF names, not user
binding IDs or a format-specific prefix guarantee. Failed definitions consume no
name. Object reservation remains provider-major within bootstrap/content phases,
independent of naming order. Logical IDs such as `logo` remain separate from owned
handle identity and PDF names. There is no provider-prefix option or key compatibility.

## Generic XObjects and optional JPEG

Core owns `XObjectNode`, `ResourceProvider.collectXObject`, `XObjectSite` and
`xObjectSlot`. A provider must claim each committed leaf through the current
collection; missing/foreign/unclaimed/conflicting bindings fail `RESOURCE` before
serialization. Keys are valid PDF names, escaped by core's writer; placement wraps
the provider's normalized unit rectangle with an explicit point-box matrix and
isolated `q`/`Q`. There is no implicit clip.

`@updf/jpeg` owns structural parsing, private copied bytes and metadata. Its provider
claims only identities in its private JPEG registry, not lookalike metadata or
generic handles forged with `createOwnedResource`. Reusable providers intern per
collection/handle; aliases and pages share one original DCT stream. Separate
preparations of equal bytes remain separate objects. Unused handles have no PDF
objects but still count toward `resourceBytes`. See [image guide](../jpeg-images.md).

Generic binding IDs/foreign handles now report `RESOURCE` at `/resources/<id>`,
including font-only callers. Font-specific diagnostics remain unchanged; this is
a documented prerelease compatibility delta, not a claim that all errors are stable.
