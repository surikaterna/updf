import type { ResolvedFonts } from "../fonts/resources.js";
import type { ComponentContext, RegistryDefinition } from "./types.js";

export interface OutputPage {
  width: unknown;
  height: unknown;
  children: Record<string, unknown>[];
}
export interface Location {
  readonly mode: "root" | "pages" | "draw";
  readonly x: number;
  readonly y: number;
  readonly page?: OutputPage;
  readonly target?: Record<string, unknown>[];
  readonly astPath?: string;
}
export interface State {
  units: number;
  readonly active: Set<object>;
  readonly installed: ReadonlySet<RegistryDefinition>;
  readonly context: ComponentContext;
  readonly fonts: ResolvedFonts;
  readonly pages: OutputPage[];
  readonly origins: Map<string, string>;
  document?: { version: unknown };
}
export type Walk = (child: unknown, location: Location, path: string, depth: number) => void;
