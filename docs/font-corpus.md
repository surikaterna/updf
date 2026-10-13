# On-demand Fontkite compatibility corpus

The corpus is a pinned, opt-in development tool. No downloaded fonts are added to
Git or npm packages. Ordinary `npm test` stays network-free and does not require
the external corpus cache. Existing small Liberation fixtures and synthetic
malformed-font regressions remain in the ordinary tests.

## Use

From the workspace root, install dependencies and build first (`npm ci`, then
`npm run typecheck`). Fetch explicitly, then run offline:

```sh
npm run corpus:fetch -- --suite all
npm run test:font-corpus -- --suite all --offline
```

Suites: `all` (34 files), `static-smoke` (30 static faces), `unsupported` (two
variable fonts, one CFF OpenType font and one WOFF2 container).
Use `--id lato-regular` to select one manifest ID. Tests accept `--output PATH`
(default `artifacts/font-corpus/report.json`). Unknown/duplicate options, empty
selections and missing values fail rather than silently selecting another suite.
An optional `--oracle PATH` adds independent bounds verification; see below.

Cache location, in precedence order:

1. `UPDF_FONT_CORPUS_CACHE`.
2. `$XDG_CACHE_HOME/updf/font-corpus`.
3. `~/.cache/updf/font-corpus`.

For example, this session uses a shared cache outside the worktree:

```sh
export UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache
npm run corpus:fetch -- --suite all
npm run test:font-corpus -- --suite all --offline
```

Objects live at `sha256/<digest>`. Both fonts and license texts are downloaded on
demand. Every read verifies exact size and SHA-256, including warm-cache reads.
Corrupt objects fail explicitly: remove the reported digest and fetch again;
there is no silent redownload that would mask corruption.

The fetch command uses three workers, HTTPS commit-pinned raw GitHub URLs, no
redirects, a 30-second per-request/body deadline, and the pinned byte size as a
streaming limit (maximum 4 MiB per asset). Downloads use the shared `@updf/assets`
transport: headers and body reads race the abort signal, even for a supplied
fetcher that ignores it, and cancellation cleanup is best-effort without an
unbounded await. Transport failures use `AssetError`; size/hash verification still
occurs before anything is published to the cache. Verified downloads use unique temporary
files and atomic rename. Concurrent worktrees may duplicate a request, but cannot
publish partially downloaded content. Interrupted temporary files are never read
as cache objects and may be removed by the cache owner.

## Provenance and selection

`scripts/font-corpus/manifest.ts` and `upstream-manifest.ts` pin **34 font files
across 12 families**, plus 12 OFL-1.1 license texts, each with a hash and size.
The original 21 files remain at `google/fonts` commit
`66928797f271fed5ee428544e7229685e2d90127`. Original family selections:

- Lato, PT Serif, PT Sans, IBM Plex Mono, Crimson Text: regular/bold/italic.
- Inconsolata: regular/bold/condensed regular.
- Anton: display regular.
- Roboto and Noto Sans: variable-font rejection controls, not supported static
  fonts merely because their filenames end in `.ttf`.

Additional upstream selections (not Google Fonts mirrors):

| Repository | Pinned revision | Files |
| --- | --- | --- |
| `adobe-fonts/source-sans` | `87b37a2daaed80fcb8e8ccb0085c4d72ddade12e` | Regular, Bold, Italic and Light TTF; Regular CFF/WOFF2 rejection controls |
| `adobe-fonts/source-serif` | `80d3f8894c09c937bebfa9011247d2e1c79fd6f4` | Regular, Bold and Italic TTF |
| `JetBrains/JetBrainsMono` | `19371302b95d218af43299bce79ddbddd0bc364d` | Regular, Bold, Italic and Bold Italic TTF |

All eleven new supported faces contain real format-12 cmaps. The set covers
different families, units-per-em, short/long loca and OS/2 v3/v4, but is not
exhaustive. Point-attached composites, older names/OS2 and broader export-toolchain
coverage remain follow-up work. Synthetic tests cover several such boundaries.
The cache is not a substitute for font licensing: retain the pinned license and
copyright notices with any redistributed asset; no font modification is performed.
Reports retain the legacy `revision` field for Google Fonts and list all four
repositories in `sourceRevisions`. Expanding the manifest invalidates older oracle
artifacts: regenerate them rather than bypassing the manifest-hash check.

Adding a case requires reviewing the source/license, choosing an immutable commit,
recording independently inspected bytes/hash/coverage and setting a justified
expectation. The runner has no automatic latest-version or trust-on-first-use
manifest update command. Do not move a mismatching static font into the unsupported
suite just to get a passing report.

## Results and exit status

- `match`: supported font metadata matches Fontkit exactly by code point.
- `expected-rejection`: unsupported input gets the exact expected Fontkite
  diagnostic code **and message**.
- `mismatch`: descriptor/other metadata or glyph mapping/advance/bounds differs.
- `verified-bounds-difference`: every prepared mapping's bounds match an explicitly
  supplied independent oracle and all non-bounds metadata matches Fontkit. Passes
  with `parity: "different"`; the Fontkit discrepancy remains in the report.
- `oracle-mismatch`: any prepared bound disagrees with the oracle, even if Fontkit
  and Fontkite agree with each other. Fails.
- `unexpected-rejection`, `unexpected-acceptance`, `reference-error`: fail.
- `cache-error`, `worker-error` (including timeouts/crashes): fail, not skip.

The command always writes the completed comparison report after processing the
selected cases and exits **1** if any case fails. It reports total differing glyphs
and up to 20 concrete examples per font, plus the full manifest hash, source commit,
Node version, asset hashes, tags and expectations. Version 2 reports also separate
parity differences from check failures, record the supplied oracle's content hash,
and report how many prepared mappings were checked. Invalid arguments/build setup
can fail before a report is produced. Existing reports should not be mistaken for
a successful new run; check the command's exit status.

Each font runs in a separate Node process with a 15-second wall deadline, 256 MiB
V8 heap setting and 1 MiB captured-output limit. This bounds routine parser hangs
and heap growth; it is not an OS memory sandbox. Bytes are verified again in the
worker. The test command does not fetch anything; a missing font **or license**
fails. A Fontkit match is differential evidence, not proof of font correctness.
This corpus slice checks preparation metadata, not all-font PDF rendering or
shaping/language support.

## Optional independent bounds check

For a complete bounds check, generate an oracle for **all glyph IDs** in every
selected static face, not only the reported discrepancies. The generator reads
only font identity/selection from the corpus report, verifies source hashes, and
derives bounds from the fonts with FontTools and Python Fraction arithmetic.
It does not copy Fontkite or Fontkit bounds from the report.

After the ordinary corpus run has produced its report (currently exit 1 for
Fontkit differences), use the pinned FontTools environment described below:

```sh
/tmp/opencode/fontkite-oracle-venv/bin/python -B scripts/font-corpus/build-bounds-oracle.py \
  --report artifacts/font-corpus/report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/bounds-oracle.json

UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache \
  npm run test:font-corpus -- --suite all --offline \
  --oracle artifacts/font-corpus/bounds-oracle.json \
  --output artifacts/font-corpus/verified-report.json
```

The checked contract is exact integer bounds of the decoded binary64 quadratic
coordinates, not exact evaluation of ideal, arbitrarily deep composite transforms.
The Node worker verifies algorithm/version, corpus manifest identity, font SHA-256,
units-per-em, glyph count and oracle structure. It checks every prepared mapping,
not just differences with Fontkit. Missing, malformed, stale or wrong-face oracles
fail for static faces; unsupported-format controls still use their exact rejection
expectations. No runtime dependency on Python is introduced.

This is a trusted local test artifact, not a signed attestation: regenerate it
with the provided independent tool, do not edit it to bless output. No fonts or
large oracle files are committed. Four negative tests ensure wrong bounds fail
even when both parsers agree, and verified bounds cannot waive changes to advances,
mapping inventory, or descriptor fields. Current results: **34 checks pass** (30
static faces and four rejection controls), with **12 Fontkit parity differences**
still reported. Without `--oracle`, the original strict differential run still fails.

### Inspect individual discrepancy samples

FontTools is not a project/runtime dependency. To inspect the reported discrepancy
samples in a separate Python environment:

```sh
python -m venv /tmp/opencode/fontkite-oracle-venv
/tmp/opencode/fontkite-oracle-venv/bin/python -m pip install fonttools==4.60.1
/tmp/opencode/fontkite-oracle-venv/bin/python scripts/font-corpus/fonttools-oracle.py \
  --report artifacts/font-corpus/report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/fonttools.json
```

This verifies each font digest and computes unhinted bounds using FontTools'
BoundsPen, rounded with the same floor/ceil convention. It checks only captured
samples with matching glyph IDs; it is not a full third-engine corpus comparison,
does not waive differential failures, and does not prove either engine universally
correct. Use trusted pinned inputs with this optional advisory script.

The path trace accepts numeric command coordinates and serialized Python Fraction
strings (integers or numerator/denominator pairs). It validates and converts a copy
to finite numbers before comparing segment geometry; the original rational evidence
is not rewritten. Invalid fractions or command shapes fail rather than comparing
ambiguous string/number or nonfinite values.

## CI policy

The [discrepancy analysis](evidence/fontkite-discrepancies.md) records the original
26 differences. The [bounds fix](evidence/fontkite-bounds-fix.md) corrects Fontkite
and describes the explicit independent-verification mode; parity remains separate.

The downloader and reporter are explicit commands, not automatically attached to
CI in this slice. A future corpus job should restore the content-addressed cache,
fetch missing pinned assets in a separate step, and run the reporter offline.
Cache keys can use the manifest/tooling hash; restored bytes are always reverified.
Network failures belong to the fetch step, not parser compatibility. Keep ordinary
unit tests independent of network/cache availability. The current full corpus has
real differential failures; an independent-oracle job may pass without parity,
but must generate and verify that evidence explicitly, not skip mismatches or add
tolerances. No CI workflow was changed in this slice.

For separate deterministic malformed-input stress testing, see [font fuzzing](font-fuzzing.md).
Those checks exercise failure handling, determinism and ownership, not the numerical
correctness of arbitrary mutated fonts. They do not replace the independent corpus oracle.
