# Add paged tables

## Summary

Add a table abstraction that measures columns and rows, lays out headers and cells, and can continue across pages using the flow/pagination contract. Make row splitting and oversized-row behavior explicit so output cannot clip or stall silently.

## Context

The local experimental CMR proof draws a fixed small goods grid using explicit geometry; its README identifies a general table/layout engine and multipage CMR behavior as omitted. The current renderer has only text, unfilled rectangles, lines, and fixed geometry. A table feature should not quietly become a complete form/CMR rewrite.

The proof is local at `experimental/declarative/` on `feature/declarative-cmr-poc`, based on `7782bb3`; it is not hosted on GitHub or released.

## Scope

- Define typed table, column, header, row, and cell data with clear width, alignment, spacing, and measurement semantics.
- Measure cells using the public text-measurement contract and calculate stable column/row geometry.
- Repeat configured table headers when a table continues on a new page.
- Specify whether rows are atomic or splittable; handle a row taller than the usable page area through a deterministic diagnostic or documented split behavior.
- Expose layout results/counts sufficient to verify rows and pages were consumed.

## Acceptance criteria

- Tables render with deterministic column widths, row heights, text placement, and page breaks.
- Repeated headers and page-template body bounds do not overlap; every input row is either emitted or reported as an error.
- A row larger than the usable page area cannot cause a pagination loop, disappear, or clip silently.
- Tests cover empty and populated tables, long/wrapped cells, exact-fit transitions, repeated headers, multi-page data, and oversized rows.
- Text extraction and raster tests verify cell content/order and visible boundaries; output remains within validated page/resource limits.
- The fixed CMR example remains unchanged unless a separately scoped integration is chosen.

## Validation

Run strict typecheck, lint, build, and tests. Add deterministic multi-page PDF fixtures and validate page count, extracted row order, geometry, and raster output.

## Dependencies

Depends on the public measurement/rich-text contract and optional flow layout/page templates. Painted cell backgrounds/borders beyond existing drawing semantics depend on the active painting/fill work; this issue must not duplicate that work.

## Non-goals

No spreadsheet formulas, arbitrary cell widgets, automatic business-data inference, or full CMR multipage conversion. No new painting model is defined here.

## Related roadmap issues

- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add optional flow layout and page templates](https://github.com/surikaterna/updf/issues/27)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
