# Native API in the private workspace checkout

Status: private/unreleased `2.0.0-poc.0`. This page describes the current contract.
The [original detailed proof README](evidence/native-poc-readme.md) is retained
as historical contract/evidence context. Its old package names, command paths and
audit-status wording are not current instructions. Use root `readme.md` commands.

## Core contracts

- `@updf/text`: public readonly paragraph-only measurement with required `MeasureOptions`
  (`resources`, `measurer`, `profile`, `limits` only). `createTextMeasurer` is the
  standalone factory; rendering `text`/`providers` options are rejected, not projected.
  `createTextService` remains the full render/layout service. Separate
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
- `@updf/fonts`: `createPreparedFont` accepts checked prepared metadata and
  owned ordinary nonshared Uint8Array bytes. Opaque handle identity is core-owned;
  metadata/bytes are copied, program bytes remain private. This is a trusted
  preparation boundary, not a font-file sanitizer. Resources are external to AST.
- Explicit regular Helvetica accepts printable ASCII + LF, with no fallback,
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

`@updf/jpeg` prepares privately owned baseline JPEG bytes and supplies an explicitly
installed PDF Image XObject provider. Core's generic `xObject` leaf names a resource
and positive point box; native JSX/helpers use the same path. No image parser is
loaded by drawing/text consumers. Pixel metadata never sets placement geometry.
See [JPEG images](jpeg-images.md) for the exact supported profile, ownership,
budgets, transforms and atomic layout; PNG/alpha images remain unsupported.

`@updf/layout` exports native Document/Page/Flow/Block/Paragraph/Span/Row/Column, readonly
data constructors, layout/measure, contexts, decorations and adapters. `layout`
returns frozen fixed core documents and source placements; serialize explicitly
with `render(result.document, options)`. Core owns the sole JSX runtime and renderer.
Reserved final regions use sealed PageContext/FragmentContext. Paragraphs split at
complete measured lines. See [full contract](../packages/layout/README.md) and
[documents](documents.md). Root excludes tables and no general CSS engine is included.
Atomic side-by-side Rows and standalone vertical Columns use the shared fixed/weighted
width resolver; see [Row/Column constraints, alignment, clipping and page policy](rows.md).
Derived flow capacities use the approved private inverse-translation/32-local-ULP
conditioning policy, not a widened measurement tolerance. Actual materialized
endpoints/region separation must fit; ill-conditioned templates reject even when
empty. See the layout README numerical contract for exact rounding-cell semantics.

`@updf/tables` provides Table/table and head/body/foot/row/cell parts inside native
Flow, with an explicitly installed tableExtension. Cells use native block/inline
content. Rows never split; impossible row/header pairs fail before copying. See
[tables](tables.md). Core/root layout closures exclude table implementations.
Transitional exports are removed; see [migration](authoring-migration.md).

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
nonnegative safe-integer depth/node/page/scalar-text/path/resource-byte/output budgets.
Render, lower, measurement and optional flow/tables use the same explicit policy.
Resource maps are operation-owned; aliases charge each owned identity once, including
unused font and JPEG resources. Geometry,
font profiles, cycles/progress, safe counters and PDF representation always validate.
No separate image-byte budget, public work counter or CPU sandbox is promised.
JPEG preparation retains separate fixed 8 MiB/64M-pixel profile limits.
Invalid generic resource IDs/foreign handles now fail `RESOURCE`, even in font-only
maps; font-specific errors retain `FONT_RESOURCE` and their existing codes.

`createContext`/`useContext` in `/vdom` provide deeply readonly snapshots and scoped
providers, not async/state/effect/page hooks. Transitional measurement contexts close
on success/failure. Optional SVG/geometry/Fontkit retain separate bounded parser
policies. See the [dated foundation/blueprint](architecture/composable-layout.md)
for units, all removed/residual ceilings, context lifetime and deferred C–G APIs.

Migration added no image/layout/editor functionality or legacy modernization.
Optional bounded flow was added subsequently by #27. Rich-only migration preserves
the CMR form geometry but adopts rich line baselines and a new guarded PDF digest.

## Document authoring

For a task-oriented starting point, see the [agent documentation map](agents/README.md)
and [runnable template workflow](agents/pdf-authoring.md). These guides link current
contracts and examples rather than historical evidence or unpublished API-site URLs.

The current `@updf/layout` Document/Page/Flow components, readonly data constructors,
PageSize presets/custom point sizes, sealed final PageContext/FragmentContext and
reserved deferred decorations are documented in [documents.md](documents.md).
Core's fixed document/page grammar remains version 1; native text is canonical
`richText` paragraph data only. Former plain tags/props are rejected. Existing rich
engine bytes remain unchanged, not the former plain baseline policy. JPEG placement
does not add a layout `Image` component, release, issue closure or deployment.
