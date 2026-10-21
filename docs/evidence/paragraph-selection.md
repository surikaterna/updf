# Bounded raw/rich paragraph selection — implementation evidence

Issue: N/A. This is one paragraph-selection batch, **implemented for independent
audit**, not verified, published, a whole-flow closure or either user-2 FINAL pass.
No tracker, staging, commit, push or PR mutation was performed.

## Entry, ownership and provenance

- Exact worktree: `/home/sprawl/projects/updf/trees/flow-admission`.
- Branch: `feature/flow-admission`; base and unchanged HEAD:
  `b70da49ace00c19a8e570b4fc783806dffd6931c`.
- Entry had 108 inherited dirty paths. Before production edits,
  `artifacts/paragraph-selection/snapshot.mjs` captured their status plus all 1,424
  tracked/nonignored-untracked source hashes and full contents, and the compiled
  layout/layout-boxes/text/core trees. This is the actual audited dirty entry,
  including A/B1 and the public next-provider migration, **not Git HEAD** or another
  worktree. Entry files are under `artifacts/paragraph-selection/entry`.
- Prior `artifacts/provider-units/final-state.json` SHA-256 matched
  `5f668b70b26ed05f0f3934e02a1aa2b42aa28fca82dab780eacb47e6bf82244b`.
  The manifest and all historical evidence remain unchanged.
- Owned production files only: `packages/layout/src/paragraph-fragments.ts`,
  `paragraph-producer.ts`, `content-producer.ts`, `blocks.ts`. Owned tests are the
  three new `paragraph-selection*.test.ts` files and narrow explicit-binding
  changes in `paragraph-fragments.test.ts` and `inline-background.test.ts`.
  Active documentation changes are limited to AGENTS, layout-boxes, content roles,
  flow-admission contract and this evidence file.
- `delivery.mjs` compares **entry hashes**, rejects any changed frozen source path,
  checks the prior manifest/HEAD/empty index, and writes `final-state.json` with
  all delivery hashes, entry/delivery deltas, actual Git status and gate results.
  All delivery changes are unstaged/untracked; ignored artifacts are local evidence.

## Implementation and intentionally changed policy

The existing `paragraph-fragments` binding now accepts structural readonly
`ParagraphMetrics { lines: readonly { height }[], height }`. Rich measurement fits
directly. Raw measurement wraps the existing lines reference and maps
`consumedHeight` to `height`; it does not remeasure or copy lines. Both producers
require an explicit binding, and `prepareLeaf` passes `paragraphFragments(lifetime)`
on both branches. There is no implicit standalone/unclosed operation.

One operation owns all paragraph sources/retries in each enclosing lifetime. Its
width-only provider returns a numeric line-index payload and one line height, or
one total-height unit for nonempty keepTogether. It consumes one provider-work
unit per callback, including a kept paragraph, not one per painted line. It never
paints, constructs native nodes, calls a public measured-block bridge, or reads
capacity. Kernel `select` alone chooses endpoints. Raw's capacity-selection loop
and separate keepTogether fit guard are deleted. Accepted ranges alone reserve
ancestors/output, then distinct raw/rich painters emit the selected lines. Kept
source offset/end 0/1 maps to the complete painted line range 0/lineCount.

Split extent is `max(1, lineCount)`; kept extent is one. A true zero-line paragraph
emits one empty zero-height private fragment, even with unrelated natural-height
metadata, and exhausted requests emit nothing. This corrects rich zero-line extent
zero. A measured blank paragraph can still have a real blank line: the paired
empty-text fixtures preserve that measurement rather than forcing it to zero.
Native measurement of an empty paragraphs array is separately checked as zero
lines/zero consumed height. Legal nonempty zero-height lines progress without
fabricated positive certificates; existing positive intervals retain their private
ownership and compensated offsets. All rich backgrounds still precede foreground.

**Intentional quota adoption:** the paragraph `MAX_SAFE_INTEGER` override is
removed. Unchanged finite `fragmentDefaults` now apply to raw and rich together;
10,000 alternating rejected requests succeed at the attempts boundary and request
10,001 fails LIMIT before further provider work. Work is cumulative and never
rolled back with tentative output. This can reject large valid documents formerly
admitted. No limits were raised to pass tests/showcase. Output budgets remain
separate. Exact width identity, numeric domains, native certificates and kernel
arithmetic/default values are unchanged. Existing LayoutInputError selection
mapping to DocumentError and enclosing finally/close hooks remain the owners.

Not implemented: a generic paragraph measurement engine, unified painter, B1 native
placement integration, or removal of the private PreparedBlock.fragment bridge,
stack/container/nested height-aware paths. No new service bag or callback framework.

## Checks and risk-based coverage

All commands ran in the exact worktree above. Logged gates use:

```sh
unshare --user --map-root-user --mount sh -c 'mount --bind "$PWD/artifacts/paragraph-selection/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/paragraph-selection/cache"; COMMAND'
```

This binds only this batch's disk-backed temporary directory, with no host config
or installation changes. `python artifacts/paragraph-selection/gates.py NAME...`
runs commands serially, preserving actual exit codes in `gates.json` and full
named logs. There are no abandoned asynchronous checks.

| Command | Final result |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, including AST code-principles gate |
| `npm run typecheck` | PASS, including full serial workspace `npm run build` |
| `npm test` | PASS: 1,290 tests, zero failures/cancellations |
| Focused command below | PASS: 72 tests |
| `npm run test:consumer` | PASS: 14 clean packed external consumers, declarations/runtime |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | PASS: all 12 browser dependency graphs |
| `npm run test:browser` | PASS: 18 tests |
| `npm run build:showcase` | PASS |
| `npm run test:showcase` | PASS: 101 tests, no default-quota blocker |
| `git diff --check` | PASS |

```sh
npx tsx --test packages/layout/test/paragraph*.test.ts packages/layout/test/inline-background.test.ts packages/layout/test/cancellation.test.ts packages/layout/test/content.test.ts packages/layout/test/content-normalization.test.ts packages/layout/test/flow-admission-lifecycle.test.ts packages/layout/test/measured-source.test.ts packages/layout/test/measured-cache.test.ts
```

New tests cover both actual producer branches, kernel endpoint/height agreement at
exact/just-over/occupied fits, fresh retry/source-index continuity, kept all-or-none
selection and all-line reservations, zero-line and zero-height progress/no ghosts,
mixed zero/positive certificate ownership, successor-width rejection before line
work and poison, real measurement/cache identity at exact widths, shared finite
default exhaustion, lifetime isolation, selected-only ancestor/output reservations
and monotonic rejected-lookahead work. Actual raw/rich layout failure closes the
owner. A `--expose-gc` child proves retained closed bindings release rich callback
resources. Existing cancellation/background/native render tests remain intact.

Architecture tests parse the actual production source ASTs: both emitters import
and call the canonical binding, no local fit call/capacity branch or measured-source
bridge exists, and both prepareLeaf branches pass the same lifetime binding. The
provider callback is inspected separately for capacity/paint access. Negative
controls restore the old local fit-loop expression and a scalar capacity branch;
both fail the architecture assertion while legitimate MetricSum emission passes.

Development checks initially caught excessive nesting in a test (refactored, no
exception). The paired harness initially used nonexistent text-service keys, then
compared Uint8Array and Buffer object types; both harness errors were corrected
without production shims. One combined gate tool call timed out during browser
tests after packed/build/graphs passed; that browser run was interrupted, not a
pass. No batch process remained; a standalone rerun passed all 18. Final logs and
exit codes supersede these attempts, not their assertions.

## Paired native output and costs

`node artifacts/paragraph-selection/paired.mjs before` bundles the **captured entry
compiled artifacts** through a logged esbuild onLoad mapping; it does not restore
files or reconstruct baseline from HEAD. `... after` uses the current serial build.
Each arm creates its own font runtime, owned resources/text service and author
objects; no owned handles cross bundles. The raw arm uses an unowned raw paragraph
object, asserts `authorParagraph` is undefined, probes real `prepareLeaf`, and runs
the actual low-level flow layout. The rich arm uses public factories/layout.

Eight paired fixtures cover raw/rich split, kept, empty-text and rich tight-line
background/nativeInline split/kept content. Exact documents, placements, node counts,
measurement callback counts and native PDF bytes match. All 16 PDFs pass
`qpdf --check`; `pdftotext -bbox` outputs and all `pdftoppm -r 96` PPM bytes match
exactly. No raster threshold was introduced or loosened. The zero-line private
fragment correction is tested separately, not mislabeled as a public blank-text
PDF difference. Existing focused tests cover advanced inline callbacks/background
ordering, clipping and prepared-font rendering beyond these eight proof fixtures.

| Fixture | measure / rich / inline callbacks, each arm | Native nodes by page, each arm |
| --- | --- | --- |
| raw split | 2 / 6 / 0 | 2, 1 |
| raw kept | 2 / 6 / 0 | 3 |
| raw empty text | 2 / 2 / 0 | 1 |
| rich split | 0 / 6 / 1 | 4, 2 |
| rich kept | 0 / 6 / 1 | 6 |
| rich empty text | 0 / 0 / 1 | 1 |
| rich visual split / kept | 0 / 6 / 1 | 12 |

Raw totals include the explicit private-path probe as well as layout; rich
callbacks include unchanged native validation/render preparation. Full traces,
loaded baseline module hashes, PDFs, bbox, rasters, timings and profiles are in
`before-proof.json`, `after-proof.json` and fixture-named artifacts.

Same esbuild browser/ESM profiles, raw / minified / gzip bytes:

| Profile | Entry | Delivery | Delta |
| --- | --- | --- | --- |
| layout consumer | 312749 / 160445 / 51067 | 313035 / 160582 / 51070 | +286 / +137 / +3 |
| text paragraph | 334676 / 170194 / 54463 | 334962 / 170331 / 54482 | +286 / +137 / +19 |

The small positive bundle delta buys mandatory shared finite selection for raw
paragraphs and empty/zero-height correctness; no net-negative cost is claimed.
Each raw trial now allocates the existing kernel selected-unit metadata; no new
native output wrapper or measurement snapshot is introduced. Rich positive-line
certificate collection additionally filters optional zero-line entries.

Representative paired medians (milliseconds; five warmups, 15 complete layout/render
runs per fixture, separate sequential arms): raw split 1.272 → 1.437, raw kept
1.036 → 1.132, rich split 1.328 → 1.335, rich kept 1.249 → 1.208, rich visual split
1.519 → 1.879. These short timings are noisy and not a speedup/benchmark guarantee;
raw now performs real shared kernel accounting. All raw timings are retained.

## Code-principles and audit handoff

Checklist self-check: correctness/boundaries validated; no unsafe bypass or fallback;
cohesive owned source files under 400 lines; functions under 50 lines and nesting
at most three; comments explain invariants; risk-based tests added; lint/tests pass.
No approved exception was needed. No Changeset: this private unpublished workspace
does not use Changesets. Independent Auditor should review the entry-relative hash
delta and scope, exact operation sharing/quota adoption, source cursor versus line
index handling, zero/positive interval ownership, real raw-path provenance, lifetime
release, and paired native/gate evidence. Remaining flow migrations are separate
future assignments, not work authorized by this handoff.
