# @updf/core

Private, unreleased `2.0.0-poc.0`. Portable immutable declarative PDF data,
generic owned resources, native painting, VDOM and native JSX runtimes. Its only
runtime dependency is portable layout-boxes arithmetic. See repository
`docs/native-api.md` for contracts and limitations.
See [API inventory and compiled examples](API.md) for entry-point coverage,
imports, units, defaults, lifecycle and trust boundaries. Public declarations carry
JSDoc into generated types; optional sibling packages are not covered by this inventory.
No example CMR types, React, parser or filesystem APIs are part of core.
`@updf/text` exposes frozen paragraph-only rich measurements; `RichTextNode` and native
`<richText>` use typed paragraphs/runs, with font/size/RGB styles. Components receive
operation-bound `context.measurement.measureText`. See repository
`docs/measurement.md`; dated audit evidence is retained in `docs/evidence`. Private/unreleased.
`/internal` is a narrow audited shared-validator seam, not a consumer extension API.

The unpublished extraction removes `/fonts` and `/measurement`: concrete font data,
Helvetica metrics and CID/PDF font providers now belong to `@updf/fonts`.
`/resources` exposes generic owned handles, text-runtime/run contracts, typed
collection/painting slots and provider callbacks. `/pdf` exposes only the typed
writer/value primitives required by resource providers, not internal directories.
Providers intern key-free `ResourceDefinition<T>` records (own data `category`,
`phase`, `payload`, `reserve`); core returns a fresh shallow-frozen `Resource<T>`
with its document/category-local readonly `key`. Payloads remain mutable and
`reserve` receives the core record as `this`. Provider-assigned or inherited keys,
accessors and extra fields reject `RESOURCE`; no prefix option is exposed.
Names are private, assigned by first successful use, not logical binding IDs.
Text requires explicit `resources`, `text`, and rendering `providers`.
Use `createTextService({ runtime, defaultFont? })` from `@updf/text`; an omitted
layout authoring font requires its explicit `defaultFont`; native paragraphs always
specify `defaultStyle.font`. There is no implementation fallback or
default provider. Core dispatches structural text capabilities, validates and
owns their numeric output, and preserves opaque run identity. Wrapping and
intrinsic metrics belong to text; alpha and generic drawing ink remain core-owned.
See `packages/text/README.md` for usage and root build/typecheck/test gates,
or `docs/migration/fonts-text.md` for the breaking composition change.

Service, runtime, and provider callbacks are captured once and bound to their
original receiver. Provider capability records are frozen, null-prototype records
containing only the slot and validated own callbacks; mutable receiver state is
intentionally not copied or frozen. Later callback replacement does not change a
captured function. Inherited capabilities and accessor fields are never invoked.
Finite service text positions must also compose to finite native/page coordinates;
overflow rejects with `GEOMETRY` at the retained source path plus `/x` or `/y`.

`createOwnedResource(data, { byteLength? })` captures an immutable nonnegative
safe-integer byte count privately, defaulting to zero. `ownedResourceBytes(handle)`
rejects forged handles. `limits.resourceBytes` counts unique bound identities
even when unused or non-text, with the former 8 MiB service budget unchanged.

The current local foundation adds `/vdom` `createContext`/`useContext` with owned,
deeply readonly synchronous provider values. Core operations default to trusted
workloads; `profile: "service"`, frozen `SERVICE_LIMITS` and validated `limits`
offer optional budgets without weakening geometry/font/schema checks. See
`docs/architecture/composable-layout.md` for units, remaining optional parser caps
and current layout architecture. Generic `XObjectNode`/native `<xObject>` placements
use explicit named resources and point boxes; core owns normalized unit-rectangle
painting and `q`/`Q` isolation, not JPEG parsing. Install `@updf/jpeg` and its provider
only when needed; see [JPEG images](../../docs/jpeg-images.md).
No public serializer plans or page hooks are exposed.

The six native wire kinds have cohesive source owners in `src/nodes`, assembled
by separate exhaustive phase maps in `wiring.ts`; AST nodes remain plain data.
Iterative traversal, budgets and operation state stay in their drivers. See
[native node ownership](../../docs/architecture/native-nodes.md) for boundaries,
measurement retention evidence and the core-owned iterative AST-to-VDOM bridge.
Layout delegates native classification and conversion through the existing unstable
`@updf/core/internal-drawing` seam, retaining only document/page assembly rather
than a duplicated native leaf list or conversion logic.

Generic binding failures (invalid IDs or foreign handles) now use `RESOURCE`,
including font-only resource maps. Font-specific selection/run diagnostics still
use `FONT_RESOURCE`; not all error codes are unchanged.

MIT licensed; the full `LICENSE` contains the user-confirmed project attribution,
Copyright (c) 2026 Surikat AB. No npm publication or deployment is authorized.
