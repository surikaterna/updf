# Restructure UPDF as a compatibility-preserving TypeScript monorepo

## Summary

Restructure the repository so the legacy implementation and native TypeScript packages have clear, maintainable package boundaries and responsibilities. Define ownership, optional dependencies, and exports explicitly while preserving existing consumer compatibility through a staged migration.

## Context

The local declarative TypeScript 2.0 proof is isolated under `experimental/declarative/` and demonstrates a parser-free core, optional font adapter, separate browser entries, native TS/TSX, and strict package-consumer checks. It is an untracked local proof, not a published package or approved final monorepo design. The legacy implementation remains the compatibility reference during planning and migration.

POC context: local worktree `feature/declarative-cmr-poc`, base `7782bb3`, subtree `experimental/declarative/`. This issue must not rely on a GitHub link to that untracked proof.

## Scope

- Propose package boundaries that separate legacy compatibility/runtime from native TypeScript APIs and assign each package one documented responsibility.
- Define dependency direction and optional dependency policy so parser, editor, React, or feature-specific dependencies do not leak into core consumers unintentionally.
- Design explicit package exports, declaration/runtime entry parity, browser/Node conditions where needed, and supported compatibility entry points.
- Define migration, versioning, test, and deprecation policy that avoids breaking existing import paths or behavior without an explicit compatibility decision.
- Provide a repository-level build/test graph and ownership documentation for maintainers.
- Validate boundaries with real packed-consumer installs, supported environment tests, and dependency/module-graph evidence.

## Acceptance criteria

- A reviewed architecture/migration plan names package responsibilities, public exports, dependency rules, and compatibility guarantees before implementation changes begin.
- Existing documented legacy imports and behavior have regression fixtures or an explicit, approved breaking-change plan; migration does not silently replace the legacy entry point.
- Native TypeScript packages expose coherent runtime and declaration exports and pass strict packed-consumer tests without accidental ambient/runtime dependencies.
- Optional dependencies remain optional in both install metadata and actual consumer/runtime graphs, with measured package/bundle impact.
- Repository scripts provide a clear supported path to build, lint, typecheck, test, and validate all package boundaries.
- No package is published and no public version is changed as part of this issue absent separate release authorization.

## Validation

Start with an architecture proposal and consumer/import inventory. For implementation, run the full legacy regression set plus package-specific strict typecheck, lint, build, tests, packed-consumer installs, graph checks, and compatibility tests on supported Node/browser environments.

## Dependencies

Use the local POC as evidence about possible boundaries, not as a mandate to copy its private package name or structure. Coordinate with the active painting/SVG and font/resource work so their APIs fit the agreed package responsibilities.

## Non-goals

No unrelated legacy rewrite, forced migration of every user, editor/Kalada integration, package publication, or breaking export change without explicit review. This issue establishes maintainable package structure and compatibility clarity, not a product feature bundle.

## Related roadmap issues

- [Clarify repository vision with runnable examples and an accurate roadmap](https://github.com/surikaterna/updf/issues/35)
- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
