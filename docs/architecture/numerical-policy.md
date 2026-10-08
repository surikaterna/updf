# Numerical policy: exact contracts and approximate derived containment

This is the canonical contributor policy for numerical changes, not a claim that
every current guard implements it. The bounded adoption below intentionally changes
the public occupied-height fit relation, not operand domains or stored geometry. See
[layout-boxes architecture](layout-boxes.md) and [code quality](../code-quality.md).

## Classify the operation, not the number's provenance

| Contract | Required comparison |
| --- | --- |
| Authored/input type, finite values, positive/nonnegative fields, authored closed ranges, min/max contradictions | Exact validation of the field's domain |
| Counts, work budgets, byte/pixel caps, progress, IDs/identity, source offsets and safe integers | Exact validation and comparisons |
| Prepared/request width compatibility and cache keys | Exact identity; even a one-successor width change can wrap differently |
| Derived accumulated occupied metrics versus available metrics | Shared approximate fit predicate where the API permits it |
| RangeRequest/FragmentRegion `usedHeight` versus `height` | Derived occupancy fit: `!exceeds(usedHeight, height)` with default scale, including public caller-supplied metrics |
| Calculated endpoints versus bounds in the same immediate local frame | Shared approximate containment where the API permits it |
| Named native coordinate/interval certificates | Their existing exact API and local precision-budget contract |

Classification belongs to the operation/API contract. It is not a universal
source-versus-generated branch, nor a trusted `derived` tag: user-supplied ASTs,
synthetic inputs, and unknown provenance still require validation. A bound may
come directly from literal input while the endpoint compared with it is the
result of approximate arithmetic. That does not expand the stored input frame.

Authored width/min/max constraints are not reported occupancy-fit relations.
Request `usedHeight` may contain a previous calculation, so its relation to
`height` permits bounded metric roundoff even at the public boundary. Both fields
still require exact finite, nonnegative number validation. The API preserves the
original values, including a small positive overrun; it never clamps usedHeight.
Beyond the existing formula it rejects with `GEOMETRY` at `/request/usedHeight`.
The existing dimension validator also reports `GEOMETRY` for wrong types,
nonfinite values and negative lengths; own-record/accessor failures report `TYPE`.
Offsets, progress, count/work quotas, fixed-source width equality and authored
min/max contradictions remain exact. No unrelated width enters this allowance.

Validate every operand's type, finiteness, sign, range and integer requirements
separately, including relevant intermediates. Tolerance never legalizes authored
negative lengths, NaN, infinities, unsafe integers, or contradictory constraints.
Signed positions are allowed only where the particular field contract permits
them; there is no universal prohibition on negative x coordinates.

Do not use approximate fit for equality, sorting, cache identity or equivalence
classes. Approximate closeness is not transitive. Do not replace production `>`
comparisons with `!exceeds` by search-and-replace.

## One existing arithmetic owner

Use `MetricSum`, `sum` and `exceeds` from
`@updf/layout-boxes/arithmetic` (`packages/layout-boxes/src/arithmetic.ts`).
Text reexports these from `packages/text/src/arithmetic.ts`; core's internal
`packages/core/src/measurement/arithmetic.ts` seam also shares this implementation.
There is no third numerical library or new geometry export needed for this policy.

`MetricSum` is mutable compensated scalar accumulation; `sum` accumulates in
input order and returns zero for empty input. They do not validate domains, imply
units, provide exact mathematical sums, or guarantee geometry certification.
Nonfinite arithmetic propagates. Do not substitute JSON long-double encodings or
bit patches for these operations.

The existing `exceeds(actual, bound, operationScale = 0)` is unchanged:

```text
if any of actual, bound, operationScale is nonfinite: return true
if actual <= bound: return false
scale = max(abs(actual), abs(bound), abs(operationScale))
return (actual - bound) > scale * (2 * Number.EPSILON)
```

This is **two relative machine epsilons**, not an exact two-ULP distance rule or
fixed `0.001`-unit allowance. It is not a general bound on arbitrary operation
error. Do not introduce an EPS magic constant, a global unit enum, or a one-point
scale. A boolean approximate fit result is not an exact source-interval token.

For very small normal values such as an exact source value `1e-300`, the relative
allowance is correspondingly tiny; source validation still remains exact. There
is no arbitrary `Number.MIN_VALUE` floor. In the subnormal range the existing
multiplication can underflow the allowance to zero, leaving a strict comparison.
Do not promise scale invariance across all binary64 values.

## Immediate-local geometry and operation scale

After separate finite/domain validation, approximate upper containment uses
`exceeds(endpoint, upperBound, localScale)`; lower containment uses
`exceeds(lowerBound, endpoint, localScale)`. Both endpoint and bound must be in
the **same immediate local frame**, not a flattened ancestor coordinate system.
These tests classify a calculated result; they neither enlarge stored frames nor
silently round, clamp, shrink, crop, or repair geometry.

Leave `operationScale` at its default zero when endpoint/bound magnitudes capture
the real calculation's local scale. For cancellation near zero, use the maximum
absolute magnitude of immediate operands and relevant intermediates actually
produced by that calculation. Examples are the operands of `position +
glyphOffset` and of `frameWidth - rightInset`. Include relevant operations on
both sides of the comparison, not hypothetical magnitudes.

Never inflate the allowance with unrelated whole-page width, opposite-axis
dimensions, flattened ancestor origins, or document-wide maxima merely to pass
a test. A different multiplier requires actual operation-error analysis and an
explicit contract change, not a global increase to the existing factor.

Future bounded containment changes must keep final geometry checks consistent
with their fit decisions on both lower and upper bounds. Preserve parent-frame
geometry for nested fragments; do not linearize the full ancestor chain and
introduce cancellation. This guidance does not implement a region engine or
authorize a production host/flow migration, candidate-lookahead framework, or
replacement of an exact native certificate.

## Exact certificates and host responsibilities

`packages/layout-boxes/src/binary64.ts` and `/numeric` bit/dyadic/floor helpers
are distinct from approximate metric arithmetic. `derivedAxis` and
`materializedStart` in `packages/layout-boxes/src/geometry.ts` remain exact
native binary64 certificates under their existing validated domains, association
rules and local conditioning budgets. “Exact” here describes those native API
contracts, not arbitrary real-number arithmetic. Do not replace their checks
with `exceeds`, or pass approximate containment as an exact interval certificate.

For a TUI, the host projects edges onto its integer grid **before measurement**,
uses the same projected bounds when painting, and applies exact integer checks.
Tolerance must not grant an extra terminal cell. Host projection does not create
a global unit scale for the kernel.

PDF native certificates, legacy conversions and existing source validation stay
unchanged until an explicit mapped migration. This policy does not authorize
loosening PDF certificate boundaries or modifying SVG/host behavior.

## Adoption status

| Area | Current status |
| --- | --- |
| Metric arithmetic | Existing kernel implementation; text and core share/reexport it; unchanged in this change |
| Public request occupied-height fit relation | Implemented in this change using unchanged `exceeds` default scale; operand domains remain exact |
| Derived geometry containment | Policy for future bounded changes, not a region-engine implementation in this change |
| Generic `layoutBoxes` | Optional `containment: "metric"` adopts bounded natural-height fit and immediate-parent lower/upper endpoint containment; default `"native"` remains strict, result reports its guarantee; production Row and standalone Column use staged boxes with metric containment while the host retains pagination and body/fragment extents |
| Native exact certificates | Unchanged; their named contracts remain authoritative |
| Production core page guards | Mixed strict/tolerant, not migrated here |
| Layout adapter measurement bounds, table-column width bounds | Remain exact/unmigrated; no blanket adoption claim |

In this repository the page guard is `inPage` in
`packages/core/src/nodes/geometry.ts`, not `packages/core/src/core/bounds.ts`.
After optional clip intersection it uses strict lower-edge checks (`< 0`);
rich-box upper edges use `exceeds`, while other upper edges use strict `>`.
`packages/core/src/painting/bounds.ts` owns geometric bounds/intersection
construction. These existing guards are not rewritten by this change.

Contributor instructions must not waive failing CI. Experiment outcomes are
transient evidence, not repository-wide permissions or active instructions.

## Regression expectations for adoption

These cases define review/test expectations proportional to each bounded change:

- Derived `0.1 + 0.2` versus `0.3` fits under the current two-relative-epsilon
  predicate. An authored negative length, however tiny, still fails its domain.
- A source quota of 10 rejects 11 (`10 + 1`); no tolerance applies to counts or
  work limits. Prepared width versus its next representable successor mismatches
  exactly, even when an approximate metric comparison would accept it.
- Preserve flat fits `[1.2, 1.1]` into `2.3` and `[4.9, 0.1]` into `5`, and
  accumulated flow carry. For future nested containment adoption, test parent-frame
  calculations without flattening parent geometry into ancestor coordinates.
- Test derived upper and lower containment at exact boundaries, just inside
  and just outside the relative allowance when adopting those comparisons.
  Construct neighboring representable values with existing successor operations
  in tests; compute the actual local operands and formula for each comparison,
  rather than hard-coding an EPS distance. Beyond-allowance bounds violations must
  fail. Keep authored-input boundary tests separately exact.
- Cover cancellation near zero with justified immediate-local scales, far
  representable scales, subnormals (including zero allowance), and each nonfinite
  argument. Test grouping/accumulation contexts and exact work-limit boundaries
  proportional to the changed code's risk.
- For occupied-height adoption, cover unclamped immutable request snapshots,
  public region calls, near-boundary zero-unit progress, positive overflow,
  rejection before provider callbacks, exact fixed-width identity and work quotas,
  and an exact native certificate rejecting an endpoint accepted as metric fit.
- Future containment changes must test consistent fit and final-fragment bounds.
  Resolve nonmonotone candidate regressions explicitly, not by skipping them,
  relabeling failures as passing, or widening all allowances.

Future changes must classify touched contracts first, migrate only their bounded
scope, add boundary tests, and attribute intentional behavior changes in review
notes. Run relevant [quality gates](../code-quality.md) and affected host checks;
record failures/unavailable checks and keep exact certificates intact. This
document alone is not evidence that those gates passed; record current validation
in the implementation handoff and review evidence.
