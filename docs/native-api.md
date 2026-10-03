# Native API in the private workspace checkout

Status: unreleased `2.0.0-poc.0`; migration implemented, independent audit pending.
The [original detailed proof README](evidence/native-poc-readme.md) is retained
as historical contract/evidence context. Its old package names, command paths and
audit-status wording are not current instructions. Use root `readme.md` commands.

## Core contracts

- `@updf/core/measurement`: public readonly plain/rich measurement. Separate
  `RichTextNode`/native `<richText>` paragraph data supports font/size/RGB runs.
  Trusted components use operation-bound `context.measurement.measureText`.
  See [full semantics, caps and lifetime contract](measurement.md). Local #26
   delivery was independently verified per the #27 assignment; not released.

- `@updf/core`: `render(DocumentDefinition, options?)` and
  `renderUnknown(unknown, options?)` synchronously return binary Uint8Array bytes.
  Both validate the full schema before rendering; no caller mutation or implicit
  string coercion. `DocumentError` diagnostics use deterministic JSONPointer paths.
- Coordinates are top-left PDF points. Fixed positive dimensions and finite
  geometry must fit page bounds; new painting checks conservative ink bounds.
  Plain data descriptors/prototypes/dense arrays are required. JSON roundtrips,
  frozen input and shared nodes work; cycles/accessors/classes/unknown keys reject.
- `@updf/core/fonts`: `createPreparedFont` accepts checked prepared metadata and
  owned ordinary nonshared Uint8Array bytes. Opaque handle identity is core-owned;
  metadata/bytes are copied, program bytes remain private. This is a trusted
  preparation boundary, not a font-file sanitizer. Resources are external to AST.
- Default regular Helvetica accepts printable ASCII + LF, with no fallback,
  kerning, shaping or silent transliteration. Wrapping preserves space runs;
  overflow fails rather than clips/shrinks/pages automatically. Selected fonts
  require every glyph and support simple LTR Latin/Cyrillic/profile symbols only.
- Full static glyf TrueType programs are embedded, not subsetted. CFF, WOFF/TTC,
  variable/color fonts, combining sequences and bidi/shaping are unsupported.
- `@updf/core/painting`: native path/paint/affine types and helpers. Paths are
  move/line/cubic/close data, not arbitrary PDF operators. Independent fill/stroke
  alpha, RGB, dashes, fill rules, transforms and bounded local clips are supported.
- `@updf/core/vdom`: immutable `h`, Fragment, Component, bind, registry primitives
  and `lower`. Pure synchronous components consume deeply readonly copied props.
  Their code is trusted, not sandboxed. Lower produces a new frozen data AST.
  `group` is translation-only; `paintGroup` carries native affine/clip semantics.
- Native JSX runtimes expose only module-local JSX types and share VNode ownership.
  No React/global augmentation. Each lower/render call owns fresh budgets/context.

## Optional packages

`@updf/layout` implements bounded measured flow (#27, independently verified per
the #28 assignment, not released). `layoutFlow`/`layoutFlowUnknown` take an
explicit page template and ordered paragraph/spacer/pageBreak/fixed blocks. They
return frozen fixed core documents and source placements; serialize explicitly
with `render(result.document, options)`. `/vdom` provides the ordinary
`Flow.Document` component using the same object definition, resources and private
paginator. No second JSX runtime or arbitrary intrinsic flow grammar. Header/footer
are repeated local fixed regions; paragraphs split at internally measured complete
lines. See [full contract](../packages/layout/README.md) and [evidence](evidence/flow.md).
Root excludes tables; no general CSS layout, nested flow or page callbacks are included.
Derived flow capacities use the approved private inverse-translation/32-local-ULP
conditioning policy, not a widened measurement tolerance. Actual materialized
endpoints/region separation must fit; ill-conditioned templates reject even when
empty. See the layout README numerical contract for exact rounding-cell semantics.

`@updf/layout/tables` adds #28 explicit-width, atomic-row paged tables and mixed
prose/table flow through that same private paginator. `layoutTable`/`layoutTableUnknown`
accept `{ pageTemplate, table }`; `layoutTableFlow`/`layoutTableFlowUnknown` accept
readonly mixed `body`. `/tables/vdom` supplies ordinary `Tables.Document`, not a new
JSX grammar. One paragraph per cell, inherited actual font/size/RGB settings, scalar
padding, optional positive row minimum, solid backgrounds and a uniform inset grid.
Reports include stable table/row/page placements, consumed body rows and repeated
header count. Rows never split; impossible row/header pairs fail before copying.
See [complete model/geometry/accounting](../packages/layout/README.md#optional-paged-tables-28)
and [local evidence](evidence/tables.md). Locally implemented, not independently
verified or released. Core/root layout closures exclude table implementations.

`@updf/geometry` provides strict full-consuming SVG path grammar, arc/shape/color
helpers. `@updf/svg` supports the documented bounded svg/g/path/basic-shapes,
simple class CSS and transforms/viewports subset; `/tree` adapts to native VDOM.
Unsupported references, scripts/events, images/text/gradients/filters/masks and
group opacity other than 1 reject. XML/CSS diagnostics retain original UTF16
source spans. `compileSVG` reports the narrow quoted-none compatibility warning;
`renderSVG` rejects warnings rather than silently accepting them.

`@updf/fontkit` uses public Fontkit creation/metrics APIs (not layout/shaping).
The optional peer is required only when importing this package. The native core
does not parse fonts. Host preparation is synchronous and parser work is not a
malicious-font sandbox. Browser builds resolve Fontkit's public browser entry;
Node resolves its public Node module entry. Optional cost is measured separately.

## Current safety policy

Default core operations use `profile: "trusted"`, without arbitrary workload caps.
`profile: "service"` selects frozen `SERVICE_LIMITS`; optional `limits` override
nonnegative safe-integer depth/node/page/scalar-text/path/font-byte/output budgets.
Render, lower, measurement and optional flow/tables use the same explicit policy.
Resource maps are operation-owned; aliases charge font programs once. Geometry,
font profiles, cycles/progress, safe counters and PDF representation always validate.
No image-byte budget, public work counter or CPU sandbox is promised.

`createContext`/`useContext` in `/vdom` provide deeply readonly snapshots and scoped
providers, not async/state/effect/page hooks. Transitional measurement contexts close
on success/failure. Optional SVG/geometry/Fontkit retain separate bounded parser
policies. See the [dated foundation/blueprint](architecture/composable-layout.md)
for units, all removed/residual ceilings, context lifetime and deferred C–G APIs.

Migration added no image/layout/editor functionality or legacy modernization.
Optional bounded flow was added subsequently by #27, without changing fixed CMR.

## Subsequent Slice E authoring (implemented, not independently verified)

The current `@updf/layout` Document/Page/Flow components, readonly data constructors,
PageSize presets/custom point sizes, sealed final PageContext/FragmentContext and
reserved deferred decorations are documented in [documents.md](documents.md).
The older foundation statements above describe that dated delivery. Core's fixed
document/page grammar and bytes remain unchanged. F separate tables, G and #33
images are not claimed complete; no release, issue closure or deployment occurred.
