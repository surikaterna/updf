# Repository contributor instructions

These instructions complement higher-priority instructions; they do not replace
them. This file directs repository contributors, not users authoring documents
with agents. Existing authoring documentation under `docs/agents/` is separate.

- Keep changes scoped and files cohesive. Preserve unrelated work and existing
  behavior unless the task explicitly requires a change.
- Follow [code quality](docs/code-quality.md): source files at most 400 lines,
  functions under 50 lines, and control-flow nesting at most three levels. Use
  comments for intent, invariants, or non-obvious tradeoffs, not code narration.
- For numerical changes, follow the canonical
  [numerical policy](docs/architecture/numerical-policy.md). Classify each touched
  operation/API before changing comparisons: exact input/identity validation,
  approximate derived fit/containment, or a named exact native certificate.
- Validate operand domains separately. Reuse `@updf/layout-kernel/arithmetic`
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
