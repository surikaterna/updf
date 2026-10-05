import { createRendererContext, type RendererBinding } from "@updf/core/internal";

/** Sealed final pagination information; document/section/page numbers are one-based, flow index zero-based. */
export interface PageInfo {
  readonly docPageNumber: number;
  readonly docPageCount: number;
  readonly sectionNumber: number;
  readonly flow: {
    readonly index: number;
    readonly pageNumber: number;
    readonly pageCount: number;
  } | null;
}
/** Sealed decoration fragment index (zero-based), total count and first/last flags. */
export interface FragmentInfo {
  readonly index: number;
  readonly count: number;
  readonly first: boolean;
  readonly last: boolean;
}
const page = createRendererContext<PageInfo>();
const fragment = createRendererContext<FragmentInfo>();
/** Renderer-owned final context; read with core useContext only during final fixed/region rendering. */
export const PageContext = page.context;
/** Renderer-owned final decoration context; unavailable during early body measurement. */
export const FragmentContext = fragment.context;
export const pageBinding: RendererBinding<PageInfo> = page.binding;
export const fragmentBinding: RendererBinding<FragmentInfo> = fragment.binding;
