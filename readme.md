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
or published. The Pages showcase is an **independently audited local artifact**,
not deployed. #26–#28 remain OPEN, with uncommitted/unmerged local changes.
The prior painting/SVG proof was independently verified before
migration; its [dated historical evidence](docs/evidence/native-poc.md) is not
verification of the new package structure.

| Workspace | Responsibility / entry points |
| --- | --- |
| `@updf/layout-kernel` | Zero dependencies; allocation, atomic boxes, fragment selection and shared arithmetic; [current contract](docs/architecture/layout-kernel.md) |
| `@updf/core` | PDF bytes; depends on kernel with arithmetic-only runtime retention: `.`, `/measurement`, `/fonts`, `/painting`, `/vdom`, `/jsx-runtime`, `/jsx-dev-runtime` |
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
See [package architecture](docs/architecture/packages.md),
[native contracts](docs/native-api.md) and [legacy migration](docs/migration/legacy.md).

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
```

`typecheck` builds in explicit kernel → core → layout/tables/geometry/Fontkit → SVG → examples order,
then compiles repository tooling/tests. Legacy compilation uses its scoped old
toolchain. Native declarations use ES2022 only, no ambient DOM/Node/React or TS
path aliases. Clean tarball consumers check NodeNext and bundler resolution.

The npm monorepo uses `packages/*` for libraries, five private `apps/*`
workspaces for runnable examples, and `scripts/*` for repository automation.
Package names and public exports are unchanged; native JSX remains in the core
subpaths rather than a separate package.

`npm run format` applies Biome 2.4.13 formatting to maintained native code,
apps, scripts, tests and root configs. `npm run lint` combines Biome with the
existing TypeScript-recommended ESLint checks and the unchanged 400-line file,
49-line function and three-level nesting limits. Legacy code, historical
evidence, generated output and byte-sensitive font fixtures are intentionally
outside Biome's scope. See the [alignment evidence](docs/evidence/ghost-biome-alignment.md)
for exceptions, preservation history and acceptance results.

**Legacy failures are not hidden by native success:** `npm run test:legacy` fails
on the inherited container fixture. `npm run test:legacy:comparison` checks actual
before/after equivalence (including six full-suite failures); it does not turn
the legacy test suite green. Root `npm audit --ignore-scripts` includes inherited
vulnerable tooling and is nonzero. No legacy modernization is included here.

## Browser showcase / GitHub Pages

The private [showcase](apps/showcase) runs native text/layout, reusable TSX,
rich text/shared measurement, painting and optional on-demand flow/tables/SVG demos.
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
No Fontkit, React, arbitrary source evaluation
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
The engine does not write files or require a TS runtime after building.

```ts
import { type DocumentDefinition, render } from "@updf/core";

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
import { render } from "@updf/core";
import { type Component, lower } from "@updf/core/vdom";

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
const font = prepareFont(trustedStaticTrueTypeBytes); // ordinary Uint8Array
// Set font: 'Demo' on text nodes and pass { resources: { Demo: font } } to render.
// For TSX, pass the same resources to lower(tree, { resources }) and render.
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
`@updf/core/measurement` and operation-scoped component measurement share rendering
truth; fixed text wrapping/baselines and both CMR PDF digests remain unchanged.

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
The full [project license](LICENSE) ships in all six production package tarballs
and the showcase's `notices/LICENSE`; the earlier missing-notice blocker is resolved.
See [dated resolution evidence](docs/evidence/project-license.md). This pull request
is review-only: it does not authorize merge, npm publishing, deployment, or issue
closure. Issue states remain unchanged pending review and the remaining public API
cleanup.
Fontello MIT notices remain in geometry/legacy tarballs and the showcase, and
Liberation Sans 2.1.5 OFL/provenance stays with test assets, never production tarballs.
