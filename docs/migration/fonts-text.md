# Breaking migration: optional fonts and text

Private/unreleased API change; no compatibility facade or publication is implied.

| Previous | Current |
| --- | --- |
| `@updf/core/fonts` | `@updf/fonts` |
| `@updf/core/measurement` | `@updf/text` |
| implicit Helvetica/default font/provider | explicit resources + text service + provider |
| `limits.fontBytes` | `limits.resourceBytes` (all unique owned resource identities) |
| unconditional `/F1` | Core assigns private font names in committed first-use order; unused Helvetica allocates none |
| standalone `measureText(input, RenderOptions)` | `measureText(input, MeasureOptions)` with required `measurer` |
| discriminated plain/rich measurement inputs | `{ width, height?, paragraphs }` only, no `kind` |
| `TextNode`, native `<text>` and text children concatenation | `RichTextNode`, native `<richText paragraphs={...} />` only |
| invalid generic resource IDs / foreign handles reported as `FONT_RESOURCE` | `RESOURCE` at the generic binding path, including font-only maps; font-specific selection/run errors unchanged |

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
const options = {
  resources,
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  providers: [fontProvider(runtime)],
};
const input = { width: 100, paragraphs: [{
  runs: [{ text: "Hello" }],
  defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const },
  lineHeight: 12, align: "left" as const,
  whiteSpace: "preserve" as const, breakLongWords: "error" as const,
}] };
measureText(input, measurementOptions);
// Pass options to lower(tree, options), layout(document, options), and render(document, options).
```

Drawing-only core needs none of these packages or options. Binding a font does not
select it: paragraph default styles always require a font ID. For layout style
resolution, omission requires the
service's explicit `defaultFont`; an own `font: undefined` is invalid.
Prepared fonts use `createPreparedFont(input)` from fonts, or optional
`prepareFont(bytes)` from the Fontkit adapter. Bind the handle under a resource ID
and select that ID explicitly. Pair provider and service with the same runtime.
Unused configured fonts are not emitted, even when providers are installed.

Resources remain outside the document AST. Alias IDs share owned identity and count
private bytes once, including unused bound resources. Core exposes generic
contracts through `/resources` and narrow PDF primitives through `/pdf`, not font
programs, glyphs, metrics implementations, wrapping, or a global font registry.

Host-only measurement can implement `TextRuntime` from `@updf/core/resources` and
use `createTextMeasurer` without fonts. See
`tests/consumer/types/host-metrics-template.ts`; rendering host runs additionally
requires a matching provider. Layout depends on text/core/kernel, not fonts;
tables depend on layout/core. The core install still installs the whole kernel
package although drawing runtime imports only its arithmetic entry.

Standalone measurement accepts **only** `resources`, `measurer`, `profile`, and
`limits`; both `measureText` and `measureTextUnknown` reject old `text`/`providers`
keys or any other option, even if empty. Define a separate typed composition,
sharing resource handles and runtime intentionally; do not pass rendering options
or expect keys to be dropped. Custom structural measurers must expose only an own
`measure` function, not a full service. Its complete numerical DTO is snapshotted,
validated and frozen by core. `createTextService` remains the legitimate full
seven-method API (`measure`, `validate`, `rich`, `inline`, `validateStyle`,
`resolveStyle`, `lineBox`) for render/layout and scoped component/table measurement;
those call sites do not migrate to the standalone capability.
Both factories require all five runtime capabilities (`validateResource`,
`validateText`, `measure`, `lineMetrics`, `joinRuns`). `lineMetrics` is used by inline
layout and is required even for standalone measurement. Only the full service retains `defaultFont` for layout/flow style
resolution; standalone factory options accept only `runtime`.

E1 removes `PlainTextInput` and every measurement discriminator. Do not pass a
string root, `kind`, or former top-level text/font fields: strict validation rejects
them rather than converting them. Author paragraphs with explicit style, line
height, alignment, whitespace and long-word policies. Empty paragraph lists have
zero lines; empty paragraphs have one. LF hard breaks keep the paragraph index,
and source spans remain UTF-16 while quotas count code points. One-run measurement
now has the existing rich baseline/envelope and relative exact-fit arithmetic,
not the historical fixed baseline. E2 removes native plain nodes, their props/exports,
fixed service callbacks and all native plain rendering branches, without an alias or
forwarder. Runtime measurement now has one rich metric envelope:
`measure(resource, text, fontSize, path)`, without a mode or fixed policy. Opaque
runs retain runtime/resource/font-size ownership checks when joined. See the
[final integration evidence](../evidence/rich-only-text.md) for preservation and
rich-vs-rich bundle costs; historical plain appearance parity is not claimed.

Application convenience wrappers deliberately own defaults: CMR exposes
`renderCMR(document, options?)`, while `createCmrDocument(data)` stays pure data.
Unicode CMR uses `unicodeCmrOptions(font)`/`renderUnicodeCMR(font)`. Native library
render/lower/layout calls do not inherit those application defaults.

Root tests/typecheck include extraction regressions; `test:consumer` installs real
tarballs externally and compiles NodeNext/Bundler declarations without source aliases.
Historical `docs/evidence` reports retain their revision-specific contracts.
JPEG handles can coexist in the resource map without fonts/text importing JPEG;
add `jpegProvider()` explicitly to image-bearing operations. See [images](../jpeg-images.md).
