import { semanticComponent, validateDataObject } from "@updf/core/internal";
import type { BlockComponent } from "./content-types.js";
import type { PageBreakBlock } from "./types.js";

/** PageBreak takes no props or children. */
export type PageBreakProps = Readonly<Record<string, never>>;
export const pageBreakIdentity = Object.freeze({});
/** JSX flow control marker; not an atomic box or an unconditional blank-page drawing. */
export const PageBreak = semanticComponent<PageBreakProps>(pageBreakIdentity, true) as BlockComponent<PageBreakProps>;

export function pageBreakProps(props: Readonly<Record<string, unknown>>, path: string): PageBreakBlock {
  validateDataObject(props, [], path);
  return { type: "pageBreak" };
}
