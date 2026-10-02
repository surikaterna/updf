# Add rich text and a public measurement contract

## Summary

Add styled text runs and a public, reusable measurement/extension contract so callers and layout components can measure the same text semantics the PDF backend renders. Preserve the POC's explicit, deterministic errors rather than silently clipping, substituting, or shrinking content.

## Context

The local experimental POC currently accepts plain text, has no public measurement context, and its pure VDOM components receive immutable resource metadata rather than a measurement API. It supports a deliberately limited text profile and measures simple runs using the selected font's unkerned advances. There is no shaping, bidi, normalization, arbitrary styled text, or rich-text child model today.

The POC is local under `experimental/declarative/` on `feature/declarative-cmr-poc`, based on `7782bb3`; it is not a GitHub artifact or released package.

## Scope

- Specify a typed representation for ordered text runs and the supported per-run style overrides, including inheritance and conflict rules.
- Define a public measurement context/result contract that uses the same font resources, Unicode profile, wrapping rules, and metrics as rendering.
- Make the measurement contract available to trusted pure extensions/components without exposing serializer internals, mutable global state, or hidden callbacks.
- Preserve structured diagnostics and source paths through run validation and component/extension expansion.
- Document which measurement results are stable across environments and which depend on the selected font/resource profile.

## Acceptance criteria

- Rich text renders in deterministic run order with explicitly documented style inheritance and supported style properties.
- Measurement and rendering agree on advances, line breaks, line heights, and bounds for the same input; tests include mixed styles, empty runs, boundaries, and errors.
- Missing resources, unsupported characters/styles, overflow, and invalid run data fail with stable structured diagnostics rather than fallback or coercion.
- Public declarations expose the intended read-only contract and compile in strict standalone TypeScript and native TSX consumers without React/Node ambient types.
- Extension/component measurement access is scoped to one lowering/render operation and cannot mutate inputs or leak mutable backend state.

## Validation

Run strict typecheck, lint, build, unit tests, declaration-consumer tests, and Node/browser parity checks for representative rich-text documents. Add PDF extraction/raster checks where they can expose run ordering, wrapping, or clipping regressions.

## Dependencies

Depends on the local POC's current plain-text measurement and immutable extension model. Its Unicode/font profile must be stated as part of the contract, not expanded implicitly. This work is the measurement foundation for optional flow layout and templates.

## Non-goals

This issue does not promise complex-script shaping, bidi, normalization, kerning, arbitrary HTML/CSS, or automatic font fallback. It does not require a layout engine dependency or expose PDF serializer commands to extensions.

## Related roadmap issues

- [Add configurable, validated resource budgets](https://github.com/surikaterna/updf/issues/25)
- [Add optional flow layout and page templates](https://github.com/surikaterna/updf/issues/27)
- [Restructure UPDF as a compatibility-preserving TypeScript monorepo](https://github.com/surikaterna/updf/issues/34)
