# Clarify repository vision with runnable examples and an accurate roadmap

## Summary

Update the repository README to explain UPDF's intended direction and current capabilities, give maintainers and users runnable examples, and link to an accurate roadmap that distinguishes implemented work from planned work. Make the documentation useful without implying that experimental local proofs are released features.

## Context

The local declarative TypeScript proof has runnable Node/browser fixtures and implementation evidence, but it is experimental, untracked in this worktree, and not a released UPDF package. Root documentation should make the project's vision and actual supported state understandable, while keeping future roadmap items clearly labeled as plans and linking to real repository issues once created.

POC context is local at `experimental/declarative/` on `feature/declarative-cmr-poc`, based on `7782bb3`; it is not a GitHub-hosted artifact or release.

## Scope

- State the project's vision and explain the role/status of the legacy implementation and native TypeScript direction without promising an unapproved migration or release.
- Add concise runnable examples with exact prerequisites and commands; distinguish examples that work today from proposals or experimental-only proofs.
- Link to the roadmap and relevant issues using verified repository URLs, and keep implementation status synchronized with actual code/release state.
- Label roadmap work as planned, in progress, or implemented only when that status is supported by repository evidence; do not present planned issues as completed features.
- Document where users should start, how to run the relevant checks/examples, and where compatibility/package information lives.

## Acceptance criteria

- A new reader can identify current supported entry points, project direction, and experimental/released status without relying on tribal knowledge.
- Every advertised runnable example was executed from the documented environment and its command/output expectation is accurate.
- Roadmap links resolve to the correct repository issue(s); planned versus implemented features are visibly and accurately distinguished.
- Documentation does not link to untracked local paths as if they were public artifacts or state unverified performance/compatibility promises.
- Review confirms README claims match package manifests, public exports, tests, and current issue state.

## Validation

Run every newly documented command/example in its stated environment. Check all URLs, issue references, and package/export names; review the rendered Markdown and compare each capability claim with current code and release state.

## Dependencies

Depends on having the relevant public roadmap issues and on the package/compatibility direction being sufficiently clear to describe. Use real issue URLs after creation; keep upcoming work separate from implemented feature descriptions.

## Non-goals

No release, API contract change, migration, implementation claims based only on a local proof, or requirement to rewrite every document page. This is documentation and navigation for the project, not authorization to publish unreleased work.

## Related roadmap issues

- [Restructure UPDF as a compatibility-preserving TypeScript monorepo](https://github.com/surikaterna/updf/issues/34)
- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add optional flow layout and page templates](https://github.com/surikaterna/updf/issues/27)
- [Add paged tables](https://github.com/surikaterna/updf/issues/28)
- [Add Markdown lists](https://github.com/surikaterna/updf/issues/29)
- [Add Code 39 barcodes](https://github.com/surikaterna/updf/issues/30)
- [Add QR codes](https://github.com/surikaterna/updf/issues/31)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
- [Add bounded raster-image resources](https://github.com/surikaterna/updf/issues/33)
