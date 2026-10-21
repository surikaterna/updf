# Repository contributor instructions

These instructions complement higher-priority instructions; they do not replace
them. This file directs repository contributors, not users authoring documents
with agents. Existing authoring documentation under `docs/agents/` is separate.

- Keep changes scoped and files cohesive. Preserve unrelated work and existing
  behavior unless the task explicitly requires a change.
- This is an unpublished greenfield API. When a canonical migration is explicitly
  authorized, prefer the smallest coherent, powerful model: remove incidental APIs
  rather than adding compatibility shims, aliases or parallel installation paths.
- Follow [layout content roles](docs/architecture/layout-content-roles.md): distinguish
  block/inline participation, atomic/split fragmentation, and Row/Column layout mode.
  Reuse existing owners before adding abstractions. Native body admission must not
  depend on content type, producer identity, atomic/split mode or natural height.
  The existing Paginator admits every validated top-level fragment using its actual
  height and margin-adjusted origin before paint. Do not reintroduce a registry or
  special native eligibility branch. See [current migration status](docs/evidence/uniform-body-admission.md):
  the public provider ABI is now width-only `MeasuredBlock.next`, including tables.
   Raw/rich paragraphs share a finite-default metric selection operation per lifetime.
   Already-resolved fixed/spacer/Row/closed frames use the shared `frameFits`
   predicate, not kernel source registration. Keep input/output/page budgets and
   native admission mandatory; real unit enumeration retains its kernel limits.
   See [measured simplification](docs/evidence/resolved-frame-fit.md). Do not equate
   one admission owner with routing every known height through a stateful selector.
   The private painting ABI declares every selected ordinary painting part and
   direct child; iterative preparation completes the whole selected graph before
   any painter or late geometry callback runs. This seam is implemented, ready for
   independent audit, not verified; see [preparation evidence](docs/evidence/fragment-paint-preparation.md).
   Private stack/container composition and the PreparedBlock bridge still exist.
   Assess their actual responsibilities and failure cases before further rewrites.
   The unused B1 host admission session has been removed; the public kernel
   candidate API remains supported. Do not recreate a parallel host session merely
   for uniformity. See [delivery cleanup](docs/evidence/host-admission-removal.md).
- Keep host measurement, fragment policy, budgets and native painting separate
  from staged box layout and shared metric arithmetic. Preserve exact native
  certificates; justify micro-costs with paired evidence, not blanket EPS or
  fixed-point rewrites. Verify actual base instructions, not historical PR status.
- Exact scalar domains, authored width/cache identity, native certificates, quotas,
  owned handles and operation/recipe lifecycles are non-negotiable. Reuse their
  measurement owners; justify added branches and micro-costs with net paired data.
- Production builds retain those runtime guarantees. Only additional debug tracing
  or diagnostics may be optional; never use a build mode to bypass admission,
  validation, ownership, lifecycle or quota checks. Prefer statically selected
  capabilities: range-only consumers use `createRangeOperation`; consumers needing
  candidate enumeration or region flow use the full fragment operation. Both share
  the same selector and lifecycle owner. Measure retained output, not just imports.
- Kept/closed container contents and Row Columns request complete source selection
  explicitly, rather than inventing a capacity from natural height or one point.
   Authored definite alignment still uses its real bounded content region. Natural
   measurement also requests complete selection and reports the metric sum of actual
   selected fragment heights. Its cumulative selection budget and whole-measurement
   geometry preparation precede painting; authored height ceilings still reject.
   Line reports consume prepared paint coordinates rather than reconstructing
   container layout. See [natural measurement evidence](docs/evidence/natural-complete.md).
   Complete selection never bypasses work limits, authored constraints, clipping
   policy or native admission.
- Follow [code quality](docs/code-quality.md): source files at most 400 lines,
  functions under 50 lines, and control-flow nesting at most three levels. Use
  comments for intent, invariants, or non-obvious tradeoffs, not code narration.
- For numerical changes, follow the canonical
  [numerical policy](docs/architecture/numerical-policy.md). Classify each touched
  operation/API before changing comparisons: exact input/identity validation,
  approximate derived fit/containment, or a named exact native certificate.
- Validate operand domains separately. Reuse `@updf/layout-boxes/arithmetic`
  for approximate comparisons with justified immediate-local operation scales;
  do not introduce unit-sized epsilon allowances or blanket comparison rewrites.
  Preserve exact certificates and exact request/cache identity.
  For example, request `usedHeight` versus `height` is an approximate occupancy
  relation even at a public boundary; each field's finite/nonnegative domain,
  offsets, quotas, authored min/max and fixed-width identity remain exact. Do not
  apply tolerance indiscriminately to numeric properties.
- Add risk-based boundary and regression tests for changed numerical contracts.
  Explain intentional behavior changes and any justified principle exceptions
  in review notes; do not describe pending migrations as already implemented.
- Run relevant gates from `package.json`: `npm run format:check`, `npm run lint`,
  `npm run typecheck`, and `npm test`, plus affected host/package checks where
  applicable. Report exact commands, outcomes, and unavailable or failing checks.
  A docs-only change can use scoped document validation without claiming runtime
  coverage. Existing failures are not passes or blanket CI waivers; required CI
  must pass before merge, subject only to explicitly documented exceptions.
