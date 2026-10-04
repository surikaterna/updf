# GH#51 slice 1 — private generated interval helper

Historical checkpoint: superseded by the runtime delivery in
[fractional51.md](fractional51.md). The helper now has actual content/container
callers and fragment/piece ownership; the incoming public regression is corrected.

Helper and direct tests delivered for independent audit; **GH#51 remains incomplete**.
No runtime callers, public exports, tracker writes, staging or commits were added.
The incoming `fractional51.md` and `fractional-reservation.test.ts` remain untouched.

## Manifest and ownership

- Cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Base/HEAD: `e9e6261ff662f42601c04bd9631801c28d288944` (unchanged).
- This slice owns new `packages/layout/src/generated-interval.ts`,
  `packages/layout/test/generated-interval.test.ts`, this evidence file, and the
  single internal-import inventory addition in `scripts/boundaries.ts`.
- All delivery changes are unstaged/untracked. The previous Engineer retains
  ownership of the two incoming untracked files above.

## Private API and invariant

`generatedIntervals()` creates a private `MetricSum` sequence.
`append(semanticExtent, path)` captures its value before and after adding the
finite positive semantic extent. It returns a frozen `GeneratedInterval` with
`sourceStart`, `sourceEnd`, and `semanticExtent`. Both endpoints come from the
**same accumulator**; callers must append preceding metrics to that sequence,
not reconstruct an interval from independently rounded offsets and extents.

`materializeGeneratedInterval(interval, origin, { sourceStart, sourceEnd }, path)`
returns a frozen `{ start, sharedEnd, semanticExtent, allocationExtent }`.
A private WeakSet authenticates the input record before its fields are read;
copies and user-created records cannot supply a certificate. These functions are
module-internal APIs, not package entry-point exports.

Admission first checks finite nonnegative origin/reservation coordinates and
strict source containment (`interval.sourceStart >= reservation.sourceStart`
and `interval.sourceEnd <= reservation.sourceEnd`). No axis capacity, tolerance,
or translated rounding cell participates in source admission. Even a one-ULP
source endpoint overflow rejects when translation would erase the difference.
The source interval is the accumulator's binary64 endpoints, not a claim about
an unrounded real-number sum of all metrics.

The unchanged start association is `sum([origin, sourceStart])`. The shared end
is `sum([origin, sourceEnd])`, using the same origin. Both must form a finite
positive interval strictly inside the materialized enclosing reservation.
If `start + semanticExtent <= sharedEnd`, allocation preserves the semantic
extent exactly, without requiring a new conditioning certificate.
Otherwise `derivedAxis(start, sharedEnd, path).capacity` must pass the existing
finite-positive, endpoint-midpoint/parity and local conditioning checks. Its
exact dyadic difference from the semantic extent must additionally be at most
`32 * spacing(bits(semanticExtent))`. That limit is a **rejection ceiling**, not
permission for source or materialized overflow. Finally the actual native
`start + allocationExtent` must fit both the shared end and enclosing end.

The reproduction produces start `18.6`, shared end `31.2`, semantic extent
`12.6`, allocation extent `12.599999999999998`, and native allocation end `31.2`.
It does not change semantic line height, glyph origins, baselines, reservations,
ink validation, clips, fixed-node behavior, or global arithmetic policy.

## Validation

- `npx tsx --test packages/layout/test/generated-interval.test.ts packages/layout/test/axis.test.ts packages/layout/test/cancellation.test.ts`:
  PASS, 20/20. Seven new tests cover unchanged ordinary extents, reproduction,
  one-ULP source overflow hidden by translation, exact threshold midpoint and
  next-coordinate overflow, subnormals, invalid/negative/nonfinite inputs,
  forged records, collapsed endpoints and ill-conditioning.
- `npm run lint`: PASS (Biome and code-principles ESLint).
- `npm run format:check`: PASS.
- `npm run typecheck`: FAIL only at incoming
  `packages/layout/test/fractional-reservation.test.ts:23`, TS2740:
  `ParagraphContent` is not `readonly FlowBlock[]`. All package builds in this
  command passed. The unrelated incoming test was not changed.
- `npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck packages/layout/src/generated-interval.ts packages/layout/test/generated-interval.test.ts`:
  PASS for the delivered helper and direct tests.
- `npm test` (serial rerun after completed build): FAIL, 566/568 pass; only the
  two incoming GH#51 runtime reproductions fail, as expected without wiring.
  An earlier run overlapping the build had an additional transient module-export
  load failure; it did not recur in the serial rerun.
- `npm run check:graphs`: PASS, including internal seam inventory.
- `git diff --check`: PASS.

Code-principles self-check: cohesive files under 400 lines; functions under 50
lines and nesting within the configured limit; intent-only comment; no unsafe
certificate acceptance; risk-based boundary tests added. No approved exceptions
or rule suppressions. Slice-local checks pass; repository-wide tests/typecheck
remain red as stated, and no merge-readiness or independent verification is claimed.

## Next assignment, not part of this delivery

Auditor should independently check source admission versus translated capacity,
ownership, native association, and exact residual conditioning. Slice 2 must
wire owned source intervals into generated line allocations while preserving
semantic line heights, glyph/baseline positioning and reservation semantics.
The helper intentionally rejects negative coordinates, zero/collapsed intervals,
and uncertifiable corrections. It provides no hidden-overflow or ink-clip bypass.
The caller should separately assign correction of the incoming regression's
measurement API type error to its owner; this slice does not fix it prematurely.
