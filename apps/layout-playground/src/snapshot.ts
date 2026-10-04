import type { TextLineMeasurement } from "@updf/core/measurement";
import type { BoxLayout } from "@updf/layout-kernel/boxes";
import type { FragmentCounts } from "@updf/layout-kernel/fragmentation";
import type { SourceNode } from "./boxes.js";

export interface Unit {
  readonly id: string;
  readonly path: string;
  readonly height: number;
  readonly layout?: BoxLayout<never>;
  readonly root?: SourceNode;
  readonly line?: TextLineMeasurement;
  readonly lineIndex?: number;
}
export interface Placement {
  readonly unit: Unit;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly start: number;
  readonly end: number;
}
export interface Region {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly placements: readonly Placement[];
}
export interface Snapshot {
  readonly regions: readonly Region[];
  readonly status: "done" | "blocked" | "cap";
  readonly counts?: FragmentCounts;
  readonly blocked?: {
    readonly id: string;
    readonly height: number;
    readonly width: number;
    readonly regionHeight: number;
  };
  readonly source: unknown;
  readonly pdf: boolean;
}

export function unit(id: string, data: Omit<Unit, "id" | "path">): Unit {
  return Object.freeze({ id, path: `/${id}`, ...data });
}
