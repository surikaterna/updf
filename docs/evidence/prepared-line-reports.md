# Prepared line reports — self-validated checkpoint

Worktree: `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Changes are uncommitted. This is direct
execution evidence, not independent audit or publication approval.

## Bounded scope

Removed `content-line-containers.ts` and the separate `collectLines`, `lineMargin`
and decoration-offset calculations in `content-measure.ts`. Rich paragraph parts
carry their existing immutable line metadata. Prepared paint contexts retain their
already-computed, frozen incoming native matrix. Reporting projects that metadata
using the same prepared part positions and core affine operations as painting.
Selection and admission never inspect line metadata.

The existing core `point` operation is reexported through the internal sibling seam;
its exact export and consumer permission inventories were updated. No new numerical
owner, tolerance, geometry repair, provider callback or global registry was added.
Signed ink endpoints are projected separately, without reconstructing widths and
re-adding them. Paint preparation and its native certificates are unchanged except
for retaining the matrix. The private natural painter's optional report consumer
runs after preparation; it does not disable any safety check or change selection.

Reports now follow selected preceding heights rather than natural-height hints.
A provider with natural height 10 and actual height 1 puts the next line at 1,
not 10 (and at 2 inside one point of padding). Equal-top lines use logical source
order, including left-to-right Row Columns, instead of the old reverse task-stack
tie order. Native transform association can also correct last-bit report rounding.
These reporting changes do not alter native drawing geometry.

**Not converted:** natural measurement still selects using its old capacity and
reports total size from prepared natural sizes. This batch removes the duplicate
line-position algorithm, not the remaining natural-height policy. Complete-source
measurement, bounded private composition, production admission-session integration,
independent review of recent batches and both FINAL closure audits remain pending.

## Validation

Passed on the final production source state:

- `npm run format:check`
- `npm run lint` (including AST code-principles checks)
- `npm run typecheck` (full workspace build and typecheck)
- `npx tsx --test packages/layout/test/prepared-line-reports.test.ts`: 3 regressions
- `npm test`: 1,373 passed
- `npm run test:consumer`: 14 external tarball closures passed
- `npm run build:browser` and `npm run test:browser`: 18 tests passed
- `npm run check:graphs`: 12 profiles passed
- `npm run build:showcase` and `npm run test:showcase`: 101 tests passed
- `node artifacts/prepared-line-reports/paired.mjs final`: eight fixtures, nine
  page pairs; exact documents, placements, provider queries, ordinary natural report,
  PDF bytes, extracted text bounds and 72-DPI rasters. All sixteen PDFs pass qpdf.

Gate logs use the existing disk-backed private mount recipe:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/prepared-line-reports/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/prepared-line-reports/cache" && node artifacts/prepared-line-reports/gates.mjs rootVerified consumerVerified browserBuild browser graphs'
```

Showcase build used `showcaseBuild`; its first combined run exceeded the outer
200-second command timeout. No test process remained. A separate run with
`showcaseVerified` and a 600-second timeout passed all 101 tests in 291 seconds.
Initial checks also caught formatting, a test union-narrowing error, and three
stale exact seam-inventory assertions; all were corrected without weakening gates.

## Paired footprint

Source-based, same-tool measurements are in `artifacts/prepared-line-reports/`:
`before.json`, `before-sources.json`, `after-final.json`, and `paired-final/`.

| Profile | Before min / gzip | After min / gzip | Delta min / gzip |
| --- | ---: | ---: | ---: |
| Core only | 35,558 / 12,272 | 35,558 / 12,272 | 0 / 0 |
| Full layout and tables | 184,845 / 58,918 | 183,711 / 58,583 | -1,134 / -335 |
| Layout consumer without public measurement | 163,852 / 52,369 | 163,920 / 52,405 | +68 / +36 |

The smaller consumer retains only the metadata plumbing, not the reporting walker.
Core output is byte-identical. Each prepared context now retains one existing matrix
reference, and rich line parts one existing metadata reference; heap impact was not
separately benchmarked. No code-principles exceptions were introduced. The project
does not use Changesets. Hosted CI and independent audit were not run in this batch.
