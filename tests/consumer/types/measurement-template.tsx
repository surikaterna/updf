/** @jsxImportSource @updf/core */
import { type OperationOptions, type RichTextNode, render, SERVICE_LIMITS } from "@updf/core";
import { type Component, createContext, lower, useContext } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import {
  createTextService,
  createTextMeasurer,
  type MeasureOptions,
  measureText,
  measureTextUnknown,
  type ParagraphDefinition,
  type TextMeasurement,
  type TextStyle,
} from "@updf/text";

const style: TextStyle = { font: "Helvetica", fontSize: 10, color: [0, 0, 0] };
const paragraphs: readonly ParagraphDefinition[] = [
  {
    defaultStyle: style,
    runs: [{ text: "native rich" }],
    lineHeight: 12,
    align: "left",
    whiteSpace: "collapse",
    breakLongWords: "codePoint",
  },
];
const input = { width: 100, paragraphs } as const;
const runtime = fontRuntime();
const composition = {
  resources: { Helvetica: createHelvetica() },
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  providers: [fontProvider(runtime)],
};
const measurementOptions: MeasureOptions = {
  resources: composition.resources,
  measurer: createTextMeasurer({ runtime }),
  profile: "service",
  limits: { ...SERVICE_LIMITS, pages: 21 },
};
const result: TextMeasurement = measureText(input, measurementOptions);
const node: RichTextNode = { type: "richText", x: 0, y: 0, width: 100, height: result.consumedHeight, paragraphs };
const Theme = createContext({ heading: { height: 100 } });
const options: OperationOptions = { ...composition, profile: "service", limits: { ...SERVICE_LIMITS, pages: 21 } };
const Heading: Component<object> = (_props, context) => {
  const theme = useContext(Theme);
  if (theme.heading.height !== 100) throw new Error("context");
  const measured = context.measurement.measureText(input);
  return <richText x={0} y={0} width={100} height={measured.consumedHeight} paragraphs={paragraphs} />;
};
const bytes = render(
  lower(
    <document version={1}>
      <page width={200} height={200}>
        <Theme.Provider value={{ heading: { height: 100 } }}>
          <Heading />
        </Theme.Provider>
      </page>
    </document>,
    options,
  ),
  options,
);
if (!bytes.length || measureTextUnknown(input, measurementOptions).lineCount !== 1 || node.type !== "richText")
  throw new Error("measurement");
if (bytes.length === 0) {
  // @ts-expect-error The runtime mode type was removed, not aliased.
  const oldMode: import("@updf/core/resources").TextMode = "rich";
  void oldMode;
  // @ts-expect-error Runtime measurement has no mode argument or legacy overload.
  runtime.measure(composition.resources.Helvetica, "A", 10, "rich", "/old");
  // @ts-expect-error Fixed policy is not a runtime capability.
  runtime.fixedPolicy(composition.resources.Helvetica, "/old");
  // @ts-expect-error Hook values are deeply readonly snapshots.
  useContext(Theme).heading.height = 1;
  // @ts-expect-error Async component output is not VDOM.
  const asyncComponent: Component<object> = async () => null;
  void asyncComponent;
  // @ts-expect-error Image budgets are not supported until image implementation.
  const imageOptions: OperationOptions = { limits: { imageBytes: 1 } };
  void imageOptions;
  // @ts-expect-error Results cannot be mutated.
  result.lines[0].baseline = 1;
  // @ts-expect-error Font size is required on the default style.
  const missing: TextStyle = { font: "Helvetica", color: [0, 0, 0] };
  void missing;
  const children = (
    // @ts-expect-error Rich text is typed paragraph data, not a child grammar.
    <richText x={0} y={0} width={100} height={12} paragraphs={paragraphs}>
      text
    </richText>
  );
  void children;
  // @ts-expect-error Optional undefined is not accepted.
  measureText({ ...input, height: undefined }, measurementOptions);
  // @ts-expect-error The root input is structured paragraphs, never a string.
  measureText("native rich", measurementOptions);
  measureText(
    // @ts-expect-error The former plain measurement form is removed.
    { kind: "plain", text: "A", width: 100, fontSize: 10, lineHeight: 12, align: "left" },
    measurementOptions,
  );
  // @ts-expect-error Even the former rich discriminator is an unknown key.
  measureText({ ...input, kind: "rich" }, measurementOptions);
  // @ts-expect-error Standalone factories do not resolve authoring font defaults.
  createTextMeasurer({ runtime, defaultFont: "Helvetica" });
  // @ts-expect-error Rendering options do not provide a standalone measurer.
  measureText(input, options);
  // @ts-expect-error Standalone measurement rejects rendering capabilities.
  const unsupported: MeasureOptions = { ...measurementOptions, text: composition.text };
  void unsupported;
  // @ts-expect-error The measurer capability has only one method.
  const extra: MeasureOptions = { measurer: { measure: measurementOptions.measurer.measure, fixed() {} } };
  void extra;
  // @ts-expect-error No raw font bytes or trusted plans are exposed.
  void result.lines[0].fragments[0].glyphs;
  // @ts-expect-error DOM-like spans are not a native tag.
  const span = <span>unsupported</span>;
  void span;
}
