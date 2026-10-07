import type { SvgElement, SvgIntrinsicElements, SvgNode } from "./authoring-types.js";
import { svgFail } from "./error.js";
import { dataFields } from "./structured.js";

// biome-ignore lint/style/noNamespace: TypeScript requires a module-scoped JSX namespace for jsxImportSource.
export declare namespace JSX {
  export type Element = SvgNode;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicElements extends SvgIntrinsicElements {}
}
export function Fragment(props: { readonly children?: SvgNode }): SvgNode {
  return props.children;
}
type Component = (props: never) => SvgNode;
/** Synchronous function components are trusted code; SVG data is validated at preparation. */
export function jsx(type: string | Component, props: unknown, _key?: unknown): SvgNode {
  if (typeof type === "function") return type(props as never);
  if (typeof type !== "string") svgFail("SVG_UNSUPPORTED", "/svg", "Unsupported SVG JSX tag");
  const fields = dataFields(props ?? {}, "/svg/props", 66);
  const attributes: Record<string, { readonly value: string }> = Object.create(null);
  for (const [name, value] of Object.entries(fields)) {
    if (name === "children" || name === "key") continue;
    if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)))
      svgFail("SVG_GEOMETRY", `/svg/@${name}`, "SVG attributes require strings or finite numbers");
    attributes[name] = Object.freeze({ value: typeof value === "number" ? String(value) : value });
  }
  return Object.freeze({
    kind: "element",
    name: type,
    attrs: Object.freeze(attributes),
    children: Object.freeze(fields.children === undefined ? [] : [fields.children as SvgNode]),
  } satisfies SvgElement);
}
export const jsxs = jsx;
