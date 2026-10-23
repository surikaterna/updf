# Bounded TextFlow edge-profile silhouettes

## Delivery and baseline

This slice adds **edge profiles**, not arbitrary polygons. Implementation is in
`/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`, base/HEAD
`882d6d38f432edcac97e962fbf446062c1483c3d`. Issue: N/A. The Engineer is the
integration owner. Nothing is staged, committed, pushed or delivered; independent
audit is required; the slice is implemented, not independently verified. The inherited rectangle/optimization work (17 modified tracked
and 15 untracked files) is not this slice's implementation diff.

Before runtime edits, `artifacts/text-flow/edge-profile-before/manifest.json`
captured every tracked/nonignored-untracked source SHA, dirty state, exact cwd,
branch/HEAD, tool versions and lock SHA. This includes the inherited fixture and
cost-script hashes. The historical optimized report SHA was checked against
`44cd42dd5bc4f99666aff27268c82f082f304c0e1198929036b4161b2297cb28`.
The fresh `edge-profile-before/report.json` matched all 214 metrics, all existing
consumer strings, flags, versions and lock hash of
`exclusion-optimized-vs-surgical/report.json`. This is a dirty-feature baseline,
not a claim that the HEAD commit alone reproduces it. Historical artifacts remain
unchanged.

Tools: Node v24.22.0, npm 11.19.1, tsx 4.23.15, TypeScript 5.9.3; the paired
reports also record esbuild. Lock SHA:
`a9f1de49a16ac04bc462281c22c04ecb9c89782cfce9066f16fcf394f34a6493`.

`scripts/text-flow-profile-parity.ts` captured 162 pre-edit rectangle/no-exclusion
cases: complete reports, structured diagnostics and ordered composition work
charges, including failed calls. Final comparisons must be strict deep equality.
The existing wrapper parity script independently compares 216 selected-output/error
cases. Timing samples from that script are not a performance claim.

## Public API and exact input contract

Exported from `@updf/text/composition` and reexported by `@updf/text-flow`:

```ts
interface EdgeProfilePoint {
  readonly x: number;
  readonly y: number;
}
interface EdgeProfileExclusion {
  readonly shape: "edge-profile";
  readonly side: "left" | "right";
  readonly top?: number;
  readonly points: readonly EdgeProfilePoint[];
}
type TextExclusion = RectangularExclusion | EdgeProfileExclusion;
```

`CompositionInput.exclusion` and `TextFlowProps.exclusion` use `TextExclusion`.
Installation remains the existing explicit `createTextComposition` capability and
`createTextFlow` factory. No second wrapper, layout engine, measurement service,
pagination path or painting implementation is added.

- `x` is finite **positive inward depth from the selected edge**, exactly at most
  the frame width. It is not an absolute physical x coordinate. For the right edge
  the physical boundary is `frameWidth - depth`.
- `y` is finite local nonnegative height. There are at least two points. The first
  height is exactly zero; subsequent heights strictly increase. Collinear points
  are legal. `top` is finite nonnegative and defaults to zero. Every materialized
  `top + y` must be finite and must preserve strict ordering; translated collapse
  is rejected, not repaired.
- The linear chain closes to the selected frame edge by horizontal caps. Positive
  depths and strict vertical ordering guarantee a simple silhouette, including
  concave profiles, without area thresholds or self-intersection passes. Tiny
  positive/subnormal depth and height are not rejected by an epsilon-area rule.
- Unknown profile/point fields, repeated or reversed heights, closed rings,
  zero-depth tips, negative depths and width overflow are rejected. There is no
  unrestricted polygon/ring, hole, curve, multiple-interval, x-scaling, clipping,
  margin, auto-tracing, image or visual-parsing API.
- Geometry can extend below `maxHeight`; unused geometry never forces frame
  height. An empty paragraph array returns zero height. Authored max-height and
  native body admission still apply to actual selected output, including gaps.

## Whole-band selection and profile-only retries

`selectionBand` is unchanged. Each candidate uses the whole conservative nominal
line/ink band at its **actual** top, not a baseline sample. The band is intersected
with the profile support. Every segment is visited with work charged; intersected
segments contribute both clipped endpoint depths. Linear extrema occur at those
endpoints, so the maximum includes interior vertices and cap crossings. Exact
touching of the profile's top/bottom cap is disjoint. No sorting or quadratic
geometry scan is used.

The offered interval is `[depth, frameWidth]` on the left or
`[0, frameWidth - depth]` on the right. The existing `lineSelector.next` selects
source once; the existing line owner creates geometry. A charged final scan uses
the selected actual line/ink band, then reuses existing exterior checks for every
fragment's origin, advance and ink bounds. Text painting remains selected native
text. Profiles do not themselves paint a visual.

Only profiles retry on the paragraph's line-height grid. If an active profile
blocks the full interval or the first indivisible unit, the same compensated
`MetricSum` advances by one paragraph line height. Each candidate must make finite,
exact strict progress. The same unconsumed source is queried again until fit,
height overflow or cumulative work exhaustion. A sloping profile can admit the
token before its bottom; this is **not** earliest-continuous-fit search. A constant
full-width profile ending at 17 with line height 16 admits at 32, not 17. Below
the profile, ordinary full-width token overflow propagates the selector's error.
Rectangle jump behavior, results and charge ordering remain unchanged.

## Numerical classification and bound

Authored domains, first/ordered heights, width bounds, endpoint query identity,
work limits and strict progress are exact. Existing derived fit/containment
predicates retain their local-scale approximate contract. Native certificates,
cache/request identity and shared arithmetic are unchanged.

`profile-interpolation.ts` is private and uses existing
`@updf/layout-boxes/numeric` `bits`, `value` and `successor`, not a new binary64 or
general geometry implementation. Validated operands are nonnegative; segment spans
are strictly positive. Exact endpoint queries and constant depths return exact
authored depths without interpolation. For an interior query, orient the segment
as `lowDepth + depthDelta * distance / span` with all terms nonnegative:

1. Widen the rounded positive distance subtraction upward by one representable
   step. Widen the rounded span subtraction downward by one step.
2. If the span lower bound is zero, return the maximum authored endpoint.
   Otherwise divide, then widen upward. The fraction is mathematically in `[0,1]`,
   so an upper bound may safely be capped at one.
3. Independently widen depth subtraction, multiplication and final addition
   upward. A rounded zero/subnormal result is widened too; overflow propagates
   to an infinite upper bound, not an unchecked underestimate.
4. Linear interpolation lies in the exact authored endpoint range. Cap the result
   at its maximum endpoint. This also provides the safe ill-conditioned fallback.

There is no unit-sized allowance, blanket epsilon rewrite or production rational
engine. Tests independently decode binary64 values to exact BigInt rationals and
compare the returned bound by cross multiplication, rather than repeating the
production rounded sequence. Directed cases cover normals, subnormals, huge
values, translated cancellation, both slopes, endpoints and constant depths.

## Work, ownership and isolation

The existing input snapshot runs before feature preprocessing/allocation. Profile
validation reserves array validation work before traversing vertex descriptors,
then charges each vertex before validation/materialization. Queries charge before
scanning and charge every segment visit, including disjoint visits. Candidate
advances, selector attempts and final fragment/segment scans are charged through
the existing cumulative `compositionCapture.work`; there is no independent ledger,
new quota, two-attempt profile limit, lifted budget or bypass for failed calls.
Long blocked profiles intentionally can return `LIMIT`. Rectangle work sequences
are preserved exactly.

Production changes are limited to composition types/exports/plan, optional
composition-exclusion, three small private profile helpers and the addon type
surface. One inherited rectangle test helper's parameter annotation is widened to
`TextExclusion` for typechecking; its assertions and old fixture strings are
unchanged. Boundary inventory permits the existing `/numeric` export only from
`profile-interpolation.ts`. `wrap.ts`, `wrap-selector.ts`, `lines.ts`, `baseline.ts`,
`composition-band.ts`, core, layout, layout-boxes, geometry, fonts, native paint,
dependencies and quotas are unchanged from the captured inherited baseline.
Graph/boundary inventory changes inspect browser ESM and Node/CJS retained
consumers. The new `textFlowProfile` cost consumer and silhouette fixture are
separate; old consumer strings remain byte-identical.

## Paired costs

Commands (each cost run builds all packages and inventories packed/emitted output):

```sh
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/edge-profile-before --compare artifacts/text-flow/exclusion-optimized-vs-surgical/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/edge-profile-vs-before --compare artifacts/text-flow/edge-profile-before/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/edge-profile-vs-library --compare artifacts/text-flow/library-baseline/report.json
npm exec -- tsx scripts/text-flow-profile-evidence.ts
```

The evidence script asserts unchanged prior inputs/flags/versions/lock, identical
final metric runs, preservation of every inherited source outside the eleven
permitted integration files, zero emitted/packed delta for core and every other
non-text/non-addon package, and **zero incremental retained bytes/gzip** for
drawing, ordinary text, prepared font, JPEG and layout in browser and Node/CJS,
raw and minified.

Existing optional consumers grow; they are not portrayed as free:

| Existing consumer | Browser min bytes / gzip delta | Node/CJS min bytes / gzip delta |
| --- | ---: | ---: |
| TextFlow | +2,653 / +845 | +3,591 / +1,127 |
| TextFlow rectangle | +2,653 / +837 | +3,591 / +1,128 |

The new profile consumer's absolute minified cost is 214,751 bytes / 69,648 gzip
in browser and 333,083 / 101,884 in Node/CJS (no prior profile pair). Full raw and
minified metrics are in the reports. Package payload is not installed dependency
closure: text's emitted ESM/CJS JS deltas are +6,668/+7,589; its declarations grow
2,828 per format. Text pack grows 5,125 compressed / 30,345 unpacked bytes; addon
pack grows 34 / 112. Addon runtime JS and both Node facades are unchanged.

The library-baseline report intentionally includes inherited capability/rectangle
work. Its ordinary costs are not this slice's incremental tax: e.g. ordinary
text min bytes/gzip are +2,896/+958 browser and +8,237/+2,424 Node. The accepted
residual 384/510 ordinary wrapper tax relative to the earlier surgical comparison
is not revisited. The fresh-before comparison is the attribution for this slice.
No runtime performance improvement is claimed.

## Validation and audit handoff

Risk-based tests are in `packages/text/test/edge-profile*.test.ts` and
`packages/text-flow/test/edge-profile.test.ts`, with a separate
`tests/fixtures/text-flow/edge-profile.ts`. They cover both sides, nonzero tops,
constant-rectangle parity, concavity/internal peaks, exact/crossing caps and
vertices, collinear points, invalid rings/fields/order/domains, translated
collapse/overflow, tiny positive geometry, rational interpolation bounds, actual
mixed-font ink/advances, baseline outside the profile, inside-slope retries,
candidate-grid limitations, exact no-progress rejection, ordinary overflow,
empty/unused geometry, gaps and fractional compensated height, atomic Unicode
source/break/whitespace semantics, cumulative work and native PDF lifecycle.

Final checks, run sequentially in the worktree above:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | PASS, 1,129 files |
| `npm run lint` | PASS: Biome 1,134 files and AST principles gate |
| `npm run typecheck` | PASS, full build and `tsc --noEmit` |
| `npm test` | PASS, 1,455 tests, zero failures/skips |
| `npm run build:browser` | PASS, 12 builds; nonfatal large-chunk warning |
| `npm run check:graphs` | PASS, all 12 graph inventories |
| `npm run test:consumer` | PASS, 15 external tarball closures, NodeNext/Bundler declarations |
| `npm run test:browser` | PASS, 18 Chromium/runtime/raster tests, zero failures/skips |
| `git diff --check` | PASS |
| `npm exec -- tsx --test packages/text/test/edge-profile*.test.ts packages/text/test/exclusion*.test.ts packages/text-flow/test/*.test.ts tests/integration/text-flow-graphs.test.ts` | PASS, 43 tests |
| `npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/edge-profile-vs-before/parity.json artifacts/text-flow/edge-profile-before/parity.json` | PASS, 162 strict report/diagnostic/charge comparisons |
| `npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/edge-profile-vs-before/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json` | PASS, 216 strict wrapper comparisons |
| Cost commands above and `npm exec -- tsx scripts/text-flow-profile-evidence.ts` | PASS; zero-tax and inherited-source preservation assertions |

Earlier attempts exposed test callback lint, two type-only union integration
errors, and the missing `/numeric` boundary inventory entry; all were corrected
and the complete final chain rerun successfully. No failing gate is waived.
No principle exception is requested. Files remain cohesive and below
400 lines; functions below 50 and control-flow nesting at most three are checked
by the project AST gate. The inherited Biome config omits `packages/text-flow/**`;
the changed addon files additionally receive scoped Biome lint via a temporary
config extending the project config, without changing repository policy.

Auditor should review the actual dirty delivery against the captured source
manifest, not just `git diff HEAD`; independently check outward bounds, full-band
selection, source-preserving retries, quota retention, exact rectangle charge
parity, and optional graph isolation/cost attribution. No arbitrary-polygon or
shared-owner migration is part of this assignment.
