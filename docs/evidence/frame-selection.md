# Fixed/spacer metric selection — self-validated checkpoint

**Historical checkpoint, superseded:** the kernel registration of resolved frames
was removed after measured capacity and performance regressions. See
[resolved-frame fit](resolved-frame-fit.md) for the current implementation.

Worktree `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Changes remain uncommitted.
This is direct-execution evidence, not independent audit or release approval.

## Live integration, not another dispatcher

`blocks.ts` no longer decides fixed/spacer fit with its own capacity comparison.
It registers a single atomic metric unit using the existing `createRangeOperation`
owner in `paragraph-fragments.ts`. The descriptor carries only resolved height,
not native payloads or a paint callback. Its provider branch supplies metrics;
all capacity decisions remain in the same kernel selector as paragraph selection.

The existing internal owner names were retained to avoid a rename-only migration.
There is no compatibility alias, second operation, private frame registry, new
production module, build flag or alternate entry. Existing closure paths close the
shared operation. Registration and selection kernel errors map to host diagnostics.
An exhausted source does not emit another frame. Bound width is the measured host
width, not an optional smaller border-box width. Incorrect requests poison the
owner as required by the kernel contract.

The fixed/spacer painters, local native validation, ancestor/output reservations,
prepared geometry, native admission and publication are unchanged. Rejected units
do not reserve ancestors or paint. This slice does not wire B1 or migrate the live
Row/container/decoration/stack paths; no whole-system closure is claimed.

## Explicit behavior and cost changes

Fixed and spacer attempts now consume the same finite cumulative ledger as
paragraphs, including the existing **10,000-attempt default**. Limits were neither
raised nor bypassed. Large fixed-only or mixed documents may now fail `LIMIT`
where the old fixed path bypassed that ledger. This is an intentional tightening,
not output equivalence for every formerly accepted workload. Public documentation
records that this limit is independent of node/page limits.

Each prepared frame now has a kernel source/descriptor and selector closure;
attempts allocate the kernel's normal selected-unit/range data. No additional
operation is allocated when the lifetime already has the metric owner. Fixed-only
lifetimes now create that owner. Peak heap and throughput were not benchmarked;
bundle cost is not evidence of zero runtime cost.

| Profile | Before min / gzip | After min / gzip | Delta min / gzip |
| --- | ---: | ---: | ---: |
| Core only | 35,558 / 12,272 | 35,558 / 12,272 | 0 / 0 |
| Full layout and tables | 183,190 / 58,449 | 183,519 / 58,532 | +329 / +83 |
| Layout consumer | 163,410 / 52,264 | 163,739 / 52,315 | +329 / +51 |

Core output is byte-identical. The positive cost buys deletion of a live private
selector and consistent identity, progress, lifetime and work enforcement. No
code-principles exceptions were introduced. No Changeset: this repository does
not use Changesets.

## Validation and unresolved test observation

Final production sources passed:

- `npm run format:check`, `npm run lint`, `npm run typecheck` (full build).
- `npm test`: 1,386 passed, including five new frame-selection regressions.
- `npm run test:consumer`: 14 clean external tarball closures.
- `npm run build:browser`, `npm run check:graphs`: 12 graph profiles.
- `npm run test:browser`: 18 passed on two consecutive unchanged-code reruns.
- `npm run build:showcase`, `npm run test:showcase`: 101 passed.
- `node artifacts/frame-selection/paired.mjs verified`: eight fixtures / nine page
  pairs with exact documents, placements, provider queries, ordinary measurement,
  PDF bytes, text bounds and 72-DPI rasters; all sixteen PDFs pass qpdf.

One final browser run failed the SVG-only native raster comparison after PDF
parity had passed. No code or tolerance was changed; two complete reruns passed.
The cause is **not established**. The failure log and SVG artifacts are preserved
in `browserVerified.log` and `browser-failure/`. This remains a release-review
observation, not a silently waived failure. The subsequent combined command timed
out during showcase tests; no process remained. A standalone showcase rerun passed
all 101 tests in 427 seconds.

Initial test formatting was corrected. A new source assertion initially matched
the word "exceeds" inside a diagnostic string; it was narrowed to a function call
or request-capacity access. No production behavior was changed to satisfy it.

Artifacts are under `artifacts/frame-selection/`: `before.json`,
`before-sources.json`, **`after.json`** (latest, after registration error mapping),
`paired-verified/`, gate logs and the preservation manifest. The earlier
`after-final.json` is retained historical evidence, not the final source state.
Gates used the private disk-backed environment:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/frame-selection/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/frame-selection/cache" && node artifacts/frame-selection/gates.mjs rootVerified consumerVerified browserBuildVerified browserVerified graphsVerified showcaseBuildVerified showcaseVerified'
```

After the recorded browser failure, `browserRetry browserRepeat graphsVerified
showcaseBuildVerified showcaseVerified` was attempted through the same wrapper;
after its outer timeout, `showcaseRetry` ran separately with a 650-second outer
timeout. Independent review of recent batches, both FINAL audits and hosted CI
remain outstanding. No staging, commits, PRs or deployment were performed.
