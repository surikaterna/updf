# Develop / PDF.js showcase integration — 2026-10-03

## Delivery state and ownership

- Objective: bring **all** fetched develop changes into the measured-flow/tables
  branch and use live PDF.js canvas previews for all public showcase demos.
- Issue: N/A (ad-hoc authorized integration); status: implemented, ready for
  independent audit, not independently verified. No tracker mutation.
- Worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
- Branch: `feature/measured-flow-tables`.
- Old HEAD/base: `ac60f80675a2042f2f6043bae51b541b85e7251f`.
- New HEAD and pinned `origin/develop`:
  `777b64f462701f0e1d6efd7ff220c993f19b7e58`.
- Integration owner: Engineer, this worktree only; no nested delegation or
  edits to sibling worktrees. Existing A–F implementation belongs to the prior
  owners and is preserved; G cleanup and plasma-frame-download branch work
  remain outside scope.
- Recovery stash retained, not popped or dropped:
  `952b4a884ba492b155b62003a167f9c5f5e4e14a`, named
  `recovery: measured-flow-tables before PDF.js develop integration`.
  Its tree and third-parent tree are immutable path/blob-hash manifests of
  the original tracked and untracked content; ignored artifacts were excluded.
- Only the authorized fast-forward changed branch history. No new commits,
  push, PR, deployment/settings changes, or delivery staging. Conflict files
  were temporarily added only to clear unmerged entries, then
  `git restore --staged .` restored the index to HEAD without touching source.
  Final index is empty and there are no unmerged paths.

## Integration and preservation

The full six upstream commits were fast-forwarded, including PDF.js 6.3.289,
the separate plasma entry/worker lifecycle, bundled worker and Apache notice,
and manual Pages workflow qpdf/poppler installation. Five stash conflicts were
resolved compositionally: showcase package, main UI, root lockfile, README,
and showcase graph test. No whole-file ours/theirs replacement was used.

Blob-hash comparison against the recovery stash checks all **61 tracked dirty
files and 256 untracked files**. Exactly these 13 original paths intentionally
differ:

- `.github/workflows/pages.yml`
- `apps/showcase/index.html`, `apps/showcase/package.json`,
  `apps/showcase/src/main.ts`
- `package.json`, `package-lock.json`, `readme.md`
- `tests/showcase/graph.test.ts`, `tests/showcase/blocks.test.ts`,
  `tests/showcase/flow.test.ts`, `tests/showcase/mixed.test.ts`,
  `tests/showcase/rich.test.ts`, `tests/showcase/tables.test.ts`

The other **304 original dirty files are byte-identical**, including all core,
layout, tables, fixtures, demo generators/control readers/optional adapters,
and historical evidence (including F audit R2). Additional integration changes
are `tests/showcase/helpers.ts`, new `tests/showcase/live-demos.test.ts`, and this
document. All upstream-changed paths except the seven composed merge paths and
the test helper remain byte-identical to new HEAD, including preview/plasma
production source and their lifecycle tests. The lockfile adds upstream PDF.js
and optional canvas dependencies without replacing layout/tables workspace data.

The local preservation check was `node /tmp/opencode/pdfjs-preservation.mjs`:
61 tracked, 256 untracked, the 13 paths above changed, zero protected changes.
It compares `git ls-tree -r -z` blob IDs for the stash/third parent with
`git hash-object -- <path>` for every original dirty path, and checks upstream
paths against HEAD. The immutable recovery objects permit independent repetition.

## Behavior and risk-based tests

- All original controls, actual source displays and measurement/table summaries
  remain. Initial generation and selection are automatic; title and measured
  controls use the upstream 300 ms debounce. Manual Generate remains immediate.
- PDF.js renders every page in order. Preview and links publish together;
  pending/invalid generation retains the last successful matched PDF. Preview
  failure replaces old canvases with explicit fallback for the new PDF.
- Upstream stale-token cancellation, lazy renderer/worker loading, resize,
  pagehide cleanup and pageshow restoration remain intact. PDF.js receives
  copied bytes, preserving byte-exact generation/downloads.
- Existing local tests now assert retained canvases/one URL on edits or errors,
  and latest exact bytes after delayed imports/reset/control edits instead of
  obsolete manual-only/clear-on-edit assumptions. No lifecycle tests were removed.
  Held-module completion uses the actual import promise rather than network-idle,
  which can remain unsettled during PDF worker activity.
- New live-demo coverage checks all five measured demos without Generate clicks:
  rapid latest-title wins, Node/download byte parity, actual ink on every page,
  ordered labels, 320 px mobile resize, bounded backing dimensions/pixels,
  pagehide URL cleanup and pageshow restoration. Existing tests exercise automatic
  numeric, select and checkbox controls, table chart/SVG parity, source parity,
  qpdf/extraction, optional failures and concurrency cancellation.
- The shared raster helper counts opaque **colored or dark** marks on white paper.
  The former all-channels-near-black threshold missed legitimate blue cover text
  at mobile scale (93 near-black pixels); opaque mark and paper requirements remain.
- `test:showcase` now uses `--test-concurrency=1`: the combined suite otherwise
  launched enough Chromium instances to produce `ERR_INSUFFICIENT_RESOURCES`,
  browser crashes and unrelated failures locally. Serialization preserves all tests.
- Graph checks traverse initial static closures rather than assume a single entry
  with no shared chunks: initial PDF.js/SVG/layout/tables isolation, lazy demo
  closures, plasma isolation, licenses and both `/updf/` HTML entries are asserted.

## Validation

Commands run in the exact worktree above at new HEAD plus unstaged integration:

| Command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts` | Pass; merged lock accepted without regeneration/upgrades |
| `npm run build:showcase` | Pass; dependency builds, showcase typecheck, both Vite entries, bundled worker/notices |
| `npm run test:showcase` (final serialized script) | **46/46 pass**, none skipped/cancelled, ~76 s |
| `npm test` | **359/359 pass**, none skipped/cancelled |
| `npm run format:check` | Pass, 428 files |
| `npm run lint` | Pass, Biome (432 files) and ESLint code principles |
| `npm run typecheck` | Pass, full workspace build and root TypeScript |
| `npm run check:graphs` | Pass, all 12 existing generated browser graphs |
| `mise exec actionlint@1.7.12 -- actionlint .github/workflows/pages.yml` | Pass |
| `git diff --check` | Pass |
| `node /tmp/opencode/pdfjs-preservation.mjs` | Pass, zero protected changes |
| `git merge-base --is-ancestor origin/develop HEAD` | Pass; both refs equal pinned new HEAD |
| `git ls-files -u`; `git diff --cached --stat` | Empty; no unmerged/staged delivery |

Early runs caught test-contract mismatches, an overlong combined graph test,
a test-only mixed-default import error, and formatting issues; these were fixed.
An early serialized suite exceeded its tool timeout while old network-idle
assertions stalled; the final full suite completed normally. The unset actionlint
shim was resolved by selecting its existing version with `mise exec`, not changing
global configuration. The final formatting-only block-source helper change does
not change the passing suite's semantics.

Native/font/SVG/packed-consumer full browser matrices were not rerun: protected
source/manifests are byte-identical and prior independently verified evidence is
retained. Graph validation reuses existing generated browser graphs, while showcase
graphs were freshly built/tested. No fresh vulnerability audit was run; no claim
that the new production dependency graph has zero vulnerabilities is made.

## Code-principles self-check and next owner

All checklist items pass: correctness checks above; cohesive files below 400 lines;
functions below 50 lines and nesting within three levels (enforced by lint);
intent-only comments; proportional new/updated risk tests; lint and tests pass.
No new principle exception requested or approved. Existing historical exclusions
were not broadened. No Changesets setup exists; only private showcase/runtime
integration changed, not publishable library source.

Auditor should review the actual dirty/untracked delivery relative to the retained
recovery stash and new HEAD, focusing on conflict composition, automatic controls,
summary plus page metadata, matched last-good links/canvases, all-page PDF.js output,
lazy graph/worker cleanup and unchanged A–F hashes. Independent integration audit
and any authorized delivery remain next; this note does not supersede historical
audit evidence or claim a deployed site.
