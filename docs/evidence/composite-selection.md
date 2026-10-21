# Row and closed-container selection — self-validated checkpoint

**Historical checkpoint, superseded:** the kernel registration of resolved frames
was removed after measured capacity and performance regressions. See
[resolved-frame fit](resolved-frame-fit.md) for the current implementation.

Worktree `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Uncommitted direct execution;
not independent audit or publication approval.

## Production scope

Four production files changed: `block-compiler.ts`, `row-compiler.ts`,
`container-producer.ts`, and `row-producer.ts`.

Rows and closed/kept containers register their resolved outer height with the
existing frame selector and shared metric operation. Their private occupied-height
fit checks are deleted. Row retains a fresh-height comparison solely to classify
kernel refusal with the existing `VERTICAL_OVERFLOW` diagnostic. No descendant
query or ancestor reservation occurs for a refused outer frame.

The compiler passes exact measured host width, including when an authored box is
narrower. Row Columns use their allocated width. Existing unit normalization,
complete-child requirements, prepared Row-height equality, authored sizing,
hidden clipping, auto alignment, budgets, painting and native certificates remain
unchanged. The height/geometry supplied by container preparation is not rederived
from child units in this batch. A small column-height helper keeps Row completion
under the function-size gate without changing its calculations or diagnostics.

There is no new production module, second metric owner, registry, flag, compatibility
overload, or alternative fit path. Seven private-constructor test fixtures were
updated to supply explicit owner/width arguments. Three new regression tests cover
shared ledger use, pre-descendant refusal, exact width identity, closure/poisoning,
complete queries and preservation of the Row diagnostic.

## Limits and remaining migration

Each Row/closed-container frame now consumes the existing finite kernel ledger,
as do its selected descendants. The 10,000-attempt default is cumulative, not per
frame. Deep or large compositions can reach it sooner than before this migration;
node/page limits do not override it. No limit was raised or waived.

Splittable-stack prefix selection, inset/gap/decorations policy, auto-margin
alignment and production B1 integration remain. Natural-size inputs still exist
in container preparation. Independent review of recent batches, both FINAL
whole-system audits and hosted CI remain outstanding.

## Validation

Passed:

- `npm run format:check`
- `npm run lint`, including AST code-principles checks
- `npm run typecheck` (full workspace build); `npx tsc --noEmit` after test updates
- `npx tsx --test packages/layout/test/composite-selection.test.ts`: 3 passed
- `npm test`: 1,389 passed
- `npm run test:consumer`: 14 external tarball closures
- `npm run build:browser` and `npm run test:browser`: 18 tests
- `npm run check:graphs`: 12 profiles
- `npm run build:showcase` and `npm run test:showcase`: 101 tests
- `node artifacts/composite-selection/paired.mjs final`: eight fixtures / nine page
  pairs retain exact documents, placements, provider queries, ordinary natural
  report, PDF bytes, text bounds and 72-DPI rasters. Sixteen PDFs pass qpdf.

Initial checks caught test formatting, a missing private-fixture argument update,
the Row completion function-size gate, and an ESM/CJS nominal type mismatch in the
new test. These were corrected without weakening gates or changing geometry.
No runtime test failures occurred in this batch. The prior batch's unreproduced
SVG-only raster failure remains recorded in its evidence; this browser run passed.

Artifacts and gate logs are under `artifacts/composite-selection/`, including
`before.json`, `before-sources.json`, `after-final.json`, `paired-final/` and the
final preservation manifest. Gates use the private disk-backed environment:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/composite-selection/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/composite-selection/cache" && node artifacts/composite-selection/gates.mjs consumer browserBuild browser graphs'
```

`root` and `showcaseBuild showcase` ran separately through the same wrapper.

## Footprint

| Profile | Before min / gzip | After min / gzip | Delta min / gzip |
| --- | ---: | ---: | ---: |
| Core only | 35,558 / 12,272 | 35,558 / 12,272 | 0 / 0 |
| Full layout and tables | 183,519 / 58,532 | 183,586 / 58,617 | +67 / +85 |
| Layout consumer | 163,739 / 52,315 | 163,806 / 52,415 | +67 / +100 |

Core output is byte-identical. Each resolved composite frame adds the kernel's
normal source/descriptor/selector and per-attempt range data. Peak heap and
throughput were not benchmarked; bundle size does not establish zero runtime cost.
Lifetimes that previously needed no metric operation now initialize the existing owner.
No code-principles exceptions were introduced. The repository does not use
Changesets. No staging, commits, PRs or deployment were performed.
