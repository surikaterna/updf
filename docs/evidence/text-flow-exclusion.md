# PR89: bounded rectangular edge exclusion

**Implemented; pending independent audit, not verified.** Tracker: N/A; PR89 is
the assignment reference. Integration owner: Engineer. Exact worktree:
`/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`, base/start/current HEAD
`882d6d38f432edcac97e962fbf446062c1483c3d`.

This audit-fix assignment inherited 14 modified tracked files and nine untracked
files from the prior implementation. It preserves that work and fixes the three
audit must-fixes plus the stale addon README. Final scope is 17 modified tracked
files and 12 new files, all unstaged and
uncommitted. No staging, commit, push, PR/tracker mutation or delegation occurred.
Historical evidence and baseline reports remain untouched.

## Bounded audit fixes

1. Exclusion height now uses the existing `MetricSum` across lines and paragraphs,
   retaining its correction until an absolute jump selects a new origin. A jump
   starts a new compensated sum at that origin. Finite and exact strict-progress
   checks remain mandatory; maxHeight uses the unchanged approximate fit predicate.
2. The selection envelope now bounds each operand of the actual painting baseline
   association independently, using shared `lineLeading`/`lineBaseline` arithmetic.
   The leading extrema are computed once per paragraph; absolute bounds are
   materialized at each queried top, including its rounding, before adding glyph
   ink. Monotonic operations enclose every selected metric combination without an
   algebraic reassociation or epsilon padding. This can reserve more space for
   mixed metrics; maximal packing is still not promised. Exact touching and the
   final actual-ink intersection check are retained, not weakened.
3. `composition-band.ts` owns the optional envelope scan behind composition.
   Ordinary `lines.ts` retains only generic baseline arithmetic, no envelope
   export/scan/call. Emitted browser/Node graph regressions inspect behavior in
   shared module bodies as well as helper paths; raw and minified cost profiles
   assert helper absence for drawing/text/prepared-font/JPEG/layout and presence
   for both TextFlow profiles. In particular CJS no longer retains the exclusion
   envelope through `lines.js` exports. The boundary inventory adds only the exact
   optional helper path, not a broader importer permission.

README now documents `side`, the one-rectangle reservation/selection contract and
an API example, while retaining contour/multi-interval/visual/split exclusions.

## Delivered contract and acceptance

- `CompositionInput.exclusion` and `TextFlowProps.exclusion` optionally accept one
  `{ shape: "rect", side: "left" | "right", width, height, top? }`. Width/height
  must be finite and strictly positive; top defaults to zero and must be finite
  and nonnegative. Width cannot exceed the exact authored frame width. Unknown
  properties, invalid discriminants, nonfinite sums and unrepresentable bottom
  progress reject. The rectangle reserves space only; it paints no visual.
- `wrap-selector.ts` is the single incremental line-breaking owner. Ordinary
  `wrap` drains it at constant width; exclusion composition offers varying widths.
  Immutable token extents, scalar-order compensated accumulation, source atom
  identities and UTF16 offsets are retained. Oversized words split against the
  whole offered width, not the remaining tail. A blocked first unit does not
  commit source progress; retry at a different width recomputes the chunk.
- Preserved/collapsed spaces, hard/soft/paragraph-end breaks, empty paragraphs,
  supplementary scalars, cross-run atoms and atomic units keep existing owners.
  No-exclusion composition still uses `rich`; the line builder's default origin
  remains zero. The extraction does not add a second wrapper or measurement owner.
- Exclusion selection uses a conservative whole-paragraph envelope bounding any
  fixed-height selected line: nominal line height, default empty-line metrics,
  mixed ascents/descents and actual vertical glyph ink. Any occupied-band
  intersection narrows the whole line. This can reserve more than a particular
  selected line needs; it deliberately does not promise maximal packing.
- Left reservations shift the line origin; right reservations narrow its right
  edge. Actual advances and ink are checked again after line construction.
  Exact touching is disjoint. An uncertain positive separation remains occupied.
  Full-width blockage or an indivisible first unit triggers one direct jump below
  the reservation, without consuming source or iterating through vertical space.
  Rounded/no-progress or still-blocked jumps reject rather than loop.
- Reported height includes required leading/interior jumps and actual selected
  lines, not the reservation's unused trailing height. Empty paragraph arrays
  consume zero height. Finite progress, maxHeight, line and output quotas remain
  mandatory. Failed work charges remain cumulative across the real operation.
- Exclusion scans, interval queries, retries and selected-line work charge the
  existing optional composition capture budget. Huge and small blocked rectangles
  have identical bounded attempt/scan charges. Native sealed output, lifetime,
  resource identity, graph preparation and admission are unchanged and mandatory.

All bounded acceptance items above are implemented. Intentionally excluded:
contours, multiple reservations, sibling floats, visuals, arbitrary children,
split pagination, alignment modes beyond the existing left-only composition
contract, and further optimization. No core, layout, layout-boxes, fonts runtime
or native painting source was changed. `scripts/boundaries.ts` adds only the four
exact new text helper paths to the existing core-internal importer inventory;
the guard, export inventory and package-edge policy are unchanged.

### Numerical classification

Input domains, authored width, source/cache identity, counters, quotas and strict
progress are exact. Derived horizontal fit and ink/occupied-band containment use
the existing text arithmetic facade over layout-boxes arithmetic, with immediate
local operation scales. Exact touching is an explicit disjointness certificate;
it does not turn every derived comparison into an exact one. No blanket epsilon,
unit-sized allowance or native-certificate relaxation was introduced.

## Validation and failures

Commands executed from the exact worktree above, all final outcomes passing:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npx tsx --test --test-concurrency=1 packages/text/test/exclusion-rounding.test.ts packages/text/test/exclusion.test.ts packages/text/test/exclusion-fonts-budget.test.ts packages/text/test/wrap-selector.test.ts packages/text/test/composition-parity.test.ts packages/text/test/composition-native-parity.test.ts packages/text-flow/test/adapter.test.ts
npx tsx scripts/text-wrap-parity.ts artifacts/text-flow/wrap-exclusion-fixed.json artifacts/text-flow/wrap-before.json
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/exclusion-fixed-vs-surgical --compare artifacts/text-flow/surgical-vs-baseline/report.json
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/exclusion-fixed-vs-baseline --compare artifacts/text-flow/library-baseline/report.json
npx tsx scripts/text-flow-seam-costs.ts --out exclusion-fixed-vs-baseline --paired exclusion-fixed-vs-surgical --previous surgical-vs-baseline
git diff --check
```

Results: **1,433/1,433 full tests**, **29/29 focused**, no failures/skips;
**216/216 pre-edit wrapper cases identical** including structured errors, source
atoms, metrics and break reasons. Typecheck includes a full build; each cost run
also rebuilds. All 12 browser graphs and 15 clean external tarball closures pass,
including NodeNext/Bundler declarations without source aliases. This is not a
claim that the separate Playwright browser suite was run. The large-browser-chunk
warning and the historical arithmetic test's deliberate invalid-syntax diagnostic
are passing controls, not waived failures.

Initial targeted tests rejected incomplete test styles; supplying the complete
font/color style fixed the fixtures. Initial lint rejected two oversized functions;
small cohesive helpers fixed them. Typecheck caught an unnarrowed test ink union,
then passed after an explicit nonempty assertion. Formatting was corrected after
the graph regression edit. All required gates subsequently passed; no failure or
principle exception was waived. Builds/consumers/cost runs were sequential.

Risk-based regressions cover both edges, nonzero top, exact touching, band versus
baseline/nominal-box intersection, mixed fonts/negative bearings/ink overhang,
full blockage and narrow-token retry, huge jumps, no trailing reservation, source
offset preservation, empty/newline cases, exact domains and overflow/no-progress,
maxHeight, cumulative failed budgets, durable native output and atomic adapter
transport. Existing rectangular report/native-PDF parity suites still pass. The
new separate exclusion fixture does not alter ordinary rectangular fixture inputs.
New rounding regressions cover 200 empty/nonempty fractional lines at exact height
20 with an inactive rectangle, fractional multi-paragraph height after a jump,
the audit's exact inward-rounded band (actual ink bottom 16.05 versus rectangle
top 16.049999999999997), and small/large metrics with mixed-scale nonzero origins.

## Reproducible cost evidence

Harness cwd is the worktree root. Both new directories contain 15 tarballs, 28
consumer bundles/metafiles and **214 comparison rows**: the existing 206 metrics
plus eight absolute-only exclusion profile metrics. Reports assert emitted rather
than source-aliased graphs and optional positive/negative controls. The seam
reporter now accepts output/paired/previous directory names; its historical
no-argument behavior remains available. Only the new directory's `seams.json`
was written. Shared-module `bytesInOutput` is not additive gzip attribution.

The reporter asserts equal metrics across the two new runs, unchanged flags,
byte-identical existing input strings (including surgical TextFlow), and zero
emitted/pack deltas for every package except text/text-flow. The separate exclusion
cost input adds only the reservation to the existing TextFlow operation.

Preserved report SHA-256, unchanged:

| Report | SHA-256 |
| --- | --- |
| library-baseline | `cc3cc2e01cad80ee10427ec9dfdda5e9645669d43ff61c822b544fb189e2dd53` |
| runtime-final | `bae5429859303bcafb0a4f59c8df75fdf29c958dc63cfb573f23a0be1f432e03` |
| surgical-vs-baseline | `f4755d5b4ca47a71b40dfd2c49cd92da041246c69af252565895e8cae2af3156` |
| surgical-vs-current | `4b9bd963ad95877eb520668fe4f1d7f5da32b660ebd25f1e201780ed5ea6a80e` |
| exclusion-vs-surgical | `4ebea64f6ef3aa5c5c8a40f71906683a2dd7bff736f0b661768e9aa7d572a0fb` |
| exclusion-vs-baseline | `ff6bbf314075c24abaf14e5429eeab520530aac11a4a02aab61f6fc06c824e48` |

New paired report hashes: exclusion-fixed-vs-baseline
`c04b07b5765ff19dce2bf824cfeb6f8e34e850ed50780cbf79ce42c3182bb67e`;
exclusion-fixed-vs-surgical
`5d9da6ea8e9b682a01d391522719e2ec4abdb161caa49a68345f27c17db3acd4`.

### Final package sizes, bytes

Package payloads are **not dependency closures or installed footprint**. Delta is
against surgical, not pre-feature. All emitted JS/declarations/maps/facades for the
13 unchanged packages are also zero-delta, including the required **core zero**.

| Package (@updf/) | Tarball | Delta | Unpacked | Delta |
| --- | ---: | ---: | ---: | ---: |
| assets | 11,978 | 0 | 51,881 | 0 |
| barcodes | 23,441 | 0 | 101,985 | 0 |
| core | 134,653 | 0 | 785,101 | 0 |
| fontkit | 14,642 | 0 | 69,199 | 0 |
| fontkite | 21,654 | 0 | 106,402 | 0 |
| fonts | 21,198 | 0 | 106,028 | 0 |
| geometry | 17,347 | 0 | 76,714 | 0 |
| jpeg | 14,739 | 0 | 61,505 | 0 |
| layout | 184,475 | 0 | 1,126,137 | 0 |
| layout-boxes | 63,540 | 0 | 339,751 | 0 |
| png | 18,858 | 0 | 81,282 | 0 |
| svg | 47,965 | 0 | 257,739 | 0 |
| tables | 28,037 | 0 | 139,871 | 0 |
| text | 44,737 | +8,177 | 256,897 | +49,506 |
| text-flow | 5,717 | +385 | 16,124 | +1,276 |
| **Total** | **652,981** | **+8,562** | **3,576,616** | **+50,782** |

| Emitted metric | Final | Delta vs surgical |
| --- | ---: | ---: |
| Text browser JS / CJS JS | 55,563 / 64,269 | +11,457 / +12,799 |
| Text declarations, browser/CJS each | 22,884 | +3,800 |
| Text browser maps/other | 82,386 | +17,650 |
| Addon browser JS / CJS JS | 2,098 / 2,254 | +76 / +76 |
| Addon declarations, browser/CJS each | 985 | +110 |
| Addon browser maps/other | 2,608 | +227 |
| All browser JS / CJS JS | 766,132 / 883,775 | +11,533 / +12,875 |
| All declarations, browser/CJS each | 305,988 | +3,910 |
| All facade JS / declarations | 12,902 / 2,864 | 0 / 0 |

### Retained consumers and ordinary-wrapper cost

Minified level-9 gzip bytes, browser / Node:

| Consumer | Final | Delta vs surgical |
| --- | ---: | ---: |
| Drawing | 12,990 / 19,269 | 0 / 0 |
| Ordinary text | 21,084 / 39,589 | +448 / +581 |
| Prepared font | 22,383 / 39,605 | +439 / +562 |
| JPEG | 15,444 / 22,695 | 0 / 0 |
| Layout | 58,282 / 92,845 | +470 / +575 |
| TextFlow, unchanged input | 68,820 / 100,763 | +1,770 / +2,121 |
| TextFlow exclusion | 68,849 / 100,794 | N/A (new profile) |

Ordinary text browser raw/minified bytes: 118,401 / 61,352, deltas +2,084 /
+1,188; gzip 28,803 / 21,084, deltas +605 / +448. Node raw/minified bytes:
265,678 / 127,036, deltas +2,928 / +1,438; gzip 50,623 / 39,589, deltas +733 /
+581. Versus the prior exclusion delivery, ordinary Node min-gzip is -70 bytes,
prepared-font -82 and layout -70; the optional envelope helper is absent in all
three. Ordinary browser min-gzip is +20 from shared baseline extraction. Thus the
shared incremental wrapper has a measured ordinary retained cost;
optional composition graph isolation is not a claim of zero text-consumer growth.
All exact percentages and pre-feature comparisons are in the JSON reports.

Timing is diagnostic only: 50 warmup iterations, nine rounds of 100 iterations
over two 8,192-scalar synthetic cases, width 127, same harness. Preserved pre-edit
rounds span 147.998–164.761 ms, median 151.539 ms. This assignment's replay spans
174.561–204.904 ms, median 188.089 ms, slower than the saved baseline; the wrapper
implementation itself was unchanged by these audit fixes. The prior exclusion
replay spanned 143.824–168.059 ms, median 148.458 ms. These are sequential noisy
microbenchmarks, not an
interleaved production latency study. **No speed improvement is claimed.**

## Code principles and handoff

Universal checklist passes: explicit ownership/correctness, cohesive files ≤400
lines, functions <50 lines, nesting ≤3, intent/invariant/tradeoff comments, and
risk-proportional tests. Format, lint/AST principles, typecheck and tests pass.
No approved exception, quota increase, compatibility route or build-mode bypass.
No Changeset: the repository does not use Changesets.

Changed inventory: text-flow `src/index.ts` and `test/adapter.test.ts`; text
`src/composition{,-operation,-output,-plan,-types}.ts`, `lines.ts`, `wrap.ts`;
scripts `boundaries.ts`, `text-flow-cost-inputs.ts`, `text-flow-costs.ts`,
`text-flow-seam-costs.ts`; fixture `options.ts`. New: text source
`wrap-selector.ts`, `exclusion.ts`, `composition-exclusion.ts`; text tests
`wrap-selector.test.ts`, `exclusion.test.ts`, `exclusion-fonts-budget.test.ts`;
`scripts/text-wrap-parity.ts`, fixture `exclusion.ts`, and this document.
Audit-fix additions to that inherited inventory: text-flow `README.md`, text
`src/baseline.ts`, `src/composition-band.ts`, `test/exclusion-rounding.test.ts`,
`scripts/graph-check.ts`, and `tests/integration/text-flow-graphs.test.ts`.

No implementation blocker remains. Auditor should review the actual unstaged
and untracked scope, challenge scalar/whitespace/block-retry parity and conservative
ink-band selection, confirm cumulative quota and exact native enforcement, and
reconcile both cost reports and preserved hashes. Independent audit and any
authorized delivery remain with the caller; further contours/optimization require
a fresh bounded assignment.

## Subsequent bounded cost follow-up

The historical evidence above is preserved. See
[shared-selector optimization](text-wrap-optimization.md) for the subsequent
bounded optimization, paired measurements, exact remaining ordinary-consumer tax,
validation and independent-audit handoff.
