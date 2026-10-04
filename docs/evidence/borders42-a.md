# #42-A implementation handoff

Objective: reusable typed edge-border policy and Blocks only, on the canonical
#49 style surface. Table cell/shared-edge integration remains #42-B.

Worktree: `/home/sprawl/projects/updf/trees/authoring-api`; branch
`feature/authoring-api`; clean starting base and unchanged HEAD
`60450d47d5a535a0f56d8ad3a7e1309ca589af9c`. Engineer owns this slice's unstaged
and untracked changes; no staging, commits, push, tracker mutations or delegation.
Issue #42 remains OPEN. Implementation evidence is not independent verification.

## Delivery

- `packages/layout/src/borders.ts`: exported typed edges/policy, strict path-aware
  validation, explicit null, shorthand expansion and ordered border-only layers.
- `border-rectangles.ts`, sizing, container producer/painting/budget: resolved
  per-edge insets, inside-only strips, mixed-edge hidden clips, first/last
  horizontal edges and repeated side edges. Existing fragment allocations remain.
- Public types/index and the clean NodeNext/Bundler consumer style template.
- New policy/geometry tests and actual Poppler PDF raster tests, including missing
  coverage and actual out-of-box PDF-ink negative controls. Existing box rejection
  test now rejects malformed border color rather than a newly supported edge.
- `scripts/boundaries.ts`: inventories only the new border validator importer of
  the existing core internal seam; no new core exports or weakened graph checks.
- `docs/text-styles.md` and `docs/blocks.md`: defaults, composition, corner ownership,
  stroke placement, padding/clip and fragment reservations/painting documented.

No table drawing/refactor, Span background, flex, legacy or showcase source changes.
No Changeset: repository does not use Changesets. Table conflict resolution is
documented as **planned**, not implemented: explicit edge over grid fallback,
greater width wins, stable top/left owner on ties, draw shared edge once.

## Validation

Run in the worktree above on Node v24.21.0:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass Biome error gate and ESLint code-principles gate |
| `npm run typecheck` | Pass full package build and root `tsc --noEmit` |
| `npm test` | Pass 414/414; zero skips; includes fixed CMR byte/raster and callback/resource contracts |
| `npm run test:consumer` | Pass seven clean tarball closures; NodeNext/Bundler declarations and runtime ownership |
| `npm run build:browser` | Pass all twelve builds; existing font-browser large-chunk warning |
| `npm run check:graphs` | Pass all twelve graphs and source seam inventories |
| `npm run build:showcase` | Pass |
| `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase` | Pass 49/49; zero skips |
| `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | 9/10 pass; deferred #50 SVG signature failure only |
| `git diff --check` | Pass |

The browser failure remains at `tests/svg-reference/browser.test.ts:131`:
signature ink-mass delta ratio `0.030079044159627057`; other reported signature
metrics are zero. User explicitly deferred #50; no skip, tolerance or fixture change.

Final focused Block gate passed 33/33, zero skips:

```sh
npx tsx --test packages/layout/test/borders.test.ts packages/layout/test/box-style.test.ts packages/layout/test/containers.test.ts tests/integration/block-borders.test.ts tests/integration/block-background.test.ts tests/integration/block-clipping.test.ts tests/integration/blocks.test.ts
```

The first graph run correctly rejected the new validator's uninventoried importer;
adding that single importer made the gate pass. Early test fixture/type construction
errors were corrected with semantic `h(Block, ...)`, not API compatibility changes.

## Consumer cost evidence

`npx tsx scripts/style-consumer-cost.ts before` and `after`, identical dynamic inputs,
Node v24.21.0 / esbuild 0.28.2, minified bundled browser ESM, ES2022. Raw metafiles,
retained input names and reports are ignored artifacts under `artifacts/style49/`.
These are consumer closures, not additive package costs or CPU/heap measurements.

| Scope | Before raw/gzip B; retained | After raw/gzip B; retained | Delta |
| --- | --- | --- | --- |
| Named text-only dynamic renderer | 39,498 / 13,973; 38 | 39,498 / 13,973; 38 | 0 |
| Document → Flow → Paragraph | 124,864 / 40,852; 110 | 126,065 / 41,246; 112 | +1,201 raw / +394 gzip / +2 modules |

Only `borders.ts` and `border-rectangles.ts` are newly retained in paragraph flow,
whose dynamic block union already retains container painting. No React, selector,
Fontkit, PDF.js, SVG or table closure leaks into either consumer scope.

## Self-check and next owner

Universal checklist satisfied: correctness/strict unsafe-data rejection exercised;
cohesive production files below 400 lines, functions below 50, nesting within three
levels (ESLint passes); comments explain policy/invariants; risk-proportional tests;
format/lint/typecheck/native tests pass. No new code-principles exceptions.
The only approved validation exception is deferred #50 above.

Auditor should independently review the full unstaged **and untracked** delivery,
especially layer omission/null semantics, authored diagnostic paths, asymmetric
corner/clip geometry, first/last fragment edges and preserved cloned allocations.
Ancestor preflight conservatively reserves specified border decorations before
last-fragment knowledge; painting counts actual fragment edges. Independent audit
and #42-B are remaining work; no delivery or issue disposition is authorized here.
