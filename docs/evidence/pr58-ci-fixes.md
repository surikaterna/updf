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
