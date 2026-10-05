import { fail } from "../core/error.js";
import type { ResolvedTextResources as ResolvedFonts } from "../core/text-resources.js";
import type { WorkLedger } from "../measurement/ledger.js";
import { context, install } from "./registry.js";
import type { State } from "./state.js";
import type { LowerOptions } from "./types.js";

export function operationState(fonts: ResolvedFonts, budget: WorkLedger, options: LowerOptions = {}): State {
  if (
    ("registry" in options && options.registry == null) ||
    ("resourceMetadata" in options && options.resourceMetadata == null)
  )
    fail("TYPE", "/options", "Present options must have explicit data values");
  const metadata = context(options.resourceMetadata ?? []).resources;
  if (metadata.some((item) => fonts.bindings.has(item.id)))
    fail("FONT_RESOURCE", "/options/resourceMetadata", "Metadata cannot override font resource ids");
  const resources = [...fonts.bindings.keys()].map((id) => ({ id, kind: "resource" }));
  return {
    environment: new Map(),
    sourceNodes: 0,
    generatedNodes: 0,
    generatedText: 0,
    generatedCommands: 0,
    expansions: [],
    budget,
    closed: false,
    active: new Set(),
    installed: install(options.registry ?? []),
    fonts,
    context: context([...resources, ...metadata]),
    pages: [],
    origins: new Map(),
  };
}
