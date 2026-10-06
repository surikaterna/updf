/** @jsxImportSource @updf/core */

import type { ParagraphDefinition } from "@updf/core";
import { type Component, definePrimitive, Fragment, h, type VDOMChild } from "@updf/core/vdom";
import { lower, render } from "./text-options.js";

const bounds = { x: 0, y: 0, width: 80, height: 24 } as const;
function paragraph(text: string): ParagraphDefinition {
  return {
    runs: [{ text }],
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
    lineHeight: 12,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
}
interface LabelProps {
  readonly label: string;
  readonly children: string;
  readonly items?: readonly string[];
}
const Label: Component<LabelProps> = ({ label, children }) => (
  <richText {...bounds} paragraphs={[paragraph(label + children)]} />
);
const NoChildren: Component<{ readonly label: string }> = ({ label }) => (
  <richText {...bounds} paragraphs={[paragraph(label)]} />
);

function isDot(value: unknown): value is { readonly size: number } {
  return typeof value === "object" && value !== null && "size" in value && typeof value.size === "number";
}
const Dot = definePrimitive("Dot", isDot, (props) => <rect x={0} y={0} width={props.size} height={props.size} />);

export const nativeTree = (
  <document version={1}>
    <page width={100} height={100}>
      <group x={5} y={1}>
        <Label label="Hello"> PDF</Label>
      </group>
      <Dot.Type size={3} />
      <Fragment>{[null, false, <NoChildren key="metadata" label="X" />]}</Fragment>
    </page>
  </document>
);
export const bytes: Uint8Array = render(lower(nativeTree, { registry: [Dot.definition] }));
export const explicitBuilder = h(Label, { label: "Hello", children: " PDF" });

// These compile-only bodies must not execute deliberate bad props or mutations.
export function typeFailures(children: VDOMChild, props: LabelProps): void {
  // @ts-expect-error The library owns a closed native intrinsic vocabulary.
  const unknown = <circle />;
  const align = (
    // @ts-expect-error Align is a closed union, not arbitrary text.
    <richText {...bounds} paragraphs={[{ ...paragraph("X"), align: "justify" }]} />
  );
  // @ts-expect-error Numbers cannot become text by implicit coercion.
  const number = <richText {...bounds} paragraphs={[{ ...paragraph("X"), runs: [{ text: 42 }] }]} />;
  // @ts-expect-error Required component props are inferred from Component<Props>.
  const required = <Label>missing label</Label>;
  // @ts-expect-error Component-specific declared children are required.
  const missingChildren = <Label label="X" />;
  // @ts-expect-error Children are not universally injected into every component.
  const injected = <NoChildren label="X">not declared</NoChildren>;
  // @ts-expect-error Registry wrappers retain their primitive-specific prop type.
  const registry = <Dot.Type size="three" />;
  // @ts-expect-error Explicit builders infer the same required component props.
  const builder = h(Label, { children: "missing label" });
  const both = (
    // @ts-expect-error Native rich text accepts canonical data, not concatenated children.
    <richText {...bounds} paragraphs={[paragraph("prop")]} children="child" />
  );
  // @ts-expect-error Removed native text is rejected, not forwarded to rich text.
  const obsolete = <text {...bounds} text="old" />;
  void obsolete;
  // @ts-expect-error The AST version is still 1, not the package major version.
  const version = <document version={2}>{children}</document>;
  // @ts-expect-error Native data primitives cannot accept callback props.
  // biome-ignore lint/a11y/noStaticElementInteractions: Negative native JSX type probe, not DOM interactivity.
  const callback = <rect x={0} y={0} width={10} height={10} onClick={() => {}} />;
  // @ts-expect-error Component props are readonly, not VDOM mutation handles.
  props.label = "changed";
  void [unknown, align, number, required, missingChildren, injected, registry, builder, both, version, callback];
}

export const Deep: Component<{ readonly data: { readonly labels: string[] } }> = (props, context) => {
  // @ts-expect-error Nested data is deeply readonly inside components.
  props.data.labels.push("mutation");
  // @ts-expect-error Context metadata is deeply readonly too.
  context.resources.push({ id: "x", kind: "x" });
  return null;
};
