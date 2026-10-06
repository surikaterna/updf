import { ledger, type WorkLedger } from "../measurement/ledger.js";
import type { ValidationView } from "../nodes/context.js";
import { isNativeNodeKind } from "../nodes/metadata.js";
import { acceptedKeys, validation } from "../nodes/wiring.js";
import { identity } from "../painting/affine.js";
import type { DocumentDefinition } from "../types.js";
import { dataRecord } from "./data.js";
import { fail } from "./error.js";
import { checkLimit } from "./policy.js";
import { array, number, validateDataObject as record } from "./schema.js";
import { emptyTextResources, type ResolvedTextResources as ResolvedFonts } from "./text-resources.js";

interface Counts {
  nodes: number;
  commands: number;
  fonts: ResolvedFonts;
  active: Set<object>;
  budget: WorkLedger;
  readonly tasks: (() => void)[];
}

function contents(
  node: Record<string, unknown>,
  view: ValidationView,
  path: string,
  state: Counts,
  depth: number,
): void {
  if (!isNativeNodeKind(node.type)) fail("TYPE", `${path}/type`, "Unsupported node type");
  validation(node.type)(node, {
    path,
    view,
    fonts: state.fonts,
    budget: state.budget,
    remainingCommands: state.budget.policy.pathCommands - state.commands,
    reserveCommands: (count) => {
      state.commands = checkLimit(state.commands + count, state.budget.policy.pathCommands, path, "Path commands");
    },
    scheduleChildren: (children, next) => {
      for (let i = children.length - 1; i >= 0; i--) {
        const item = children[i];
        state.tasks.push(() => child(item, next, `${path}/children/${i}`, state, depth + 1));
      }
    },
  });
}
function nodeRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  dataRecord(value, path);
  if (!isNativeNodeKind(value.type)) fail("TYPE", `${path}/type`, "Unsupported node type");
  record(value, acceptedKeys(value.type), path);
}
function child(value: unknown, view: ValidationView, path: string, state: Counts, depth: number): void {
  checkLimit(depth, state.budget.policy.depth, path, "Depth");
  state.nodes = checkLimit(state.nodes + 1, state.budget.policy.nodes, path, "Nodes");
  nodeRecord(value, path);
  if (state.active.has(value)) fail("TYPE", path, "Cyclic painting containers");
  state.active.add(value);
  state.tasks.push(() => {
    state.active.delete(value);
  });
  contents(value, view, path, state, depth);
}
export function validate(
  document: unknown,
  fonts: ResolvedFonts = emptyTextResources,
  budget: WorkLedger = ledger(),
): asserts document is DocumentDefinition {
  record(document, ["version", "pages"], "");
  if (document.version !== 1) fail("VERSION", "/version", "Only version 1 is supported");
  array(document.pages, budget.policy.pages, "/pages");
  if (!document.pages.length) fail("VALUE", "/pages", "At least one page is required");
  const state: Counts = { nodes: 0, commands: 0, fonts, active: new Set(), budget, tasks: [] };
  document.pages.forEach((page, i) => {
    const path = `/pages/${i}`;
    record(page, ["width", "height", "children"], path);
    const view: ValidationView = {
      width: number(page.width, `${path}/width`, true),
      height: number(page.height, `${path}/height`, true),
      matrix: identity,
      local: false,
    };
    array(page.children, budget.policy.nodes, `${path}/children`);
    page.children.forEach((item, j) => {
      child(item, view, `${path}/children/${j}`, state, 0);
      while (state.tasks.length) state.tasks.pop()?.();
    });
  });
}
