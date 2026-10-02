# Native API in the private workspace checkout

Status: unreleased `2.0.0-poc.0`; migration implemented, independent audit pending.
The [original detailed proof README](evidence/native-poc-readme.md) is retained
as historical contract/evidence context. Its old package names, command paths and
audit-status wording are not current instructions. Use root `readme.md` commands.

## Core contracts

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

20 pages, 10,000 document nodes, depth 128, 4,096 characters/text node,
100,000 total text characters, 10 MiB output. Prepared font caps: 8 ids,
4 MiB/program, 8 MiB aggregate, 65,535 mappings/font. Paths: 4,096 commands/node,
100,000/document. SVG: 1 MiB source, depth 64, 10,000 elements/emitted nodes,
64 attrs/element, 1,000 class selectors, 128 transforms/list. These caps are
implementation safety policy, not PDF-format limits; configurable budgets are #25.

No image/layout/editor functionality or legacy modernization was added by migration.
