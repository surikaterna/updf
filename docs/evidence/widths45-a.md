# #45-A shared width resolver

Engineer implementation evidence; independent audit remains required. Issue #45
and related #44 remain open; tracker changes were not authorized.

## Delivery boundary

- Cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`; clean incoming base and unchanged HEAD:
  `3fc05d01b74e7b62ea3719bf2847f7f372af74b3`.
- Parent owns integration. Delivery is unstaged/untracked only, with no staging,
  commit, push, delegation, dependencies or tracker mutation.
- Owned manifest: layout `src/width-types.ts`, `src/width-input.ts`,
  `src/width-distribution.ts`, `src/width-resolver.ts`, minimal `src/index.ts`
  export, `test/width-resolver.test.ts`, one importer inventory entry in
  `scripts/boundaries.ts`, and this evidence/contract document.
- No table/Row integration, legacy/core renderer edits, intrinsic content scan,
  percentages, CSS flex semantics, shaping or SVG #50 changes.

## Supported contract

```ts
import { resolveWidths, type WidthTrack } from '@updf/layout';

const tracks: readonly WidthTrack[] = [
  40,
  { weight: 1, min: 20, max: 100 },
  { weight: 2 },
];
const resolved = resolveWidths({
  availableWidth: 300,
  tracks,
  gap: 8,
  maxTracks: 100,
}, '/row');
```

Scalar tracks are fixed point widths, retained bit-for-bit. Weighted tracks have
positive finite weights, and optional positive finite point minima/maxima.
Zero (including negative zero) is rejected for widths, bounds and weights, in
line with current table and geometry contracts. An omitted minimum is the least
positive binary64 value, `Number.MIN_VALUE`; an omitted maximum is available
width. Explicit maximum must be at least minimum. Available width is positive
finite; gap is nonnegative finite and defaults to zero. Gaps occur only between
tracks, are deducted exactly once, and are returned for caller placement.

Resolution occurs before child measurement and does not inspect children. Fixed
widths and gaps are allocated first; weighted widths solve
`clamp(lambda * weight, min, max)` against the remaining budget. Exact sorted
min/weight and max/weight breakpoints implement bounded redistribution: each
breakpoint activates or saturates a share, and the remaining shares redistribute
proportionally. This avoids incorrect simultaneous min/max clamping. Complexity
is O(n log n), storage O(n), with bounded-size BigInt binary64 arithmetic; there
is no unbounded iterative convergence or intrinsic scan.

The implementation uses exact integer dyadics and rational products, reusing
layout's existing binary64 helpers. Weight sums and comparisons cannot overflow
or underflow; even `Number.MIN_VALUE` versus `Number.MAX_VALUE` stays meaningful.
No decimal quantization or arbitrary epsilon is used. Exact fixed/minimum/gap
sums exceeding the exact input budget fail with `GEOMETRY` at `<path>/tracks`,
even if native addition would hide the excess. There is no silent shrink.

Each exact bounded share is rounded down to binary64. Fractional shares may then
receive **one successor ULP** in stable input order, only if the exact residual
budget can pay for it and the maximum remains respected. Exact shares and fixed
tracks are untouched. Each weighted result lies between its exact target's floor
and ceiling. Thus rounding conserves the budget soundly, without transferring a
large-track ULP to a tiny track and destroying proportional fairness. Exact
exhaustion is obtained when those ULPs permit it; otherwise representational
slack remains unused. Saturated maxima also leave trailing unused width.

Results and the widths array are frozen; inputs are neither mutated nor retained.
`occupiedWidth` is the upward-rounded exact sum of widths plus gaps and never
exceeds available width. `unusedWidth` is the downward-rounded exact remainder.
Their native sum need not equal available width. Likewise a naive native
left-to-right sum of widths is not an exact arithmetic certificate: consumers
must still validate materialized coordinates using layout's existing numerical
geometry policy, especially at translated origins/extreme scales.

Runtime inputs accept only ordinary dense arrays and plain data objects with
enumerable data properties. Unknown keys, accessors, explicit undefined fields,
invalid numbers and malformed tracks receive core diagnostics with JSON-pointer
paths (including escaped unknown keys). The optional diagnostic root defaults to
`/widths`. `maxTracks` is a nonnegative safe-integer caller budget, default 10,000;
length is checked before scanning entries. Consumers should pass their remaining
node/column budget and charge their own source/generated work as appropriate.

## Migration / next #45-B slice

TableColumn is intentionally unchanged in A. B should widen its existing scalar
`width` to `WidthTrack`, validate/snapshot public data/TSX through that contract,
and resolve once against the table's available content width with gap zero.
Store the frozen widths and reuse them for all header/body/footer cells and pages,
before measuring any cells. Preserve existing explicitly sized fixture/PDF
output; consider the all-scalar compatibility path explicitly rather than
accidentally adopting a different native total/placement association. Map track
diagnostics to public column width paths. Upcoming #44 Row should use this same
resolver with its explicit gap and validate translated materialized geometry,
not duplicate weighted/gap arithmetic.

B owns public table docs/migration, multi-page stable widths, alignment and
containment/PDF tests, explicit-width regression fixtures, and Node/browser
parity. A has no changed rendering path, so browser/raster gates are deferred to
B. Independent Auditor should review breakpoint math, exact infeasibility,
floor/ceiling residual fairness, budget checks and the exported contract.

## Self-check and evidence

Universal checklist: cohesive production files below 400 lines, functions below
50 lines, nesting at most three; intent-only comments; no approved exceptions.
Risk-based coverage adds mixed constraints and multiple saturation passes,
fractional residual order, overflowing/underflowing weights, exact infeasible
negative controls, runtime paths/count budget, immutability, 500 seeded mixed
extreme-scale cases and proportional fairness checks.

Commands run from the delivery cwd:

- `npx biome format --write packages/layout/src/width-*.ts packages/layout/src/index.ts packages/layout/test/width-resolver.test.ts`
- `npx biome check --write packages/layout/src/width-*.ts packages/layout/src/index.ts packages/layout/test/width-resolver.test.ts`
- `npx tsx --test packages/layout/test/width-resolver.test.ts`: 9/9 pass.
  Initial extreme-weight failure exposed unfair whole-residual reassignment;
  the corrected one-successor-ULP rule passes the negative control.
- `npm run lint`: pass (Biome and enforced code-principles ESLint).
- `npm run typecheck`: pass, including full workspace build.
- `npm test`: 507/507 pass (498 existing plus nine resolver tests).
- `npm run test:consumer`: pass, seven clean packed external closures.
- `npm run check:graphs`: initially rejected the unlisted validator importer;
  added only its inventory entry, retaining existing core internal exports.
  Final rerun passes source seams and all 12 available build graph inventories.
- Final `npm run format:check && npm run lint && npm run typecheck && npm run check:graphs`:
  all pass. Final `npm test`: again 507/507 pass, with tests importing the public
  layout entry and asserting extreme-scale representational slack remains unused.
- `node --input-type=module -e 'import assert from "node:assert/strict"; import { resolveWidths } from "@updf/layout"; assert.deepEqual(resolveWidths({availableWidth:100,tracks:[10,{weight:1},{weight:3}],gap:5}).widths,[10,20,60]); console.log("Emitted public resolver runtime: PASS");'`:
  pass against emitted package JS, without tsx source aliases.
- `git diff --check`: pass. Final manifest has exactly the eight files listed
  above: two unstaged tracked modifications and six untracked new files.

No Changesets workflow is present/introduced. Existing browser build graph
inventories were checked, not regenerated browser integration/PDF evidence.
Browser checks remain for B; known SVG #50 deferral is untouched.
