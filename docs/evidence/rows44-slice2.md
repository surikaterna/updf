# #44 slice 2 — semantic authoring and visual evidence

Engineer handoff, 2026-10-04; ready for independent audit, not independently verified.
Issue #44 remains OPEN; no tracker/delivery mutations were authorized.

## Revision, ownership and manifest

- Worktree/cwd: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Clean starting base and unchanged HEAD: `e26b903e094bd5fe0cbaaa2ac37db6a0d24468a5`.
- All following edits are Engineer-owned, unstaged/untracked; no staged changes,
  commits, pushes or nested delegation. Audited slice-1 Row engine remains unchanged;
  F1 additionally fixes direct Flow hierarchy guarding in `mixed-layout.ts`.
  Actual manifest: 13 modified tracked files and 8 new files (21 total).

Modified:

```text
apps/showcase/index.html
apps/showcase/src/demos.ts
apps/showcase/src/main.ts
docs/native-api.md
docs/rows.md
packages/layout/README.md
packages/layout/src/index.ts
packages/layout/src/mixed-layout.ts
packages/layout/src/row-types.ts
readme.md
scripts/boundaries.ts
scripts/packed-consumer.ts
tests/showcase/graph.test.ts
```

Added:

```text
apps/showcase/src/optional-rows.ts
apps/showcase/src/rows.tsx
docs/evidence/rows44-slice2.md
packages/layout/src/row-vdom.ts
packages/layout/test/rows-tsx.test.ts
tests/consumer/types/rows-template.tsx
tests/integration/rows-visual.test.ts
tests/showcase/rows.test.ts
```

## Acceptance evidence

- Public semantic `Row`/`Column`, readonly `RowProps`/`ColumnProps` map directly to
  the audited identities/compiler. No new engine kinds, paginator branches or
  normalization contract changes. Row has no keepTogether option; Column inherits
  WidthTrack/default weight 1, forbidden style widths and standalone keepTogether.
- TSX tests compare exact data/semantic measurement, layout and PDF bytes for all
  four alignments and fresh-page movement. Wrappers/Fragments/providers yield
  Columns; bare text/Paragraph/native node failures identify actual source paths.
- All sibling track/inset/stretch preflight failures produce zero known-Column
  descendant calls. Captured provider/selected-page scope, operation lifetime,
  cycles and depth limits have explicit semantic regressions. Full existing
  prepared-font, deferred-emission, owned-edge, flow and table regressions pass.
- Packed public consumer checks positive runtime, readonly props/tracks and
  invalid Row policy/Column style/track/text props in NodeNext and Bundler. No
  private imports in consumers/showcase; the one new internal factory importer is
  explicitly inventoried. Seven optional-package closures remain isolated.
- Lazy showcase composes Paragraph, clipped Block, existing chart/SVG adapters and
  nested Rows without tables/manual layout X coordinates. Four alignments, fixed
  and weighted min/max tracks, gap, borders/stretch and atomic fresh-page movement
  produce five pages. Oversize selection reports VERTICAL_OVERFLOW, retains the
  previous PDF. Real Node/browser PDF bytes match; displayed source equals actual
  TSX plus imported adapter sources; accessible PDF.js preview and screenshot.
- qpdf, Poppler bbox and 144-DPI raster validate real PDF geometry, alignment,
  border strips, containment and explicit clips independently of emitted layout
  geometry. Negative pixel controls and actual wrong-alignment/missing-border/
  removed-clip PDFs are rejected by the unchanged oracle.
- Current docs cover available border-box width, trailing unused space, atomic
  errors, stretch height restrictions, explicit clips, standalone Columns and
  deliberate absence of baseline alignment. Legacy/historical evidence unchanged;
  #46 invoice/manifest is intentionally not included.

## Commands and outcomes

All commands ran in the worktree above against unchanged HEAD plus this manifest.
The passing gates below were rerun after the F1 fix; the Chrome 154 failure is
retained prior evidence, not a new run or a passing gate.

| Command | Outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS Biome and code-principles ESLint |
| `npm run typecheck` | PASS full package build and repository strict tsc |
| `npx tsx --test packages/layout/test/rows*.test.ts packages/layout/test/flow*.test.ts` | PASS 42/42, no skips |
| `npm test` | PASS 549/549, no skips |
| `npm run test:consumer` | PASS all seven tarball closures, NodeNext/Bundler including rows fixture |
| `npm run check:graphs` | PASS all 12 browser graph inventories and source seams |
| `npm run build:browser` | PASS; existing font-browser large-chunk warning only |
| `npm run build:showcase` | PASS |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase` | PASS 50/50 |
| `npx tsx --test tests/showcase/graph.test.ts` | Prior PASS 2/2; both also pass in rerun full showcase suite |
| `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:browser` | PASS 10/10, Chromium 152.0.7977.82 |
| `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | FAIL 9/10, Chrome for Testing 154.0.8037.0: known #50 signature mismatch |
| `git diff --check` | PASS |

Browser/showcase commands used a 600000ms execution timeout. Chrome's #50 failure
is exactly `inkMassDeltaRatio=0.030079044159627057` versus unchanged `<=0.03`;
interior/foreground mismatch and bbox delta are zero, compared pixels 242580.
No tolerance changes, skips or blind retries. This is the caller-specified known
#50 deferral, not a green Chrome gate or a root-cause/baseline claim. #50 remains OPEN.

Generated, ignored evidence: `artifacts/rows/{geometry,mixed,top,middle,bottom,stretch,
negative-alignment,negative-border,negative-clip}.pdf`, alignment/negative PPMs,
`artifacts/showcase/rows.pdf`, `artifacts/showcase/rows.png`,
`artifacts/installed-graphs.json` and browser SVG-reference artifacts. Fresh Chrome
failure artifacts should be retained for the separate #50 investigation.

## F1 bounded audit fix

- Direct Flow normalization now uses the existing block hierarchy guard, with
  an explicit allowance for top-level Flow.Header/Body/Footer slots. No core
  normalizer rewrite, Column deferral or callback preflight changes.
- New regressions reject a wrapped Fragment/Paragraph under Row before its
  descendant callback executes (zero calls), in measurement, direct Flow and
  Flow → Block → Row. Exact authored paths are `/content/children/expanded/children/0`,
  `/document/children/children/children/expanded/children/0` and
  `/document/children/children/children/children/expanded/children/0`, respectively.
- Valid wrapped nested Rows in header, direct body/Flow.Body and footer produce
  identical document output. Existing provider/selected-page and sibling-preflight
  regressions remain passing. Two tests added; full suite increases 547 → 549.
- Initial format check rejected two test formatting spans; corrected with focused
  edits, then format/lint/typecheck and all relevant gates passed. Browser builds
  retain only the existing font-browser large-chunk warning. Chrome 154/#50 was
  not rerun because this normalization fix does not change SVG raster thresholds.

## Code principles and next owner

Checklist: correctness and strict schemas tested; cohesive files below 400 lines;
functions below 50 lines, nesting at most three; comments explain invariants/type
negative intent only; risk-based authoring/consumer/geometry/raster/browser tests
added; lint/typecheck/Node tests pass. No new code-principles exceptions, no Changesets
setup in this project. Known Chrome gate deferral is explicitly reported above.

Auditor should review the actual unstaged and untracked manifest plus the audited
data engine, verify deferred call ordering and resource/edge ownership, inspect the
real PDFs/raster negative controls and lazy source/preview parity, and distinguish
scoped #44 readiness from the still-open #50 Chrome validation failure. Parent owns
integration, tracker disposition and any later delivery. No async checks remain.
