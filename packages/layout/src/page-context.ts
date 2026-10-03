import { createRendererContext, type RendererBinding } from "@updf/core/internal";

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
export interface FragmentInfo {
  readonly index: number;
  readonly count: number;
  readonly first: boolean;
  readonly last: boolean;
}
const page = createRendererContext<PageInfo>();
const fragment = createRendererContext<FragmentInfo>();
export const PageContext = page.context;
export const FragmentContext = fragment.context;
export const pageBinding: RendererBinding<PageInfo> = page.binding;
export const fragmentBinding: RendererBinding<FragmentInfo> = fragment.binding;
