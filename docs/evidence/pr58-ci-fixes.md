# PR #58: two hosted-CI remediations

Worktree: `/home/sprawl/projects/updf/trees/layout-kernel`, branch
`feature/layout-kernel`, base/HEAD `c16e1cb60b4905f7d6017a6ad043f7abda8d3cac`.
Changes are uncommitted. No tracker, workflow, deployment or service changes.

## History-independent byte preservation

Run [37232636387](https://github.com/surikaterna/updf/actions/runs/37232636387)
passed 686/687 native tests; the remaining test required a historical Git object
absent from checkout's depth-one history. The replacement hashes raw source
bytes against a pinned SHA-256, not current source against itself.

Provenance command (full-history checkout, run before editing):

```sh
git show e96d2741f8d4a5f3086e6b95ff61a5967db7e7f1:packages/core/src/measurement/arithmetic.ts | sha256sum
```

Result: `6c99483a778c69420c73b74c4745247479d484c4d6d0eacce1be1ed28b0dd620`.
The extracted kernel file has the identical digest. Production bytes unchanged.
No other Git lookup exists in the kernel default tests; optional historical
baseline scripts remain unchanged.

Historyless proof: `git archive HEAD | tar -x -C /tmp/opencode/pr58-historyless`,
link existing `node_modules`, build the archived kernel with
`npm run build -w @updf/layout-kernel --prefix /tmp/opencode/pr58-historyless`.
From **that archive cwd**, run:

```sh
git cat-file -e e96d2741f8d4a5f3086e6b95ff61a5967db7e7f1
GIT_CEILING_DIRECTORIES=/tmp/opencode ./node_modules/.bin/tsx --test --test-name-pattern='arithmetic extraction' packages/layout-kernel/test/boxes.test.ts
```

Object check fails (no repository); original test fails at `git show`.
Apply only the delivered test diff to the archive: test passes 1/1.
Add one trailing space to the archived arithmetic source's first comment:
test fails with actual digest `435eb13ce825e109a6ce94c2c600918ca43948795bc77bb3d921c2abaf88c3a4`.
The mutation is only in the disposable archive, not this worktree.

## Narrow showcase diagnostics

Hosted browser artifact `browser-version.log` confirms **Google Chrome
154.0.8037.57**; hosted showcase passed 55/56, failing the existing 375px
document-width assertion. No rich failure screenshot exists in that artifact:
the assertion precedes screenshot capture. Download inspected with:
`gh run download 37232636387 -n browser-evidence -D /tmp/opencode/pr58-hosted-browser`.

Installed full Chrome-for-Testing **154.0.8037.0** at
`/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome`
was used without installing a browser. It passes the original 375px test locally;
this is not exact hosted patch/font-environment reproduction.

Observed local root cause: the unbroken diagnostic path in `#status` cannot
wrap under `white-space: pre-wrap` alone. Before the fix, the new regression
fails at 320px with document width 366 and status scroll width 333 in a 254px
box. At 375px with monospace fallback and a reserved 24px scrollbar, status
scroll width is 451 in a 285px box, document width 484. After
`overflow-wrap: anywhere`, document width is 351 (375 minus scrollbar) and
the diagnostic fits. No clipping, assertion tolerance or viewport change.

Geometry/screenshot capture script: `/tmp/opencode/pr58-overflow.ts`.
`PR58_OLD_CSS=1` restores only the old wrapping rule in the browser for the
before capture; without it captures the fix. Evidence:
`/tmp/opencode/pr58-geometry-{before,after}.log` and
`/tmp/opencode/pr58-overflow-{before,after}.png`.
Regression covers 320/370/375px with default font and monospace fallback +
24px stable scrollbar gutter. It checks controls/diagnostic bounds, unchanged
source text, source panel horizontal scrolling, and keyboard focus order.

## Gates

From the assigned worktree, all final checks pass:

- `npm run format:check` (`/tmp/opencode/pr58-format.log`).
- `npm run lint` (`/tmp/opencode/pr58-lint.log`). Initial max-depth failure in
  the new test was fixed by flattening cases, without reducing coverage.
- `npm run typecheck` (includes safe root package build;
  `/tmp/opencode/pr58-typecheck.log`).
- `npm test`: **687/687** (`/tmp/opencode/pr58-native.log`).
- `npm run build:showcase` (`/tmp/opencode/pr58-showcase-build-green.log`).
- `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase`:
  **57/57** (`/tmp/opencode/pr58-showcase-final.log`), 600000ms timeout.
- `git diff --check`.

Code-principles self-check: correctness/red-green and byte-mutation rejection;
cohesive files below 400 lines; changed functions below 50 lines and nesting
at most three; comments explain provenance; risk-based regression coverage;
lint/tests pass. No new exception or Changeset (showcase-only CSS/test change).
Core/kernel production, PDF fixtures, SVG thresholds (#48/#50), workflows and
playground dist are unchanged. Hosted CI on a new commit remains for parent
delivery/monitoring after independent audit; no hosted-green claim.

## 2026-10-04 follow-up: wire the historical paragraph control

Addresses [PR #58 discussion r4179232761](https://github.com/surikaterna/updf/pull/58#discussion_r4179232761).
Same worktree/branch; this follow-up starts at clean base/HEAD
`2d9cc4d7a785d2eefbd2aa20a065bab52b621cb8` and remains uncommitted.

Baseline esbuild probe (`stdin` exports `layout` from `@updf/layout`, with
the original dist-only onLoad filter and `metafile: true`) returned:

```json
{"hits":0,"inputs":["packages/layout/src/content-producer.ts"]}
```

Root tsconfig source resolution bypassed the control: the earlier paragraph
comparison was current versus current, not historical compatibility evidence.
No checkout-depth change is needed. The replacement accepts the resolved source
path (and dist for compatibility), asserts exactly one producer metafile input
and exactly **one** replacement hit, and resolves historical relative imports
from layout source. These assertions run before importing each control bundle.

The test-only `tests/integration/fixtures/pre-c-content-producer.ts.txt` preserves
the exact historical bytes. Development provenance:

```sh
git show cb719c2e709f0d2ee2dc79773fb093c9ce17650a:packages/layout/src/content-producer.ts | sha256sum
```

SHA-256: `eb2c1c642e0eaf4f384e78edd84d169a5a6fc7d3b3402b6f9cfeb829d06db32c`.
The independent certificate is pinned in `kernel-paragraph-control.ts`; tests
read the fixture, never Git. An appended source byte must fail certification.
A separate in-memory mutation inserts a producer-body throw: public paragraph
execution rejects with exact message `PRE_C_PARAGRAPH_PRODUCER_EXECUTED`.
It is not an import-time throw; different bundled bytes produce a different
data URL, avoiding reuse of the unmutated module. No real source is mutated.

The original paragraph input, including style/lineHeight semantics, PDF byte
comparison, data/TSX comparison, three-page ranges, qpdf check, Poppler line
order and raster generation are unchanged. The real historical comparison
passes; no golden or expected output was altered.

Fresh historyless reproduction (no shared node_modules): archive base HEAD to
`/tmp/opencode/pr58-control-historyless`, overlay the three delivered test files
with tar, then from that directory run `npm ci --ignore-scripts --no-audit
--no-fund`, `npm run build`, and `GIT_CEILING_DIRECTORIES=/tmp/opencode npm test`.
Result: **688/688**, zero failures/skips. `GIT_CEILING_DIRECTORIES=/tmp/opencode
git rev-parse --is-inside-work-tree` fails: no repository. Logs:
`/tmp/opencode/pr58-control-historyless-{install,build,native}.log`.

Local follow-up gates all pass:

- `./node_modules/.bin/tsx --test tests/integration/kernel-paragraph.test.ts`: **2/2**.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass.
- `npm test`: **688/688**, zero failures/skips.
- `npm run test:consumer`: all **eight** clean tarball closures pass.
- `npm run check:graphs`: all **12 existing** browser graph reports pass;
  no app rebuild. `npm run check:licenses`: all **eight** package tarballs pass.
- `npm pack --dry-run --json ./packages/<name>` manifest assertions exclude
  the historical fixture/helper for layout-kernel/core/layout/tables/geometry/
  svg/fontkit/legacy (99/299/399/51/37/76/19/66 files respectively).
  Both `artifacts/{module-graphs,installed-graphs}.json` also exclude them.
- `git diff --check`: pass. Gate logs: `/tmp/opencode/pr58-control-*.log`.

Browser tests were not rerun for this test-only change. Prior hosted provenance:
[run 37234214764](https://github.com/surikaterna/updf/actions/runs/37234214764),
at base HEAD, passed native **687**, production browser **9**, showcase **57**,
and playground browser **5**. Its separate unmodified SVG-reference job failed
(#48/#50); the overall run is not green. These are prior results, not hosted
validation of this follow-up. No thresholds, retries or workflows changed.

Code-principles checklist passes: correctness and fault-injection coverage;
cohesive files below 400 lines, changed functions below 50 and nesting at most
three; intent/provenance comments only; lint/tests pass. No new exception or
Changeset: test fixture/helper/test and evidence only, no runtime package change.
No app build, served playground dist, showcase CSS, other worktree, tracker,
staging, commit or delivery mutation. Ready for independent audit, not verified.

## 2026-10-04 follow-up: preserve app pagination input order

Addresses [PR #58 discussion r4179380528](https://github.com/surikaterna/updf/pull/58#discussion_r4179380528).
Worktree/branch unchanged; clean starting HEAD
`e586f16c254fafb390dbdea3d5ffd22504ff921e`. PR base is `develop`,
`12e485b9ac881f2d6ba620a390ba36ff7ea8a4b2`. This slice is uncommitted.

Root cause is purely app host grouping: filtering all lines and then all atomics
silently reordered mixed inputs. Blocked metadata subsequently indexed the
original input using the reordered accepted count. The helper now scans input
order, coalesces only adjacent line runs, and gives each atomic its own source.
Blocked metadata reads the same grouped progression as the operation.
Kernel selectors, region progress, unit heights, geometry, provider `next`, and
budgets are unchanged. Source-bar/client selection still uses original unit IDs.

Line-run source IDs/paths are `paragraph`/`/paragraph`, then `paragraph-2` etc.,
skipping IDs reserved by any input unit. Allocation is deterministic within an
operation. Atomic IDs/paths remain the original unit IDs/paths. Duplicate input
unit IDs reject with `VALUE` at the duplicate unit path, rather than permitting
ambiguous identity. Mixed inputs therefore have intentionally different source
group identities and run-local offsets; this is not a claim of unchanged source
IDs for all inputs. Placement `start`/`end` index the adjacent run (atomics 0/1).
Original unit paths, lineIndex, measured line top/baseline and UTF16 fragment
source spans remain untouched and are not replaced by those run-local offsets.

Risk regressions cover atomic-before-lines, line/atomic/line, consecutive
atomics, empty input, blank lines, source coverage/order across pages, exact
accepted prefix at cap, oversized atomic and oversized line blocked metadata,
multiple line groups, generated-ID collisions, and duplicate unit rejection.
Before the fix, `tsx --test apps/layout-playground/test/pagination.test.ts`
failed all three initial tests: reordered coverage, non-prefix acceptance,
and `paragraph` source identity collision. After the fix the final four tests
pass. The prefix case accepts only `line-0` at cap 1/height 18; with a larger
cap it blocks at `atomic-row` (height 70), not a later line.

The new real-PDF test passes qpdf, Poppler text order/coordinates, and atomic
edge raster checks. Its row is at PDF y=38 after `First`; a later blank line
fits below it, and `Last` resumes on page 2. A negative PDF rendered from the
old partition order fails both text geometry and atomic raster checks. No fake
kernel results. The raster helper now checks line/row non-overlap on either side
of the row, instead of assuming every line must precede it.

Final worktree gates:

- `npm test -w @updf/layout-playground`: **12/12** (previously 7); includes
  qpdf/Poppler and positive/negative PDF raster checks.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass.
  Typecheck builds root packages/examples/legacy, not app dist. The initial
  new-fixture optional-property type error was fixed before the final pass.
- `git diff --check`: pass.

Isolated build/browser evidence: archived starting HEAD into
`/tmp/opencode/pr58-grouping`, overlaid only the five changed app source/test
files, and read-only reused dependencies through a symlink to this worktree's
existing `node_modules`. No dependency install. From that archive cwd:

- `npm run build -w @updf/layout-playground`: pass (root base, isolated dist).
- `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser -w @updf/layout-playground`:
  **5/5**, including actual browser/Node PDF-byte parity and unit-ID selection.
  Harness ephemeral preview/browser processes close in `finally`.
- `./node_modules/.bin/tsx preservation.ts`: compares old helper extracted with
  `git show HEAD:apps/layout-playground/src/pagination.ts` to the new helper.
  Default paragraph/row, leading blank line, blocked height 18/cap 20, and
  capped default all have identical complete snapshots/counts/blocked metadata;
  complete cases also have exactly identical PDF bytes.

Root native tests are not rerun: no production package or root test changed;
prior **688/688** evidence above remains applicable, not a fresh result.
Production browser 9/showcase 57 and separate known SVG #50 failure are also
prior evidence only. No SVG thresholds/retries, CSS, workflows, services,
Tailscale configuration, active `/layout` app dist, other worktrees, or tracker
changed. Hosted outcome for this slice remains unknown until parent delivery.

Code-principles checklist passes: correctness/red-green and real-PDF negatives;
cohesive source below 400 lines, changed functions below 50 lines and nesting
at most three; no unnecessary comments; proportional tests; lint/tests pass.
No new exception and no Changeset: private app-only runtime fix. Implementation
is ready for independent audit; no stage/commit/push or delivery authorization
was exercised.
