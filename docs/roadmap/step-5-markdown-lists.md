# Add Markdown lists

## Summary

Add a bounded Markdown-list representation or parser adapter for ordered and unordered lists, rendered through the text measurement and optional flow pipeline. Keep the supported syntax deliberately small and report unsupported constructs rather than guessing at browser-like Markdown behavior.

## Context

The local POC accepts explicit document data and plain text, with no Markdown parser or list layout. Text currently wraps using a narrowly defined profile. A list feature needs deterministic indentation, markers, continuation alignment, measurement, and pagination behavior; a browser HTML/CSS interpretation is not a suitable implicit contract.

The proof is local at `experimental/declarative/` on `feature/declarative-cmr-poc` based on `7782bb3`; it is not a published or GitHub-hosted package.

## Scope

- Specify supported ordered/unordered list nodes, nesting rules, markers, indentation, and spacing.
- Choose and document whether input is structured list data or a constrained Markdown parser entry; keep parsing separate from the core PDF runtime if it adds a dependency.
- Align wrapped continuation lines and nested list content using measured text, not hard-coded character counts.
- Define diagnostics for malformed/unsupported list input and a bounded policy for nesting/item counts.
- Integrate with optional flow pagination without altering fixed-geometry documents.

## Acceptance criteria

- Ordered and unordered lists render with stable marker/numbering and continuation alignment across wrapping and page breaks.
- Nested list limits and unsupported syntax are explicit; invalid input produces structured errors rather than silently changing meaning.
- Measurement/rendering agree on item heights and page placement; no list item is silently dropped or clipped.
- Tests cover empty lists, numbering, nesting limits, wrapping, long items, exact page transitions, and malformed inputs.
- Any parser package remains optional and isolated from the core runtime graph, or the issue documents why a dependency is unnecessary.

## Validation

Run strict typecheck, lint, build, and tests. Add deterministic PDF extraction/raster fixtures spanning ordered/unordered, nested, wrapped, and paged list content. Check package graphs if parser tooling/dependencies are introduced.

## Dependencies

Depends on rich-text/public measurement and optional flow layout/page templates. Does not require or imply a full Markdown implementation.

## Non-goals

No full CommonMark/GFM support, HTML embedding, CSS stylesheets, tables, images, or arbitrary Markdown extensions. Tables and barcodes have separate roadmap scope.

## Related roadmap issues

- [Add rich text and a public measurement contract](https://github.com/surikaterna/updf/issues/26)
- [Add optional flow layout and page templates](https://github.com/surikaterna/updf/issues/27)
- [Add bundle-cost and feature regression gates](https://github.com/surikaterna/updf/issues/32)
