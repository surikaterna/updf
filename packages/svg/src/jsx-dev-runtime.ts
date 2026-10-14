import { jsx } from "./jsx-runtime.js";

export { Fragment } from "./jsx-runtime.js";
export type { JSX } from "./jsx-runtime.js";
/** Development bookkeeping is not SVG data and never becomes fabricated XML provenance. */
export function jsxDEV(
  type: Parameters<typeof jsx>[0],
  props: unknown,
  key?: unknown,
  _staticChildren?: boolean,
  _source?: unknown,
  _self?: unknown,
): ReturnType<typeof jsx> {
  return jsx(type, props, key);
}
