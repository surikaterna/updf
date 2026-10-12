# Fontkite exact bounds fix and upstream draft

YOLO implementation/self-validation, not independent audit. Tracker N/A.
Worktree `/home/sprawl/projects/updf/trees/fontkite`, branch `feature/fontkite`,
base/HEAD `aade3cb6bf487fac13ea7fef4f45bf2cdfba896b`. This and the preceding
prototype/corpus work remain uncommitted. No push, publication or upstream posting.

## Runtime change and numerical contract

`packages/fontkite/src/extremum.ts` replaces floating evaluation of a rounded
quadratic parameter with exact rational floor/ceil. The existing bounds walker
incorporates those two integers rather than an approximate peak value.

- Validate finite axis coordinates before any conversion.
- Strict endpoint derivative signs identify whether there is an interior extremum:
  if the control lies between the endpoints, no interior extremum is needed.
- For common integer/half-integer coordinates, scale by two into small BigInts.
- For other finite binary64 coordinates, reuse `bits`/`dyadic` from the existing
  `@updf/layout-boxes/numeric` owner. No new general binary64 conversion library.
- With scaled integers A/B/C and scale S, the extremum is
  `(A*C - B*B) / ((A - 2*B + C)*S)`. Numerator, denominator, sign normalization,
  quotient and remainder are exact; negative floor and positive ceil are explicit.
- Check the existing prepared-font bounds domain (-32768..32767) before converting
  the rounded integer results back to Number. No epsilon, near-integer snapping,
  endpoint-root relaxation or rounding of the parameter t.

This is an exact native certificate for **materialized binary64 curve coordinates**,
not a guarantee that preceding floating-point composite transforms or implied
midpoints equal ideal infinite-precision source transforms. Those operations are
unchanged. Inputs, flags, offsets and budgets retain exact validation; layout-fit
tolerances and existing kernel certificates were not modified.

The numeric export is an explicit direct workspace dependency and the source-edge
policy permits only that kernel subpath, not the entire layout-boxes surface.
Fontkit, FontTools and analysis/oracle code do not enter the Fontkite bundle.
PreparedFont's shape and resource ownership are unchanged.

## Corrected cases and an additional discovery

Lato Bold U+207D now produces xMax **287**, in either curve direction, instead of
288 from `ceil(287.00000000000006)`.

The complete independent bounds check also exposed a previously shared error:
Lato Bold U+20AF, glyph 1052, has a segment with x coordinates `[2432,2447,2417]`.
Its exact maximum is **2437** at t=1/3. Both the old Fontkite expression and
Fontkit evaluate it as `2437.0000000000005`, yielding 2438. The new calculation
returns 2437. This was invisible to the original parity-only comparison.

Consequently the post-fix differential report still has **26 differing mappings
across seven faces**: the fixed U+207D disagreement disappears and the corrected
U+20AF disagreement appears. All current differences are verified Fontkit bounds
errors (three evaluation-roundoff cases and 23 root-cancellation cases), not a
remaining known Fontkite mismatch in this corpus. Historical analysis records
remain revision-specific rather than being rewritten to hide that discovery.

The updated trace checks current Fontkite bounds against exact geometry while
retaining the old Bernstein evaluator as a clearly labelled numerical diagnostic.

## Independent bounds verification versus parity

Added `build-bounds-oracle.py`, using pinned FontTools 4.60.1 plus Python Fraction
arithmetic. It computes every glyph ID's bounds directly from each selected static
font, not from either adapter's output or only the previously differing mappings.
The corpus report supplies only selection and pinned source identities.

The generated artifact contains **22,907 glyph boxes across 19 static faces**.
Node checks all **14,672 prepared mappings** against the independent per-GID boxes.
The artifact is local/ignored, not a new committed bulk font/metadata fixture.
Its SHA-256 in this run is
`5cb901303883d35564b2dfcb211c22c1a52464ad45cdae8b9bb975347653402f`.

`--oracle PATH` is explicit. Workers validate algorithm/version, manifest hash,
font hash, units-per-em, glyph count and box schema. Reports retain parity and
per-glyph Fontkit differences alongside independent verification results.

- An oracle-verified bounds-only difference can pass as `verified-bounds-difference`.
- Any incorrect bound fails as `oracle-mismatch`, even if both adapters agree.
- Missing or incorrect mappings, advances or descriptor fields still fail.
- Missing/stale/malformed oracle files fail for selected static faces; there is no
  silent fallback. Unsupported-format controls retain their diagnostic checks.
- Without the option, the original strict differential run still exits 1.

This is a trusted local test artifact, not a signed attestation or an all-font
correctness proof. Reproduce it with the independent tool, rather than editing it.
No broad difference allowlist or numeric tolerance was introduced.

## Size and performance

`npx tsx scripts/consumer/fontkite-cost.ts` after the fix:

| Consumer | Before minified JS | After minified JS | Before gzip | After gzip |
| --- | ---: | ---: | ---: | ---: |
| Fontkite application | 71,566 | 72,319 | 25,022 | 25,338 |
| Fontkite preparation only | 19,461 | 20,214 | 7,328 | 7,651 |
| Fontkite `/load` | 25,719 | 26,472 | 9,269 | 9,595 |

The application cost is **+316 gzip bytes**. The Fontkit application remains
435,717 minified / 174,391 gzip bytes; prepared-data rendering remains
62,445 / 21,350. Gzip differences are contextual, not additive package sizes.

Local warmed medians for Regular/Bold were approximately **12.66/12.46 ms** for
Fontkite versus **36.25/35.13 ms** for Fontkit. These small local samples are not
performance guarantees or a claim that exact arithmetic is universally faster.
Both Liberation sample PDFs remain byte-identical between Fontkite, Fontkit and
pre-prepared data, with qpdf, text extraction and raster smoke checks passing.

## Upstream report

- Draft: [Quadratic path bounds can miss an interior minimum](../upstream/fontkit-quadratic-bounds.md).
- Standalone reproduction: [fontkit-quadratic-repro.mjs](../upstream/fontkit-quadratic-repro.mjs).

The report is short and focused on the missed-minimum bug: tested version, a small
curve, actual/expected output, and the coefficient/root explanation. It does not
include internal project process, generated summaries, invented authorship or a
large template. The script prints `{ actualMinX: 2, expectedMinX: 1.2 }` against
Fontkit 2.0.4 using the bundled ordinary TrueType fixture to obtain its Path class.

Read-only issue searches for `quadratic bounds` and `bbox` did not find this exact
report; this is not a claim of exhaustive duplicate detection. Source inspection
at upstream master commit `d55dc3eb7f0c54d518d3be979a01f29ce93d2fc5` found the same
calculation. The reproduction was executed against released 2.0.4, not an upstream
checkout build. **Nothing was posted to GitHub.**

## Validation

All commands run from the worktree above. Ordinary tests do not need downloaded
corpus assets or Python. New tests cover exact integer boundaries, immediate
binary64 neighbours, positive/negative subnormal extrema, monotone/endpoint roots,
reversal, nonfinite operands, the prepared numeric range, an F2DOT14 composite,
and 1,400 seeded dyadic cases checked against a rational Bernstein oracle.
Independent-verification tests cover provenance/schema failures, agreement on an
incorrect bound, and non-bounds differences that must never be waived.

```sh
# Explicit independent artifact generation (FontTools 4.60.1 in the existing venv)
/tmp/opencode/fontkite-oracle-venv/bin/python -B scripts/font-corpus/build-bounds-oracle.py \
  --report artifacts/font-corpus/report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/bounds-oracle.json

UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache \
  npm run test:font-corpus -- --suite all --offline \
  --oracle artifacts/font-corpus/bounds-oracle.json \
  --output artifacts/font-corpus/verified-report.json
```

The verified corpus run passes **21/21 checks**: 19 static faces plus two expected
variable-font rejections, with seven Fontkit parity differences still reported.
The same command **without `--oracle`**, using the default output, still exits 1
for those seven differences. That remains an explicit diagnostic result, not a
claim of exact Fontkit compatibility or a silently waived failing test.

| Exact command | Outcome |
| --- | --- |
| `npm run format:check` | pass |
| `npm run lint` | pass, including AST principles gates |
| `npm run typecheck` | pass, full package build and workspace checking |
| `npm test` | **1,069 pass**, zero failures/skips/cancellations; includes packed consumers |
| `npx tsx --test tests/browser/browser-fontkite.test.ts` | pass, actual Chromium |
| `npm run check:licenses` | pass, all 14 tarballs |
| `npx tsx scripts/consumer/fontkite-cost.ts` | pass, sizes and three-way PDF/native checks |
| `node docs/upstream/fontkit-quadratic-repro.mjs tests/fixtures/fonts/LiberationSans-Regular.ttf` | reproduces upstream error: actual 2 versus expected 1.2 |
| `git diff --check` | pass |

The exact-analysis and trace commands documented in the discrepancy evidence also
completed against the new strict report: all 26 remaining differences are upstream
bounds errors, including the newly exposed shared U+20AF case. The trace labels the
old Bernstein evaluation separately from current Fontkite bounds.

Full showcase/browser suites are outside this bounded change; actual Fontkite
Chromium preparation and clean packed consumers are checked. The existing root
arithmetic negative-control test still prints an intentional esbuild diagnostic
inside a passing test. No new license exception, Changesets setup or release
mutation. Principles checks retain the 400-line file, <50-line function and depth-3
limits without suppression. No approved principles exceptions are needed.

**Status:** the bounded Fontkite fix and explicit independent corpus mode are
implemented and self-validated. Fontkit parity remains intentionally different;
the draft is ready for review, not posted. Broader font formats, exact source-level
composite arithmetic, and exhaustive corpus coverage remain outside this slice.
