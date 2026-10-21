# Single paginator publication entry — self-validated checkpoint

Worktree `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Uncommitted direct-execution work;
not an independent audit or release approval.

## Scope

Source search found no callers of `Paginator.atomic` or its `fit` helper; `fits`
was used only by selection validation. The alternate atomic entry retained a late
`paint(y)` callback, a metric-only preflight and a second wrapper construction path.
It is deleted, not adapted or replaced with another entry. Its emitted class method
was retained in consumer bundles despite having no callers.

`place` now requires `acceptedY`. It cannot fall back to `materializedStart` after
painting. Ordinary fragments pass the origin already certified by `fragmentStart`.
Page controls explicitly project their zero-height cursor before publication,
preserving the old coordinate and diagnostic path. The `fits` expression is inlined
at its only caller with the same ordered operands and shared arithmetic owner.
No fit tolerances, native certificates, geometry, budgets, lifecycle, retry policy,
resource ownership or source/cache identities were changed.

This is a narrow prerequisite cleanup. The live bounded stack/container/Row/
decoration paths remain, and the B1 admission session is still unwired. The batch
does not claim whole-system architectural closure. Independent review of recent
batches, both FINAL audits and hosted CI remain outstanding.

## Checks

- `npm run format:check`: passed (an initial test-formatting issue was corrected).
- `npm run lint`: passed, including AST code-principles checks.
- `npm run typecheck`: passed, including the full workspace build.
- `npm test`: 1,381 passed, including three new regressions for removed entries,
  required publication origin/no reprojection, and page-control cursor placement.
- `npm run test:consumer`: 14 clean external tarball closures passed.
- `npm run build:browser` and `npm run test:browser`: 18 tests passed.
- `npm run check:graphs`: 12 profiles passed.
- `npm run build:showcase` and `npm run test:showcase`: 101 tests passed.
- `node artifacts/single-publication/paired.mjs final`: eight fixtures / nine page
  pairs retain exact documents, placements, provider queries, ordinary measurement,
  PDF bytes, extracted text bounds and 72-DPI rasters. All sixteen PDFs pass qpdf.

Recorded gates used the existing private disk-backed environment:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/single-publication/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/single-publication/cache" && node artifacts/single-publication/gates.mjs root consumer browserBuild browser graphs showcaseBuild showcase'
```

Snapshots, logs, paired outputs, cost records and final preservation hashes are
under `artifacts/single-publication/`. No runtime test failures were observed.

## Footprint

| Profile | Before min / gzip | After min / gzip | Delta min / gzip |
| --- | ---: | ---: | ---: |
| Core only | 35,558 / 12,272 | 35,558 / 12,272 | 0 / 0 |
| Full layout and tables | 183,845 / 58,648 | 183,190 / 58,449 | -655 / -199 |
| Layout consumer | 164,065 / 52,437 | 163,410 / 52,264 | -655 / -173 |

Core output is byte-identical. No new code-principles exceptions or Changesets
(the repository does not use Changesets). No commits, staging, PRs or deployment.
