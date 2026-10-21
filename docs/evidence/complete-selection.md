# Complete selection for kept contents and Row Columns

## Scope and status

Worktree `/home/sprawl/projects/updf/trees/flow-admission`, branch
`feature/flow-admission`, HEAD/base
`b70da49ace00c19a8e570b4fc783806dffd6931c`. The comparison baseline is the actual
dirty entry after range-capability separation, not clean HEAD. Tracker: N/A.

This batch introduces an explicit complete-source query and removes fabricated
selection capacities from kept/closed container contents and Row Columns. It
does not complete private bounded-composition migration or wire the standalone
admission session. Independent audit and both FINAL whole-flow audits remain
pending; this session provides self-validation only.

## Exact changes

- Kernel `select` accepts either the existing bounded request or
  `{ mode: "complete", offset, width }`. Both use the same `selectRange` loop,
  provider validation, `UnitSequence` accumulation, ownership and ledger. No
  separate collector loop, candidate store, or disabled production guard.
- Complete requests reject capacity fields, unknown modes, accessors and malformed
  dimensions. Missing height in an ordinary request is still invalid. Complete
  accumulation rejects nonfinite totals rather than returning an infinite height.
- The private request union distinguishes real bounded regions from explicit
  complete selection. Providers still receive only offset/extent/width.
- `unitSelectionRequest` lowers either internal request to the kernel shape;
  paragraph and measured-source bindings share it.
- Kept/closed containers no longer synthesize `Math.max(content.height, 1)` for
  selecting descendants. Explicit authored alignment retains its certified finite
  capacity. Other whole-content requests carry only source position, exact width
  and operation services.
- Rows request complete Columns without `Math.max(1, column.naturalSize.height)`.
  Their existing prepared-size/completeness policy remains unchanged.
- Stacks preserve complete mode through children and consume exact remaining gap
  values through their existing dyadic owner. Bounded gaps still use the actual
  available region. Decorations do not subtract an overhead from a nonexistent
  bound in complete mode; measured decorations and reservation accounting remain.
- A zero-height kept container now rejects positive selected content rather than
  silently discarding it through the zero-height paint shortcut. Direct atomic
  content may still return an actual height different from its natural metadata;
  a regression proves that remains valid. This guard does not recompute prepared
  container sizes from actual units; that broader reconciliation remains pending.

This deliberately leaves real region-capacity tests intact. No authored geometry,
native certificate, tolerance formula, input domain or clipping behavior is
relaxed. The measured-source attempt also validates its cumulative height before
using it for ancestor accounting.

## Natural measurement remains unchanged

The initial scope considered replacing `paintNatural`'s capacity too. Inspection
showed that public measurement currently reports sizes and line offsets from
`naturalSize`, while actual units can have different heights. Simply collecting
all units could return a report inconsistent with its output or height ceiling.
That change was reverted before final validation; `natural-paint.ts` is
byte-identical to entry. Its migration requires a separate report/geometry design.
No claim is made that every fabricated preparation/measurement height is gone.

## Regression evidence

New kernel tests exercise both full and range-only operations: complete collection,
grouped atomic progress, empty/exhausted ranges, zero-height progress, exact widths,
work-limit exhaustion before callbacks, poisoning, malformed modes, accessors and
total overflow. Existing bounded-selection tests remain active.

New layout tests verify:

- outer region rejection happens before querying kept descendants;
- complete child queries contain no fake remaining/fresh/occupied-height fields;
- complete stacks consume all children and generated gaps;
- explicit-height alignment still supplies the real bounded content region;
- hidden clipping and overflow errors remain distinct;
- ordinary split Blocks, complete Rows, and prohibited kept page breaks retain
  their behavior.

The Row request-shape regression intentionally now expects complete mode rather
than a synthetic `freshHeight`. The paginator-only effect fixture asserts it
receives a bounded request. Paragraph tests use the narrower region-request type
for their explicitly bounded shared fixture; their behavioral assertions remain.
The zero-height-container regression additionally preserves the direct-placement
positive control and checks the precise new geometry diagnostic.

## Paired output

`artifacts/complete-selection/paired.mjs final` builds separate before/current
runtimes from the captured entry sources and current sources. Each creates its
own Helvetica, font runtime, provider and text service. The initial harness failed
because it omitted the font provider; no production validation was changed to fix
that fixture composition.

Eight fixtures cover kept stacks, Rows/Columns, explicit clipping, decorations,
ordinary split flow, measured units, raw/rich/inline text and empty containers.
The paired natural-measurement control remains identical too. Exact documents,
placements, provider query traces and PDF bytes match. All sixteen PDFs pass
qpdf and page-count checks; nine corresponding pages have identical text-bbox
output and 72-DPI PPM rasters. These are ordinary behavior-preservation fixtures,
not proof of the unfinished general nested-admission architecture.

The separate understated-height control reproduces an existing loss of content:
the entry implementation accepts a zero-height kept container and returns no
native nodes despite a selected positive-height unit. Current code rejects that
composition with `GEOMETRY` before painting. The same unit directly placed still
reports height 0.5 in both arms. This deliberate correction is not included in the
ordinary fixture parity claim.

## Final checks and costs

All commands ran serially in the stated worktree. Subprocess-heavy gates used a
private user/mount namespace with batch-owned disk-backed scratch/cache:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/complete-selection/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/complete-selection/cache" && COMMAND'
```

No host configuration, global mount, unrelated temporary data or test threshold
was changed. Final command results:

| Command | Result |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including AST principles |
| `npm run typecheck` | PASS, full serial build plus root TypeScript |
| `npm test` | 1,370 passed, no failures/skips |
| `npm run test:consumer` | 14 external tarball closures passed, including ESM/CJS and strict type checks for complete queries |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | 12 graph profiles passed |
| `npm run test:browser` | 18 passed |
| `npm run build:showcase` | PASS |
| `npm run test:showcase` | 101 passed |
| `node artifacts/complete-selection/paired.mjs final` | Eight ordinary paired fixtures/nine page pairs and the intended zero-height rejection control passed |
| `git diff --check` | PASS |

Initial format diagnostics, a test's nonexistent `pageBreak` factory import,
single-child data-form test shape, and private region-union type annotations were
corrected before these passes. The earlier root run's lone Row request-shape
failure is retained in `root.log`; the passing final runs do not waive it.

Paired sizes use the same actual dirty-entry/current source-emission driver,
TypeScript 5.9.3, esbuild 0.28.2, browser ESM/ES2022 and default Node gzip of the
minified result. Entry source hashes were captured before editing. Exact profile
strings, options, hashes and metafiles are in `before.json` and `after-final.json`.

| Consumer | Raw before / after | Minified before / after | Gzip before / after |
| --- | ---: | ---: | ---: |
| Core render only | 67,136 / 67,136 | 35,558 / 35,558 | 12,272 / 12,272 |
| Full layout + tables | 356,180 / 357,930 | 183,864 / 184,845 | 58,593 / 58,918 |
| Layout consumer | 318,070 / 319,816 | 162,871 / 163,852 | 52,080 / 52,369 |

This adds 981 minified / 325 gzip bytes to the full profile; it is not a size or
speed optimization. No second selector, additional candidate stores or disabled
safety checks were introduced. Complete collection can perform more work than a
prematurely truncated synthetic-capacity attempt, but finite limits still bound it.

## Handoff

Implementation and self-validation complete for this bounded slice. No independent
Auditor was available in this session; independent review remains required. No
commit, push, PR or deployment was made. Source/test-size, function/nesting,
comments and risk-based test gates pass without a principle exception. Changesets
are not configured in this repository.

Natural measurement reconciliation, remaining private region-fit composition,
admission-session integration, and both FINAL whole-system audits remain pending.
