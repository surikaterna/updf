# Add configurable, validated resource budgets

## Summary

Replace the renderer's hard-coded resource ceilings with an explicit, validated budget/profile contract while retaining safe bounded defaults. This is roadmap step 1: callers should be able to choose appropriate limits without making untrusted rendering unbounded or weakening validation.

## Context

The experimental TypeScript 2.0 proof currently enforces limits including 20 pages, 10,000 total nodes, 4,096 characters per text node, 100,000 total text characters, and 10 MiB output. It also bounds VDOM expansion/snapshots and prepared-font resources. These are concrete POC safeguards, not a measured universal workload profile or a released API. Validation, measurement, and serialization are separate pipeline stages; limits must be enforced before large allocation/work wherever possible.

The POC lives locally at `experimental/declarative/` on the `feature/declarative-cmr-poc` worktree based on `7782bb3`. That proof is not on GitHub and is not a release; this issue must not depend on a broken link to it.

## Scope

- Define which resource limits callers may configure, their units, validation rules, and whether each applies per document, resource, or render call.
- Preserve bounded defaults and hard implementation ceilings; configuration must not silently disable validation or permit unsafe/unbounded allocation.
- Apply effective limits consistently across validation, measurement, VDOM lowering, resource/font handling, and output serialization where applicable.
- Return stable structured diagnostics that identify the exhausted budget and relevant input path.
- Document compatibility and precedence when profiles and individual overrides are supplied.

## Acceptance criteria

- Defaults retain bounded behavior and have tests for every documented limit and boundary.
- Invalid, negative, non-finite, inconsistent, or above-hard-cap settings fail deterministically before expensive processing.
- Lower configured limits are enforced at the earliest safe point; exact output-size checks still occur before final output allocation.
- Tests cover boundary values, aggregate versus per-item accounting, VDOM expansion, fonts/resources, and output limits without relying only on happy paths.
- Public types and runtime validation agree, and user-facing documentation explains defaults, units, hard caps, and errors.

## Validation

Run the experimental subtree's strict typecheck, lint, build, and tests. Add targeted tests proving limits cannot be bypassed through `render`, `renderUnknown`, VDOM lowering, shared/reused input, or resource aliases. Review allocations and accounting for overflow and off-by-one errors.

## Dependencies

Build on the local declarative POC's existing bounded pipeline. Establish a measured workload baseline before changing default values; do not select larger “production” limits by guesswork.

## Non-goals

This does not make synchronous rendering a time-isolated sandbox, guarantee protection from trusted extension code that does not return, or promise arbitrary adversarial-input safety. It does not raise limits or add new document features as a side effect.

## Related roadmap issues

- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add optional flow layout and page templates](https://github.com/surikaterna/updf/issues/27)
- [Add bounded raster-image resources](https://github.com/surikaterna/updf/issues/33)
