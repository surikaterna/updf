import type { MeasuredNode } from "../core/plan.js";
import type { ResolvedTextResources } from "../core/text-resources.js";
import type { WorkLedger } from "../measurement/ledger.js";
import type { NodeDefinition } from "../types.js";
import type { Bounds } from "../painting/bounds.js";
import type { Matrix } from "../painting/types.js";
import type { ResolvedDrawing } from "../painting/types.js";
import type { ResourceCollection, ResourceProvider, PaintingSlot } from "../core/resource-types.js";
import type { PrivateFragment } from "../measurement/lines.js";
import type { PdfString } from "../core/pdf-values.js";

export type NodeKind = NodeDefinition["type"];
export type NodeOf<K extends NodeKind> = Extract<NodeDefinition, { type: K }>;
export type MeasuredOf<K extends NodeKind> = Extract<MeasuredNode, { type: K }>;

export interface MeasurementContext {
  readonly path: string;
  readonly fonts: ResolvedTextResources;
  readonly budget: WorkLedger;
  readonly schedule: (nodes: readonly NodeDefinition[], output: MeasuredNode[], path: string) => void;
}

export type MeasurementHandler<K extends NodeKind> = (node: NodeOf<K>, context: MeasurementContext) => MeasuredOf<K>;
export type MeasurementPhase = { readonly [K in NodeKind]: MeasurementHandler<K> };

export interface ValidationView {
  readonly width: number;
  readonly height: number;
  readonly matrix: Matrix;
  readonly clip?: Bounds;
  readonly local: boolean;
}

export interface ValidationContext {
  readonly path: string;
  readonly view: ValidationView;
  readonly fonts: ResolvedTextResources;
  readonly budget: WorkLedger;
  readonly remainingCommands: number;
  readonly reserveCommands: (count: number) => void;
  readonly scheduleChildren: (children: readonly unknown[], view: ValidationView) => void;
}

export type ValidationHandler = (node: Record<string, unknown>, context: ValidationContext) => void;

export interface PaintContext {
  readonly height: number;
  readonly local: boolean;
  readonly push: (chunk: string) => void;
  readonly drawing: (drawing: ResolvedDrawing) => readonly string[];
  readonly text: (fragment: PrivateFragment, x: number, y: number, fontSize: number) => string;
  readonly xObjectKey: (node: MeasuredOf<"xObject">) => string;
}
export type PaintHandler<K extends NodeKind> = (node: MeasuredOf<K>, context: PaintContext) => void;
export type PaintPhase = { readonly [K in NodeKind]: PaintHandler<K> };

export interface InkContext {
  readonly transform: Matrix;
  readonly clip?: Bounds;
  readonly addBounds: (bounds: Bounds | undefined) => void;
  readonly schedule: (nodes: readonly MeasuredNode[], transform: Matrix, clip?: Bounds) => void;
}
export type InkHandler<K extends NodeKind> = (node: MeasuredOf<K>, context: InkContext) => void;
export type InkPhase = { readonly [K in NodeKind]: InkHandler<K> };

export interface CollectionContext {
  readonly providers: readonly ResourceProvider[];
  readonly collection: ResourceCollection;
  readonly hasPainting: (site: object, slot: object) => boolean;
  readonly textSlot: PaintingSlot<PdfString>;
  readonly xObjectSlot: PaintingSlot<null>;
}
export type CollectionHandler<K extends NodeKind> = (node: MeasuredOf<K>, context: CollectionContext) => void;
export type CollectionPhase = { readonly [K in NodeKind]: CollectionHandler<K> | null };

export type LoweringHandler = (
  props: Readonly<Record<string, unknown>>,
  x: number,
  y: number,
  path: string,
) => Record<string, unknown>;

export interface NativeWork {
  readonly commands: number;
  readonly points: number;
}
export type NativeWorkHandler = (props: Readonly<Record<string, unknown>>) => NativeWork;

export type MeasurementProofHandler<K extends NodeKind> = (
  node: NodeOf<K>,
  path: string,
  fonts: ResolvedTextResources,
  budget: WorkLedger,
) => void;
export type MeasurementProofPhase = { readonly [K in NodeKind]: MeasurementProofHandler<K> | null };
