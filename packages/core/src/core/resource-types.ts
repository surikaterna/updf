import type { ResolvedDrawing } from "../painting/types.js";
import type { OwnedResource } from "./owned-resource.js";
import type { PdfRef, PdfWriter } from "./pdf-writer.js";
import type { MeasuredPage } from "./plan.js";
import type { TextRun } from "./text-runtime.js";

const slotBrand: unique symbol = Symbol("Resource slot");
export interface ResourceSlot<T> {
  readonly [slotBrand]: (payload: T) => T;
}
export function resourceSlot<T>(): ResourceSlot<T> {
  return Object.freeze({ [slotBrand]: (payload: T) => payload });
}
export interface PaintingSlot<T> extends ResourceSlot<T> {
  readonly category: string;
}
export function paintingSlot<T>(category: string): PaintingSlot<T> {
  return Object.freeze({ ...resourceSlot<T>(), category });
}
export interface PaintingBinding<T> {
  readonly resource: Resource<unknown>;
  readonly finish: () => T;
}
export type ResourcePhase = "bootstrap" | "content";
/** Key-free own-data schema. Payload stays mutable; reserve runs with the frozen core Resource as this. */
export interface ResourceDefinition<T> {
  readonly category: string;
  readonly payload: T;
  readonly phase: ResourcePhase;
  readonly reserve: (writer: PdfWriter) => { readonly ref: PdfRef; readonly define: () => void };
}
/** Fresh, shallow-frozen document-local record; key is assigned exclusively by core. */
export interface Resource<T> extends ResourceDefinition<T> {
  readonly key: string;
}
export interface PageResources {
  resolve<T>(site: object, slot: ResourceSlot<T>): Resource<T>;
  painting<T>(site: object, slot: PaintingSlot<T>): { readonly key: string; readonly payload: T };
}
export interface ResourceCollection {
  /** Intern by slot and identity; only successful new definitions consume a category-local name. */
  intern<T>(slot: ResourceSlot<T>, identity: unknown, create: () => ResourceDefinition<T>): Resource<T>;
  bind<T>(site: object, slot: ResourceSlot<T>, resource: Resource<T>): void;
  bindPainting<T>(site: object, slot: PaintingSlot<T>, binding: PaintingBinding<T>): void;
}
export interface ResourceProvider {
  readonly slot: object;
  readonly initialize?: (
    collection: ResourceCollection,
    context: { readonly bindings: ReadonlyMap<string, OwnedResource> },
  ) => void;
  readonly collectText?: (site: TextSite, collection: ResourceCollection) => void;
  readonly collectDrawing?: (drawing: ResolvedDrawing, collection: ResourceCollection) => void;
  readonly collectXObject?: (site: XObjectSite, collection: ResourceCollection) => void;
}
export interface XObjectSite {
  readonly identity: object;
  readonly resource: OwnedResource;
  readonly path: string;
}
/** Providers supply normalized unit-square content (Forms must normalize BBox/Matrix themselves). */
export const xObjectSlot: PaintingSlot<null> = paintingSlot<null>("XObject");
export interface TextSite {
  readonly identity: object;
  readonly run: TextRun;
  readonly path: string;
}
export interface DocumentResources {
  page(page: MeasuredPage): PageResources;
  open(writer: PdfWriter): {
    readonly dictionary: Record<string, Record<string, PdfRef>>;
    reserve(phase: ResourcePhase): void;
    define(phase: ResourcePhase): void;
  };
}
