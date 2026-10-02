# Add bundle-cost and feature regression gates

## Summary

Track runtime, optional-feature, font, and generated-document costs with reproducible measurements and regression alerts. Keep product code and optional feature closures separate where appropriate; report measured evidence instead of promising that every dependency tree-shakes away.

## Context

The local POC already measures separate core, VDOM, parser-free fonts, application, optional Fontkit, font-browser, and font/PDF artifacts. Its current evidence includes a core bundle of 18,081 raw / 6,216 gzip bytes, VDOM bundle 19,014 / 5,700 gzip, ordinary React app 214,328 / 68,808 gzip, optional Fontkit closure 490,786 / 169,026 gzip, and a full-font Unicode CMR PDF of 423,448 bytes. These are snapshot measurements from the proof, not budgets, release guarantees, or universal baselines.

The worktree proof is local at `experimental/declarative/` on `feature/declarative-cmr-poc`, based on `7782bb3`; it has not been published to GitHub and is not a release.

## Scope

- Define repeatable raw/gzip measurement for core runtime, separately exported optional features, browser fixtures, font assets, and representative PDF outputs.
- Record graph membership as well as size so parser/editor/React or other optional closures cannot accidentally enter core without detection.
- Establish reviewed thresholds from repeated, reproducible baselines; do not convert a single POC snapshot into arbitrary hard budgets.
- Add CI/reporting behavior that distinguishes intentional reviewed increases from accidental regressions.
- Include feature correctness/behavior fixtures alongside size checks so size reduction cannot pass by silently dropping functionality.

## Acceptance criteria

- A documented command produces stable scope-specific raw/gzip and dependency-graph reports from a clean install/build.
- Core, VDOM, parser-free font, and optional feature scopes are independently measured; no claim of full tree-shaking is made without evidence.
- Baseline and thresholds identify toolchain, inputs, and method, and are reviewed against actual consumers/workloads.
- CI fails or requires an explicit reviewed baseline update for material regressions; generated reports make the cause inspectable.
- Representative PDF size and behavior checks cover no-font and full-font documents without conflating font/PDF bytes with engine bundle size.
- Optional feature and consumer integration tests continue to prove absent dependencies stay absent from the core production graph.

## Validation

Run the strict typecheck, lint, build, tests, production graph checks, packed-consumer tests, and size measurement from a reproducible install. Compare results to the recorded baseline and inspect the actual changed graph/artifacts.

## Dependencies

Build on the local POC's size and module-graph tooling. Rebaseline only after deciding which artifacts and supported environments are authoritative; measurements are not inferred from source size.

## Non-goals

No blanket promise that all optional dependency internals tree-shake away, no invented size targets, and no dependency update or feature removal solely to satisfy a number without a correctness/consumer review. This is not a release announcement.

## Related roadmap issues

- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add paged tables](https://github.com/surikaterna/updf/issues/28)
- [Add Markdown lists](https://github.com/surikaterna/updf/issues/29)
- [Add Code 39 barcodes](https://github.com/surikaterna/updf/issues/30)
- [Add QR codes](https://github.com/surikaterna/updf/issues/31)
- [Add bounded raster-image resources](https://github.com/surikaterna/updf/issues/33)
