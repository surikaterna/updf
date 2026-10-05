import type { ResolvedTextResources as ResolvedFonts } from "../core/text-resources.js";
import type { WorkLedger } from "../measurement/ledger.js";
import type { ProviderEnvironment } from "./context.js";
import type { Expansion } from "./progress.js";
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
  environment: ProviderEnvironment;
  sourceNodes: number;
  generatedNodes: number;
  generatedText: number;
  generatedCommands: number;
  readonly expansions: Expansion[];
  readonly budget: WorkLedger;
  closed: boolean;
  readonly active: Set<object>;
  readonly installed: ReadonlySet<RegistryDefinition>;
  readonly context: Pick<ComponentContext, "resources">;
  readonly fonts: ResolvedFonts;
  readonly pages: OutputPage[];
  readonly origins: Map<string, string>;
  document?: { version: unknown };
  drawing?: (
    input: unknown,
    width: number,
    height: number,
    path: string,
  ) => readonly import("../types.js").NodeDefinition[];
}
export type Walk = (child: unknown, location: Location, path: string, depth: number) => void;
