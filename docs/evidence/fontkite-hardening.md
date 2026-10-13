# Expanded font corpus and bounded mutation campaigns

Ad-hoc tracker N/A. YOLO implementation/self-validation, not independent audit.
Worktree `/home/sprawl/projects/updf/trees/fontkite-hardening`, branch
`feature/fontkite-hardening`, starting base/HEAD
`45bdd8bc777cb7bc7a02f8e77405191f613d9fda` (Fontkite PR #77 head).
Changes are uncommitted. No staging, push, PR, merge, deployment or upstream issue
posting. The uncommitted selector in `trees/font-engine-selector` was left untouched.

This slice changes development tooling, tests and docs only. It does not change
Fontkite parsing, numerical bounds, PreparedFont, package dependencies or UI behavior.
No parser fixes were needed for the findings observed below.

## Corpus expansion

Added 13 files from three independently maintained upstream repositories:

- Adobe Source Sans 3: Regular/Bold/Italic/Light TTF plus CFF and WOFF2 rejection
  controls, pinned to `87b37a2daaed80fcb8e8ccb0085c4d72ddade12e`.
- Adobe Source Serif 4: Regular/Bold/Italic TTF, pinned to
  `80d3f8894c09c937bebfa9011247d2e1c79fd6f4`.
- JetBrains Mono: Regular/Bold/Italic/BoldItalic TTF, pinned to
  `19371302b95d218af43299bce79ddbddd0bc364d`.

Font bytes and family licenses have pinned SHA-256s and sizes. Reviewed license
headers specify OFL-1.1; Adobe retains the Reserved Font Name Source. Downloads
reuse the existing bounded content-addressed cache and are not committed.
The warm cache supplied the original 30 objects; the expanded fetch added 13 font
objects and three license texts, for 46 distinct font/license objects total.

The corpus now contains **34 files / 12 families / four repositories**, split into
30 supported static faces and four expected rejections. The new supported files
contain real format-12 cmaps and cover both short and long loca. This is not a claim
of exhaustive supplementary-script, composite-attachment or font-toolchain coverage.

Manifest SHA-256:
`42bcb2fb4acf48500eafc882f236739cdd39a49b6b79939defe11c41f8db5afd`.
New independent oracle SHA-256:
`022fcfe203bbcf12b0772a61bb2e0b73b5780cf250e63e6903c7feddaae64445`.
The existing oracle format rejects stale manifest identities, so it was regenerated
from the verified source bytes using FontTools 4.60.1 and Fraction arithmetic.
It contains 43,350 per-GID boxes; verification checks all 24,541 prepared mappings.

**Independent result: 34/34 checks pass.** Twelve faces retain Fontkit bounds parity
differences. The plain differential run remains red (22/34 checks met, exit 1);
no new difference was waived or reclassified as an unsupported font to turn it green.
No detailed root-cause classification of every new Fontkit difference is claimed.

## Fuzz harness

`scripts/font-fuzz/` adds a seeded, deterministic, versioned mutation harness.
It uses local fixtures or verified cached supported fonts, never network fetching.
Twelve strategies include table/glyph edits, truncation, bit flips, filled spans,
bounded appends, short noise buffers, composite self-references and valid controls.

Each source has a dedicated child process with a 256 MiB V8 heap setting and a
15-second initialization deadline. One case is dispatched at a time; a watchdog
in the parent enforces the configured deadline (2 seconds for these campaigns).
It can kill a synchronous parser loop. This is not an OS/RSS memory sandbox.
IPC receipts are validated and stderr retention is bounded to 8 KiB.

Accepted cases must preserve input bytes and produce identical metadata on a
repeat with a nonzero-offset subview. Rejections must be structured DocumentErrors.
Every twelfth case is the original valid seed and must retain its baseline metadata.
Raw errors, byte mutation, determinism failures, timeouts, worker failures and bad
receipts become findings. Findings or incomplete campaigns exit nonzero.

Findings save ignored binary/JSON artifacts with source/input hashes, recipe
version, seed, case index and both single-input and prefix replay commands. Replay
can check the exact mutation checksum before parsing it. These generated files
must remain private where font-license/RFN terms require it; prefer sharing recipes
or reduced structural examples, not automatically uploading mutated font binaries.

## Campaign outcomes

Two campaigns over 32 seeds (30 corpus faces and two repository fixtures):

| RNG seed | Cases per font | Total completed | Accepted | Structured rejections | Findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| 12345 | 512 | 16,384 | 8,207 | 8,177 | 0 |
| 4294967295 | 256 | 8,192 | 4,236 | 3,956 | 0 |
| **Total** | | **24,576** | **12,443** | **12,133** | **0** |

Counts include 2,016 unmodified controls. They are not counts of distinct malformed
fonts. Many mutations remain valid or affect unused data; acceptance is not itself
a failure. Accepted inputs were also prepared a second time for the subview and
determinism check. No crash, timeout, unstructured rejection, byte mutation or
metadata inconsistency was reported in these cases.

Both campaigns were rerun after the final receipt checks; outcome counts were
identical. The final two runs used separate output directories concurrently, so
case durations are diagnostics under local load, not controlled benchmarks.
The largest retained campaign output is JSON; no finding binaries were produced
by the real campaigns. Negative-control unit tests intentionally create temporary
findings and remove them afterward.

## Validation

All commands executed from this worktree. Corpus/fuzz cache:
`UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache`.

| Exact command | Outcome |
| --- | --- |
| `npm run corpus:fetch -- --suite all` | pass, all 46 pinned objects available |
| `npm run test:font-corpus -- --suite all --offline` | **exit 1**, 12 explicit Fontkit parity differences |
| `npm run test:font-corpus -- --suite all --offline --oracle artifacts/font-corpus/bounds-oracle.json --output artifacts/font-corpus/verified-report.json` | **34/34 pass** |
| `npm run fuzz:fontkite -- --suite all --cases 512 --seed 12345 --output artifacts/font-fuzz/seed-12345` | **16,384 completed, zero findings** |
| `npm run fuzz:fontkite -- --suite all --cases 256 --seed 4294967295 --output artifacts/font-fuzz/seed-4294967295` | **8,192 completed, zero findings** |
| `npx tsx --test --test-concurrency=1 tests/integration/font-fuzz*.test.ts` | six harness tests pass |
| `npm run format:check` | pass |
| `npm run lint` | pass, including code-principles AST gates |
| `npm run typecheck` | pass, full package build and workspace checks |
| `npm test` | **1,075 pass**, zero failures/skips/cancellations |
| `git diff --check` | pass |

Independent oracle generation:

```sh
/tmp/opencode/fontkite-oracle-venv/bin/python -B scripts/font-corpus/build-bounds-oracle.py \
  --report artifacts/font-corpus/report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/bounds-oracle.json
```

Tests include negative controls for a hung worker, simulated fatal exit, uncaught
exception, wrong/incomplete receipt, input mutation, nondeterministic output,
checksum mismatch, CLI failure status and saved replay artifacts. A small real
fixture-only campaign runs in ordinary `npm test`; no external cache is required.

Initial checks caught an unsafe IPC-result cast and a 51-line function. Receipt
fields are now checked individually and option validation was extracted; no
suppression or principles exception. The root arithmetic negative-control test
prints its existing intentional esbuild error inside the passing suite.

No new browser/showcase, packaging-license or library-size run is claimed: no app,
runtime library, dependency or exported package surface changed. Principles were
self-checked; no new numerical contract, Changesets setup or release mutation.

## Remaining limits and next action

This is mutation stress testing, not coverage-guided fuzzing, a sanitizer, proof of
PDF-viewer safety, or a long-lived mixed-font memory-leak test. Unused tables and
hint bytecode may remain unchecked. Neither zero findings nor passing real-font
bounds justify advertising malicious-font safety. Existing profile restrictions
remain; no automatic fallback or broader font support was added.

**Status:** tooling and corpus expansion implemented and exercised; ready for review
and authorized delivery separately from the selector. Next worthwhile testing work
is a scheduled private-artifact campaign with rotating seeds and eventual
coverage-guided/minimizing instrumentation, rather than claiming security from
these two deterministic campaigns alone.
