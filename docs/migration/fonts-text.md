# Breaking migration: optional fonts and text

Private/unreleased API change; no compatibility facade or publication is implied.

| Previous | Current |
| --- | --- |
| `@updf/core/fonts` | `@updf/fonts` |
| `@updf/core/measurement` | `@updf/text` |
| implicit Helvetica/default font/provider | explicit resources + text service + provider |
| `limits.fontBytes` | `limits.resourceBytes` (all unique owned resource identities) |
| unconditional `/F1` | Helvetica `/F1` only when committed text uses it |

```ts
import { render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService, measureText } from "@updf/text";

const runtime = fontRuntime();
const options = {
  resources: { Helvetica: createHelvetica() },
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  providers: [fontProvider(runtime)],
};
// Pass the same options to measureText(input, options), lower(tree, options),
// layout(document, options), and render(document, options).
```

Drawing-only core needs none of these packages or options. Binding a font does not
select it: omitted font requires `defaultFont`; an own `font: undefined` is invalid.
Prepared fonts use `createPreparedFont(input)` from fonts, or optional
`prepareFont(bytes)` from the Fontkit adapter. Bind the handle under a resource ID
and select that ID explicitly. Pair provider and service with the same runtime.
Unused configured fonts are not emitted, even when providers are installed.

Resources remain outside the document AST. Alias IDs share owned identity and count
private bytes once, including unused bound resources. Core exposes generic
contracts through `/resources` and narrow PDF primitives through `/pdf`, not font
programs, glyphs, metrics implementations, wrapping, or a global font registry.

Host-only measurement can implement `TextRuntime` from `@updf/core/resources` and
use `createTextService` without fonts. See
`tests/consumer/types/host-metrics-template.ts`; rendering host runs additionally
requires a matching provider. Layout depends on text/core/kernel, not fonts;
tables depend on layout/core. The core install still installs the whole kernel
package although drawing runtime imports only its arithmetic entry.

Application convenience wrappers deliberately own defaults: CMR exposes
`renderCMR(document, options?)`, while `createCmrDocument(data)` stays pure data.
Unicode CMR uses `unicodeCmrOptions(font)`/`renderUnicodeCMR(font)`. Native library
render/lower/layout calls do not inherit those application defaults.

Root tests/typecheck include extraction regressions; `test:consumer` installs real
tarballs externally and compiles NodeNext/Bundler declarations without source aliases.
Historical `docs/evidence` reports retain their revision-specific contracts.
