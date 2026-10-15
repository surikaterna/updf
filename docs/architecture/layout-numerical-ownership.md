# Production layout numerical ownership (bounded audit)

This maps the production paths at `c48b5a3032b31dbf45f5024934fd49071ab6a30b`
and the private paginator-origin consolidation based on it. It does **not** migrate
fit contracts. The [canonical numerical policy](numerical-policy.md) remains
authoritative and unchanged. See [measured evidence](../evidence/layout-placement.md).

## Operation classes and existing owners

Paths below are relative to `packages/`. An operation's contract, not whether its
value was authored or generated, determines its comparison class.

| Owner / production consumers | Contract and boundary | Decision in this slice |
| --- | --- | --- |
| `layout-boxes/src/arithmetic.ts`; `core/src/measurement/arithmetic.ts`, `text/src/arithmetic.ts` | `MetricSum`/`sum` own ordered compensated occupancy accumulation; `exceeds` owns approximate derived fit, with the existing two-relative-epsilon formula. Core and text already reexport the same owner. | No recurrence, tolerance, helper, or reexport change. |
| `layout-boxes/src/fragment-select.ts` | Provider heights have separately validated finite/nonnegative domains; selection uses `exceeds(sum([usedHeight, accumulated, candidate]), height)`. Width equality, offsets, progress and work counters are exact. | Metric selection is not a native geometry certificate. |
| `layout-boxes/src/fragment-regions.ts`, `fragment-source.ts` | Region flow accumulates occupancy with the shared sum and places ranges in its local frame. Request/region occupied-height relation is approximate; identifiers, cursor ownership, field domains and quotas remain exact. | No host pagination migration. |
| `layout-boxes/src/box-containment.ts` | Explicit native containment preserves exact `(inset + offset) + extent` versus `frame - trailing`; metric mode uses shared `exceeds` on both edges with immediate-local scales and separate finite checks. | No flattened ancestor frame or global scale. |
| `layout-boxes/src/geometry.ts`, `binary64.ts`, `numeric` export | `derivedAxis` certifies maximal native capacity with its existing 32-local-ULP conditioning budget. `materializedStart` certifies exactly `(axis.start + offset) + extent`. | Preserve association and throwing diagnostics, not interchangeable with metric fit. |
| `layout/src/axis.ts`, `template.ts`, `sizing.ts` | Host delegates native certification to the kernel and translates kernel errors. Template body and inset capacities belong to this owner. | No duplicate geometry implementation; do not funnel native `+`/`-` through a different association. |
| `layout/src/generated-interval.ts` | Private owned generated intervals use a compensated source sequence, strict source reservation and exact part identity. A certified allocation extent can differ from semantic extent within its existing local budget. | Allocation is not permission to change authored size or arbitrary provider height. Not a duplicate metric fit. |
| `layout/src/container-reservation.ts`, `container-budget.ts`, `budget.ts` | Ancestor height propagation uses shared sums, but reservations charge node/command counts before copying. Candidate-local state tracks exact count deltas; output budgets are exact. | Budget reservation is not geometry placement. Preserve preflight/live charge order. |
| `layout/src/stack.ts`, `paragraph-producer.ts`, `content-producer.ts` | Shared accumulation and metric occupied-height selection; exact progress and dyadic space continuation. `availableHeight` is still a separate subtractive hint. | No replacement by a fixed-point accumulator or new candidate protocol. |
| `layout/src/paginator.ts` | Compensated cursor and approximate `fits`; native pre-paint whole-fragment certificate; relative-part native certificates and overlap guard; record then cursor publication after painting. Controls record a zero-height certificate before advance. | Reuse only the already-certified whole-fragment `y` in private recording. Keep all other checks. |
| `layout/src/container-producer.ts`, `container-paint.ts` | Metric producer admission coexists with native capacities, generated-part certificates, exact native child endpoints and authored hidden clipping. Children paint in immediate-parent frames. | Not a redundant paginator check: local child bounds still need validation. |
| `layout/src/extension-producer.ts`, `leaf-cache.ts` | Checked finite dimensions/progress, approximate occupied-height fit, exact measured width bound and width/cache identity. Public output gets validated/snapshotted before private painting. | Do not assume atomic `naturalSize.height` equals a returned fragment's height. |
| `layout/src/row-boxes.ts`, `row-producer.ts`, `column-boxes.ts` | Row and standalone Column stage kernel boxes with metric containment; host retains source/output quotas, body extents, native painting and pagination. Issued allocated width is preserved exactly. | No general placement coordinator or new public API. |
| `layout/src/decorated-producer.ts`, `decorations.ts` | Shared sums for before/content/after reservations; forked candidate state/budget, selected-only adoption, exact decoration capability identity, local painting and existing native part checks. | Repeated arithmetic here has distinct candidate/reservation/paint roles, not automatically removable. |
| `svg/src/layout.ts` | SVG still compares authored block height strictly with callback `availableHeight`; capability, sizing and native output validation remain exact. | Preserve known decimal false-deferrals; no SVG guard change. |

The scoped source search found no local `EPSILON`, second `MetricSum` class, or
local `sum`/`exceeds` implementation in `layout/src`. Existing arithmetic-byte
preservation and graph tests remain authoritative; this slice does not add a
duplicate ownership-test framework or impose a blanket operator lint rule.

## The genuine duplicate removed

Previously `Paginator.consume` certified the whole fragment origin before paint,
then `recordFragment -> place` called `materializedStart` again with the same
axis, cursor, extent and path. Now `recordFragment` receives that `y` and passes it
to `place`; `place` stores it directly. The source witness is this direct dataflow:

```text
consume: y = materializedStart(vertical, origin, fragment.height, path)
         resolvePaint(fragment, { y, start: relative-part native check, ... })
         recordFragment(..., path, y)
recordFragment: place(index, y, fragment.height, ...)
place: box = { x, y, width, height }; position.add(height)
```

Controls have no paint origin, so they explicitly obtain their own zero-height
certificate using the previous default `/body/${index}` diagnostic path before
recording and advancing. `bodyStart`, its overlap guard, the pre-paint overlap
guard, final host/native geometry checks, cursor arithmetic, callback order,
state adoption, and budget publication are unchanged. This removes one redundant
whole-fragment certificate per successful ordinary fragment, **not** certificates
for independently positioned child parts.

The private protocol marks fragment properties readonly. More importantly, public
extension callbacks do not receive these private fragments: `checkedFragment`
captures validated `nextOffset` and `height` into a new internal record, snapshots
emitted nodes and supplies its own paint closure. Containers and decorations also
construct their own records. No exposed callback path was found that could mutate
the certified private height during paint. No new freeze or getter/read policy is
introduced; post-paint height reads and existing internal producer obligations stay
as before. Arbitrary mutation of internal objects via private imports is not a new
supported public contract.

## Remaining limitation and required decisions

This is consolidation, **not general placement coordination** and **not a fix for
numerical false-deferrals**. In particular:

- SVG `[4.9, 0.1]` in `5` and `[1.2, 1.1]` in `2.3` still use two pages even though
  their final second native placements are certifiable at origin zero. The strict
  subtractive available-height hint can be smaller than the candidate height.
- `[0.1, 0.2]` in `0.3` and three `10.3` units in `30.9` are not generally native
  eligible at origin zero. Approximate metric fit alone cannot authorize them.
  Translation to 700 can change native eligibility (covered for `30.9`); there is
  no one-page or translation-invariance promise.
- A broader repair needs an approved valid-known-candidate contract and a
  nonthrowing native certificate query, with candidate/state/budget/error-order
  semantics specified. Constructing `derivedAxis` on arbitrary tiny remaining
  intervals is unsafe because valid parent regions can have ill-conditioned
  remainders. Returning synthetic allowance as an authored size is not authorized.

No fixed-point model, public `usedHeight`, fixed-height flag, provisional allowance,
epsilon widening, kernel migration, or dependency on unmerged PR #84 / #68 is part
of this delivery. The broader steps 1–5 / false-deferral objective remain partial
and require a separate approved scope.
