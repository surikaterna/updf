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

## 2026-10-05: prepared width fit and historyless arithmetic profiling

Bounded PR #58 review fixes (Copilot prepared-width finding and discussion
r4179506395). Worktree `/home/sprawl/projects/updf/trees/layout-kernel`, branch
`feature/layout-kernel`, clean starting base/HEAD
`6d4fe13b2aa92f36494f37555004ec19a6b4877c`. All changes remain unstaged/uncommitted;
no tracker or delivery mutation. Issue ID: N/A (PR review assignment).

### Runtime fit contract

`viewBox` now checks compensated width minus left/right insets against the
compensated child-width total plus fixed gaps, before `placeResolved`. This uses
the same existing `exceeds` metric policy as its vertical prepared precondition;
no new epsilon, allocation, resize, truncation, margin or wrapping behavior.
Generic boxes and later strict PDF materialized-geometry checks are unchanged.
Zero child sizes remain accepted. The README states both prepared fit checks.
Aggregate fit is checked after the indexed child snapshot: trusted `childAt`
size callbacks legitimately run to discover the total, once per child. Invalid
metadata/counts/accessors reject before child callbacks; no content measurement
is introduced.

Focused tests cover child totals, gaps, each inset, combined reservations,
empty rows with oversized insets, nonfinite totals, exact ordinary/fractional/
tiny/large fits, zero sizes, invalid numeric fields/counts and accessor rejection.
The standalone packed consumer checks true inset-associated output bounds and
rejects the real width-10/two-width-8 example. A separate actual bundled old/new
probe (`/tmp/opencode/pr58-review-profiles.mjs`) confirms old output coordinates
`[[0,8],[8,8]]` reach 16; current execution throws `GEOMETRY` at
`/actual-overflow`. Neither result is mocked.

### Historical control

`scripts/layout-kernel-baseline.ts --baseline` now loads the test-only
`tests/integration/fixtures/pre-kernel-arithmetic.ts.txt`, with independent pinned
SHA-256 `6c99483a778c69420c73b74c4745247479d484c4d6d0eacce1be1ed28b0dd620`.
Provenance is the original
`e96d2741f8d4a5f3086e6b95ff61a5967db7e7f1:packages/core/src/measurement/arithmetic.ts`,
as certified above. No Git object, network or install is needed at runtime.
The cohesive script helper accepts source/dist resolution, asserts exactly one
matching metafile input and one replacement, and reports revision/path/digest,
resolved input and replacement count before executing the bundle.

The focused regression exercises both source and dist hooks, rejects an appended
source byte and a wrong-entry/zero-hit graph, retains loader parse-error origin,
and inserts a throw inside historical `MetricSum.add`. Public **rich** core
measurement executes that exact body sentinel; the unmutated control succeeds.
Default current profiling remains current. Missing rows evidence fails clearly
with the build/test prerequisite and original ENOENT cause, not a hidden install.
Historical evidence above is not rewritten or presented as a new baseline run.

Historyless reproduction: archive starting HEAD to
`/tmp/opencode/pr58-review-historyless`, overlay this slice's tracked diff and
four new files, copy existing node_modules preserving local workspace symlinks,
then from that archive cwd run `npm run build`,
`GIT_CEILING_DIRECTORIES=/tmp/opencode npm test` (**694/694**), and
`GIT_CEILING_DIRECTORIES=/tmp/opencode ./node_modules/.bin/tsx scripts/layout-kernel-baseline.ts --baseline`.
The final control metadata reports `packages/core/dist/measurement/arithmetic.js`
and **1** replacement. Git repository detection fails as expected. No install.

### Fresh cost and preservation evidence

Captured existing profiles before editing at the starting HEAD, then reran
`tsx scripts/{kernel-profile,box-profile,fragment-profile,layout-kernel-baseline}.ts`.
Logs/JSON: `/tmp/opencode/pr58-review-{before,after}-{kernel,box,fragment,core}.json`
and `/tmp/opencode/pr58-review-profiles.log`.

| Scope | Before raw/gzip | Current raw/gzip |
| --- | ---: | ---: |
| Allocator/numeric | 4575/1991 | 4575/1991 |
| Empty generic box | 14219/5358 | 14219/5358 |
| Measured generic row | 14392/5419 | 14392/5419 |
| Fragmentation | 11306/4277 | 11306/4277 |
| Boxes + fragmentation | 21879/7772 | 21879/7770 |
| Public prepared helper microbundle | 4672/2063 | 4875/2150 |
| Current native core | 39516/13985 | 39516/13985 |

Prepared helper delta: **+203 raw / +87 gzip**. Its old/current SHA-256 values
are `168e3e7b2d4b7a18ff6c393f5981db7d092fdb8609294946c81eca0b736c0d63` and
`51d1e70b4b686cd3e5407e4ac9691735a4ca92ec2f06e740a8f6e139e9a35f03`.
Combined generic boxes/fragmentation retains no prepared-helper bytes; its small
gzip delta accompanies minified symbol changes, not new retained functionality.
Whole installed kernel unpacked bytes: **152602 -> 153529** (+927 including
emitted source/maps and README). Current core SHA-256 remains
`d4f77fda0ba7aa58bb7c8f1391ee155873a81e0cbec0fe28f0b7bbcfa7e893b0`.
Fresh historical control is 39516/13984 with SHA-256
`00664c963c61a7017a1fdbadcafc3c6564df43814223b5fc1344621c2e751b21`;
different control bundle bytes, identical PDF bytes. Four unchanged PDF hashes:

- Native: `07175eea062e0b7e4ce412840d86ad6d65a51faa6e6a081bc4ee8a0d1056ee6a`.
- CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
- Real Rows geometry: `83c3e00d2ed01e1d26721c315b6ae35a9346da3cd97f6ee89af8f7bc09f60a2e`.
- Freight: `fb0e28599369c2eccd401bd236fadcb0399de3480385e2e80fde56014381c58c`.

### Gates and delivered manifest

- `tsx --test packages/layout-kernel/test/*.test.ts tests/integration/kernel-arithmetic-control.test.ts`: **60/60**.
- `npm test`: **694/694**, including fractional PDF Rows, strict geometry and width oracle; no expectations refreshed.
- `npm test -w @updf/layout-playground`: **12/12**, real positive/negative PDFs.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `git diff --check`: pass.
- `npm run test:consumer`: **8** clean tarball closures; `npm run check:licenses`: **8** pass.
- `npm run build:browser`, `npm run check:graphs`: final serial build and **12 fresh** graphs pass.
- `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome tsx --test tests/browser/*.test.ts`: **9/9**.
- `npm run build:showcase`, `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase`: **57/57**.
- In the isolated archive only: `npm run build -w @updf/layout-playground` and
  `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser -w @updf/layout-playground`: **5/5**.
  Fresh chunk graph excludes `box-prepared`. Active 4318 `/layout` dist untouched.
- `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown`,
  `FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs`,
  and `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs`:
  pass, **4/4**, 274 projections, positive kernel controls, no PDF leaks. Same
  pinned clean Formbar revision, read-only reuse, no install/build there.

One initial browser build collided with the concurrent showcase package rebuild
(`packages/layout/dist/index.js` temporarily absent). Final serial build passes;
this was not a browser assertion retry. Gate logs use
`/tmp/opencode/pr58-review-*.log`. SVG-reference #48/#50 was not rerun: known
prior failures remain unresolved; no skip, threshold, retry or hosted-green claim.

Changed tracked files: kernel `src/box-prepared.ts` and README,
`scripts/consumer/kernel.ts`, `scripts/layout-kernel-baseline.ts`, this evidence.
New files: `packages/layout-kernel/test/prepared-box.test.ts`,
`scripts/layout-kernel-control.ts`, the arithmetic fixture and its focused
integration test. Eight dry-pack manifests exclude fixture/helper (file counts
99/299/399/51/37/76/19/66 for kernel/core/layout/tables/geometry/svg/fontkit/legacy);
installed/browser graphs exclude them too.

Code-principles checklist passes: correctness and real negative reproduction;
cohesive production files below 400 lines; changed functions below 50 lines and
nesting at most three; provenance/intent comments only; proportional regressions;
lint/typecheck/tests pass. No approved/new exception. No Changeset: project does
not use Changesets. Both acceptance slices implemented, ready for independent
audit, not verified. Remaining host action: parent audit and authorized delivery;
new hosted CI status is unknown. No unrelated contract or feature changes.
