# Add bounded raster-image resources

## Summary

Add explicit raster-image resources and placement to PDF documents, with deterministic sizing, supported-format rules, and validated resource limits. Keep image decoding isolated from the small PDF core where practical, and make unsupported or malformed image data fail clearly.

## Context

The local declarative TypeScript POC has no image API. Its current typed document surface handles fixed geometry, text, rectangles, and lines; image loading/async resource resolution is explicitly outside its existing synchronous resource contract. Painting/SVG work is active separately and should land first so images can use a settled shared drawing/resource boundary.

The proof is local at `experimental/declarative/` on `feature/declarative-cmr-poc`, based on `7782bb3`; it is not released or available as a GitHub artifact.

## Scope

- Define a document/resource representation for raster images and explicit placement/scaling within validated page geometry.
- Select and document supported formats and decoding behavior; reject unsupported formats, malformed data, and unsupported color/bit-depth features explicitly.
- Bound source bytes, dimensions, pixel count, decoded memory, and emitted PDF size before costly allocations wherever possible.
- Specify whether hosts provide already-decoded pixel data or use an isolated optional decoder; do not add an implicit network/filesystem loader to core.
- Preserve deterministic serialization for identical image bytes and placement options, and define transparency/color handling accurately.

## Acceptance criteria

- Supported formats, color/alpha behavior, limits, scaling, and placement semantics are documented and validated at runtime.
- Oversized dimensions/pixel counts, invalid encodings, and output-limit exhaustion fail with stable structured diagnostics before unbounded allocation.
- Tests cover placement/bounds, transparency as supported, malformed and unsupported inputs, limit edges, deterministic bytes, and multi-page resource reuse.
- PDF structural checks and raster comparisons validate image appearance and page geometry; generated PDFs reopen and pass the repository's available PDF checks.
- Core/optional decoder dependency graphs and bundle costs are measured; image decoding does not silently enter unrelated consumers.

## Validation

Run strict typecheck, lint, build, and tests. Add representative color/alpha raster fixtures with provenance, PDF integrity checks, and rasterized output assertions. Record supported decoder/tool versions and verify image/resource memory accounting.

## Dependencies

Depends on the active painting/SVG work establishing shared draw/resource semantics. Coordinate placement and budgets with configurable resource limits. Any parser/decoder must have reviewed license, security posture, and measured optional-dependency cost.

## Non-goals

No network fetching, filesystem loading, arbitrary image formats, image editor, vector/SVG parsing, or claim of a hostile-input sandbox. This does not define transparency groups or color management beyond an explicitly tested supported profile.

## Related roadmap issues

- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
