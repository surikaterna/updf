# GitHub Pages showcase — local configuration only

The private `apps/showcase` Vite/TypeScript workspace builds a static site at
`apps/showcase/dist`. No server, React, Fontkit, font asset, code editor or source
evaluation is shipped. SVG/geometry is a dynamic chunk, loaded only when its
predefined demo is generated. Displayed snippets are raw imports of the same
example modules used by the build, not separately maintained pseudo-code.

The preview lazy-loads `pdfjs-dist` and a Vite-bundled worker from the configured
base (including `/updf/assets/`); it uses no CDN. Every explicit example page is
rendered to a responsive canvas, at up to 3× device pixel density. The TSX example
has two explicit pages. This is a preview feature, not core PDF functionality.

Titles update after a 300 ms debounce; example selection, Reset and Generate PDF
update immediately. During updates or generation errors the previous successful
PDF stays shown and linked. New pages publish together with new open/download
links. If PDF.js loading or rendering fails, old canvases are removed and the new
PDF remains available via those actions. Canvas previews have page labels but no
text layer; use the PDF itself for selection and browser accessibility features.

Superseded generation tokens suppress stale SVG/renderer imports. Active PDF.js
render/loading tasks are cancelled and documents/workers destroyed; object URLs
are revoked on replacement and pagehide. Resizing debounces a fresh preview, and
back/forward-cache restoration regenerates after pagehide cleanup.

This configuration is **implemented, not independently verified or deployed**.
The supplied Pages API lookup returned 404; that is not a live-site claim.
Expected URL after authorized activation: **https://surikaterna.github.io/updf/**.
No workflow has been run and no Pages settings have been changed.

## Local build and preview

From the worktree root, with Node 24 and installed Chromium:

```sh
npm ci --ignore-scripts
npm run build:showcase
npm run test:showcase
npm run preview -w @updf/showcase
```

Open `http://127.0.0.1:4173/updf/` (or Vite's printed port). Production and local
preview both default to `/updf/`. For a custom host path, build and preview with
the same environment, for example `SHOWCASE_BASE=/ npm run build:showcase` and
`SHOWCASE_BASE=/ npm run preview -w @updf/showcase`. Only root-relative directory
paths are accepted. Tests intentionally require the project path `/updf/`.
For local dev: `npm run dev -w @updf/showcase` after the native package build.

`build:showcase` builds only core → geometry → SVG → site, with an independent
site typecheck. It does not redefine root `build`, `test`, or legacy gates.
`test:showcase` checks actual production assets and Chromium PDFs against Node,
source synchronization, keyboard/mobile behavior, structured validation, Blob
cleanup, optional loading/failure/cancellation, roadmap links and retained notices.
Preview checks inspect visible canvas pixels on each page, high-DPI/mobile sizing,
debounced updates, stale async loads, document/worker cancellation and renderer
failure fallback; download bytes are still checked against Node generation.
It uses `/usr/bin/chromium`, or the explicit `SHOWCASE_CHROMIUM` executable override.

## Activation requires separate authorization

1. Retain the full project MIT license at `notices/LICENSE`: Copyright (c) 2026
   Surikat AB, authoritatively confirmed by the user. The earlier missing-notice
   blocker is resolved; see [resolution evidence](../evidence/project-license.md).
   Fontello notices remain included byte-for-byte because optional geometry ships
   in the browser chunk. PDF.js's Apache-2.0 license is retained at
   `notices/LICENSE.pdfjs`. License links use the configured site base.
2. Obtain independent audit before the separately authorized commit/push step.
   Npm publication, Pages activation and deployment are not authorized by that push.
   Commit and push the intended audited scope; do not commit the existing dirty
   worktree indiscriminately. This implementation makes no such Git mutations.
3. Make `.github/workflows/pages.yml` available on the repository's default branch
   through the authorized review/merge process. GitHub requires a manually
   dispatchable workflow on that branch before its Run workflow control appears.
4. In repository **Settings → Pages → Build and deployment → Source**, choose
   **GitHub Actions**. Check the `github-pages` environment's allowed deployment
   branches and approvals. Allow only the intended reviewed ref; any changes to
   settings/protections are a separate authorized action.
5. In **Actions → Showcase Pages (manual) → Run workflow**, select the reviewed
   branch/ref. Checkout uses the dispatch event's ref/SHA, not an arbitrary input
   or a second deployment checkout. Review the selected SHA before dispatch.
6. Build uses Node 24, `npm ci --ignore-scripts`, format/lint, the required native
   workspaces/site, then Chromium showcase tests. Upload contains only
   `apps/showcase/dist`. Deploy uses that exact successful build's Pages artifact,
   with `pages:write` and `id-token:write` confined to the deployment job.
7. Approve the environment if required and confirm the actual deployment URL
   and `/updf/` assets, links, downloads and mobile fallback after deployment.

The only trigger is `workflow_dispatch`; no push, PR or scheduled deployment is
configured. Concurrency serializes manual deployments without cancelling a
running one. Official checkout/setup-node/configure-pages/upload-pages-artifact/
deploy-pages actions are pinned to the resolved v6/v6/v5/v4/v4 commit SHAs.
`configure-pages` does not automatically enable Pages. A missing setup or blocked
environment fails instead of changing repository settings.

## Limits and inherited failures

This showcase is the unreleased native checkout, not legacy 0.4.15 or an
operational CMR. Geometry is fixed, Helvetica ASCII, pages explicit: no raster
images, shaping, bidi, rich-text/flow/tables or full SVG. Fonts can be prepared
through the optional adapter/resources contract but are not loaded here.
Roadmap #25–#33 remains planned; #34/#35 are locally audited, not released.

The manual workflow's scoped success does not declare the inherited legacy suite
or whole dependency audit green. Prior evidence records raw legacy failure and
45 inherited audit findings (8 moderate, 10 high, 27 critical); production-only
audit had 0 vulnerabilities. See [implementation evidence](../evidence/pages-showcase.md)
for commands actually run here and [prior evidence](../evidence/ghost-biome-alignment.md)
for the unchanged baseline. No archived roadmaps or historical evidence were edited.
