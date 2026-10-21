# Resolved-frame fit: measured simplification

Worktree `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Uncommitted, self-validated work;
not an independent audit or publication approval.

## Decision and implementation

The old/lean/current comparison exposed an unnecessary cost: already-resolved
fixed, spacer, Row and closed-container heights had been turned into registered
kernel sources. This introduced descriptors, selector closures, range allocations
and a shared 10,000-attempt ceiling even where no source enumeration was needed.

Those registrations and their compiler/test plumbing are removed. All four frame
forms call `frameFits` in the existing `selection-request.ts`. It checks the initial
atomic offset and bounded capacity using the existing ordered `sum`/`exceeds`
operations; complete selection bypasses only capacity. Resolved dimensions come
from the existing validated preparation paths. No tolerance or authored geometry
was changed. This is a private capacity predicate, not a native certificate.

No new production file, registry, operation, compatibility alias or safety flag was
added. The normal arithmetic helper can still allocate temporaries; the removed
allocations are source/descriptor/selector/range machinery, not every allocation.
Paragraph and adapter unit selection still use their finite kernel ledgers. Public
input/output/page budgets and real source lifecycle/width/cache guards remain.
Synthetic private-frame kernel width/poison/closure contracts are intentionally
removed with the registration experiment; authored width constraints and the exact
widths of measured descendants remain validated and tested.

Retained: complete natural measurement, actual-height reporting, prepared line
reports, the positive-content/zero-height rejection, pre-paint geometry validation,
native certificates, and accepted-coordinate publication. The public kernel
candidate API and unrelated work are unchanged. B1 host scaffolding remains
unwired and is not automatically a future integration requirement.

## Capacity and behavior

New permanent regressions verify that 11,000 simple fixed blocks produce 11 pages
and 5,100 kept blocks produce six pages. The registered-frame checkpoint fails both
with `/work/attempts` LIMIT. An explicit ten-page limit still rejects the eleven-page
case. Other tests retain pre-descendant refusal, ancestor reservation ordering,
Row fresh-region diagnostics, complete and exhausted queries, zero heights,
fractional metric fit, authored-width rejection and real provider-handle closure.

Against committed `b70da49`, nine ordinary fixtures were compared. Eight have exact
document/placement/PDF equality. The canonical table fixture has different internal
document/PDF structure, but identical placements, text bounds and all four 72-DPI
page rasters. All eighteen PDFs pass qpdf. Separate equivalent provider fixtures,
adapted to each ABI, confirm actual-height measurement and rejection of the old
zero-height kept-container silent-content-loss case.

## Four-way measurement

All arms use the same installed compiler, bundler and dependencies:

- Old: committed `b70da49` sources.
- Lean: hash-verified `artifacts/frame-selection/before-sources.json`.
- Registered: this batch's immutable dirty-entry `before-sources.json`.
- Current: the simplified working sources.

| Profile (gzip bytes) | Old | Lean | Registered | Current |
| --- | ---: | ---: | ---: | ---: |
| Core only | 12,272 | 12,272 | 12,272 | 12,272 |
| Full layout/tables | 56,651 | 58,449 | 58,617 | 58,473 |
| Layout consumer | 50,073 | 52,264 | 52,415 | 52,244 |

Compared with registered: -405 minified bytes, -144 gzip bytes for full layout,
and -171 gzip bytes for the layout consumer. Layout production source shrinks by
41 lines. Compared with old, the broader safety-oriented migration still adds
1,822 full-profile gzip bytes (about 3.2%); this is not an across-the-board size win.
Core size is unchanged; its minified hash differs from old, but is identical to the
lean and registered checkpoints.

Local layout-only benchmarks: three warmups, eleven alternating measured samples,
explicit GC between calls, preconstructed inputs, no PDF serialization in timings.
These are synthetic samples with visible machine noise, not universal speed claims.

| Workload | Old median ms | Lean | Registered | Current |
| --- | ---: | ---: | ---: | ---: |
| 500 fixed blocks | 9.19 | 11.45 | 13.66 | 11.83 |
| 500 kept blocks | 24.62 | 29.52 | 34.76 | 29.74 |
| 200 two-column Rows | 34.27 | 41.09 | 48.51 | 41.46 |
| 200 short paragraphs | 54.00 | 55.06 | 55.24 | 54.98 |
| 60 table rows | 167.12 | 181.72 | 180.32 | 178.41 |

Known-frame workloads improve about 13–15% versus registered and return close to
lean. They remain about 21–29% slower than old in this run; retaining the safety
work has a cost. Peak heap was not benchmarked. No claim that every remaining cost
is necessary or that the original architecture is uniformly worse is made.

## Validation and preservation

Passed:

- `npm run format:check`, `npm run lint`, `npm run typecheck` (full build).
- `npx tsx --test packages/layout/test/frame-selection.test.ts packages/layout/test/composite-selection.test.ts`: 7 tests.
- `npm test`: 1,388 passed. The registration-specific tests were replaced by fit,
  capacity and budget regressions; the count decrease is not a disabled gate.
- `npm run test:consumer`: 14 external tarball closures.
- `npm run build:browser`, `npm run test:browser`: 18 tests.
- `npm run check:graphs`: 12 profiles.
- `npm run build:showcase`, `npm run test:showcase`: 101 tests.
- `node artifacts/resolved-frame-fit/compare.mjs`: the four-way comparison above.
- `node artifacts/resolved-frame-fit/evidence.mjs after-final`: source-based costs.

Gate logs, snapshots and final preservation hashes are in
`artifacts/resolved-frame-fit/`. The comparison runner retains a standalone copy
as `run-comparison.mjs`; rerun it with `node --expose-gc` from this worktree.
The private disk-backed gate wrapper is:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/resolved-frame-fit/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/resolved-frame-fit/cache" && node artifacts/resolved-frame-fit/gates.mjs root consumer browserBuild browser graphs'
```

`showcaseBuild showcase` ran separately. Initial formatting failures were corrected;
no runtime test failures occurred in this batch. The prior SVG-only raster flake
remains recorded in historical evidence and was not reproduced here.

No code-principles exceptions were introduced. No Changeset (the repository does
not use Changesets), staging, commits, PRs or deployment. Independent final audits,
hosted CI and an explicit release-scope decision remain outstanding. Further
refactoring must be justified by concrete behavior or measured cost, not uniformity
alone.
