# Add optional flow layout and page templates

## Summary

Add opt-in flow layout for content whose size is determined by measurement, including dynamic positions, page templates, and automatic pagination. Keep the existing fixed-geometry document API valid and predictable; flow must be an explicit higher-level path, not a change to fixed CMR geometry.

## Context

The local POC validates explicit top-left point geometry and measures into a fresh plan before serialization. It supports multiple explicit pages, but does not automatically create pages, size content from measurement, or provide headers/footers/page templates. The existing CMR example intentionally remains a fixed one-page subset with omitted fields; it is not a full CMR flow implementation.

POC context is in local `experimental/declarative/` on `feature/declarative-cmr-poc` based on `7782bb3`, not a released or GitHub-hosted implementation.

## Scope

- Define an opt-in flow/layout input and its boundary with the existing fixed `DocumentDefinition` API.
- Use the public measurement contract to size content and calculate dynamic positions without mutating caller data.
- Support page templates with explicit page dimensions/margins and well-defined repeated header/footer regions.
- Automatically paginate supported flow content and report generated page/content counts.
- Define behavior for content that cannot fit, including an oversized atomic block or row, with structured diagnostics/progress guarantees.
- Preserve a fixed-geometry mode so existing documents and the fixed CMR proof do not silently reflow.

## Acceptance criteria

- A multi-page flow document produces deterministic page breaks, positions, and bytes for identical input/resources.
- Headers and footers are applied consistently to generated pages, with explicit reservation of their space and no overlap with body content.
- Pagination either advances or reports a clear error for every content item; oversized indivisible content cannot cause an infinite loop or silent clipping.
- Flow output is validated against page bounds and measured ink/content bounds before serialization.
- Tests cover empty content, exact-fit boundaries, page transitions, repeated templates, long content, oversized items, and fixed-mode non-regression.
- Documentation describes supported flow primitives, measurement assumptions, and unsupported layout behavior.

## Validation

Run strict typecheck, lint, build, and tests. Add page-count and geometry assertions plus PDF structural, text-extraction, and raster checks for multi-page examples. Verify byte determinism and unchanged output for representative fixed-geometry fixtures.

## Dependencies

Requires the rich-text/public measurement contract. Table pagination depends on a row layout contract and should build on this issue rather than defining a competing page-break system.

## Non-goals

No full CSS layout, Yoga integration, browser DOM measurement, implicit reflow of fixed documents, or promise of every possible layout primitive. This is optional document flow, not a full CMR port or editor integration.

## Related roadmap issues

- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add paged tables](https://github.com/surikaterna/updf/issues/28)
- [Add Markdown lists](https://github.com/surikaterna/updf/issues/29)
