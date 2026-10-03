import { DocumentError, fail } from "../core/error.js";
import { execute } from "./context.js";
import { measurementContext } from "./measurement.js";
import type { State } from "./state.js";
import type { VDOMChild, VNode } from "./types.js";

export function expand(node: VNode, state: State, path: string): VDOMChild {
  try {
    const context = measurementContext(state, path);
    if (node.kind === "component") return execute(state, () => node.invoke(context));
    if (node.kind !== "extension") fail("TYPE", "", "Expected expandable VDOM node");
    if (!state.installed.has(node.definition))
      fail("VDOM_REGISTRY", "", `Primitive ${node.definition.name} is not installed`);
    return execute(state, () => node.definition.expand(node.props, context));
  } catch (error: unknown) {
    if (error instanceof DocumentError) {
      const diagnostic = error.diagnostics[0];
      if (diagnostic)
        throw new DocumentError(diagnostic.code, `${path}${diagnostic.path}`, diagnostic.message, diagnostic);
    }
    throw new DocumentError("VDOM_COMPONENT", path, thrownMessage(error));
  }
}
function thrownMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Component expansion failed";
  const message = Object.getOwnPropertyDescriptor(error, "message");
  return message && "value" in message && typeof message.value === "string"
    ? message.value
    : "Component expansion failed";
}
