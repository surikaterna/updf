# PR #77 tooling review follow-up

YOLO self-validation, not independent audit. Worktree
`/home/sprawl/projects/updf/trees/fontkite-review-fixes`, branch
`feature/fontkite-review-fixes`, initial reproduction base
`03c63cbc0763189e68a6ff5251ce8e15e49c1826` (includes merged #78 and #79).
After delivery authorization, the local branch was fast-forwarded to
`8888d62644ab925434fb9b93564cf702cbe3d2d0`, the current #76 head, preserving the
bounded tooling patch. GitHub records delivery status; the validation below
distinguishes the original reproduction from the final integrated base. Review
threads are left for the reviewer rather than marked resolved by the implementer.

## Reviewed threads

1. [Body deadline / stalled cancellation](https://github.com/surikaterna/updf/pull/77#discussion_r4252842236).
2. [Serialized Fraction command arguments](https://github.com/surikaterna/updf/pull/77#discussion_r4252842291).
3. [Stale PR scope and corpus counts](https://github.com/surikaterna/updf/pull/77#discussion_r4255196166).

The current remote head already has successful quality, production-browser/showcase,
and SVG-reference CI jobs. Those results do not prove these missing edge cases or
validate this unpushed patch. The reviewer text claiming combined-stack CI is still
pending is stale relative to the inspected GitHub check results.

## Deadline fix

Three new regressions failed against the unchanged cache implementation:

- A body read ignoring abort, with cancellation returning a never-settling promise.
- An oversized body whose cancellation never settles, masking the size failure.
- A supplied fetch promise that itself ignores abort.

All remained pending until the test's independent 1500 ms guard fired, despite a
20 ms requested deadline. No cache object was published.

Instead of maintaining another timeout implementation, `cache.ts` now delegates
transport to the existing public `@updf/assets` loader. That implementation races
headers and reads against abort, limits streaming bytes/reads, and performs
best-effort cancellation without waiting indefinitely. The corpus still verifies
the exact pinned size and SHA-256 before atomic publication. No asset-library or
font-parser implementation was changed.

Tests assert lock release, attempted cancellation, no partial cache object, and
successful recovery on a subsequent valid download. Existing cooperative-abort
tests check `AssetError` code LOAD and observed abort signals rather than relying
on injected error text winning a promise race. Transport errors now follow the
shared loader contract; integrity failures remain explicit corpus errors.

## Command normalization

The serialized rational regression failed before the patch: strings such as
`"1/2"`, `"-3"` and `"7/2"` were compared literally with numeric path coordinates.
The new `path-commands.ts` validates command kinds/arity and converts numeric or
canonical integer/rational arguments into finite numbers before normalization.
It creates a copy; raw commands and rational oracle evidence are not rewritten.
The trace's extremum-witness conversion uses the same validated boundary helper.

Qualification: the existing pen does not universally write Fraction objects into
`commands`. Its rational point conversion is local to the exact-bounds candidates;
normal FontTools commands commonly remain ints/floats. The finding was reproduced
with actual Fraction-valued pen inputs, whose `json.dumps(default=str)` output is
the mixed numeric/string fixture used by the test. This is a real serialization
boundary fix, not a claim that every previous corpus trace failed.

Additional tests reject zero denominators, malformed/nonfinite coordinates, sparse
argument arrays and invalid command shapes. There is no geometry tolerance or
change to the independent rational bounds calculation.

## PR description

Prepared an updated body at
`/tmp/opencode/updf-pr77-description-03c63cb-review.md`. It describes the merged
selector and fuzzing scope, 34 files / 30 supported faces / four rejection controls,
24,541 prepared mappings, 34/34 oracle-backed checks and 12 retained Fontkit parity
differences. It separates current-head green CI from this local, unpushed patch.
The user subsequently authorized publishing the refreshed description, delivering
the fixes as a follow-up, and replying with the corresponding validation links.

During this work, #77 merged into `feature/font-loading` at
`8888d62644ab925434fb9b93564cf702cbe3d2d0` (2026-10-13T06:15:27Z).
#76 and #75 remain open. These fixes were not part of that merge and are delivered
as a follow-up to the updated font-loading branch. The refreshed description
identifies #77 as merged instead of attributing the follow-up to its old head.

## Validation

| Command | Outcome |
| --- | --- |
| `npx tsx --test --test-concurrency=1 tests/integration/font-corpus-deadline.test.ts tests/integration/font-trace-commands.test.ts` before the fix | four reproductions fail as expected |
| `npx tsx --test --test-concurrency=1 tests/integration/font-corpus-cache.test.ts tests/integration/font-corpus-deadline.test.ts tests/integration/font-trace-commands.test.ts tests/integration/font-extrema.test.ts` after the fix | 15 pass |
| `npm run format:check` | pass |
| `npm run lint` | pass, including AST principles gates |
| `npm run typecheck` | pass, full package build and workspace checking |
| `npm test` | **1,082 pass** on the initial base; **1,089 pass** after integration with `8888d62`, zero failures/skips/cancellations |
| `git diff --check` | pass |

Live cold transport smoke (new cache directory; one font and its license):

```sh
UPDF_FONT_CORPUS_CACHE=/tmp/opencode/fontkite-review-fetch \
  npm run corpus:fetch -- --id sourcesans3-regular
```

Both pinned objects downloaded and verified successfully. Unit tests still require
no network. A real Lato Bold extraction/trace also passed:

```sh
UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache \
  npm run test:font-corpus -- --id lato-bold --offline \
  --output artifacts/font-corpus/trace-report.json
# Expected exit 1: Fontkit parity differs; the report is still produced.

/tmp/opencode/fontkite-oracle-venv/bin/python -B scripts/font-corpus/exact-analysis.py \
  --report artifacts/font-corpus/trace-report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/exact-analysis.json

UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache \
  npx tsx scripts/font-corpus/trace-discrepancies.ts
```

Full independent verification reused the previously generated, hash-bound oracle:

```sh
UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache \
  npm run test:font-corpus -- --suite all --offline \
  --oracle /home/sprawl/projects/updf/trees/fontkite-hardening/artifacts/font-corpus/bounds-oracle.json \
  --output artifacts/font-corpus/verified-report.json
```

Result: **34/34 pass**, including a rerun after clean `npm ci --ignore-scripts --no-audit --no-fund`
and full build on `8888d62`, with 12 Fontkit parity differences still visible. No full
showcase/browser rerun or new large fuzz campaign is claimed for these tooling-only
fixes. The root suite includes ordinary bounded fuzz smoke and packed consumers.
The existing arithmetic negative control still emits its intentional esbuild error
inside the passing suite.

Principles: reuse the established transport, keep cache integrity/limits intact,
validate wire-coordinate domains exactly, preserve evidence and unrelated work,
and add targeted regressions. No new package dependency, numerical policy exception,
suppression, release or deployment. Review threads remain open for reviewer confirmation.
