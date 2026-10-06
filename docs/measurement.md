# Rich text and public measurement — #26

Status: current private/unreleased measurement contract. Dated delivery and audit
records are preserved under `docs/evidence`; use native layout `measure` for authoring.
No flow, page templates or tables (#27/#28) are included. Issue #26 remains OPEN;
this document is not a tracker transition, release or deployment claim.

## Portable public boundary

`@updf/text` exports `measureText(input, options)` and
`measureTextUnknown(unknown, options)`. Required options bind resources and an
explicit `TextMeasurer`; see [composition and migration](migration/fonts-text.md).
`MeasureOptions` accepts only `resources`, required `measurer`, `profile`, and
`limits`. `text`, `providers`, and unknown keys are rejected even when empty;
the measurer accepts only an own `measure` function. This breaking prerelease
contract has no rendering-options overload or silent key projection.
`createTextMeasurer({ runtime })` validates all five runtime
capabilities and installs no automatic default font. All supplied limits validate,
including limits not consumed by standalone measurement; no new quota is added.
Each independent call has a fresh ledger.
Results are deeply frozen ordinary readonly data, in top-left PDF points:
`width`, `consumedHeight`, `lineCount`, ordered `lines`. Every line gives
`paragraphIndex`, `top`, `height`, `baseline`, complete `advance`, `inkBounds`,
ordered `fragments`, and `breakReason` (`soft`, `hard`, `paragraphEnd`).
Fragments give text, effective `style`, x, advance, ink bounds, original run index
and original UTF16 `[source.start, source.end)` offsets within that run.
Empty ink is explicitly `{ empty: true }`; nonempty bounds give left/top/right/bottom.
No plans, glyph records, serializer commands, resource handles or font bytes escape.

The only input is `{ width, height?, paragraphs }` (`TextMeasurementInput = RichTextInput`).
There is no discriminator, plain form, compatibility flag or automatic converter.
Bare root strings fail `TYPE`; former plain fields and any `kind` (including
`'rich'`) fail `KEY` at their field paths. Each paragraph
requires `runs`, `defaultStyle`, `lineHeight`, `align`, `whiteSpace` and
`breakLongWords`. `TextStyle` requires a font id, positive point fontSize, and
normalized RGB triple. Runs require text and may override any style property;
each override inherits independently from the paragraph default, never a prior run.
Only actual Helvetica/prepared faces, size and RGB are supported. No synthetic
bold/italic, decorations, shaping, bidi, kerning or font fallback is implied.

## Exact rich semantics

- Zero paragraphs consume zero height. Every empty paragraph consumes one line,
  including paragraphs with zero runs or empty runs. LF creates a hard break,
  retaining empty and trailing lines within the same paragraph index. CR and tabs are not coerced.
- `preserve` retains U+0020 sequences and their leading/trailing advance. `collapse`
  collapses across run boundaries, trims paragraph/hard-line edges, and discards
  spaces at soft wraps. A collapsed space uses its first original scalar's style
  and source range. Source discontinuities may create separate fragments.
- Run boundaries are not wrap opportunities. NBSP is not a break opportunity; it
  requires a prepared font under the unchanged repertoire. Helvetica remains
  printable ASCII + LF. Prepared fonts retain the simple LTR Latin/Cyrillic profile.
- Oversized tokens fail `TOKEN_OVERFLOW` in `error` mode. `codePoint` splits long
  tokens into scalar-safe chunks, never UTF16 halves. A scalar wider than the box
  still fails. Alignment uses the complete line advance, not individual runs.
- Rich lines share a baseline based on their maximum ascent/descent envelope,
  with centered spare leading. Helvetica uses its existing conservative ASCII
  envelope; prepared faces use actual glyph bounds. Line height must be at least
  each effective font size and contain the envelope. Horizontal prepared overhang
  fails `FONT_INK`, never clips or shifts silently.
- Omitted height is natural; supplied height is a hard bound. Exact fit passes;
  smaller bounds fail `VERTICAL_OVERFLOW`. No shrinking or automatic pages.

Rich metrics use compensated positive accumulation for advances, fragment positions
and consumed height. Helvetica's conservative descent is the complement of its
ascent in one em. Rich fit boundaries allow only rounding differences within two
relative machine epsilons of the compared metric/positioning operation; there is
no absolute point allowance. A left-aligned zero-edge check uses glyph/position
scale, not an unrelated huge box width. Nonfinite results always fail. Metrics
are not clamped, shrunk or decimal-quantized, so natural height may still contain
a representational tail (for example `30.900000000000002` fits a `30.9` bound).
The helper is private to measurement; no public or `/internal` export was added.
Native positioned text now uses only these rich paragraphs and the same rich engine.
The old native plain node/tag, plain props and fixed service callbacks are removed,
not accepted by an adapter. Existing rich output remains unchanged; former plain
consumers adopt rich per-line leading/baselines. Runtime measurement has five
capabilities and no fixed policy or mode argument. See the
[final integration evidence](evidence/rich-only-text.md) for rich preservation and
fair bundle costs. Implementation is not independent audit.

The AST uses `RichTextNode` (`type: 'richText'`, Box and paragraphs). Native TSX
uses `<richText ... paragraphs={paragraphs} />`, not a `<span>` child grammar.
Rich rendering consumes the same private measurement truth and the existing
font collection, painting coordinate convention and PDF serializer.

## Scoped component access, diagnostics and caps

Trusted components/extensions receive readonly
`context.measurement.measureText(input)`, bound to a snapshot of the operation's
owned resources and the same cumulative lowering ledger. Callers cannot supply
replacement resources or diagnostic path prefixes. Contexts close in `finally`
after successful or failed lowering; retained use fails `MEASUREMENT_CONTEXT`.
Pure component code is still trusted, not a sandbox.

Descriptor/prototype/dense-array checks reject unknown keys and present optional
undefined values. Existing structured diagnostic codes remain; rich character and
token errors preserve run paths and original scalar spans through component remapping.
The B foundation replaces mandatory legacy ceilings with trusted defaults and
optional `service`/validated `limits`, shared with render/lower/flow/tables. Text
is charged in Unicode code points, not UTF16 units; source and generated totals
are independent and repeated logical measurement is not charged again. There is
no public work cap or per-block 4,096 ceiling. Mandatory geometry/font/schema
checks remain. See [policy units, parser limitations and context API](architecture/composable-layout.md).
This local foundation is not independent verification or closure of #25.

## Showcase and evidence

The core-only rich example displays its exact imported source, bounded width/font
size/alignment/whitespace/long-word controls, and measured line count/height. It
reuses the existing Blob cleanup, cancellation, readable diagnostics and mobile
open/download fallback. SVG stays optional; Fontkit/React remain outside the initial
site closure. Pages remains manual-only and is not dispatched by implementation.

Current validation/delivery evidence is in [measurement evidence](evidence/measurement.md).
The [current roadmap index](roadmap/current.md) supersedes historical planning
status; original issue bodies and historical evidence remain byte-preserved.
