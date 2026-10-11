# Package ownership and build contract

Private npm workspace root; one authoritative active root package-lock.json.
Archived pre-migration locks are historical evidence only. No permanent POC
facade or package publication. All native versions stay `2.0.0-poc.0`; legacy
stays `0.4.15` under the checkout name `@updf/legacy`.

Dependency direction: layout-boxes has zero runtime dependencies; core →
layout-boxes (runtime retains only `/arithmetic`); geometry → core;
fonts → core; text → core + kernel arithmetic;
JPEG → core only (core's installation includes the kernel; JPEG has no direct kernel dependency);
layout → core + text + layout-boxes (native data and VDOM/TSX bindings at root);
tables → core + layout;
SVG → core + geometry; Fontkit adapter → core + fonts, with optional peer Fontkit ^2.0.4.
Exact native local dependency versions prevent registry fallback. Fontkit 2.0.4
is a pinned dev dependency exclusively of its adapter. React and its types belong
to the browser React example, not native libraries. Node require and ESM imports
share a canonical CommonJS graph via named ESM facades; the browser condition
selects independent tree-shakeable ESM. See [native packaging](../native-packaging.md)
for loader identity, declaration graphs and private direct-import limits.

Native manifests use explicit browser/import/require exports with matching types:
core root, resources, pdf, painting,
VDOM and both JSX runtimes; JPEG/fonts/text roots; layout root; tables root; geometry root;
SVG root/tree; Fontkit adapter root. Layout's removed `/vdom` and `/tables*`
exports are not compatibility aliases. Kernel exports root, numeric, arithmetic,
geometry, boxes and fragmentation; see the authoritative
[layout-boxes contract](layout-boxes.md).
There are no wildcard exports. `lib: [ES2022]`, `types: []`, strict NodeNext and
no TS paths apply to native builds. Build order is kernel → core → JPEG/fonts/text → layout/tables/geometry/Fontkit → SVG
→ CMR/node examples. Legacy uses TypeScript `allowJs` CommonJS compilation and
a bounded Node test runner; Babel/Mocha/ESLint are retired from active tooling.
Preserved historical configs and archives are inert; see
[legacy tooling retirement](../migration/legacy-tooling-retirement.md).
Maintained native code uses [Biome and TS code-principles gates](../code-quality.md).
Public API inventories: [core](../../packages/core/API.md),
[layout](../../packages/layout/API.md), [tables](../../packages/tables/API.md).

## Narrow internal seams

All six core native kinds have cohesive source owners and narrow exhaustive phase
wiring; see [native node ownership](native-nodes.md). The existing unstable
`@updf/core/internal-drawing` seam supplies `nativeNodeKinds`/`isNativeNodeKind`
metadata plus `isNativeNodeData`, `isNativeNodeDataArray` and `nativeNodeToVdom`.
Core owns classification and iterative AST-to-VDOM conversion; layout delegates
generically and assembles documents/pages without duplicating a native leaf list
or conversion logic.

For explicit optional text/font composition and the PDF resource pipeline,
see [resource providers](resource-providers.md) and [migration](../migration/fonts-text.md).

`core/internal` exports only existing shared validators/error identity:
DocumentError, fail, array, finite, number, own-data schema helpers, matrix, commands,
paint, and the existing ResolvedPaint type. Font byte/profile helpers belong to fonts. Public affine helpers
remain in core/painting. `geometry/internal` exports only numeric scanner sharing:
hasArguments, numeric, whitespace, Scanner. No algorithms are copied or generic
serializer/font-byte internals exposed as public extension mechanisms.

For #27, the inventoried `core/internal` seam additionally exports
`createLayoutOperation`, `contextLayoutOperation`, the `LayoutOperation` type and
shared arithmetic `exceeds`, `MetricSum`, `sum`. Operations snapshot owned resources and text service capabilities,
bind cumulative source measurement to lowering, validate local fixed geometry/ink,
and validate final documents without exposing bytes, glyphs or serializer plans.
Arithmetic is now owned by kernel `/arithmetic`, with core internal reexports only.
Core-owned WeakMap context identity and lifetime prevent resource replacement or
late use. Core never imports layout. Host-specific paragraph/fixed/spacer/break
producers and table adapters compose with the private PDF paginator through
reservation/paint seams; kernel selection does not create PDF pages. Root
layout imports do not pull in optional tables; data and VDOM are legitimate native
root bindings. Core never reaches layout.
Historical Auditor R1 remediation added layout `axis`/`binary64` helpers: operation-owned
inverse-translation capacity, constant-sized exact dyadic certificates and the
32-local-ULP conditioning guard. No shared measurement arithmetic/tolerance or public
export was changed at that stage. Current shared geometry certificates are owned
by kernel `/geometry`; private PDF binding checks remain host-owned.
Actual native materialized endpoints are checked separately;
layout's exact `axis.ts` internal importer joins the inventory, not a broad allowance.

Exact allowed native source importer inventory is enforced in
`scripts/boundaries.ts`: geometry arc/color/normalize/scanner/shapes; SVG
compile/declaration/index/style/transform/viewport; Fontkit
cmap/index/metadata/sfnt may use core/internal. Only SVG numbers may use
geometry/internal. A noninventoried importer fails. Tests and the private Node
prepared-font proof may inspect private built modules outside production exports
to retain prior coverage/preparation behavior; no new public validator is exposed
solely for proof tooling. JPEG uses only the public `@updf/core`,
`@updf/core/resources` and `@updf/core/pdf` error/data/resource/PDF surfaces;
`scripts/boundaries.ts` and JPEG boundary tests reject `@updf/core/internal`.
The parser is package-local and never imported by core.
PreparedFont ownership belongs to fonts; generic owned-resource/VNode ownership and
DocumentError identity belong to one installed core instance across packages.
Real tarball/runtime consumers check those seams.
Layout's exact current importer inventory is checked too; negative controls reject dependency inversion and
Node/React/SVG/geometry/Fontkit/external-runtime imports.
Table importers are individually inventoried. No generic plugin registry or broad
numeric allowance is implied. Current source inventory, not historical filenames,
is authoritative; prior K5 runtime audit evidence was caller-reported verified.

## Repository gates

Root lint/typecheck/build/native tests are separate from raw legacy tests. Browser
builds regenerate twelve targets from emitted package JS. The non-deploying
[PR validation workflow](../../.github/workflows/validate.yml) adds fresh CI gates,
including separate SVG-reference failure visibility; runner success is not yet known.
Graph checks reject source alias rescue, forbidden closures and unexpected
internal importers; negative controls test the checker. External tarball closures
cover twelve scenarios: kernel-only, drawing-only core, JPEG-only, mixed JPEG/fonts/text,
host-metrics text, fonts/text/CMR,
layout root data/VDOM, tables, geometry, SVG/tree,
Fontkit absent/present and legacy. Their
portable NodeNext/bundler type consumers have no ambient Node/DOM/React types.

Font + OFL/provenance are shared test assets. Known Fontello MIT notices stay in
geometry/legacy tarballs. The full project MIT license, Copyright (c) 2026 Surikat AB,
ships in all eleven checked package tarballs and the showcase. Original JPEG fixtures
are repository MIT artwork and do not ship in the package. The user-confirmed
[attribution resolution](../evidence/project-license.md) removes the earlier
missing-notice caveat; npm publication and deployment still need authorization.
