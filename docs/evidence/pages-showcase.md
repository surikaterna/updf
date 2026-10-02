# GitHub Pages showcase — implementation evidence

Status: **implemented, not independently verified; NOT deployed**. Integration
owner: Engineer, no nested delegation. This is new evidence, not a modification
of the independently audited migration/Ghost-Biome delivery or archived roadmaps.
Tracker changes, staging, commits, push, publishing, deployment and Pages settings
changes were not authorized and did not occur. No new issue was created.

## Delivery identity and actual scope

- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/declarative-cmr-poc`.
- Branch: `feature/declarative-cmr-poc`.
- Base and HEAD remain `7782bb3ba468a721ef7bd68fedd19b8f6c029d16`.
- Before edits, `pwd`, `git status --short`, `git rev-parse HEAD`,
  `git branch --show-current`, `git worktree list` and
  `git diff --cached --stat` confirmed the supplied worktree, prior dirty delivery
  and empty index. Baseline: **81 tracked dirty paths, 308 untracked files**.
- `/tmp/opencode/pages-preservation.mjs capture` (executed with `node`) captured
  SHA-256 records for all 389 tracked/nonignored untracked paths, including missing
  tracked files as null. Validation writes new ignored artifacts, not history:
  `artifacts/pages-before.json`, SHA-256
  `a56483b99c4f02ba443aff85a962c21f9869f4439b43cc3cc1b0a7b6afe96904`,
  and `artifacts/pages-final.json` (final live hashes and task delta).
- `node /tmp/opencode/pages-preservation.mjs check` confirms **384 prior path
  records unchanged**, including prior deletions. Only five existing live files
  changed: `package.json`, `package-lock.json`, `readme.md`, `biome.json`, and
  `tests/integration/code-quality.test.ts`. Legacy, history, roadmaps, assets,
  native packages, existing examples and license/notices retain their bytes.
- Added **21 files**: `.github/workflows/pages.yml`; 13 under `apps/showcase/`;
  `docs/deployment/github-pages.md`; this evidence; five `tests/showcase/` files.
- Final complete delivery: **81 tracked unstaged paths, 329 untracked files,
  zero staged files, zero task commits**. The existing deletions and other prior
  changes are not task-owned. This task edits three already-dirty tracked files
  and two prior untracked files, and adds the 21 files above. Review the actual
  dirty/untracked scope, not HEAD alone.
- Check commands: `git diff --stat`, `git diff --cached --stat`,
  `git ls-files --others --exclude-standard`, and `git status --porcelain=v1 -uall`
  (counted by a read-only Python subprocess command); final index is empty.

## Implemented scope and boundaries

- Private Vite/TypeScript static app, responsive and keyboard-accessible, with
  labels, skip/navigation links, source focus/scroll, live status and plain-text
  structured engine errors. No React, arbitrary JS/source evaluation, editor,
  untrusted HTML injection, network generation service or Fontkit in the site.
- Real predefined demos: native fixed text/simple layout; reusable readonly typed
  native TSX components using `lower` then `render`; native path painting, colors,
  opacity, clips and transforms; optional SVG subset via dynamic import.
- Displayed code is the exact raw source of executed modules, checked against disk
  in Chromium. A bounded title is passed as data; engine geometry/ASCII diagnostics
  remain visible. The root native API and existing build/test scripts are unchanged.
- Generated `application/pdf` Blob supports embedded preview, download and a
  separate open link. Fallback instructions remain visible regardless of embedded
  support. Edits, new generations, reset and pagehide revoke URLs. Generation
  tokens prevent a pending SVG result from reappearing after reset/change/unmount.
- `/updf/` production and preview base; safe custom root-relative directory base
  via `SHOWCASE_BASE`. Static output is `apps/showcase/dist`. Root explicit scripts:
  `build:showcase` (core → geometry → SVG → site) and `test:showcase`.
- Accurate micro/portable/immutable story and checkout-vs-legacy-vs-roadmap limits:
  explicit geometry/pages, ASCII Helvetica, no images, shaping/bidi, general flow,
  tables or full SVG. Prepared font resources/optional adapter are documented only.
  No CMR or other roadmap feature was added. All real #25–#35 links are present;
  #34/#35 are locally audited, not released, per the supplied independent review.
- Manual-only `workflow_dispatch` Pages workflow: event-selected checkout ref/SHA,
  Node 24, script-free clean install, format/lint, required workspace/site build,
  actual showcase tests, artifact upload, then same-artifact deployment. Official
  actions pinned to resolved v6/v6/v5/v4/v4 SHAs; no arbitrary ref input, push/PR
  trigger, automatic Pages enablement or deployment checkout. Build has only
  contents-read permission; Pages write/OIDC confined to deploy; serialized
  concurrency and `github-pages` environment.
- Fontello `LICENSE.svgpath` and geometry `REUSE.md` are emitted byte-for-byte into
  `dist/notices/` and linked under the base. Historical MIT/Surikat AB metadata does
  **not** resolve missing authoritative project attribution. No attribution was
  invented. Provenance remains a blocker to public distribution.

## Principles self-check / exceptions

- Correctness and unsafe boundaries checked; cohesive files, production files
  ≤400 lines, functions ≤49 lines, nesting ≤3; comments limited to directives or
  non-obvious intent. ESLint remains authoritative, with unchanged thresholds.
- Only new exception: exact `apps/showcase/vite.config.ts` entry in Biome's
  existing default-export allowlist, required by Vite's config contract. No blanket
  rule exceptions or size/depth suppressions. Existing legacy/history exclusions
  are retained as directed; these areas were not modernized or reformatted.
- Risk-based additions: seven dedicated showcase gates (five Chromium tests,
  production graph/notice test, custom-base config test). Existing quality negative
  probes now explicitly include `apps/showcase/src/`. Tests cover every demo,
  source synchronization, Node-byte equality, actual downloads, PDF MIME/header/EOF,
  asset/link bases, 11 roadmap links, initial graph isolation and later SVG loading,
  mobile viewport, keyboard, errors, safe bounded input, repeat/reset/edit/pagehide
  cleanup, failed optional import and cancellation. A CSP-blocked iframe test proves
  download/open fallback works without an embedded viewer.
- No Changesets system exists here; the added app is private and unreleased.

## Validation outcomes

All commands below ran in the exact worktree above, Node `v24.21.0`.

| Exact command | Outcome |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts` | pass; new private workspace/link, no new external dependency |
| `npm ci --ignore-scripts` | pass; 484 packages installed, inherited deprecation notices remain |
| `npx biome check --write --diagnostic-level=error apps/showcase tests/showcase package.json biome.json tests/integration/code-quality.test.ts` | scoped safe formatting; pass after fixes; no unsafe fixes |
| `npm run format:check` | pass; final 196 files, no fixes |
| `npm run lint` | pass; final Biome 199 files and ESLint size/function/depth/TS rules |
| `npm run typecheck` | pass; unchanged root builds including legacy compile, then full root typecheck |
| `npx tsc --noEmit` | pass separately after test typing fixes |
| `npm test` | pass; unchanged 91/91 tests, including preservation, PDF digests and quality negative controls |
| `npm run build:showcase` | pass; site-specific typecheck and 76-module Vite build |
| `npm run test:showcase` | pass; final 7/7, actual production `/updf/` Chromium site |
| `npm run build:browser` | pass; all existing eight bundles |
| `npm run check:graphs` | pass; all existing eight graphs |
| `npm run test:browser` | pass; existing 3/3 gates, including 11 SVG references with unchanged tolerances |
| `npm run test:consumer` | pass; five clean packed consumer closures, NodeNext/Bundler types/runtime |
| `npm run check:licenses` | pass for retained notices/assets; attribution remains unresolved |
| `qpdf --check artifacts/showcase/updf-text.pdf` | pass |
| `qpdf --check artifacts/showcase/updf-template.pdf` | pass |
| `qpdf --check artifacts/showcase/updf-painting.pdf` | pass |
| `qpdf --check artifacts/showcase/updf-svg.pdf` | pass |
| `python /tmp/opencode/validate-pages.py` | pass; PyYAML 6.0.3 BaseLoader parse and manual-trigger/pins/permissions/ref/artifact structural assertions |
| `actionlint .github/workflows/pages.yml` | initial unavailable: mise shim had no selected version; not a workflow failure |
| `mise ls actionlint` | installed 1.7.12 found; no install/global configuration change |
| `MISE_ACTIONLINT_VERSION=1.7.12 actionlint .github/workflows/pages.yml` | pass; actual Actions grammar/expression validation, command-local version selection |
| `node /tmp/opencode/pages-preservation.mjs check` | pass; only five approved prior live-file edits, all other records protected |
| `npx tsx scripts/audit-report.ts` | **known fail**, raw npm audit exit 1; still 45 inherited findings: 8 moderate / 10 high / 27 critical; new output only in artifacts |
| `npm audit --omit=dev --ignore-scripts` | pass; 0 production vulnerabilities |
| `git diff --check` | pass |

Read-only `gh api repos/actions/checkout/git/ref/tags/v6`,
`gh api repos/actions/setup-node/git/ref/tags/v6`,
`gh api repos/actions/configure-pages/git/ref/tags/v5`,
`gh api repos/actions/upload-pages-artifact/git/ref/tags/v4` and
`gh api repos/actions/deploy-pages/git/ref/tags/v4` resolved the pinned commit
objects. No workflow run or repository settings API mutation occurred.

Initial implementation checks caught a DOM `reset` ID shadowing `form.reset`,
test declaration/narrowing issues and a 50-line test function; all were fixed,
not waived. Final gates above pass on the actual dirty/untracked delivery.
Legacy tests were not rerun: no legacy bytes changed; inherited raw failure and
18 pass / 1 pending / 6 fail full-suite baseline remain in prior evidence.

## Artifacts and measurements (not regression budgets)

`wc -c apps/showcase/dist/assets/* apps/showcase/dist/index.html apps/showcase/dist/chunk-graph.json`
measured:

| Artifact | Bytes | Vite reported gzip |
| --- | ---: | ---: |
| Initial JS `assets/index-Hw4EXnBs.js` | 44,400 | 15.39 kB |
| On-demand JS `assets/optional-9K_GCVfZ.js` | 28,435 | 10.31 kB |
| CSS `assets/index-CTpS_JtL.css` | 1,415 | 0.70 kB |
| `index.html` | 6,930 | 2.67 kB |
| `chunk-graph.json` | 6,862 | 0.72 kB |

The graph records Rollup chunk modules/imports/dynamic imports. Entry has no static
chunk import and exactly one optional import. Entry contains core/VDOM, no SVG or
geometry; optional chunk contains SVG/geometry. Neither chunk contains Node,
React, Fontkit or externalized runtime modules. No font assets are emitted.
The graph is build evidence, not a completed #32 size regression policy.

Ignored `artifacts/showcase/` contains four downloaded demo PDFs, `input-proof.pdf`,
`fallback-proof.pdf`, and actual desktop/mobile screenshots. Screenshots were
inspected for responsive layout; embedded PDF viewer rendering is browser-dependent
and not inferred from screenshots. Browser tests check downloadable bytes directly.

`sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf artifacts/showcase/updf-*.pdf`
confirmed unchanged CMR contracts:
`8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`
and `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`.
Demo hashes with default title `Hello portable PDF`:

- Text: `f2db00e82e42c92f8d49bcee07bac1cbd44d1eea00091e92f7c3bc9799c05f81`
- Template: `65b0ed07fb0e1cb541233efed44aca8877a37e327b5c68d8b232fc9a9e9e6a79`
- Painting: `a0c1eda86e1723f48dc5f69f65863838aeb83d7f4fc2efe446ec324fe1ffee52`
- SVG: `3fa06172fe50d5720cd37a6ff63cb8a346843eedcd9ec38e308e7285da98be1e`

## Handoff and activation

Auditor should review the task delta against `artifacts/pages-before.json` and
the complete dirty/untracked worktree; confirm preservation, source snippets,
Blob lifecycle/cancellation, optional graphs/loading, actual PDFs and responsive
fallback, narrow Biome exception, license notices and manual workflow safety.
Implementation checks are not independent verification.

Activation is documented in [deployment instructions](../deployment/github-pages.md):
resolve attribution → independent audit → obtain commit/push/review authorization
→ make workflow available on default branch → authorized Settings/Pages Source
GitHub Actions and environment branch approvals → manually dispatch the reviewed
ref → inspect actual deployed site. Expected eventual URL is
`https://surikaterna.github.io/updf/`; it is **not claimed live**. This session stops
at implemented local configuration and makes no delivery/tracker state changes.
