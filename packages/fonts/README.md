# @updf/fonts (private/unpublished)

Owns prepared static TrueType metadata, immutable private program storage, profile
checks, Helvetica metrics, opaque measured text runs, and CID/PDF font resources.
No parser dependency: optional parsing belongs to `@updf/fontkit`.

```ts
import { render } from "@updf/core";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { createTextService } from "@updf/text";

const runtime = fontRuntime();
const options = {
  resources: { Helvetica: createHelvetica() },
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  providers: [fontProvider(runtime)],
};
// render(document, options)
```

For TrueType use `createPreparedFont(input)` or `prepareFont(bytes)` from
`@updf/fontkit`, bind the resulting handle under the selected text resource id,
and use the same explicit runtime/provider pairing. Prepared-only documents do
not synthesize Helvetica. Explicit Helvetica retains bootstrap F1 naming for
byte compatibility, but only emits when committed text uses it. Other fonts are
allocated on committed text traversal. Aliases share identity; unused fonts are
not embedded.

`fontRuntime()` instances own runs privately. `measure` returns numeric metrics
and a frozen opaque token. `joinRuns` requires a nonempty ordered sequence from
the same runtime, resource, size, and mode. It concatenates existing text/glyphs
without profiling, metric recomputation, or CID allocation. The provider collects
all pages before lazily encoding a cached painting binding at each actual line
or fragment identity. Measurement never owns PDF references.

Core owns only generic resource handles and text service contracts, exposed by
`@updf/core/resources`; its narrow typed PDF primitives are `@updf/core/pdf`.
Resource metadata is snapshotted/frozen; private bytes are never exposed.
Other generic resource kinds may coexist in the binding map. Text selection
validates font ownership separately, with structured `FONT_RESOURCE` diagnostics
for missing services, resources, providers, or foreign runs. Omitted font requires
the text service's explicit `defaultFont` in addition to a resource binding.
Private font program bytes are counted by core's owned-resource registry, not
a `TextRuntime` accounting capability; Helvetica counts zero.

`@updf/core/fonts` is removed without a facade. Wrapping belongs to `@updf/text`.
Use root `npm run build`, `npm run typecheck`, `npm test`, and
`npm run test:consumer`. See the [breaking migration guide](../../docs/migration/fonts-text.md).
Historical evidence describes earlier revisions, not the current installation contract.
