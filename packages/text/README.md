# @updf/text (private/unpublished)

Owns plain/fixed and rich text measurement, wrapping, alignment, line envelopes,
inline layout, and intrinsic text ink. Depends on generic `@updf/core` contracts
and `@updf/layout-kernel/arithmetic`, never a concrete font implementation.

```ts
import { render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService, measureText } from "@updf/text";

const runtime = fontRuntime();
const text = createTextService({ runtime, defaultFont: "Helvetica" });
const options = {
  resources: { Helvetica: createHelvetica() },
  text,
  providers: [fontProvider(runtime)],
};
const measured = measureText({
  kind: "plain", text: "Hello", width: 100,
  fontSize: 10, lineHeight: 12, align: "left",
}, options);
// render(document, options);
```

`measureText(input, options)` and `measureTextUnknown(input, options)` require
explicit options. Their frozen results contain numerical layout, source spans,
and styles, not font programs or private runs. VDOM components use the same
selected service through `context.measurement.measureText`; core closes those
callbacks after lowering, including failed operations.

`createTextService({ runtime, defaultFont? })` captures the runtime's own data
callbacks once. An omitted font requires an explicit `defaultFont`; even binding
`Helvetica` does not select it implicitly. Rich styles carry explicit font IDs.
For prepared fonts bind the immutable handle and pair the service with
`fontProvider(runtime)` using the **same runtime instance**. Custom host metrics
may implement `TextRuntime` from `@updf/core/resources` and supply their own
opaque-run provider; neither measuring nor core imports `@updf/fonts`.

Only omission selects `defaultFont`; an own `font: undefined` is malformed (`TYPE`
at the font field), including native render/lower inputs. Runtime measurement
outputs are own-data snapshots validated before wrapping: advance/ascent/descent
are finite nonnegative values, ink edges are finite signed values, nonempty bounds
are ordered, and runs are opaque objects whose identity is preserved. Invalid
numeric output rejects with `GEOMETRY` at the original source path plus the metric
field. Runtime/provider ownership checks remain responsible for run authenticity;
legitimate callback-thrown errors propagate unchanged. No numeric quota is added.

Core validates/captures structural service callbacks and clones numerical output
while retaining each opaque run's exact identity. Rich fragments join retained
scalar runs, without reprofiling glyphs or allocating CIDs. Helvetica retains its
ascent-baseline/no-ink-check fixed policy; prepared fonts retain centered envelopes
and ink checks. Fixed candidate strings deliberately retain repeated measurement.

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
