# Complete natural measurement — self-validated checkpoint

Worktree `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Uncommitted direct-execution work;
not an independent audit or publication approval.

## Scope and numerical contract

`natural-paint.ts` no longer invents `Math.max(1, naturalSize.height)` capacities.
It requests complete selection, verifies full source progress without page advance,
and returns a prepared whole-measurement plan. Public `measure` and adapter
`measureContent` use its actual selected heights for size reporting and authored
height ceilings. For example, natural hint 0 / actual 2 measures as 2, while hint
10 / actual 1 measures as 1 and passes a height ceiling of 1.

Selection uses one cumulative output budget across roots. Preparation and painting
use a separate shared budget so output is charged once on the live painting ledger,
not double charged for tentative selection. All selected root geometries are
prepared before any root painter runs; callers check the height ceiling before
painting. Selection callbacks necessarily run to discover actual heights, including
on a later ceiling rejection. No retry after paint, fallback selector, compatibility
path, global registry or build-mode safety switch was introduced.

Aggregate height remains a compensated `MetricSum`, now over selected heights.
Every selected height and the total must be finite and nonnegative. The authored
height ceiling retains its exact comparison. Existing native origin accumulation,
preparation, certificates, width reporting/cache identity and ink measurement are
unchanged. Metric layout size is not a promise that opaque ink has those bounds;
the existing native validation and explicit clipping rules still apply. No epsilon,
geometry shift, font remeasurement, or authored box resizing was added.

Closed/kept and Row container preparation still has natural-size inputs and its
existing explicit geometry contracts. This batch does not rederive those plans
from units or relax their rejection rules. Bounded private composition and B1
production admission integration remain unfinished. Independent review of recent
batches and both FINAL whole-system audits remain pending.

## Validation

Passed:

- `npm run format:check`
- `npm run lint`, including code-principles AST checks
- `npm run typecheck`, including the full workspace build
- `npx tsx --test packages/layout/test/natural-complete.test.ts`: 5 regressions
- `npm test`: 1,378 tests
- `npm run test:consumer`: 14 external tarball closures
- `npm run build:browser` and `npm run test:browser`: 18 tests
- `npm run check:graphs`: 12 profiles
- `npm run build:showcase` and `npm run test:showcase`: 101 tests
- `node artifacts/natural-complete/paired.mjs final`: eight ordinary fixtures,
  nine page pairs, exact documents/placements/queries/natural report/PDF bytes,
  text bounds and 72-DPI rasters. All sixteen PDFs pass qpdf.

Regressions cover over/understated and zero hints, actual height ceilings, nested
content and adapter measurement, retained-handle closure, complete request shape,
whole-measurement pre-paint failure, cumulative output limits, nonfinite totals,
empty input, explicit height/clipping and page controls. Initial formatting failures
were corrected; no runtime test failures were observed.

The recorded gates use this private disk-backed environment, without global mounts:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/natural-complete/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/natural-complete/cache" && node artifacts/natural-complete/gates.mjs consumer browserBuild browser graphs showcaseBuild showcase'
```

`root` was run separately through the same wrapper. Logs, source snapshots, paired
outputs, footprint manifests and final preservation hashes are under
`artifacts/natural-complete/`.

## Cost and limitations

| Profile | Before min / gzip | After min / gzip | Delta min / gzip |
| --- | ---: | ---: | ---: |
| Core only | 35,558 / 12,272 | 35,558 / 12,272 | 0 / 0 |
| Full layout and tables | 183,711 / 58,583 | 183,845 / 58,648 | +134 / +65 |
| Layout consumer | 163,920 / 52,405 | 164,065 / 52,437 | +145 / +32 |

Core output is byte-identical. Complete selected fragments and prepared roots are
retained until painting, rather than preparing/painting each root immediately.
Cumulative output quotas bound retained payloads; existing input and kernel work
limits also remain active. Peak heap was not separately benchmarked. This retention
buys pre-paint height and geometry validation across
the whole measurement. No code-principles exceptions or Changesets were added
(the project does not use Changesets). Hosted CI and independent audits were not run.
