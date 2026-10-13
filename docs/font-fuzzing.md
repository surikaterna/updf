# Bounded Fontkite mutation fuzzing

This is an opt-in, deterministic mutation harness, not coverage-guided fuzzing or
a malicious-font sandbox. It exercises `prepareFont` in disposable Node processes.
There is no network fetching in the fuzz command and no new runtime dependency.

## Run

Build the workspace first (`npm run typecheck`). A small offline campaign uses
only the two existing licensed Liberation Sans fixtures:

```sh
npm run fuzz:fontkite -- --suite fixtures --cases 128 --seed 12345
```

For the expanded corpus, fetch/cache it explicitly first:

```sh
export UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache
npm run corpus:fetch -- --suite all
npm run fuzz:fontkite -- --suite all --cases 512 --seed 12345 \
  --output artifacts/font-fuzz/seed-12345
```

Fuzz suites differ from corpus comparison suites:

- `fixtures`: two repository fixtures, no external cache required.
- `corpus`: the 30 supported static corpus fonts, from the verified cache.
- `all`: both sets, **32 seed fonts**. Unsupported-format controls are tested by
  `test:font-corpus`, not treated as valid mutation seeds.

`--id` selects one known source ID. Sources, sizes and SHA-256s are fixed; arbitrary
input paths or worker executables are not exposed by the CLI. Missing/corrupt cache
entries fail rather than downloading, skipping or silently replacing seeds.

## What is checked

Each seed must first prepare successfully. A deterministic versioned generator
then cycles through 12 strategies: bit flips, truncation, directory edits, loca
edits, cmap edits, glyph-byte edits, metric/name/rights table edits, filled spans,
bounded appended data, random short buffers, composite self-references, and an
unmodified positive control. Glyph targets come from the original seed's loca
ranges. A targeted glyph is not necessarily reachable through the supported text
profile; the harness does not claim instruction/branch coverage.

For every case:

- Accepted data must leave the caller's input unchanged.
- Re-preparing the same bytes as a nonzero-offset subview must produce identical
  metadata and preserve that input too.
- Rejection must be a structured `DocumentError`, not a raw exception.
- Every twelfth case is an unchanged seed; its metadata must still match the
  initial baseline after earlier malformed inputs.

**Accepted mutations are not automatically bugs.** Some remain valid fonts, modify
unused tables or padding, or affect features outside the preparation profile.
The parser does not sanitize all embedded font data or validate hint bytecode.
This harness does not claim accepted mutants are safe for every downstream PDF
viewer, nor compare arbitrary corrupt inputs with a full font validator.

## Bounds and isolation

- One child per seed and one outstanding case at a time, over IPC.
- 15-second worker startup/seed-validation deadline.
- Default **2-second per-case parent watchdog**; `--timeout-ms` accepts 100–10000.
  It includes IPC/scheduling latency and can be affected by machine load.
- **256 MiB V8 heap** setting, not an OS/RSS limit. stdout is discarded and retained
  stderr is capped at 8 KiB. This is process isolation for tests, not a security sandbox.
- Maximum 2000 cases per seed, 25,000 cases per invocation, at most ten findings
  before stopping. Each mutation is at most the seed size plus 256 bytes.
- A hang kills the owned child; crashes, invalid receipts and seed failures become
  findings. Findings or incomplete work make the command exit **1**.

The result lists accepted/rejected counts, diagnostic codes, strategy counts,
largest observed case duration and seed hashes. Counts include positive controls
and are not counts of distinct or necessarily malformed binary files. Zero findings
means only that these checks passed for the recorded cases and environment.

## Findings and replay

Reports default to ignored `artifacts/font-fuzz/report.json`. A finding also saves
its exact mutated `.bin` plus a JSON receipt containing source hash, RNG seed,
mutation version, case index, input hash and replay commands. Filenames include
source digest, mutation version and seed to avoid cross-campaign collisions.

Use the receipt's `replay` command for one exact input, or `sequenceReplay` to run
the preceding prefix for state-dependent failures. Single-input replay binds the
bytes with `--expected-sha256` and the generator with `--mutation-version`:

```sh
npm run fuzz:fontkite -- --suite fixtures --id fixture-liberation-regular \
  --seed 12345 --case 11 --mutation-version 1 \
  --expected-sha256 76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8
```

This example replays an unchanged positive control. A checksum mismatch is a
finding and the mutation is not parsed (the valid seed was still checked at
worker startup). Diagnose replay/setup failures separately from parser failures.
Source code and mutation recipes may evolve; keep the receipt and use the matching
revision/version. Setup or artifact-write failures may prevent a complete report;
always inspect the exit status and do not mistake an old report for a fresh run.

Keep crash binaries private. The upstream fonts have license/Reserved Font Name
requirements; do not automatically publish modified fonts or upload all fuzz
artifacts to public CI. Prefer a reduced numerical/structural reproduction or a
recipe referencing the pinned original font, with license attribution retained.

## Automated tests and limits of this slice

`npm test` runs a short fixture-only campaign and harness tests, without network
or corpus downloads. Negative controls simulate a hang, exit, uncaught exception,
wrong receipt, caller-byte mutation, nondeterministic metadata and checksum drift.
They verify the watchdog, failure exit status and replay artifacts actually work.

The larger campaigns are explicit commands, not added to CI in this slice. There
is no automated input minimizer, coverage-guided engine, sanitizer integration,
cross-engine oracle for mutants, or long-lived mixed-font memory-leak proof.
Those are potential follow-ups; this harness does not make a production security claim.
