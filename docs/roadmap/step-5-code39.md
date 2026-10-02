# Add Code 39 barcodes

## Summary

Add validated Code 39 barcode data/rendering for supported use cases, with explicit module sizing and quiet-zone behavior. Require decoder-based evidence; visually plausible bars alone are not acceptance evidence.

## Context

The local fixed CMR proof explicitly omits Code 39 barcodes. Its existing drawing primitives do not yet provide the filled-bar painting contract a barcode needs. Barcode work must integrate with the active painting/fill work instead of introducing a second color/fill mechanism.

POC context is local at `experimental/declarative/` on `feature/declarative-cmr-poc` based on `7782bb3`; the proof is not a GitHub release.

## Scope

- Define the supported Code 39 alphabet, input validation, checksum policy, and human-readable-text behavior.
- Calculate bars and spaces from explicit module-width parameters and validate requested dimensions, quiet zones, and page bounds.
- Produce deterministic vector output through the shared drawing/painting contract.
- Report invalid data or insufficient available width with structured diagnostics; do not clip or silently compress below requested module dimensions.
- Keep barcode generation pure and independent of document-specific CMR domain mapping.

## Acceptance criteria

- Supported and unsupported input, checksum, dimensions, and quiet-zone rules are documented and runtime-validated.
- Generated symbols meet the declared module/quiet-zone geometry and remain inside page bounds.
- Independent barcode decoding succeeds for representative values and boundary-sized symbols in generated PDFs/rasterized output.
- Tests cover malformed data, narrow/wide inputs, exact-fit/overflow dimensions, and deterministic output.
- No barcode output path bypasses resource limits or shares mutable global state.

## Validation

Run strict typecheck, lint, build, and tests. Rasterize generated PDFs at documented resolutions and decode with an independent implementation/tool; record tool/version and fixture evidence. Visual inspection supplements, but does not replace, decode tests.

## Dependencies

Depends on active painting/fill support for solid barcode modules. It does not redefine painting semantics or require a particular external decoder at runtime.

## Non-goals

No QR support in this issue, arbitrary barcode symbologies, CMR/business-field mapping, or promise of scanability for every printer, scale, or camera. Decoder fixtures do not constitute a universal hardware guarantee.

## Related roadmap issues

- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add QR codes](https://github.com/surikaterna/updf/issues/31)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
