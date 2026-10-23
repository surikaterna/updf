# Rectangle-exclusion shared-selector optimization

**Implemented; independent optimization audit and cost acceptance pending.**
Issue: N/A. This is the bounded cost follow-up to the rectangle-exclusion
assignment, not a new feature or delivery. The caller reports the inherited
feature independently audited correct; this document does not claim an independent
audit of the optimization.

## Scope and state

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/start/current HEAD:
  `882d6d38f432edcac97e962fbf446062c1483c3d`. Pre-feature reference: `244c093`.
- Inherited inventory verified before edits: 17 modified tracked, 12 untracked
  files, no staged changes. All inherited production fixes and APIs are preserved.
- This slice edits inherited untracked `packages/text/src/wrap-selector.ts` and
  `packages/text/test/wrap-selector.test.ts`; adds
  `scripts/text-wrap-optimization.ts`, `scripts/text-wrap-cost-summary.ts`, and
  this document; appends a link to the inherited exclusion evidence.
- Final inventory: 17 modified tracked and 15 untracked files. Nothing staged,
  committed, pushed, discarded, delivered or mutated in a tracker. No delegation.
  The complete dirty inventory and per-file SHA-256 fingerprints are in
  `artifacts/text-flow/wrap-optimization-cost-summary.json`, regenerated after
  the evidence update. That manifest supplements the reports' earlier dirty lists.

No core, layout, layout-boxes, fonts, native painting, wrapper entrypoint, exclusion
policy, baseline arithmetic, validation, error message, quota or fixture input is
changed by this slice. No second wrapping implementation/legacy fast path or
entrypoint-selection cost hiding is introduced. Optional envelope/capture policy
remains behind the existing composition seam; the generic selector's existing
optional work-charge callback and retry cache remain intact.

## Bounded changes and invariants

1. Group hard segments and tokens in one pass, without intermediate hard-segment
   arrays, repeated token flattening or a second grouping owner. Collapsed pending
   whitespace resets at every newline; atomic neighbors remain separate.
2. Represent hard ends by a sentinel; the final sentinel's position identifies
   paragraph end. Every source includes that final sentinel, so selection has a
   structural terminator rather than a redundant fall-through finish branch.
3. Reuse the immutable full-token record as a complete chunk. Only genuine partial
   chunks allocate a slice/record. Cache identity still includes exact source
   index, scalar offset and offered width; blocked selection is nonconsuming.
4. Only construct/test a candidate when a line already has atoms. With no pending
   space, use the existing line extent directly instead of measuring an empty
   array and joining its zero extent. No scalar accumulation is replaced by token
   totals. An empty join is an identity on these finite nonnegative-advance
   extents: the measure already includes zero and advance in its bounds. First
   chunks still undergo the mandatory full-offered-width token/scalar checks.

Numerical classification is unchanged: operand domains, authored/cache identity,
quotas and strict progress are exact; derived horizontal fit still uses `exceeds`
and existing local scales. No tolerance, reassociation, exact-touch certificate,
final actual-ink check or native guarantee is weakened. Compensated vertical sums
and the conservative actual-associated-baseline envelope are untouched.

Two bounded production experiments were measured, not an open-ended tuning loop.
The first grouping/fit simplification saved ordinary min-gzip 34/40 bytes; the
kept token/terminator simplification increased that to 64/71. Scratch experiment
reports remain under `exclusion-optimized-experiment1`; historical reports were
not overwritten. This is a **modest positive result**, not elimination of the
ordinary-consumer tax. Most of the residual overhead remains; the caller must
decide whether the cost is acceptable. Further tuning is a fresh assignment.

## Reproducible retained cost

All paths below are relative to `artifacts/text-flow/`. Before optimization,
`exclusion-optimization-before/report.json` reproduced **every metric** of
`exclusion-fixed-vs-surgical/report.json` after a fresh complete build. Two final
complete builds produce identical metrics in `exclusion-optimized-vs-surgical`
and `exclusion-optimized-vs-unoptimized`. Both have 214 rows, 15 tarballs and 28
consumer bundles/metafiles. Flags, lock hash, tool versions and all existing input
strings are asserted equal; the separate exclusion input/profile is retained.

Tools: Node `v24.22.0`, npm `11.19.1`, esbuild `0.28.2`, TypeScript `5.9.3`;
target `es2022`, bundled ESM, unchanged browser/Node conditions, minification
on/off, gzip level 9 with zero mtime. Reports use emitted packages, not source
aliases. Ordinary browser **and CJS** graphs still exclude optional composition
and band helpers, with TextFlow positive controls. No assertion/guard was weakened.

### Consumer bytes (browser / Node)

| Profile | Final minified | Final min-gzip | Min-gzip delta vs unoptimized | Residual vs surgical |
| --- | ---: | ---: | ---: | ---: |
| Drawing | 37,854 / 60,250 | 12,990 / 19,269 | 0 / 0 | 0 / 0 |
| Ordinary text | 61,147 / 126,817 | 21,020 / 39,518 | -64 / -71 | +384 / +510 |
| Prepared font | 65,423 / 126,852 | 22,317 / 39,540 | -66 / -65 | +373 / +497 |
| JPEG | 44,411 / 69,973 | 15,444 / 22,695 | 0 / 0 | 0 / 0 |
| Layout | 180,164 / 305,859 | 58,216 / 92,781 | -66 / -64 | +404 / +511 |
| TextFlow, unchanged input | 211,991 / 329,385 | 68,754 / 100,696 | -66 / -67 | +1,704 / +2,054 |
| Separate exclusion | 212,053 / 329,447 | 68,783 / 100,728 | -66 / -66 | N/A |

Ordinary raw bytes: **118,043 / 265,256**, down **358 / 422** versus unoptimized;
raw gzip **28,736 / 50,550**, down **67 / 73**. Minified bytes fall **205 / 219**.
The prior ordinary min-gzip tax was 448/581 bytes; this removes 64/71 bytes
(14.3%/12.2% of that tax), leaving **384/510**, not zero. Layout's prior 470/575
tax becomes **404/511**. Full raw/minified/gzip rows and both baselines remain in
the paired reports and cost-summary artifact.

### All package payloads (not dependency closure/installed footprint)

The 13 unchanged packages have **zero in every emitted and pack metric**, versus
both surgical and unoptimized. In particular all core metrics are zero-delta.

| Package (@updf/) | Tarball | Unpacked |
| --- | ---: | ---: |
| assets | 11,978 | 51,881 |
| barcodes | 23,441 | 101,985 |
| core | 134,653 | 785,101 |
| fontkit | 14,642 | 69,199 |
| fontkite | 21,654 | 106,402 |
| fonts | 21,198 | 106,028 |
| geometry | 17,347 | 76,714 |
| jpeg | 14,739 | 61,505 |
| layout | 184,475 | 1,126,137 |
| layout-boxes | 63,540 | 339,751 |
| png | 18,858 | 81,282 |
| svg | 47,965 | 257,739 |
| tables | 28,037 | 139,871 |
| text | 44,613 | 255,691 |
| text-flow | 5,717 | 16,124 |
| **Total** | **652,857** | **3,575,410** |

Text saves **124 packed / 1,206 unpacked bytes** versus unoptimized; addon is
unchanged. Versus surgical, text remains +8,053/+48,300 and addon +385/+1,276.
Text emitted browser/CJS JS is **55,205 / 63,890**, down **358 / 379** versus
unoptimized; declarations are unchanged at 22,884 per target. Text browser maps
and other output total 81,917, down 469. All-package browser/CJS JS totals are
765,774/883,396; declarations, facades and all 13 unrelated packages are unchanged.

### Report SHA-256 (historical reports preserved)

| Report | SHA-256 |
| --- | --- |
| surgical-vs-baseline | `f4755d5b4ca47a71b40dfd2c49cd92da041246c69af252565895e8cae2af3156` |
| exclusion-fixed-vs-surgical | `5d9da6ea8e9b682a01d391522719e2ec4abdb161caa49a68345f27c17db3acd4` |
| exclusion-fixed-vs-baseline | `c04b07b5765ff19dce2bf824cfeb6f8e34e850ed50780cbf79ce42c3182bb67e` |
| exclusion-optimization-before | `b7d458d003a2f3fe9d69db1910b4fceb03adb2902fd620b0b2b1ffccb2af88f2` |
| exclusion-optimized-vs-surgical | `44cd42dd5bc4f99666aff27268c82f082f304c0e1198929036b4161b2297cb28` |
| exclusion-optimized-vs-unoptimized | `6e991154f04efc48137dc7ab4259b42abd4b97085f30343d5b2ffff16977cb45` |

## Correctness and actual work/runtime

`text-wrap-optimization.ts --capture` saved exact old HEAD wrapper source and
unoptimized dirty wrapper/selector before any production edit. Capture uses
exclusive creation to avoid replacing the snapshot. The replay bundles all three
implementations in memory using the same dependencies/tools; compilation, input
construction and setup are outside timing. Snapshot selector SHA-256 is
`fd4d9460705e507b88a6339059d43cfcfd53126a7300ef3d1a56e868537d6983`;
optimized selector is
`393c866866cb1298fee18e63fb467d406eee2540f14e1758a35462eac71bba4a`.
All wrapper/selector hashes are also in the replay output.

Both qualified runs pass **30,000 deterministic constant-width cases** against
old `882d6d3` and unoptimized, plus **30,000 variable-width cases** against
unoptimized (including exact capture-charge sequences, blocked results and done
state). Seed is `0x58f03a`. The corpus includes whitespace modes, both longword
policies, fractional/negative-bearing metrics, mixed styles, atomic neighbors,
UTF16 scalars and hard breaks. Structured error diagnostics are compared without
implementation-specific prototypes/stacks. The existing **216-case old oracle**
also passes unchanged. A new unit regression specifically covers per-hard-segment
whitespace trimming and atomic source identity after the single-pass grouping.

The qualified runs use 12 warmup rounds per implementation, then 24 trials with
rotated forward/reverse order (all six permutations repeated), in one process.
Each trial wraps all four prebuilt samples 30 times: ordinary short paragraph,
long spaced paragraph, longword, and mixed-style fractional advances. Separate
per-fixture trials use the same ordering; short text uses 10,000 iterations for
meaningful timing duration. Full trial arrays, orders, fixture strings and warmup
counts are in `wrap-optimization-qualified{,-repeat}.json`.

| Aggregate ms, min / median / max | Old HEAD | Unoptimized | Optimized |
| --- | ---: | ---: | ---: |
| Qualified run | 43.325 / 47.164 / 53.405 | 42.262 / 47.471 / 53.122 | 36.047 / 40.458 / 44.583 |
| Repeat | 43.089 / 45.933 / 55.608 | 42.222 / 45.618 / 51.775 | 35.902 / 39.579 / 45.607 |

Per-fixture median ms, old/unoptimized/optimized (run then repeat): short
22.819/23.319/19.294 then 23.231/23.239/18.679; long spaced
14.399/14.660/12.598 then 14.073/14.059/12.270; longword
22.986/20.802/20.032 then 22.722/20.738/19.988; mixed style
9.803/9.900/7.847 then 9.129/9.636/7.780.

Aggregate optimized/unoptimized median ratios are **0.852 / 0.868**, and versus
old HEAD **0.858 / 0.862**. This supports a local harness-specific improvement,
**not a blanket production speedup**: distributions overlap, especially longword,
and scheduling/GC/frequency noise remains. No core timing hook is added.

Separate untimed work observations instrument only virtual text-horizontal source
copies; timed implementations have no observation hooks or getters. For one
four-input varied-metric pass (identical in both qualified runs):

| Actual work | Old HEAD | Unoptimized | Optimized |
| --- | ---: | ---: | ---: |
| advance reads / metric adds | 81,510 | 61,510 | 61,510 |
| atom text reads | 95,472 | 96,134 | 96,134 |
| HorizontalMeasure constructions | 16,607 | 14,629 | 13,963 |
| horizontal calls | 15,940 | 13,962 | 13,296 |
| joined calls | 13,472 | 14,624 | 13,464 |

The optimization does not claim new scalar-measurement savings: advance reads/adds
are unchanged from unoptimized. It eliminates **666** empty measurements and
**1,160** joins in this pass, plus intermediate grouping/full-token chunk
allocations. Prior selector-vs-old scalar savings are attributed to the inherited
implementation, not this slice.

## Commands and gates

All commands ran from the exact worktree above; every final gate passed. Builds,
tests, browser graphs, consumers and package measurements ran sequentially.

```sh
npx tsx scripts/text-wrap-optimization.ts --capture
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/exclusion-optimization-before --compare artifacts/text-flow/exclusion-fixed-vs-surgical/report.json
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/exclusion-optimized-experiment1 --compare artifacts/text-flow/exclusion-fixed-vs-surgical/report.json
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/exclusion-optimized-vs-surgical --compare artifacts/text-flow/surgical-vs-baseline/report.json
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/exclusion-optimized-vs-unoptimized --compare artifacts/text-flow/exclusion-fixed-vs-surgical/report.json
npx tsx scripts/text-flow-seam-costs.ts --out exclusion-optimized-vs-unoptimized --paired exclusion-optimized-vs-surgical --previous surgical-vs-baseline
npx tsx scripts/text-wrap-cost-summary.ts
npx tsx scripts/text-wrap-optimization.ts artifacts/text-flow/wrap-optimization-qualified.json
npx tsx scripts/text-wrap-optimization.ts artifacts/text-flow/wrap-optimization-qualified-repeat.json
npx tsx scripts/text-wrap-parity.ts artifacts/text-flow/wrap-exclusion-optimized-final.json artifacts/text-flow/wrap-before.json
npx tsx --test --test-concurrency=1 packages/text/test/exclusion-rounding.test.ts packages/text/test/exclusion.test.ts packages/text/test/exclusion-fonts-budget.test.ts packages/text/test/wrap-selector.test.ts packages/text/test/composition-parity.test.ts packages/text/test/composition-native-parity.test.ts packages/text-flow/test/adapter.test.ts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
git diff --check
```

Results: **1,434/1,434 full tests; 30/30 focused; zero failed/skipped**. Typecheck
includes a full build. All 12 browser graph checks and 15 clean external tarball
closures pass, including NodeNext/Bundler declarations without source aliases.
The separate Playwright suite was not run. The browser large-chunk warning and
the arithmetic negative-control diagnostic remain passing controls, not waivers.

Initial harness setup rejected an unsupported esbuild regexp flag, then a
cross-module error-prototype/stack comparison; corrected to supported filter
syntax and structured JSON diagnostics. Typecheck caught dynamic-import record
typing/possibly missing entries, corrected before final gates. An exploratory
benchmark accidentally retained observation getters in timed inputs and is not
used for runtime acceptance; qualified runs explicitly separate plain timing
inputs from untimed observations. No failure is silently counted as a pass.

## Code principles and handoff

Checklist: correctness/unsafe-pattern review complete; defaults followed; files
cohesive and ≤400 lines; functions <50 lines and nesting ≤3; comments limited to
invariants/intent/tradeoffs; risk-based unit and deterministic differential tests
added; lint/typecheck/tests pass. **No approved exception** and no Changeset
(repository does not use Changesets). No diagnostic stripping, validation bypass,
quota increase, feature expansion or graph-boundary weakening.

Acceptance completed: preserved semantics and fixes, shared single wrapper,
positive paired retained-byte reduction, actual-work reduction, repeated
same-process runtime evidence and required gates. Remaining: independent audit
of the delivered dirty/untracked scope and caller's cost-acceptance decision.
Auditor should challenge sentinel/atomic/whitespace edges, retry/cache and exact
charge parity, inspect timed versus observed harness isolation, reproduce bundle
flags/sizes and zero-package deltas, and judge the explicitly retained 384/510-byte
ordinary tax. No further tuning/delivery is authorized in this assignment.
