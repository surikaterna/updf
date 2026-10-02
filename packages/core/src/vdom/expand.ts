import { DocumentError, fail } from "../core/error.js";
import type { State } from "./state.js";
import type { VDOMChild, VNode } from "./types.js";

export function expand(node: VNode, state: State, path: string): VDOMChild {
  try {
    if (node.kind === "component") return node.invoke(state.context);
    if (node.kind !== "extension") fail("TYPE", "", "Expected expandable VDOM node");
    if (!state.installed.has(node.definition))
      fail("VDOM_REGISTRY", "", `Primitive ${node.definition.name} is not installed`);
    return node.definition.expand(node.props, state.context);
  } catch (error: unknown) {
    if (error instanceof DocumentError) {
      const diagnostic = error.diagnostics[0];
      if (diagnostic)
        throw new DocumentError(diagnostic.code, `${path}${diagnostic.path}`, diagnostic.message, diagnostic);
    }
    throw new DocumentError(
      "VDOM_COMPONENT",
      path,
      error instanceof Error ? error.message : "Component expansion failed",
    );
  }
}
