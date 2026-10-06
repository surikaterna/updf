# Core API inventory and examples

This inventory covers the consumer entry exports in this worktree, not all sibling
packages or internal implementation symbols. Contracts live on defining declarations
so builds retain them in `.d.ts` files and editor hovers. Core is private/unreleased.

## Export coverage

| Import from `@updf/core…` | Operations/values | Types (including aliases) |
| --- | --- | --- |
| root | `render`, `renderUnknown`, `DocumentError`, `SERVICE_LIMITS` | `Limits`, `OperationOptions`, `RenderOptions` (alias), `Box`, `TextAlign`, `TextNode`, `RichTextNode`, `RectangleNode`, `LineNode`, `PaintingGroupNode` (alias), `NodeDefinition`, `PageDefinition`, `DocumentDefinition`, `DiagnosticCode`, `DocumentDiagnostic`, `SourceSpan`; painting/measurement data reexports listed below |
| `/resources` | `createOwnedResource`, `isOwnedResource`, `ownedResourceBytes`, `paintingSlot`, `resourceSlot`, `textSlot` | `OwnedResource`, `MeasuredRichText`, `MeasuredText`, `PageResources`, `PaintingBinding`, `PaintingSlot`, `Resource`, `ResourceCollection`, `ResourcePhase`, `ResourceProvider`, `ResourceSlot`, `TextSite`, `TextMetrics`, `TextMode`, `TextRun`, `TextRuntime`, `TextService`, `TextServiceContext`, `InlineLine`, `InlineMetric`, `InlineLineHeights`, `LineEnvelope`, `LineHeight`, `PrivateFragment`; measurement data types below |
| `/pdf` | `hex`, `literal`, `name` | `PdfScalar`, `PdfString`, `PdfDictionary`, `PdfRef`, `PdfValue`, `PdfWriter` |
| `/painting` | `identity`, `multiply`, `point` | `ClipRect`, `CloseCommand`, `CubicCommand`, `LineCommand`, `Matrix`, `MoveCommand`, `Paint`, `PaintGroup`, `Painting`, `PathCommand`, `PathNode`, `RGB` |
| `/vdom` | `Fragment`, `bind`, `h`, `lower`, `definePrimitive`, `createContext`, `useContext` | `Context`, `ReadContext`, `Component`, `ComponentContext`, `DeepReadonly`, `Key`, `LowerOptions`, `NativeProps`, `NativeTag`, `Primitive`, `RegistryDefinition`, `ResourceMetadata`, `TextChildren`, `TextProps`, `VDOMChild`, `VNode` |
| `/jsx-runtime` | `Fragment` (same VDOM declaration), `jsx`, `jsxs` (alias) | `JSX` namespace: `Element`, `ElementType`, `ElementChildrenAttribute`, `IntrinsicAttributes`, `IntrinsicElements` |
| `/jsx-dev-runtime` | `Fragment`, `jsxDEV` | `JSX` (same runtime namespace) |

Root reexports `ParagraphDefinition`, `TextRun`, `TextStyle` from measurement data and
all painting types above except `PaintGroup`. `point`'s inferred return uses the
documented `Point` tuple in its defining module, but `Point` is not a barrel export.
`VNode`'s variant declarations describe owned nodes, not a supported way to forge them.
`/internal` and `/internal-drawing` are unstable sibling-package bridges, deliberately
excluded from consumer coverage and new support guarantees. No private-helper
documentation or exhaustive per-field hover coverage is claimed.

`/resources` also exports `InkBounds`, `ParagraphDefinition`, `PlainTextInput`,
`RichTextInput`, `TextFragmentMeasurement`, `TextLineMeasurement`, `TextMeasurement`,
`TextMeasurementInput`, `SourceTextRun` (source paragraph run, distinct from runtime
`TextRun`), and `TextStyle`. Font preparation/handles belong to `@updf/fonts`;
measurement operations belong to `@updf/text`, not removed core subpaths.

## Fixed-page render and structured errors

```ts
import { DocumentError, render, renderUnknown, type DocumentDefinition } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";

const runtime = fontRuntime();
const options = {
  resources: { Helvetica: createHelvetica() },
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  providers: [fontProvider(runtime)],
};

const document: DocumentDefinition = {
  version: 1,
  pages: [{ width: 200, height: 100, children: [{
    type: "text", x: 10, y: 10, width: 180, height: 40,
    text: "Hello PDF", fontSize: 12, lineHeight: 16, align: "left",
  }] }],
};
const pdf = render(document, { ...options, profile: "service" });
try {
  renderUnknown({ version: 2, pages: [] });
} catch (error: unknown) {
  if (!(error instanceof DocumentError)) throw error;
  console.log(error.diagnostics[0]?.code, error.diagnostics[0]?.path);
}
```

All geometry is top-left PDF points (72 per inch). Native documents are fixed
pages; overflow is an error, not pagination or shrinking. Typed inputs receive
runtime checks too. Unknown data must be ordinary supported data with no unknown
keys/accessors and omitted, rather than explicit `undefined`, optional fields.
The explicitly installed Helvetica supports printable ASCII plus LF. Core installs
no resources or text service. Service limits are optional
budgets; trusted defaults are safe-integer ceilings, not weaker geometry checks.
Neither profile limits arbitrary execution time in trusted JavaScript components.

## Prepared font and natural-height measurement

```ts
import { createPreparedFont, fontRuntime, type PreparedFontInput } from "@updf/fonts";
import { createTextMeasurer, measureText } from "@updf/text";

function prepareAndMeasure(input: PreparedFontInput) {
  const Demo = createPreparedFont(input);
  const runtime = fontRuntime();
  return measureText({ kind: "plain", text: "Hello", font: "Demo",
    width: 180, fontSize: 12, lineHeight: 16, align: "left",
  }, {
    resources: { Demo },
    measurer: createTextMeasurer({ runtime }),
  });
}
```

Standalone measurement accepts only `MeasureOptions` (`resources`, required
`measurer`, `profile`, `limits`). Old rendering `text`/`providers` keys are errors,
not compatibility inputs. `TextMeasurer` is structural in `@updf/core/resources`;
the full `createTextService` is still required for render/layout/component measurement.

The host supplies corresponding static TrueType bytes/metrics and declared
embedding rights. `@updf/fonts` validates metadata and owns copied bytes, but does not parse or
prove the font program's correspondence/rights. Font IDs match
`[A-Za-z][A-Za-z0-9_-]{0,63}`; `Helvetica` is an explicit application binding. Handles are nominal and
runtime-owned; serialization/casts cannot recreate them. Prepared text is simple
LTR Latin/Cyrillic, not shaping, bidi, kerning or fallback. Returned measurements
are deeply frozen: width is the requested width, consumedHeight is natural line
height sum, source spans are half-open UTF-16 offsets. Specifying height imposes
a hard bound. Rich runs inherit individual defaults from their paragraph.

## Native TSX

Configure `jsx: "react-jsx"` (or `react-jsxdev`) and
`jsxImportSource: "@updf/core"`; use NodeNext/appropriate export-aware resolution.

```tsx
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";

const tree = <document version={1}><page width={200} height={100}>
  <text x={10} y={10} width={180} height={40}
    fontSize={12} lineHeight={16} align="left">Hello PDF</text>
</page></document>;
// Reuse the explicit options from the fixed-page example for both operations.
const pdf = render(lower(tree, options), options);
```

`h`/JSX snapshot props; lowering returns deeply frozen data. Components run
synchronously with readonly props. Context providers snapshot data and shadow
defaults; `useContext` only works during component execution. Component measurement
shares the operation's font snapshot/budgets and becomes invalid when lowering
returns or throws. Primitives require their owned definition installed in each
lower call. No React elements, DOM tags or asynchronous hooks are involved.

Companion executable examples: `test/documentation-examples.tsx` and
`test/documentation.test.ts`, including the existing Liberation Sans fixture.
These are focused smoke/type examples, not a Markdown doctest engine.
