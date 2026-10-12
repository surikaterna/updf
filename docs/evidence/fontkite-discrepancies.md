# Fontkite corpus discrepancies: root-cause analysis

Analysis and characterization only. No parser/runtime change, tolerance change,
Fontkit patch, corpus allowlist, dependency upgrade or upstream issue creation.
YOLO self-validation, not independent audit. Tracker N/A. Worktree
`/home/sprawl/projects/updf/trees/fontkite`, branch `feature/fontkite`, base/HEAD
`aade3cb6bf487fac13ea7fef4f45bf2cdfba896b`; all work remains uncommitted.

## Conclusion

All **26 differing codepoint mappings across seven faces** are explained by ten
minimal one-axis quadratic witnesses. They fall into three categories:

| Cause | Mappings | Effect |
| --- | ---: | --- |
| Fontkite evaluation roundoff before `ceil` | 1 | Upper bound too large by one font unit |
| Fontkit evaluation roundoff before `ceil` | 2 | Upper bound too large by one font unit |
| Fontkit near-degenerate cubic root cancellation | 23 | Bounds too small by one to three integer font units |

The previous 25-to-1 FontTools agreement is now supported by **exact rational
extrema of the extracted paths**, not just a vote between floating-point engines.
Fontkite is wrong for Lato Bold U+207D; Fontkit 2.0.4 is wrong for the other 25
reported bounds under the adapters' outward integer-bound convention.

This conclusion is scoped to these 26 mappings. It is not proof of general parser
correctness or all-font compatibility.

## Evidence chain

1. Reuse the pinned font SHA-256s and verify cache bytes. The manifest hash is
   `dba23e453fd2ff0e227dcaa63bd61f3b23d5d593e0fdb40cac039fd53d646d37`;
   the Google Fonts source commit is unchanged from the corpus evidence.
2. FontTools 4.60.1 decomposes each affected outline through a BasePen subclass.
   The analysis rejects nonquadratic curves and coordinates that are not integers
   or half-integers, rather than implying exact fidelity for arbitrary transforms.
3. Python `Fraction` computes every endpoint and valid quadratic extremum exactly,
   then applies exact floor/ceil. All 26 whole-glyph integer boxes agree with the
   previous FontTools BoundsPen result. Mapping IDs and advances match between
   the two adapters for these cases.
4. A Node trace freshly verifies the Fontkite metadata and Fontkit rounded bbox
   against the saved comparison, and compares **all normalized path segments**
   from Fontkit with the FontTools extraction. Geometry matches for all 26 glyphs.
   Normalization disregards traversal starting position and implicit closing-line
   representation, not segment coordinates/directions. This is a bounds-geometry
   check, not a general winding/topology or rendering equivalence claim.
5. Extract exact-extremum witnesses and run each through Fontkit's actual installed
   Path class. Its constructor is obtained from a glyph solely in the analysis
   helper; it is not added as a supported UPDF or Fontkit API. Both isolated and
   full-glyph rounded observations agree. Fontkite's production `outlineBounds`
   is also exercised directly by the network-free characterization tests.

New tools: `exact-quadratic-pen.py`, `exact-analysis.py`, `fontkit-probe.ts`, and
`trace-discrepancies.ts` under `scripts/font-corpus/`. Ignored artifacts retain
complete extracted commands, exact fractions and binary64 coefficient/root traces.
No font binaries or complete glyph outlines were added to source control.

## 1. Fontkite: one-ULP overshoot becomes one font unit

Lato Bold U+207D, glyph 1257, has an x-axis quadratic segment with coordinates:

```text
p0 = 284.5, p1 = 292, p2 = 277
t = 1/3
exact maximum = 287
```

`packages/fontkite/src/bounds.ts` finds the correct derivative root but evaluates
the Bernstein expression in binary64:

```text
(1-t)^2*p0 + 2*(1-t)*t*p1 + t^2*p2
→ 287.00000000000006
ceil → 288
```

The exact correct outward integer bound is **287**. The error is conservative
(extra room), not lost ink, but is not the intended tight integer enclosure.

Reversing the same curve gives coordinates `[277, 292, 284.5]`, root `2/3`, and
the current code returns 287. Geometry must not depend on traversal direction;
this is a particularly useful regression.

The first extraction picked the reverse segment, which shares the same exact
maximum and did not reproduce the floating error. The analysis now retains all
tied exact-extremum witnesses and verifies the particular forward witness against
the observed whole-glyph result; it does not assume the first tied curve is enough.

## 2. Fontkit: the same evaluation problem in two other curves

Fontkit's Path bbox code degree-elevates quadratics to cubics, then evaluates the
cubic Bernstein expression. These two witnesses have an exactly zero computed
cubic leading derivative coefficient, so root-degree selection is not the cause:

| Mapping | Quadratic axis coordinates | Exact maximum | Fontkit binary64 evaluation | Rounded |
| --- | --- | ---: | ---: | ---: |
| Lato Bold U+208D | 285.5, 293, 278 | 288 | 288.00000000000006 | 289 |
| Lato Italic U+2090 | 377.5, 385, 380 | 382 | 382.00000000000006 | 383 |

Fontkite returns the correct outward bound for both. Fontkit overestimates by one
unit; making Fontkite reproduce these results would introduce errors.

## 3. Fontkit: quadratic-to-cubic elevation destabilizes the root solver

In `node_modules/fontkit/src/glyph/Path.js`, lines 104–159, Fontkit converts a
quadratic to cubic control points using `2/3`, then calculates the cubic derivative
coefficients and uses the quadratic formula unless its leading coefficient is
**exactly** zero.

That coefficient is mathematically zero for an elevated quadratic. Floating-point
arithmetic leaves small residues (roughly `1e-15` to `6e-14` in these witnesses).
The generic quadratic-formula calculation suffers catastrophic cancellation:
the meaningful root becomes 0, 1, or an inaccurate 0.5; the other root is enormous.
Boundary roots are then excluded by `0 < t < 1`, losing a real interior extremum.

The smallest reproduction uses only these axis coordinates:

```text
p0 = 3, p1 = 0, p2 = 2
Q(t) = 3 - 6t + 5t²
exact root = 3/5; exact minimum = 6/5 = 1.2

Fontkit cubic derivative leading coefficient = -8.881784197001252e-16
Fontkit roots = [1, 11258999068426240]
Fontkit minimum = 2  (endpoints only)
correct floor = 1; Fontkit floor = 2
```

This curve occurs in Crimson Text Regular `j` and related glyphs. It is not a font
mapping, name, embedding-rights, hinting or contour-decoding issue.

| Shared witness group | Coordinates | Exact minimum | Correct floor | Fontkit floor | Mappings |
| --- | --- | --- | ---: | ---: | ---: |
| Lato Italic U+0279/U+027A | -7, -15, 9 | -9 | -9 | -7 | 2 |
| Lato Italic U+1DA8 | -0.5, -6, -3 | -69/17 | -5 | -4 | 1 |
| PT Serif Bold | 37.5, -16, -5 | -887/129 | -7 | -5 | 5 |
| PT Serif Italic | 30.5, -16, -5 | -817/115 | -8 | -5 | 5 |
| Inconsolata Regular | 81.5, 39, 40 | 3478/87 | 39 | 40 | 6 |
| Inconsolata Condensed Regular | 53.5, -9, -8 | -1018/127 | -9 | -8 | 1 |
| Crimson Text Regular | 3, 0, 2 | 6/5 | 1 | 2 | 3 |

The Lato U+1DA8 root is misplaced rather than wholly rejected: Fontkit evaluates
at 0.5 instead of 11/17, obtaining -3.875 instead of -69/17. This explains why not
every result is simply one of the curve endpoints. Accented/composite glyphs reuse
the same erroneous extremum, explaining multiple mappings per witness.

## Impact and recommended fix direction

The embedded font program is unchanged, so this does not distort the actual font
outline drawn by a PDF viewer. It affects our metadata-driven ink measurement,
containment, clipping decisions and possibly layout near exact boundaries.
The differences are physically small (three units at 12 pt / 1000 upem is 0.036 pt),
but bounds that omit real ink are still incorrect.

1. **Fix Fontkite's quadratic evaluation/rounding**, not its format support or
   PreparedFont ownership/type model. Make the intended contract explicit: floor
   the true lower extremum and ceil the true upper extremum, with no integer-bound
   change from curve reversal. Add integer, half-integer and transformed-coordinate
   boundary tests before choosing the production algorithm.
2. The algebraic extremum `(p0*p2 - p1*p1) / (p0 - 2*p1 + p2)` avoids evaluating
   the rounded parameter, and is a useful candidate. It is **not automatically
   exact in binary64**: products, subtraction and division also need error/domain
   analysis. A bounded exact dyadic/rational floor/ceil fallback or proven safe
   domain is preferable to snapping every nearly integral value. Measure its
   bundle and preparation cost before adoption. The current test oracle is not
   shipped in the parser.
3. **Do not add a blanket epsilon.** A real extremum just beyond an integer must
   round outward. Arbitrary integer snapping can under-bound ink; near-zero cubic
   coefficients should not determine the degree of an input already known to be
   quadratic. These are numerical root/bound contracts, not layout-fit tolerances.
4. **Do not copy Fontkit's wrong bounds into Fontkite.** Separate differential
   compatibility reporting from independently established correctness. Continue
   strict mapping/advance/metadata checks; use justified exact-bound evidence for
   these specific disagreements rather than blanket waivers or broad tolerances.
   No gate or expectation has been changed in this analysis.
5. Fontkit would benefit from retaining a direct quadratic branch and a robust
   integer-bound policy. A minimal upstream reproduction is available, but filing
   an issue, patching/forking it, or changing its adapter requires a separate action.

Exact arithmetic here applies to the extracted integer/half-integer path geometry.
This does not establish correctness for arbitrarily deep fractional composite
transforms or all font formats. Those remain necessary follow-up coverage.

## Reproduction and validation

Use the existing isolated FontTools 4.60.1 environment and pinned corpus cache:

```sh
/tmp/opencode/fontkite-oracle-venv/bin/python -B scripts/font-corpus/exact-analysis.py \
  --report artifacts/font-corpus/report.json \
  --cache /tmp/opencode/updf-font-corpus-cache \
  --output artifacts/font-corpus/exact-analysis.json

UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache \
  npx tsx scripts/font-corpus/trace-discrepancies.ts

npx tsx --test tests/integration/font-extrema.test.ts
```

Both analysis commands passed for all 26 mappings. `-B` avoids Python bytecode
artifacts in the source tree. The trace writes
`artifacts/font-corpus/discrepancy-traces.json`; extracted paths remain ignored
artifacts, not committed fixtures.

Four network-free characterization tests pass. They use ten small numerical
witnesses and an independent BigInt rational oracle, exercising the actual
Fontkite bounds function and installed Fontkit Path class. They deliberately
describe existing faulty behavior while asserting its difference from the correct
mathematical result; a future fix must update these observations, not preserve bugs.

- `npm run format:check`: pass.
- `npm run lint`: pass, including AST principles gates.
- `npm run typecheck`: pass, full build and workspace checking.
- `npm test`: **1,060 pass**, zero failures/skips/cancellations.
- `git diff --check`: pass.
- `UPDF_FONT_CORPUS_CACHE=/tmp/opencode/updf-font-corpus-cache npm run test:font-corpus -- --suite all --offline`:
  **still exits 1**, 12 exact static matches, 7 mismatching faces and 2 expected
  variable-font rejections. No mismatch has been hidden or fixed in this slice.

Initial local checks caught a restricted variable name and a tuple-union spread
typing error in the new analysis code; both were corrected without suppressions.
The existing arithmetic negative-control test emits an intentional esbuild error
inside the passing root suite. No browser/showcase, new raster proof, size benchmark
or license rerun is claimed for this analysis-only slice.

Principles: cohesive bounded files/functions, intent comments, risk-based numerical
tests, no new runtime dependencies, no numerical-policy changes or approved
exceptions. Python advisory code is exercised directly, not covered by the TS AST
lint gate. **Status: analysis complete; production fixes pending.**
