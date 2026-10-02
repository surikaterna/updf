# Add QR codes

## Summary

Add validated QR-code generation as a deterministic vector feature, with an explicit supported profile and size/quiet-zone rules. Verify generated symbols with an independent decoder rather than treating successful PDF generation as proof of correctness.

## Context

The local POC is a small, deterministic PDF backend and currently has no QR feature. QR modules require solid painting/fill semantics that are part of the active painting work. This issue should consume that shared contract rather than defining a separate drawing behavior.

The POC exists locally at `experimental/declarative/` on `feature/declarative-cmr-poc`, based on `7782bb3`; it is not released or available as a GitHub link.

## Scope

- Choose/document the supported QR version, error-correction, encoding, and input-size profile.
- Validate input and compute a symbol/module matrix under explicit resource and output budgets.
- Render modules and required quiet zone using shared painting primitives, with explicit sizing and page-bound checks.
- Define deterministic failure when the requested symbol cannot fit; never silently crop or distort modules.
- Keep any generator dependency isolated/optional if its runtime closure is material, and measure the actual bundle impact before deciding its placement.

## Acceptance criteria

- Input, encoding, version/error-correction selection, maximum payload, module sizing, and quiet-zone contract are documented and validated.
- Identical input/options generate deterministic PDF bytes and module geometry.
- Independent decoders recover representative content from generated/rasterized PDFs across supported profiles and boundary sizes.
- Tests cover invalid input, maximum supported payload, insufficient space, page bounds, and resource-limit exhaustion.
- Module/payload work is bounded before expensive allocation; package graphs/sizes show whether any optional generator stays out of core consumers.

## Validation

Run strict typecheck, lint, build, and tests. Record independent decoder/tool and raster settings for fixture evidence. Check generated geometry and decode content; visual review is additional evidence, not a substitute.

## Dependencies

Depends on the active painting/fill contract. Select a generator implementation only after reviewing supported licensing, resource bounds, deterministic behavior, and measured dependency/bundle cost.

## Non-goals

No general image API, arbitrary QR feature extensions beyond the declared profile, guarantee of scanning on every device/printer, or duplication of Code 39 scope.

## Related roadmap issues

- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add Code 39 barcodes](https://github.com/surikaterna/updf/issues/30)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
