# UPDF

A micro, portable PDF engine built around **immutable declarative data, typed
reusable templates and native TSX**, with optional feature adapters kept outside
the core runtime. Node and browsers use the same synchronous `Uint8Array` engine.
A future Kalada compiler could target this contract; there is no Kalada,
CodeMirror, editor or React dependency in the native engine.

## What is available here?

This checkout contains private, **unreleased** native packages (`2.0.0-poc.0`)
and the compatibility-preserving legacy implementation (`0.4.15`). Workspace
migration and README (#34/#35) were independently audited and merged via
[PR #36](https://github.com/surikaterna/updf/pull/36) (`ac60f80`), **not released**
or published. The prior Pages showcase was independently audited locally;
the current modernization and SVG branding await final integrated audit and are
**not deployed**. #26–#28 remain OPEN, with uncommitted/unmerged local changes.
The prior painting/SVG proof was independently verified before
migration; its [dated historical evidence](docs/evidence/native-poc.md) is not
verification of the new package structure.

| Workspace | Responsibility / entry points |
| --- | --- |
| `@updf/layout-kernel` | Zero dependencies; allocation, atomic boxes, fragment selection and shared arithmetic; [current contract](docs/architecture/layout-kernel.md) |
| `@updf/core` | Generic PDF bytes/resources/text contracts: `.`, `/resources`, `/pdf`, `/painting`, `/vdom`, `/jsx-runtime`, `/jsx-dev-runtime`; no font implementation |
| `@updf/fonts` | Prepared fonts, explicit Helvetica, opaque text runs and paired PDF font provider |
| `@updf/text` | Text service, measurement, wrapping, line envelopes and inline text painting |
| `@updf/layout` | Native Document/Page/Flow/Block/Paragraph/Span/Row/Column, data constructors, layout/measure, contexts, decorations and adapters |
| `@updf/geometry` | Optional strict path/color/shape helpers |
| `@updf/svg` | Optional strict SVG subset; `/tree` native VDOM adapter |
| `@updf/fontkit` | Optional font preparation; requires optional peer `fontkit@^2.0.4` when imported |
| `@updf/legacy` | Version 0.4.15 behavior, `main: lib/index.js`, default CommonJS semantics and `lib` deep imports |

The narrow `/internal` seams are reserved for inventoried native validators and
the shared scanner, not public extension APIs. CMR types/templates belong to
private examples, not core. There is no umbrella or permanent POC facade.
The kernel and optional [playground](apps/layout-playground/README.md) are locally
implemented, unreleased branch work through `da0b23f`, not yet merged into `develop`.
The [authoritative current kernel contract](docs/architecture/layout-kernel.md)
consolidates ownership, API limits, evidence provenance and non-deploying PR gates;
dated A–D evidence logs are not API authority.
The [static TUI integration proof](scripts/tui-layout-proof/README.md) shows the
Formbar host-snapshot → public kernel → terminal pipeline and runnable commands;
it is not a production interactive TUI package.
See [package architecture](docs/architecture/packages.md),
[native contracts](docs/native-api.md), [fonts/text breaking migration](docs/migration/fonts-text.md)
[Node/browser packaging](docs/native-packaging.md)
and [legacy migration](docs/migration/legacy.md). Public API inventories are maintained
for [core](packages/core/API.md), [layout](packages/layout/API.md) and
[tables](packages/tables/API.md).

## Run the checkout

Requires Node 24+, npm, `/usr/bin/chromium`, qpdf and Poppler (`pdftotext`,
`pdftoppm`, `pdfinfo`, `pdffonts`). Playwright uses installed Chromium; no browser
download is required. From the repository/worktree root:

```sh
npm ci --ignore-scripts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run test:browser
npm run test:consumer
npm run check:graphs
npm run check:licenses
npm run sizes
```

`typecheck` builds in explicit kernel → core → fonts/text → layout/tables/geometry/Fontkit → SVG → examples order,
then compiles repository tooling/tests. Legacy compilation now uses TypeScript
`allowJs`, preserving CommonJS `.default` and `lib` deep imports. Native declarations
use ES2022 only, no ambient DOM/Node/React or TS path aliases. Node require and ESM
imports share one canonical CommonJS implementation; browsers retain tree-shakeable
ESM. Clean tarball consumers check both loaders, identity and type resolution.

The npm monorepo uses `packages/*` for libraries, five private `apps/*`
workspaces for runnable examples, and `scripts/*` for repository automation.
Fonts/text are separate optional packages; removed core fonts/measurement exports
have no facade. Native JSX remains in the core
subpaths rather than a separate package.

`npm run format` applies Biome 2.4.13 formatting to maintained native code,
apps, scripts, tests and root configs. `npm run lint` combines Biome lint with the
TypeScript AST code-principles checker: 400-line files, 49-line functions and
three-level nesting limits. Legacy code, historical
evidence, generated output and byte-sensitive font fixtures are intentionally
outside Biome's scope. See [current quality policy](docs/code-quality.md) for rule
mapping and exceptions; [dated alignment evidence](docs/evidence/ghost-biome-alignment.md)
preserves the prior tooling state, not the current configuration.

**Legacy failures are not hidden by native success:** `npm run test:legacy` fails
on the inherited container fixture. `npm run test:legacy:comparison` checks actual
before/after equivalence (including six full-suite failures); it does not turn
the legacy test suite green. Active Babel/ESLint/Mocha tooling has been retired in
favor of TypeScript and a bounded Node test adapter; source/test/config bytes and
historical archives remain immutable. See [retirement and exact comparison evidence](docs/migration/legacy-tooling-retirement.md).
This does not repair legacy behavior or claim a clean dependency audit.

## Browser showcase / GitHub Pages

The private [showcase](apps/showcase) runs native text/layout, reusable TSX,
rich text/shared measurement, painting and optional on-demand flow/tables/SVG demos.
Desktop inputs and PDF preview sit side by side; edits update live after a 300 ms
debounce. Narrow screens stack the workspace. A native disclosure below shows
actual TypeScript/TSX source and arguments for the committed result, not an editor.
The vector brand letterhead uses an original MIT-licensed sample SVG logo with
bounded size/palette controls, not an official corporate mark or raster Image API.
See [UX rationale and acceptance scope](docs/showcase-ux.md); these local changes
are not a WCAG conformance or deployment claim.
The focused [Row/Column](docs/rows.md) demo composes chart/SVG/paragraphs and nested
atomic rows with fixed/weighted tracks and all alignments; an oversize entry exposes
the controlled diagnostic. The separate [#46-A original mock invoice](docs/business-showcases.md)
is a runnable three-page business showcase with shared application components,
integer-cent calculations, a Node CLI and the lazy browser/mobile demo. #46-B's
original mock manifest adds 48 consignments in mixed portrait/landscape flow with
integer-gram/package totals and the same Node/browser paths. Neither example is
operational paperwork; both are unreleased application examples, not library APIs.
It generates downloadable PDFs locally,
with automatic, multi-page PDF.js canvas previews and a mobile open/download fallback.
PDF.js and its worker are lazy, locally bundled assets; SVG remains optional.
The initial entry includes no Fontkit or React; freight demos load the optional
Fontkit adapter and licensed font assets on demand. No arbitrary source evaluation
or editor is included. From the repository root:

```sh
npm run build:showcase
npm run test:showcase
npm run preview -w @updf/showcase
```

Open `http://127.0.0.1:4173/updf/`. See [Pages setup and activation](docs/deployment/github-pages.md)
for custom bases, the **manual-only** workflow, retained licenses and required
separate delivery authorization. Expected eventual URL: `https://surikaterna.github.io/updf/`;
**not claimed live**; the supplied GitHub Pages API check returned 404 (not active).
See the [dated final handoff](docs/evidence/measured-flow-handoff.md) for independent
audit outcomes; [original local evidence](docs/evidence/pages-showcase.md) is preserved as history.

The separate [Amiga-style plasma](apps/showcase/plasma.html) entry at `/updf/plasma.html`
loads its SVG → PDF → PDF.js pipeline only on Play. It targets 25 fps with a bounded
extra-frame buffer (default 10), not a guaranteed production or mobile frame rate.
See [implementation and reproducible measurements](docs/evidence/plasma-showcase.md).

## Small typed PDF

Complete source: [`apps/node/src/hello.ts`](apps/node/src/hello.ts).
The application-owned [`text-options.ts`](apps/node/src/text-options.ts) composes
an explicit Helvetica resource, text service and provider sharing one runtime.
No default font or font implementation is supplied by core.
The engine does not write files or require a TS runtime after building.

```ts
import type { DocumentDefinition } from "@updf/core";
import { render } from "./text-options.js";

const document: DocumentDefinition = {
  version: 1,
  pages: [
    {
      width: 595,
      height: 842,
      children: [
        {
          type: "text",
          x: 40,
          y: 40,
          width: 200,
          height: 24,
          text: "Hello PDF",
          fontSize: 10,
          lineHeight: 12,
          align: "left",
        },
      ],
    },
  ],
};
export const bytes: Uint8Array = render(document);
```

## Reusable native TSX

Complete source: [`apps/node/src/heading.tsx`](apps/node/src/heading.tsx).
Configure `jsx: "react-jsx"`, `jsxImportSource: "@updf/core"`, or use the pragma.
The module-local JSX namespace does not augment React or global JSX.

```tsx
/** @jsxImportSource @updf/core */

import type { Component } from "@updf/core/vdom";
import { lower, render } from "./text-options.js";

const Heading: Component<{ readonly title: string }> = ({ title }) => (
  <text x={0} y={0} width={200} height={24} fontSize={10} lineHeight={12} align="left">
    {title}
  </text>
);
const tree = (
  <document version={1}>
    <page width={595} height={842}>
      <group x={40} y={40}>
        <Heading title="Reusable native TSX" />
      </group>
    </page>
  </document>
);
export const bytes: Uint8Array = render(lower(tree));
```

Execute both built examples and check their binary results:

```sh
node --input-type=module -e "for (const name of ['hello','heading']) { const {bytes} = await import('./apps/node/dist/' + name + '.js'); if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error(name); console.log(name, bytes.length); }"
```

## Optional SVG and fonts

[`apps/node/src/optional.ts`](apps/node/src/optional.ts) executes both
adapters. SVG needs core + geometry + SVG; Fontkit needs core + the adapter and
the optional peer. Neither adapter is installed or loaded by core-only consumers.

```ts
import { renderSVG } from '@updf/svg';
const painting = renderSVG('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>',
  { x: 10, y: 10, w: 80, h: 80 });
// Insert painting into a page's children, then render the document.
```

```ts
import { prepareFont } from '@updf/fontkit';
import { fontRuntime, fontProvider } from '@updf/fonts';
import { createTextService } from '@updf/text';
const font = prepareFont(trustedStaticTrueTypeBytes); // ordinary Uint8Array
const runtime = fontRuntime();
const options = {
  resources: { Demo: font },
  text: createTextService({ runtime, defaultFont: 'Demo' }),
  providers: [fontProvider(runtime)],
};
// Set font: 'Demo' on text nodes; pass options to both lower and render.
```

Those fragments explain requirements; the linked complete optional example
supplies the licensed fixture, selected-font text and both actual render calls:

```sh
node --input-type=module -e "const {svgBytes,fontBytes} = await import('./apps/node/dist/optional.js'); console.log(svgBytes.length, fontBytes.length);"
node apps/node/dist/cli.js artifacts/cmr.pdf
node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf
node apps/node/dist/font-proof.js
node apps/node/dist/painting-proof.js
node apps/node/dist/svg-proof.js
npm run sizes
```

The CMR is a fixed upper-form demonstration, **not operational freight paperwork**
(`renderCMR(createCmrDocument(data))` from `@updf/example-cmr/cmr` opts into the
application's explicit Helvetica composition). Unicode callers can use
`renderUnicodeCMR(font)` or pass `unicodeCmrOptions(font)` to core when rendering
`createUnicodeCmrDocument(font)`; resources are never embedded in the document.
or general paged tables. `node apps/node/dist/server.js` serves a fixed
loopback GET `/cmr.pdf` on port 3001, not arbitrary request-body rendering.

## Current limits—not promises

Run the bounded mixed prose/table example (after `npm run build`) independently
of the site; this uses its actual imported source, not a README-only table engine:

```sh
node --import tsx --input-type=module -e "import {tableExample} from './apps/showcase/src/tables.tsx'; const {bytes,result}=tableExample('Inventory'); console.log(bytes.length,result.pageCount,result.placements);"
```

See [native table data and TSX](packages/tables/README.md)
for the typed table model. Layout returns an ordinary frozen core document;
serialization is always an explicit `render(result.document, options)`.

[Unified Paragraph/Span authoring](docs/inline.md) is private/unreleased.
`@updf/layout` exports meaningful readonly
content unions, `paragraph`/`span`, imported `Paragraph`/`Span`/`Block` components
and `measure(content, constraints, options)`. The same content uses core's existing
JSX runtime and native renderer; public output is frozen portable size/line/ink/
baseline/source-path data. The [actual TSX showcase](apps/showcase/src/rich.tsx)
uses a context theme and a real native inline badge. SVG remains an optional
application-owned adapter. Final contexts are documented in [documents](docs/documents.md)
and native tables in [tables](docs/tables.md). No Image API is provided.

The following #26 low-level contract is transitional and deprecated for new
authoring in this private/unreleased architecture. Renderer representations remain
available for supported adapter contracts, not as a compatibility authoring facade:

[#26 rich text and measurement](docs/measurement.md) is implemented locally,
independently verified per the #27 assignment, not released. The separate `richText` AST/native TSX
variant supports paragraph runs with actual font/size/RGB styles. Public
`@updf/text` and operation-scoped component measurement share rendering
truth with explicit composition. Fixed wrapping/baselines and ASCII CMR bytes remain
unchanged; prepared-only CMR drops unused Helvetica while retaining extraction and raster.
See [integrated extraction evidence](docs/evidence/font-package-extraction.md).

- Optional [#27 bounded flow](packages/layout/README.md) is implemented locally,
  independently verified per #28 assignment, not released. Explicit templates reserve repeated header/footer
  regions and flow complete measured paragraph lines into fixed core pages.
  Render explicitly; native data and Document/Flow TSX share one paginator.
- Optional [paged tables](packages/tables/README.md) are private/unreleased.
  Import `Table`/`table` and `tableExtension` from `@updf/tables` and install the
  adapter in the containing native Flow's local extension scope.
  Explicit-width atomic rows, repeated table headers and mixed prose reuse #27's
  paginator and native measurement. [Executed inventory example](apps/showcase/src/tables.tsx).
  [Migration](docs/authoring-migration.md) lists the removed transitional exports;
  no compatibility facade is provided. Theme is explicitly applied through context,
  not an implicit CSS cascade.
- Core retains fixed point geometry and explicit pages. No general CSS layout,
  raster images, shaping, bidi or full SVG.
- Built-in Helvetica accepts printable ASCII and LF only. Selected prepared
  fonts support the documented simple LTR Latin/Cyrillic profile; missing glyphs
  fail rather than fallback. Static single-face glyf TrueType only, full embedding.
- `renderUnknown` validates untrusted plain data; native TS types do not prove
  bounds, finite coordinates, repertoire or resource budgets. Components and font
  preparation are trusted code/data boundaries, **not a sandbox**.
- Current hard caps (20 pages, 10,000 nodes, text/font/path/output limits) are POC
  safety policy, **not PDF-standard limits**. Configurable budgets are [#25](https://github.com/surikaterna/updf/issues/25).
- No unverified size/speed guarantees. `sizes` records actual optional costs;
  it does not complete the regression-budget issue #32.

## Roadmap

All issue links below are real repository issues; planned work is not claimed as
released functionality. Original local issue bodies/index are preserved in
[docs/roadmap](docs/roadmap/README.md). See the [current status index](docs/roadmap/current.md);
the original planning records are preserved rather than rewritten as delivery evidence.

| Issue | Status in this transition |
| --- | --- |
| [#25 Configurable resource budgets](https://github.com/surikaterna/updf/issues/25) | Planned; current hard caps remain |
| [#26 Rich text and measurement contract](https://github.com/surikaterna/updf/issues/26) | Independently verified per assignment; not released |
| [#27 Flow layout/page templates](https://github.com/surikaterna/updf/issues/27) | Independently verified including R1 per assignment; not released |
| [#28 Paged tables](https://github.com/surikaterna/updf/issues/28) | Independently verified including spatial R1; not released or deployed |
| [#29 Markdown lists](https://github.com/surikaterna/updf/issues/29) | Planned |
| [#30 Code39](https://github.com/surikaterna/updf/issues/30) | Planned for native packages; legacy capability is separate |
| [#31 QR codes](https://github.com/surikaterna/updf/issues/31) | Planned |
| [#32 Bundle-cost regression gates](https://github.com/surikaterna/updf/issues/32) | Planned; measurements/graph checks are not completion |
| [#33 Raster images](https://github.com/surikaterna/updf/issues/33) | Planned |
| [#34 Workspace restructuring](https://github.com/surikaterna/updf/issues/34) | Merged via PR #36 (`ac60f80`); not released |
| [#35 README/examples/roadmap](https://github.com/surikaterna/updf/issues/35) | Merged via PR #36 (`ac60f80`); not released |

## Licensing and delivery

All workspaces are private; no npm publishing or deployment is authorized.
The user confirmed the project MIT attribution: **Copyright (c) 2026 Surikat AB**.
The full [project license](LICENSE) ships in all eight checked package tarballs
and the showcase's `notices/LICENSE`; the earlier missing-notice blocker is resolved.
See [dated resolution evidence](docs/evidence/project-license.md). This pull request
is review-only: it does not authorize merge, npm publishing, deployment, or issue
closure. Issue states remain unchanged pending review and the remaining public API
cleanup.
Fontello MIT notices remain in geometry/legacy tarballs and the showcase, and
Liberation Sans 2.1.5 OFL/provenance stays with test assets, never production tarballs.
