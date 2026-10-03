# UPDF

A micro, portable PDF engine built around **immutable declarative data, typed
reusable templates and native TSX**, with optional feature adapters kept outside
the core runtime. Node and browsers use the same synchronous `Uint8Array` engine.
A future Kalada compiler could target this contract; there is no Kalada,
CodeMirror, editor or React dependency in the native engine.

## What is available here?

This checkout contains private, **unreleased** native packages (`2.0.0-poc.0`)
and the compatibility-preserving legacy implementation (`0.4.15`). Workspace
migration and README (#34/#35) were independently audited locally, **not released**
or published. The new Pages showcase is implemented, **not independently verified**.
The prior painting/SVG proof was independently verified before
migration; its [dated historical evidence](docs/evidence/native-poc.md) is not
verification of the new package structure.

| Workspace | Responsibility / entry points |
| --- | --- |
| `@updf/core` | Zero runtime dependencies: `.`, `/fonts`, `/painting`, `/vdom`, `/jsx-runtime`, `/jsx-dev-runtime` |
| `@updf/geometry` | Optional strict path/color/shape helpers |
| `@updf/svg` | Optional strict SVG subset; `/tree` native VDOM adapter |
| `@updf/fontkit` | Optional font preparation; requires optional peer `fontkit@^2.0.4` when imported |
| `@updf/legacy` | Version 0.4.15 behavior, `main: lib/index.js`, default CommonJS semantics and `lib` deep imports |

The narrow `/internal` seams are reserved for inventoried native validators and
the shared scanner, not public extension APIs. CMR types/templates belong to
private examples, not core. There is no umbrella or permanent POC facade.
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

`typecheck` builds in explicit core → geometry/Fontkit → SVG → examples order,
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
painting and optional on-demand SVG demos. It generates downloadable PDFs locally,
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
**not claimed live**. [Local evidence](docs/evidence/pages-showcase.md) awaits independent audit.

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

- Explicit fixed point geometry and explicit pages. No automatic pagination,
  general tables/flow layout, raster images, shaping, bidi or full SVG.
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
[docs/roadmap](docs/roadmap/README.md).

| Issue | Status in this transition |
| --- | --- |
| [#25 Configurable resource budgets](https://github.com/surikaterna/updf/issues/25) | Planned; current hard caps remain |
| [#26 Rich text and measurement contract](https://github.com/surikaterna/updf/issues/26) | Planned |
| [#27 Flow layout/page templates](https://github.com/surikaterna/updf/issues/27) | Planned |
| [#28 Paged tables](https://github.com/surikaterna/updf/issues/28) | Planned; CMR grids do not complete this |
| [#29 Markdown lists](https://github.com/surikaterna/updf/issues/29) | Planned |
| [#30 Code39](https://github.com/surikaterna/updf/issues/30) | Planned for native packages; legacy capability is separate |
| [#31 QR codes](https://github.com/surikaterna/updf/issues/31) | Planned |
| [#32 Bundle-cost regression gates](https://github.com/surikaterna/updf/issues/32) | Planned; measurements/graph checks are not completion |
| [#33 Raster images](https://github.com/surikaterna/updf/issues/33) | Planned |
| [#34 Workspace restructuring](https://github.com/surikaterna/updf/issues/34) | Locally audited; not released |
| [#35 README/examples/roadmap](https://github.com/surikaterna/updf/issues/35) | Locally audited; not released |

## Licensing and delivery

All workspaces are private; no npm publishing or deployment is authorized.
The user confirmed the project MIT attribution: **Copyright (c) 2026 Surikat AB**.
The full [project license](LICENSE) ships in all five production package tarballs
and the showcase's `notices/LICENSE`; the earlier missing-notice blocker is resolved.
See [dated resolution evidence](docs/evidence/project-license.md). Commit/push is
authorized for a separate delivery step after independent audit, not performed here.
Fontello MIT notices remain in geometry/legacy tarballs and the showcase, and
Liberation Sans 2.1.5 OFL/provenance stays with test assets, never production tarballs.
