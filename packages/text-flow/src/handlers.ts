import { dataArray, fail, validateDataObject } from "@updf/core/internal";
import type { ShapeSource } from "./sources.js";
import type { PathBand, Charge } from "./path-band.js";
import type { FixedBlock } from "@updf/layout";
import type {
  FlowParticipation,
  ParticipationContext,
  ParticipationSource,
  PreparedBlock,
} from "@updf/layout/internal-participation";
import type { OwnedResource } from "@updf/core/resources";

declare const handlerBrand: unique symbol;
export interface ShapeHandler {
  readonly [handlerBrand]: true;
}
export interface TextFlowOptions {
  readonly handlers?: readonly ShapeHandler[];
}
export type GeometryHandler = (
  source: ShapeSource,
  width: number,
  height: number,
  side: "left" | "right" | undefined,
  charge: Charge,
  path: string,
) => PathBand;
export type VisualHandler = (
  geometry: PathBand,
  capture: object,
  width: number,
  height: number,
  charge: Charge,
  path: string,
) => FixedBlock;
export type SyntaxHandler = (source: string, charge: Charge, path: string) => ShapeSource;
export interface ResourceShapeHandler {
  readonly contribution: (owner: FlowParticipation, syntax?: SyntaxHandler) => FlowParticipation;
  readonly query: (
    resource: OwnedResource,
    source: ParticipationSource,
    prepared: PreparedBlock,
    context: ParticipationContext,
    charge: Charge,
    path: string,
  ) => PathBand;
}
type Definition =
  | { readonly kind: "geometry"; readonly resolve: GeometryHandler; readonly visual: VisualHandler }
  | { readonly kind: "syntax"; readonly resolve: SyntaxHandler }
  | { readonly kind: "resource"; readonly resolve: ResourceShapeHandler };
const handlers = new WeakMap<object, Definition>();
export function defineHandler(definition: Definition): ShapeHandler {
  const identity = Object.freeze({}) as ShapeHandler;
  handlers.set(identity, Object.freeze(definition));
  return identity;
}
export interface HandlerConfig {
  readonly geometry?: GeometryHandler;
  readonly visual?: VisualHandler;
  readonly syntax?: SyntaxHandler;
  readonly resource?: ResourceShapeHandler;
}
export function captureHandlers(options: unknown, supplied: boolean): HandlerConfig {
  const result: {
    geometry?: GeometryHandler;
    visual?: VisualHandler;
    syntax?: SyntaxHandler;
    resource?: ResourceShapeHandler;
  } = Object.create(null);
  if (!supplied) return Object.freeze(result);
  validateDataObject(options, ["handlers"], "/textFlow");
  if (!Object.hasOwn(options, "handlers")) return Object.freeze(result);
  dataArray(options.handlers, "/textFlow/handlers");
  for (const [index, handler] of options.handlers.entries()) {
    const definition = handler && typeof handler === "object" ? handlers.get(handler) : undefined;
    if (!definition) fail("TYPE", `/textFlow/handlers/${index}`, "Expected an owned shape handler");
    if (result[definition.kind]) fail("VALUE", `/textFlow/handlers/${index}`, "Duplicate shape handler");
    if (definition.kind === "geometry") {
      result.geometry = definition.resolve;
      result.visual = definition.visual;
    } else if (definition.kind === "syntax") result.syntax = definition.resolve;
    else result.resource = definition.resolve;
  }
  return Object.freeze(result);
}
