import type { NodeDefinition, RGB } from "@updf/core";

/** Local point-valued boundary interval and paint claim; not CSS border-collapse or a reflow reservation. */
export interface LocalEdgeClaim {
  readonly axis: "horizontal" | "vertical";
  readonly interval: readonly [number, number];
  readonly coordinate: number;
  readonly ownerSide: "top" | "right" | "bottom" | "left";
  readonly provenance: "grid" | "explicit";
  readonly width: number;
  readonly color: RGB;
  readonly sourcePath: string;
  /** Inward displacement used only where no opposite-side logical claim touches. */
  readonly unsharedInset?: number;
  /** Endpoint trims waived where an opposite-side perpendicular boundary is shared. */
  readonly startInset?: number;
  readonly endInset?: number;
}

/** Local point box, native nodes and edge reports for MeasureContext.edgeRegion; ownership is operation-local. */
export interface EdgeRegionInput {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
  readonly claims: readonly LocalEdgeClaim[];
}

declare const regionBrand: unique symbol;
declare const groupBrand: unique symbol;

export interface EdgeRegion extends EdgeRegionInput {
  readonly [regionBrand]: true;
}

export interface EdgeRegionPlacement {
  readonly region: EdgeRegion;
  readonly x: number;
  readonly y: number;
}

export interface SharedEdgeGroupInput {
  readonly width: number;
  readonly height: number;
  readonly regions: readonly EdgeRegionPlacement[];
}

export interface SharedEdgeGroup extends SharedEdgeGroupInput {
  readonly [groupBrand]: true;
}
