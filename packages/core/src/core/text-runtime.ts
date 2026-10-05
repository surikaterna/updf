import type { OwnedResource } from "./owned-resource.js";

declare const textRunBrand: unique symbol;
export interface TextRun {
  readonly [textRunBrand]: true;
}
export type TextMode = "fixed" | "rich";
export interface TextMetrics {
  readonly advance: number;
  readonly left: number;
  readonly right: number;
  readonly ascent: number;
  readonly descent: number;
  readonly top: number;
  readonly bottom: number;
  readonly empty: boolean;
  readonly run: TextRun;
}
export interface TextRuntime {
  validateResource(resource: OwnedResource, path: string): void;
  validateText(resource: OwnedResource, text: string, path: string): void;
  fixedPolicy(
    resource: OwnedResource,
    path: string,
  ): { readonly baseline: "ascent" | "center-envelope"; readonly checkInk: boolean };
  lineMetrics(
    resource: OwnedResource,
    fontSize: number,
    path: string,
  ): { readonly ascent: number; readonly descent: number };
  measure(resource: OwnedResource, text: string, fontSize: number, mode: TextMode, path: string): TextMetrics;
  joinRuns(runs: readonly TextRun[], path: string): TextRun;
}
