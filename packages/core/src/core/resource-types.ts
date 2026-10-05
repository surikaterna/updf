import type { PdfRef, PdfWriter } from "./pdf-writer.js";
import type { MeasuredNode, MeasuredPage } from "./plan.js";

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
export interface Resource<T> {
  readonly category: string;
  readonly key: string;
  readonly payload: T;
  readonly phase: ResourcePhase;
  readonly reserve: (writer: PdfWriter) => { readonly ref: PdfRef; readonly define: () => void };
}
export interface PageResources {
  resolve<T>(site: object, slot: ResourceSlot<T>): Resource<T>;
  painting<T>(site: object, slot: PaintingSlot<T>): { readonly key: string; readonly payload: T };
}
export interface ResourceCollection {
  intern<T>(slot: ResourceSlot<T>, identity: unknown, create: () => Resource<T>): Resource<T>;
  bind<T>(site: object, slot: ResourceSlot<T>, resource: Resource<T>): void;
  bindPainting<T>(site: object, slot: PaintingSlot<T>, binding: PaintingBinding<T>): void;
}
export interface ResourceProvider {
  readonly slot: object;
  readonly initialize?: (collection: ResourceCollection) => void;
  readonly collect: (node: MeasuredNode, collection: ResourceCollection) => void;
}
export interface DocumentResources {
  page(page: MeasuredPage): PageResources;
  open(writer: PdfWriter): {
    readonly dictionary: Record<string, Record<string, PdfRef>>;
    reserve(phase: ResourcePhase): void;
    define(phase: ResourcePhase): void;
  };
}
