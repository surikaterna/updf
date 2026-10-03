# Package ownership and build contract

Private npm workspace root; one authoritative active root package-lock.json.
Archived pre-migration locks are historical evidence only. No permanent POC
facade or package publication. All native versions stay `2.0.0-poc.0`; legacy
stays `0.4.15` under the checkout name `@updf/legacy`.

Dependency direction: core has zero runtime dependencies; geometry → core;
layout → core (root flow/types and `/vdom`, optional `/tables` and `/tables/vdom`);
SVG → core + geometry; Fontkit adapter → core, with optional peer Fontkit ^2.0.4.
Exact native local dependency versions prevent registry fallback. Fontkit 2.0.4
is a pinned dev dependency exclusively of its adapter. React and its types belong
to the browser React example, not native libraries. No new CommonJS native output.

Native manifests pair explicit `types`/`import` exports: core root, fonts, painting,
VDOM, measurement and both JSX runtimes; layout root/vdom/tables/tables-vdom; geometry root; SVG root/tree; Fontkit adapter root.
There are no wildcard exports. `lib: [ES2022]`, `types: []`, strict NodeNext and
no TS paths apply to native builds. Build order is core → layout/geometry/Fontkit → SVG
→ CMR/node examples. Babel 6/Mocha 2/ESLint 2 remain scoped to legacy.

## Narrow internal seams

`core/internal` exports only existing shared validators/error identity:
DocumentError, fail, array, finite, number, record, matrix, commands, paint,
byteLength, scalar, and the existing ResolvedPaint type. Public affine helpers
remain in core/painting. `geometry/internal` exports only numeric scanner sharing:
hasArguments, numeric, whitespace, Scanner. No algorithms are copied or generic
serializer/font-byte internals exposed as public extension mechanisms.

For #27, the inventoried `core/internal` seam additionally exports
`createLayoutOperation`, `contextLayoutOperation`, the `LayoutOperation` type and
rich-only arithmetic `exceeds`, `MetricSum`, `sum`. Operations snapshot owned fonts,
bind cumulative source measurement to lowering, validate local fixed geometry/ink,
and validate final documents without exposing bytes, glyphs or serializer plans.
Core-owned WeakMap context identity and lifetime prevent resource replacement or
late use. Core never imports layout. The private layout paginator has builtin
paragraph/fixed/spacer/break producers, no public registry. #28 tables compose with
that same private paginator through an atomic-output reservation/paint seam. Root
layout data imports never reach tables or VDOM; core never reaches layout.
Auditor R1 remediation adds private layout `axis`/`binary64` helpers: operation-owned
inverse-translation capacity, constant-sized exact dyadic certificates and the
32-local-ULP conditioning guard. No shared measurement arithmetic/tolerance or public
export was changed. Actual native materialized endpoints are checked separately;
layout's exact `axis.ts` internal importer joins the inventory, not a broad allowance.

Exact allowed native source importer inventory is enforced in
`scripts/boundaries.ts`: geometry arc/color/normalize/scanner/shapes; SVG
compile/declaration/index/style/transform/viewport; Fontkit
cmap/index/metadata/sfnt may use core/internal. Only SVG numbers may use
geometry/internal. A noninventoried importer fails. Tests and the private Node
prepared-font proof may inspect private built modules outside production exports
to retain prior coverage/preparation behavior; no new public validator is exposed
solely for proof tooling.
PreparedFont/VNode ownership and DocumentError identity belong to one installed
core instance across packages; real tarball/runtime consumers check those seams.
Layout's exact index/vdom/layout/template/blocks/data/budget/paginator importer
inventory is checked too; negative controls reject dependency inversion and
Node/React/SVG/geometry/Fontkit/external-runtime imports.
Table index/vdom/layout/validate/measure/producer/paint/ink importers are individually
inventoried. No new core/internal exports, plugin registry or numeric allowance.

## Repository gates

Root lint/typecheck/build/native tests are separate from raw legacy tests. Browser
builds regenerate eleven targets from emitted package JS before six Chromium
gates. Graph checks reject source alias rescue, forbidden closures and unexpected
internal importers; negative controls test the checker. External tarball closures
cover core-only, layout/vdom/tables, geometry, SVG/tree, Fontkit absent/present and legacy. Their
portable NodeNext/bundler type consumers have no ambient Node/DOM/React types.

Font + OFL/provenance are shared test assets. Known Fontello MIT notices stay in
geometry/legacy tarballs. The full project MIT license, Copyright (c) 2026 Surikat AB,
ships in all six production tarballs and the showcase. The user-confirmed
[attribution resolution](../evidence/project-license.md) removes the earlier
missing-notice caveat; npm publication and deployment still need authorization.
