# @updf/text (private/unpublished)

Owns rich paragraph measurement, wrapping, alignment, line envelopes,
inline layout, and intrinsic text ink. Depends on generic `@updf/core` contracts
and `@updf/layout-kernel/arithmetic`, never a concrete font implementation.

```ts
import { render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextMeasurer, createTextService, measureText, type MeasureOptions } from "@updf/text";

const runtime = fontRuntime();
const resources = { Helvetica: createHelvetica() };
const measurementOptions: MeasureOptions = {
  resources,
  measurer: createTextMeasurer({ runtime }),
};
const text = createTextService({ runtime, defaultFont: "Helvetica" });
const options = {
  resources,
  text,
  providers: [fontProvider(runtime)],
};
const measured = measureText({
  width: 100,
  paragraphs: [{
    runs: [{ text: "Hello" }],
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
    lineHeight: 12, align: "left", whiteSpace: "preserve", breakLongWords: "error",
  }],
}, measurementOptions);
// render(document, options);
```

`measureText(input, options)` and `measureTextUnknown(input, options)` require
`MeasureOptions`: only `resources`, required `measurer`, `profile`, and `limits`.
This is a breaking prerelease change: rendering options (`text` or `providers`)
are rejected, even when empty; there is no overload or automatic projection.
The structural `TextMeasurer` in `@updf/core/resources` has only `measure`;
core captures that own callback and rejects extra methods/accessors/inheritance.
Its frozen results contain numerical layout, source spans,
and styles, not font programs or private runs. VDOM components still use the full
selected `TextService` through `context.measurement.measureText`; core closes those
callbacks after lowering, including failed operations.

`createTextMeasurer({ runtime })` and
`createTextService({ runtime, defaultFont? })` share the measurement implementation
and validate/capture all five runtime own data callbacks: `validateResource`,
`validateText`, `measure`, `lineMetrics`, and `joinRuns`.
The latter has seven capabilities for render/layout/inline text.
Measurement accepts only `{ width, height?, paragraphs }`, with explicit paragraph
styles and font IDs. Bare strings, former plain fields and any `kind` discriminator
are rejected, not converted or silently dropped. Zero paragraphs consume zero
lines; an empty paragraph consumes one. LF stays within its paragraph index.
Native rendering supports only `richText`, with explicit paragraph
`defaultStyle.font`. `defaultFont` is only a full-service style-resolution default;
standalone measurement accepts only `runtime` and does not select a default font.
For prepared fonts bind the immutable handle and pair the service with
`fontProvider(runtime)` using the **same runtime instance**. Custom host metrics
may implement `TextRuntime` from `@updf/core/resources` and supply their own
opaque-run provider; neither measuring nor core imports `@updf/fonts`.

Only omission in service style resolution selects `defaultFont`; an own
`font: undefined` is malformed (`TYPE` at the font field). Runtime measurement
outputs are own-data snapshots validated before wrapping: advance/ascent/descent
are finite nonnegative values, ink edges are finite signed values, nonempty bounds
are ordered, and runs are opaque objects whose identity is preserved. Invalid
numeric output rejects with `GEOMETRY` at the original source path plus the metric
field. Runtime/provider ownership checks remain responsible for run authenticity;
legitimate callback-thrown errors propagate unchanged. No numeric quota is added.

Core validates/captures structural service callbacks and clones numerical output
while retaining each opaque run's exact identity. Rich fragments join retained
scalar runs, without reprofiling glyphs or allocating CIDs. Runtime measurement
uses one canonical rich metric envelope, with no mode or fixed-text policy.
`measure(resource, text, fontSize, path)` retains the existing rich arithmetic.

Generic budgets use `limits.resourceBytes` (service default 8 MiB), counting all
unique bound identities, including unused resources. Byte counts are private
immutable registry metadata supplied to `createOwnedResource(data, { byteLength })`,
not runtime callbacks or mutable public metadata. The default count is zero.

`paintInlineText` and `validateLineHeight` now belong here rather than core's
internal text implementation. Core retains structural authoring/measurement DTOs,
generic drawing ink, resource ownership, operation budgets, and context lifetimes.
`@updf/core/measurement` is removed, not a compatibility facade.

The generic `TextService.resolveStyle(style, context, path)` capability
for authoring. It accepts a numerical/color style with an optional font reference,
selects only this service's explicit `defaultFont` on omission, validates even empty
content, and returns a concrete frozen `TextStyle`. Core captures/binds this own
callback and validates its returned DTO; layout never imports a font implementation.

Run root `npm run build`, `npm run typecheck`, `npm test`, and `npm run test:consumer`.
The packed consumer includes a minimal typed host runtime without fonts or Fontkit.
See the [breaking migration guide](../../docs/migration/fonts-text.md).

MIT licensed. No publication, deployment, or Git delivery is authorized.
