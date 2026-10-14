# Fontkite corpus and prepared-data cost follow-up

Ad-hoc tracker N/A. YOLO self-validation, not independent audit. Worktree
`/home/sprawl/projects/updf/trees/fontkite`, branch `feature/fontkite`, unchanged
base/HEAD `aade3cb6bf487fac13ea7fef4f45bf2cdfba896b`. The previous prototype and
this follow-up are both uncommitted; no staging, commit, push or publication.

This slice adds corpus tooling/docs/tests and extends the cost experiment. It
does **not** change `PreparedFont`, Fontkite parsing, Fontkit, or application code.

## Which approach saves size?

`PreparedFont` is the owned runtime result of either approach, not an alternative
parser. Here "pre-prepared" means shipping the original font program plus compact
JSON metadata, then calling `createPreparedFont`, rather than deriving metadata
in the browser with Fontkite. The opaque handle itself is not serialized.

Fresh reproduction: `npx tsx scripts/consumer/fontkite-cost.ts`. Browser ESM,
ES2022, minified esbuild, gzip level 9, identical sample document. The script now
executes the prepared-data bundle too and verifies identical PDF bytes for both
Liberation Sans faces. Font bytes are separate binary assets, not base64 JSON.

| Application | Minified JS bytes | Gzip bytes |
| --- | ---: | ---: |
| Pre-prepared data | 62,445 | 21,350 |
| Fontkite preparation | 71,566 | 25,022 |
| Fontkit preparation | 435,717 | 174,391 |

Thus pre-preparing saves **3,672 gzip bytes of application JS** versus Fontkite.
The standalone Fontkite preparation entry measures 7,328 gzip bytes including
its transitive shared code; that is not its incremental cost in this application.

| Per-face data | Regular | Bold |
| --- | ---: | ---: |
| Original TTF bytes | 410,712 | 414,456 |
| TTF gzip bytes, needed by either approach | 213,267 | 214,613 |
| Compact metadata JSON bytes | 111,230 | 111,329 |
| Metadata JSON gzip bytes | 17,745 | 17,656 |
| Pre-prepared application + TTF + JSON, separate gzip responses | 252,362 | 253,619 |
| Fontkite application + TTF, separate gzip responses | 238,289 | 239,635 |

For the Regular example, **Fontkite saves 14,073 transferred bytes overall** under
these assumptions, despite larger JS. Parser code is paid once; metadata is paid
per face. Pre-preparing avoids parsing CPU but does not remove the original font
bytes needed for embedding. Runtime metadata allocation exists in both approaches.

These totals omit HTTP headers and transport scaffolding, use the full supported
mapping inventory, and assume separately gzip-compressed responses. They are not
a Brotli, memory or universal deployment-size claim. Compact binary metadata,
known-character-only metadata, different caching/compression, or server-side PDF
generation can change the tradeoff. No new metadata encoding or subsetting is
implemented. Both approaches emit identical, full-font PDFs in this experiment.

## Corpus infrastructure

See [usage and design](../font-corpus.md). Added:

- 21 pinned Google Fonts files across nine families, including 19 static faces
  and two variable-font rejection controls. Nine separate OFL texts are pinned
  and cached as well. No downloaded font/license bytes were added to the repo.
- SHA-256 content-addressed shared cache; exact-size/hash verification on every
  read; three download workers; request/body timeouts and streaming byte limits;
  verified atomic publication safe for simultaneous worktrees.
- Explicit fetch followed by offline comparison. Missing/corrupt assets, parser
  failures, crashes/timeouts and metadata differences fail, rather than skip.
- Per-font child processes with 15-second timeout and 256 MiB V8 heap setting.
  This is not an OS memory sandbox. First 20 concrete glyph differences per font
  are retained alongside the full differing-glyph count.
- Eight network-free regression tests for pin validation, cold/warm/corrupt cache,
  partial/oversized downloads, deadlines, concurrent publication, classification,
  selection, and missing-cache CLI exit/report behavior.

Google source commit: `66928797f271fed5ee428544e7229685e2d90127`.
Resolved manifest SHA-256:
`dba23e453fd2ff0e227dcaa63bd61f3b23d5d593e0fdb40cac039fd53d646d37`.
Live cold fetch downloaded all 30 font/license objects; the second fetch reverified
all 30 cached objects without downloading. Cache used:
`/tmp/opencode/updf-font-corpus-cache`.

## Actual compatibility result: NOT all green

`npm run test:font-corpus -- --suite all --offline` exits **1**:

- **12** static faces exactly match Fontkit's prepared metadata.
- **7** static faces parse but differ in glyph bounds: **26 glyph mappings** total.
- **2** variable faces reject with the exact expected diagnostic.
- No cache errors, worker crashes/timeouts or unexpected format rejections.

| Mismatching static face | Differing mappings |
| --- | ---: |
| Lato Bold | 2 |
| Lato Italic | 4 |
| PT Serif Bold | 5 |
| PT Serif Italic | 5 |
| Inconsolata Regular | 6 |
| Inconsolata Condensed Regular | 1 |
| Crimson Text Regular | 3 |

No expectation was weakened, no tolerance was added, and these faces were not
reclassified as unsupported. The corpus is intentionally an explicit optional
diagnostic command, not a silently passing CI gate. Its failures remain unresolved.

### Independent implementation check

The system Python had no FontTools. A separate temporary venv was created and
`fonttools==4.60.1` installed there; no workspace/runtime dependencies changed.
The optional `scripts/font-corpus/fonttools-oracle.py` checked all 26 reported
bound-discrepancy samples against FontTools BoundsPen, after verifying font hashes:

- **25** rounded bounds agree with Fontkite rather than Fontkit.
- **1** agrees with Fontkit rather than Fontkite: Lato Bold U+207D (8317), glyph
  1257. Fontkite xMax is **288**; FontTools and Fontkit give **287**.

This supports investigating curve/extrema behavior rather than blindly copying
Fontkit's output. It does not prove general correctness, identify the exact cause
of every difference, or waive the failed differential comparisons. No parser fix
was made in this tooling slice. The optional oracle checks captured samples only;
for this run no font exceeded the 20-sample cap.

Reports are ignored artifacts:
`artifacts/font-corpus/report.json`, `unsupported.json`, `fonttools.json` and
`artifacts/fontkite/report.json`. FontTools is advisory, not mandatory for ordinary
tests or corpus comparison. No new full-corpus PDF/shaping proof is claimed.

## Validation commands and outcomes

Executed from this worktree, with
`UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache` for corpus commands:

| Command | Outcome |
| --- | --- |
| `npm run corpus:fetch -- --suite all` | pass cold and warm, 30 assets |
| `npm run test:font-corpus -- --suite all --offline` | **FAIL, exit 1: 7 mismatching faces**, repeated after final build |
| `npm run test:font-corpus -- --suite unsupported --offline --output artifacts/font-corpus/unsupported.json` | pass, 2 expected rejections |
| `npx tsx --test tests/integration/font-corpus-*.test.ts` | pass, 8 tests |
| `npm run format:check` | pass |
| `npm run lint` | pass, including AST principles checks |
| `npm run typecheck` | pass, full package build plus workspace checks |
| `npm test` | **1,056 pass**, zero failures/skips/cancellations |
| `npx tsx scripts/consumer/fontkite-cost.ts` | pass, sizes, three-way PDF parity, qpdf/extraction/raster smoke |
| `git diff --check` | pass |

Independent implementation command (completed, 26 samples):

```sh
/tmp/opencode/fontkite-oracle-venv/bin/python scripts/font-corpus/fonttools-oracle.py \
  --report artifacts/font-corpus/report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/fonttools.json
```

Initial lint caught fourth-level nesting in the streaming downloader; stream
consumption was extracted and the gates rerun without suppression. The existing
arithmetic negative-control test prints an esbuild error during passing root tests.
Browser/showcase and license gates were not rerun in this tooling-only slice;
the preceding prototype's browser/packaging evidence remains separate.

Principles self-check: bounded/cohesive functions and files, intent-only comments,
exact byte/hash/quota checks, risk-based tests. Python advisory functions are also
small and cohesive; the TypeScript AST gate does not lint Python. No numerical
policy changes or principles exceptions. No Changesets setup; no release changes.

**Status:** corpus tooling implemented and exercised; broad Fontkite/Fontkit
compatibility remains unresolved. Next action: isolate the Lato Bold bound case
into a small regression, establish the intended extrema contract with independent
evidence, then address remaining differential disagreements without blanket
tolerances. Expand corpus provenance/coverage after that; do not adopt Fontkite
as a broadly compatible default on the basis of the two original fixtures.
